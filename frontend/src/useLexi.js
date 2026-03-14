import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { extractTextFromUpload } from './upload';

const TOPIC_BADGES = {
  math: '🔢 Mathematics',
  science: '🔬 Science',
  history: '📜 History',
  coding: '💻 Coding',
  geography: '🌍 Geography',
  literature: '📖 Literature',
  space: '🚀 Space'
};

const TOPIC_KEYWORDS = {
  '🔢 Mathematics': ['math', 'algebra', 'calculus', 'equation', 'geometry', 'trigonometry', 'quadratic', 'derivative'],
  '🔬 Science': ['science', 'physics', 'chemistry', 'biology', 'atom', 'cell', 'force', 'energy', 'photosynthesis'],
  '📜 History': ['history', 'war', 'century', 'ancient', 'empire', 'revolution', 'civilization'],
  '📖 Literature': ['poem', 'novel', 'shakespeare', 'literature', 'essay', 'story', 'author'],
  '💻 Coding': ['code', 'programming', 'algorithm', 'python', 'javascript', 'function', 'loop'],
  '🌍 Geography': ['country', 'continent', 'capital', 'ocean', 'mountain', 'river', 'geography'],
  '🚀 Space': ['space', 'planet', 'star', 'galaxy', 'moon', 'solar', 'universe', 'asteroid']
};

const QUICK_PROMPTS = [
  'Explain photosynthesis simply',
  'Quiz me on World War 2',
  'How does Newton third law work?',
  'Help me with quadratic equations',
  'Tell me something amazing about space'
];

const INITIAL_REPLY =
  "Hey! I'm Lexi. I can explain concepts, quiz you, help with homework, or just chat while you study. What are we learning today?";

function getModeLabel(mode) {
  const labels = {
    study: '📚 Study',
    quiz: '🎯 Quiz',
    chat: '💬 Chat'
  };
  return labels[mode] || '📚 Study';
}

function normalizeEndpoint(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  let normalized = raw.replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `http://${normalized}`;
  }

  return normalized.replace('://localhost', '://127.0.0.1');
}

function normalizeTopicLabel(raw) {
  const text = String(raw || '').trim().toLowerCase();
  for (const [key, badge] of Object.entries(TOPIC_BADGES)) {
    if (text.includes(key) || text.includes(badge.toLowerCase())) {
      return badge;
    }
  }
  return '📚 General';
}

function detectTopicByKeyword(text) {
  const low = String(text || '').toLowerCase();
  for (const [topic, keys] of Object.entries(TOPIC_KEYWORDS)) {
    if (keys.some(key => low.includes(key))) return topic;
  }
  return '📚 General';
}

function explainApiError(rawMessage = '', endpoint = '', model = '') {
  const message = String(rawMessage || '').trim();
  const low = message.toLowerCase();

  if (low.includes('failed to fetch') || low.includes('networkerror')) {
    if (typeof window !== 'undefined' && window.location?.protocol === 'file:') {
      return 'Browser blocked API from file:// origin. Start a local server and open Lexi via http://127.0.0.1.';
    }
    return `Cannot reach Ollama at ${endpoint}. Start it with: ollama serve`;
  }
  if ((low.includes('not found') && low.includes('model')) || (low.includes('model "') && low.includes('not found'))) {
    return `Model "${model}" is missing. Run: ollama pull ${model}`;
  }
  if (low.includes('cors') || low.includes('origin') || low.includes('access-control-allow-origin')) {
    return 'Browser origin is blocked by Ollama. Serve Lexi from localhost and allow that origin.';
  }
  if (low.includes('http 404')) {
    return `Ollama endpoint looks wrong: ${endpoint}`;
  }
  if (low.includes('http 500')) {
    return 'Ollama server error. Restart Ollama and try again.';
  }

  return `Ollama error: ${message}`;
}

function isCorrect(reply) {
  const text = String(reply || '').toLowerCase();
  return ['correct', 'perfect', 'exactly', 'right', 'well done', 'great job', 'excellent', 'yes!', 'spot on', "that's it"].some(
    phrase => text.includes(phrase)
  );
}

function getSpeechErrorMessage(errorCode) {
  switch (errorCode) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission is blocked. Allow mic access for this site, then try again.';
    case 'audio-capture':
      return 'No microphone was detected. Connect a mic and try again.';
    case 'network':
      return 'Voice recognition hit a network issue. Check internet and retry.';
    case 'language-not-supported':
      return 'This speech recognition language is not supported in your browser.';
    case 'aborted':
      return '';
    case 'no-speech':
      return "I couldn't hear anything clearly. Try speaking a bit closer to the mic.";
    default:
      return errorCode ? `Voice input error: ${errorCode}` : '';
  }
}

function normalizeTranscriptText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function useLexi() {
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://127.0.0.1:11434');
  const [ollamaModel, setOllamaModel] = useState('qwen2.5:7b');
  const [ollamaConnected, setOllamaConnected] = useState(false);

  const [showModal, setShowModal] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [settingsFeedback, setSettingsFeedback] = useState('Save & Test');
  const [isConnecting, setIsConnecting] = useState(false);

  const [statusText, setStatusText] = useState('LOADING...');
  const [currentMode, setCurrentMode] = useState('study');
  const [topicBadge, setTopicBadge] = useState('📚 General');

  const [messages, setMessages] = useState([
    { id: crypto.randomUUID(), role: 'lexi', content: INITIAL_REPLY }
  ]);
  const [msgCount, setMsgCount] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const runtimeRef = useRef({ isLoading: false, isSpeaking: false, isListening: false, ollamaConnected: false });
  const recognitionRef = useRef(null);
  const pendingTranscriptRef = useRef('');
  const voiceHadResultRef = useRef(false);
  const lastVoiceErrorRef = useRef('');
  const manualVoiceStopRef = useRef(false);
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const confidenceSamplesRef = useRef([]);
  const activeRequestControllerRef = useRef(null);
  const conversationHistoryRef = useRef([]);

  useEffect(() => {
    runtimeRef.current = {
      isLoading,
      isSpeaking,
      isListening,
      ollamaConnected
    };
  }, [isLoading, isSpeaking, isListening, ollamaConnected]);

  const refreshReadyStatus = useCallback(() => {
    const runtime = runtimeRef.current;
    if (runtime.isListening) {
      setStatusText('LISTENING...');
      return;
    }
    if (runtime.isLoading) {
      setStatusText('THINKING...');
      return;
    }
    if (runtime.isSpeaking) {
      setStatusText('SPEAKING');
      return;
    }
    setStatusText(runtime.ollamaConnected ? 'LOCAL READY' : 'BUILT-IN MODE');
  }, []);

  useEffect(() => {
    refreshReadyStatus();
  }, [refreshReadyStatus]);

  const addMessage = useCallback((role, content, count = true) => {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role, content }]);
    if (count) setMsgCount(prev => prev + 1);
  }, []);

  const beginInterruptibleRequest = useCallback(() => {
    if (activeRequestControllerRef.current) {
      activeRequestControllerRef.current.abort();
    }
    const controller = new AbortController();
    activeRequestControllerRef.current = controller;
    return controller;
  }, []);

  const endInterruptibleRequest = useCallback(controller => {
    if (!controller || activeRequestControllerRef.current === controller) {
      activeRequestControllerRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    text => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      const clean = String(text || '')
        .replace(/[*_`#>]/g, '')
        .replace(/\n+/g, ' ')
        .trim();
      if (!clean) return;

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 0.75;
      utterance.pitch = 1.25;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const indiaVoiceHint = /(female|woman|girl|neerja|aditi|priya|swara|sangeeta|kalpana|india)/i;
      const voice =
        voices.find(item => item.lang === 'en-IN' && indiaVoiceHint.test(item.name)) ||
        voices.find(item => item.lang === 'en-IN') ||
        voices.find(item => indiaVoiceHint.test(item.name) && item.lang.startsWith('en')) ||
        voices.find(item => item.name.includes('Google') && item.lang.startsWith('en')) ||
        voices.find(item => item.lang.startsWith('en-US')) ||
        voices[0];

      if (voice) utterance.voice = voice;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setStatusText('SPEAKING');
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        refreshReadyStatus();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        refreshReadyStatus();
      };

      window.speechSynthesis.speak(utterance);
    },
    [refreshReadyStatus]
  );

  const testOllama = useCallback(async (rawEndpoint, rawModel) => {
    const endpoint = normalizeEndpoint(rawEndpoint);
    const model = String(rawModel || '').trim();

    if (!endpoint || !model) {
      return { ok: false, error: 'Enter both endpoint and model.' };
    }

    const endpointCandidates = [endpoint];
    if (endpoint.includes('localhost')) {
      endpointCandidates.push(endpoint.replace('localhost', '127.0.0.1'));
    }

    let lastError = 'Failed to fetch';

    for (const candidate of endpointCandidates) {
      try {
        const tagsRes = await fetch(`${candidate}/api/tags`);
        if (!tagsRes.ok) {
          lastError = `HTTP ${tagsRes.status}`;
          continue;
        }

        const tagsData = await tagsRes.json().catch(() => ({}));
        const availableModels = (tagsData.models || []).map(item => String(item.name || '').toLowerCase());
        const selected = model.toLowerCase();
        const hasModel = availableModels.some(name => name === selected || name.startsWith(`${selected}:`));

        if (!hasModel) {
          return { ok: false, error: `Model "${model}" not found. Run: ollama pull ${model}` };
        }

        const probeRes = await fetch(`${candidate}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt: 'Say OK',
            stream: false,
            options: { num_predict: 8 }
          })
        });

        if (!probeRes.ok) {
          const errBody = await probeRes.json().catch(() => ({}));
          lastError = errBody?.error?.message || `HTTP ${probeRes.status}`;
          continue;
        }

        return { ok: true, endpoint: candidate, model };
      } catch (error) {
        lastError = error?.message || 'Failed to fetch';
      }
    }

    return {
      ok: false,
      error: explainApiError(lastError, endpoint, model)
    };
  }, []);

  const getSystemPrompt = useCallback(
    () => `
You are Lexi.

Mode: ${currentMode}

Study -> explain concepts with simple examples.
Quiz -> ask short questions, wait for the student, then grade gently.
Chat -> casual and friendly conversation.

General rules:
- Keep responses concise unless the user asks for detail.
- Use simple language and supportive tone.
- Prefer practical examples over jargon.
- End with a short next-step or encouragement when useful.
`,
    [currentMode]
  );

  const askLLM = useCallback(
    async (message, options = {}) => {
      const {
        trackConversation = true,
        temperature = 0.8,
        maxOutputTokens = 350,
        systemPrompt = getSystemPrompt(),
        signal = null
      } = options;

      const text = String(message || '').trim();
      if (!text) return 'Please provide a prompt.';

      if (trackConversation) {
        conversationHistoryRef.current.push({ role: 'user', parts: [{ text }] });
      }

      const contents = trackConversation
        ? conversationHistoryRef.current
        : [{ role: 'user', parts: [{ text }] }];

      try {
        const check = await testOllama(ollamaEndpoint, ollamaModel);
        if (!check.ok) {
          throw new Error(check.error);
        }

        if (check.endpoint !== ollamaEndpoint) {
          setOllamaEndpoint(check.endpoint);
        }
        setOllamaConnected(true);

        const historyText = contents
          .map(entry => {
            const who = entry.role === 'model' ? 'Lexi' : 'User';
            const body = entry.parts?.[0]?.text || '';
            return `${who}: ${body}`;
          })
          .join('\n');

        const prompt = trackConversation
          ? `${systemPrompt}\n\nConversation:\n${historyText}\n\nLexi:`
          : `${systemPrompt}\n\n${text}`;

        const response = await fetch(`${check.endpoint}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({
            model: check.model,
            prompt,
            stream: false,
            options: {
              temperature,
              num_predict: maxOutputTokens
            }
          })
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody?.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const reply = String(data.response || '').trim();
        if (!reply) throw new Error('Empty response from Ollama.');

        if (trackConversation) {
          conversationHistoryRef.current.push({ role: 'model', parts: [{ text: reply }] });
        }

        setOllamaConnected(true);
        return reply;
      } catch (error) {
        if (trackConversation) {
          const history = conversationHistoryRef.current;
          const last = history[history.length - 1];
          if (last?.role === 'user' && last.parts?.[0]?.text === text) {
            history.pop();
          }
        }

        if (error?.name === 'AbortError') throw error;
        setOllamaConnected(false);
        return `❌ ${explainApiError(error?.message, ollamaEndpoint, ollamaModel)}`;
      }
    },
    [getSystemPrompt, ollamaEndpoint, ollamaModel, testOllama]
  );

  const detectTopicAI = useCallback(
    async (text, signal) => {
      if (!ollamaConnected) return detectTopicByKeyword(text);

      const prompt = `
Classify this question into ONE category:
Math, Science, History, Coding, Geography, Literature, Space

Question: ${text}

Reply with exactly one category word.
`;

      try {
        const result = await askLLM(prompt, {
          trackConversation: false,
          temperature: 0,
          maxOutputTokens: 10,
          systemPrompt: 'You are a strict classifier. Output only one category from the allowed list.',
          signal
        });
        return normalizeTopicLabel(result);
      } catch (error) {
        if (error?.name === 'AbortError') throw error;
        return detectTopicByKeyword(text);
      }
    },
    [askLLM, ollamaConnected]
  );

  const getBuiltInAnswer = useCallback(
    text => {
      const low = String(text || '').toLowerCase();

      const builtIns = [
        {
          topic: '🔬 Science',
          test: /\bphotosynthesis\b/,
          reply:
            'Photosynthesis is how plants make food. They use sunlight + water + carbon dioxide to make glucose (food) and oxygen. Think of leaves as tiny solar kitchens.'
        },
        {
          topic: '🔬 Science',
          test: /newton.{0,20}(third|3rd)|third law/,
          reply:
            "Newton's 3rd law says: every action has an equal and opposite reaction. If you push a wall, the wall pushes back with the same force."
        },
        {
          topic: '🔢 Mathematics',
          test: /quadratic|ax\^?2|x\^2\s*[+-]/,
          reply:
            'For quadratic equations, use: x = (-b +/- sqrt(b^2 - 4ac)) / (2a). First match your equation to ax^2 + bx + c = 0, then plug in values carefully.'
        },
        {
          topic: '📜 History',
          test: /world\s*war\s*2|\bww2\b|\bwwii\b/,
          reply:
            'World War II (1939-1945) was mainly between the Allies and Axis powers. Key turning points included Stalingrad, D-Day, and Midway.'
        },
        {
          topic: '💻 Coding',
          test: /\bpython\b.*\bloop\b|\bfor loop\b|\bwhile loop\b/,
          reply:
            'A loop repeats code. Use a for-loop when iterating over data, and a while-loop when repeating until a condition changes.'
        },
        {
          topic: '🚀 Space',
          test: /space|planet|galaxy|solar system|black hole/,
          reply: 'Space fact: A day on Venus is longer than a Venus year because Venus rotates very slowly.'
        },
        {
          topic: '📚 General',
          test: /study tip|how to study|focus|concentrat|pomodoro|revision/,
          reply:
            'Try this cycle: 25 minutes focus + 5 minutes break, active recall, then spaced repetition later. Short daily sessions beat cramming.'
        },
        {
          topic: '📚 General',
          test: /who are you|what are you|about lexi/,
          reply:
            "I'm Lexi, your study companion. I can explain hard topics simply, quiz you, create flashcards, and help you revise faster."
        }
      ];

      if (currentMode === 'quiz' && /quiz me|test me|start quiz|ask me questions/.test(low)) {
        return {
          topic: '📚 General',
          reply:
            'Quiz mode on.\n1) What is the powerhouse of the cell?\nA) Nucleus B) Mitochondria C) Ribosome D) Golgi\n\n2) Solve: 2x + 6 = 14\n\n3) Which year did World War II end?'
        };
      }

      for (const item of builtIns) {
        if (item.test.test(low)) return item;
      }

      if (/\b(hi|hello|hey|yo)\b/.test(low)) {
        return {
          topic: '📚 General',
          reply: `Hey! I'm Lexi (${getModeLabel(currentMode)} mode). Ask me a topic, upload notes, or say "quiz me" to start.`
        };
      }

      return null;
    },
    [currentMode]
  );

  const getConversationTranscript = useCallback(
    (maxChars = 12000) => {
      const joined = messages
        .filter(item => item.content)
        .map(item => `${item.role === 'user' ? 'User' : 'Lexi'}: ${item.content}`)
        .join('\n');
      return joined.slice(Math.max(0, joined.length - maxChars));
    },
    [messages]
  );

  const runToolPrompt = useCallback(
    async ({ status, loadingMessage, prompt, maxOutputTokens = 700 }) => {
      if (runtimeRef.current.isLoading) return;

      setIsLoading(true);
      setIsThinking(false);
      setStatusText(status);

      stopSpeaking();
      const requestController = beginInterruptibleRequest();

      addMessage('lexi', loadingMessage);

      try {
        const result = await askLLM(prompt, {
          trackConversation: false,
          temperature: 0.6,
          maxOutputTokens,
          signal: requestController.signal
        });
        addMessage('lexi', result);
        speak(result);
      } catch (error) {
        if (error?.name !== 'AbortError') {
          addMessage('lexi', `I ran into an issue while generating that: ${error?.message || 'Unknown error'}`);
        }
      } finally {
        setIsLoading(false);
        endInterruptibleRequest(requestController);
        refreshReadyStatus();
      }
    },
    [addMessage, askLLM, beginInterruptibleRequest, endInterruptibleRequest, refreshReadyStatus, speak, stopSpeaking]
  );

  const sendMessage = useCallback(
    async rawText => {
      if (runtimeRef.current.isLoading) return;

      const text = String(rawText ?? inputValue).trim();
      if (!text) return;

      setInputValue('');
      setIsLoading(true);
      setIsThinking(true);
      setStatusText('THINKING...');
      setTopicBadge('🧠 Detecting...');

      stopSpeaking();
      const requestController = beginInterruptibleRequest();

      addMessage('user', text);

      try {
        const builtIn = getBuiltInAnswer(text);
        let topic = '📚 General';
        let reply = '';

        if (builtIn) {
          topic = builtIn.topic || detectTopicByKeyword(text);
          reply = builtIn.reply;
          setStatusText('QUICK REPLY');
        } else {
          [topic, reply] = await Promise.all([
            detectTopicAI(text, requestController.signal),
            askLLM(text, { signal: requestController.signal })
          ]);
        }

        setTopicBadge(topic);
        setIsThinking(false);
        addMessage('lexi', reply);
        speak(reply);
      } catch (error) {
        if (error?.name !== 'AbortError') {
          setIsThinking(false);
          addMessage('lexi', `Something went wrong while sending that message: ${error?.message || 'Unknown error'}`);
        }
      } finally {
        setIsLoading(false);
        setIsThinking(false);
        endInterruptibleRequest(requestController);
        refreshReadyStatus();
      }
    },
    [
      addMessage,
      askLLM,
      beginInterruptibleRequest,
      detectTopicAI,
      endInterruptibleRequest,
      getBuiltInAnswer,
      inputValue,
      refreshReadyStatus,
      speak,
      stopSpeaking
    ]
  );

  const sendMessageRef = useRef(sendMessage);
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const generateFlashcards = useCallback(async () => {
    const transcript = getConversationTranscript();
    if (!transcript.trim()) {
      addMessage('lexi', 'Send at least one message first, then I can create flashcards.');
      return;
    }

    const prompt = `
Create 5 flashcards from this study session.

Format:
Q:
A:

Session:
${transcript}
`;

    await runToolPrompt({
      status: 'BUILDING CARDS...',
      loadingMessage: 'Creating flashcards from our session...',
      prompt
    });
  }, [addMessage, getConversationTranscript, runToolPrompt]);

  const generateQuiz = useCallback(async () => {
    const transcript = getConversationTranscript();
    if (!transcript.trim()) {
      addMessage('lexi', 'Start a short conversation first and I will build a quiz from it.');
      return;
    }

    const prompt = `
Create a 5 question multiple choice quiz based on our conversation.
Include the correct answer after each question.

Conversation:
${transcript}
`;

    await runToolPrompt({
      status: 'GENERATING QUIZ...',
      loadingMessage: 'Generating a 5-question quiz...',
      prompt
    });
  }, [addMessage, getConversationTranscript, runToolPrompt]);

  const handleFileUpload = useCallback(
    async file => {
      if (!file || runtimeRef.current.isLoading) return;

      setIsLoading(true);
      setIsThinking(false);
      setStatusText('ANALYZING NOTES...');
      stopSpeaking();

      const requestController = beginInterruptibleRequest();

      try {
        const text = (await extractTextFromUpload(file)).trim();
        if (!text) throw new Error('No readable text found in file.');

        addMessage('user', `Uploaded file: ${file.name}`);
        addMessage('lexi', 'Analyzing your notes...');

        const clipped = text.slice(0, 8000);
        const topic = await detectTopicAI(clipped, requestController.signal);
        setTopicBadge(topic);

        const prompt = `
A student uploaded notes titled: ${file.name}

Mode: ${currentMode}

Generate:
1) A simple summary
2) 5 flashcards (Q/A format)
3) A 5-question multiple choice quiz with answer key
4) Key formulas or key facts

Keep the response clear, concise, and student-friendly.

Notes:
${clipped}
`;

        const reply = await askLLM(prompt, {
          trackConversation: false,
          temperature: 0.65,
          maxOutputTokens: 950,
          signal: requestController.signal
        });

        addMessage('lexi', reply);
        speak(reply);
      } catch (error) {
        if (error?.name !== 'AbortError') {
          addMessage(
            'lexi',
            `I couldn't read this file cleanly. Try exporting it as .txt first. (${error?.message || 'Unknown error'})`
          );
        }
      } finally {
        setIsLoading(false);
        endInterruptibleRequest(requestController);
        refreshReadyStatus();
      }
    },
    [
      addMessage,
      askLLM,
      beginInterruptibleRequest,
      currentMode,
      detectTopicAI,
      endInterruptibleRequest,
      refreshReadyStatus,
      speak,
      stopSpeaking
    ]
  );

  const connectOllama = useCallback(
    async (endpointValue, modelValue) => {
      const endpoint = normalizeEndpoint(endpointValue) || ollamaEndpoint;
      const model = String(modelValue || '').trim() || ollamaModel;

      if (!endpoint || !model) {
        setConnectError('Enter both endpoint and model.');
        return { ok: false, error: 'Enter both endpoint and model.' };
      }

      setIsConnecting(true);
      setConnectError('');
      setStatusText('CONNECTING OLLAMA...');

      const check = await testOllama(endpoint, model);
      setIsConnecting(false);

      if (!check.ok) {
        setOllamaConnected(false);
        setConnectError(check.error);
        refreshReadyStatus();
        return check;
      }

      setOllamaEndpoint(check.endpoint);
      setOllamaModel(model);
      setOllamaConnected(true);
      setShowModal(false);
      setConnectError('');
      addMessage('lexi', `Connected to Ollama at ${check.endpoint} using ${model}.`);
      refreshReadyStatus();
      return { ok: true };
    },
    [addMessage, ollamaEndpoint, ollamaModel, refreshReadyStatus, testOllama]
  );

  const skipConnection = useCallback(() => {
    setShowModal(false);
    setOllamaConnected(false);
    setConnectError('');
    refreshReadyStatus();
  }, [refreshReadyStatus]);

  const saveSettings = useCallback(
    async (endpointValue, modelValue) => {
      const endpoint = normalizeEndpoint(endpointValue) || ollamaEndpoint;
      const model = String(modelValue || '').trim() || ollamaModel;

      if (!endpoint || !model) {
        setSettingsFeedback('Invalid format');
        window.setTimeout(() => setSettingsFeedback('Save & Test'), 2000);
        return { ok: false };
      }

      setSettingsFeedback('Testing...');
      const check = await testOllama(endpoint, model);

      if (check.ok) {
        setOllamaEndpoint(check.endpoint);
        setOllamaModel(model);
        setOllamaConnected(true);
        setSettingsFeedback(`✓ ${model}`);
        window.setTimeout(() => {
          setSettingsFeedback('Save & Test');
          setShowSettings(false);
        }, 1800);
      } else {
        setOllamaConnected(false);
        setSettingsFeedback('✗ Not connected');
        addMessage('lexi', `Ollama check failed: ${check.error}`);
        window.setTimeout(() => {
          setSettingsFeedback('Save & Test');
        }, 2200);
      }

      refreshReadyStatus();
      return check;
    },
    [addMessage, ollamaEndpoint, ollamaModel, refreshReadyStatus, testOllama]
  );

  const interrupt = useCallback(() => {
    const controller = activeRequestControllerRef.current;
    if (!controller) return;

    controller.abort();
    activeRequestControllerRef.current = null;
    stopSpeaking();

    setIsLoading(false);
    setIsThinking(false);
    addMessage('lexi', 'No problem, I paused there. Continue whenever you are ready.');
    refreshReadyStatus();
  }, [addMessage, refreshReadyStatus, stopSpeaking]);

  const toggleVoice = useCallback(async () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      addMessage('lexi', 'Voice input is not supported in this browser.');
      return;
    }

    if (runtimeRef.current.isListening) {
      manualVoiceStopRef.current = true;
      recognition.stop();
      return;
    }

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      addMessage('lexi', 'Voice input requires a secure origin. Open Lexi on https:// or localhost/127.0.0.1.');
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        const code = error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError' ? 'not-allowed' : 'audio-capture';
        const msg = getSpeechErrorMessage(code) || 'Microphone access failed.';
        addMessage('lexi', msg);
        refreshReadyStatus();
        return;
      }
    }

    stopSpeaking();
    try {
      manualVoiceStopRef.current = false;
      pendingTranscriptRef.current = '';
      voiceHadResultRef.current = false;
      lastVoiceErrorRef.current = '';
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
      confidenceSamplesRef.current = [];
      recognition.start();
    } catch (error) {
      const msg = getSpeechErrorMessage(error?.name) || `Microphone could not start: ${error?.message || 'Unknown error'}`;
      addMessage('lexi', msg);
      refreshReadyStatus();
    }
  }, [addMessage, refreshReadyStatus, stopSpeaking]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceSupported(false);
      return undefined;
    }

    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = navigator.language && navigator.language.startsWith('en') ? navigator.language : 'en-US';
    recognitionRef.current = recognition;
    setVoiceSupported(true);

    const pickBestAlternative = result => {
      let bestAlt = result?.[0] || null;
      if (!bestAlt) return { transcript: '', confidence: null };

      for (let i = 1; i < result.length; i += 1) {
        const candidate = result[i];
        const candidateConfidence = Number(candidate?.confidence || 0);
        const bestConfidence = Number(bestAlt?.confidence || 0);
        if (candidateConfidence > bestConfidence) {
          bestAlt = candidate;
        }
      }

      const transcript = normalizeTranscriptText(bestAlt?.transcript || '');
      const confidence = Number.isFinite(bestAlt?.confidence) ? Number(bestAlt.confidence) : null;
      return { transcript, confidence };
    };

    recognition.onstart = () => {
      pendingTranscriptRef.current = '';
      voiceHadResultRef.current = false;
      lastVoiceErrorRef.current = '';
      manualVoiceStopRef.current = false;
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
      confidenceSamplesRef.current = [];
      setIsListening(true);
      setStatusText('LISTENING...');
    };

    recognition.onresult = event => {
      let finalChunk = '';
      let interimChunk = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const { transcript, confidence } = pickBestAlternative(event.results[i]);
        if (!transcript) continue;

        if (event.results[i].isFinal) {
          finalChunk += `${finalChunk ? ' ' : ''}${transcript}`;
          if (typeof confidence === 'number' && confidence > 0) {
            confidenceSamplesRef.current.push(confidence);
          }
        } else {
          interimChunk += `${interimChunk ? ' ' : ''}${transcript}`;
        }
      }

      if (finalChunk) {
        finalTranscriptRef.current = normalizeTranscriptText(`${finalTranscriptRef.current} ${finalChunk}`);
      }
      interimTranscriptRef.current = normalizeTranscriptText(interimChunk);

      const combined = normalizeTranscriptText(`${finalTranscriptRef.current} ${interimTranscriptRef.current}`);
      if (!combined) return;

      pendingTranscriptRef.current = combined;
      voiceHadResultRef.current = true;
      setInputValue(combined);
    };

    recognition.onerror = event => {
      lastVoiceErrorRef.current = event?.error || 'unknown';
    };

    recognition.onend = () => {
      setIsListening(false);

      const transcript = normalizeTranscriptText(finalTranscriptRef.current || pendingTranscriptRef.current);
      const hadResult = voiceHadResultRef.current;
      const voiceError = lastVoiceErrorRef.current;
      const wasManualStop = manualVoiceStopRef.current;
      const confidenceValues = confidenceSamplesRef.current;
      const avgConfidence = confidenceValues.length
        ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
        : null;

      if (transcript) {
        setInputValue(transcript);
        if (avgConfidence !== null && avgConfidence < 0.58) {
          addMessage('lexi', `I heard: "${transcript}". If this looks right, tap Send. If not, try again a bit slower.`);
        } else if (!runtimeRef.current.isLoading) {
          sendMessageRef.current(transcript);
        }
      } else if (!wasManualStop && voiceError) {
        const msg = getSpeechErrorMessage(voiceError);
        if (msg) addMessage('lexi', msg);
      } else if (!wasManualStop && !hadResult && !voiceError) {
        addMessage('lexi', 'I did not catch that. Please try again.');
      }

      pendingTranscriptRef.current = '';
      voiceHadResultRef.current = false;
      lastVoiceErrorRef.current = '';
      manualVoiceStopRef.current = false;
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
      confidenceSamplesRef.current = [];

      refreshReadyStatus();
    };

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // No-op during cleanup.
      }
      recognitionRef.current = null;
    };
  }, [addMessage, refreshReadyStatus]);

  useEffect(() => {
    const onWindowClick = () => {
      setShowSettings(false);
    };

    window.addEventListener('click', onWindowClick);
    return () => {
      window.removeEventListener('click', onWindowClick);
    };
  }, []);

  const onModeChange = useCallback(
    mode => {
      setCurrentMode(mode);
      addMessage('lexi', `Mode switched to ${getModeLabel(mode)}.`);
    },
    [addMessage]
  );

  const sendQuickPrompt = useCallback(
    prompt => {
      setInputValue(prompt);
      sendMessage(prompt);
    },
    [sendMessage]
  );

  const canInterrupt = Boolean(activeRequestControllerRef.current);

  const ui = useMemo(
    () => ({
      quickPrompts: QUICK_PROMPTS,
      modeOptions: [
        { value: 'study', label: '📚 Study' },
        { value: 'quiz', label: '🎯 Quiz' },
        { value: 'chat', label: '💬 Chat' }
      ]
    }),
    []
  );

  return {
    ui,
    ollamaEndpoint,
    ollamaModel,
    ollamaConnected,
    showModal,
    showSettings,
    connectError,
    settingsFeedback,
    isConnecting,
    statusText,
    currentMode,
    topicBadge,
    messages,
    msgCount,
    inputValue,
    isLoading,
    isThinking,
    isSpeaking,
    isListening,
    voiceSupported,
    canInterrupt,
    setInputValue,
    setShowSettings,
    connectOllama,
    saveSettings,
    skipConnection,
    onModeChange,
    sendMessage,
    sendQuickPrompt,
    generateFlashcards,
    generateQuiz,
    handleFileUpload,
    toggleVoice,
    interrupt,
    isCorrect
  };
}

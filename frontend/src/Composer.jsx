function QuickPromptLabel({ prompt }) {
  if (prompt.includes('photosynthesis')) return 'Photosynthesis';
  if (prompt.includes('World War 2')) return 'WW2 Quiz';
  if (prompt.includes('Newton')) return 'Physics';
  if (prompt.includes('quadratic')) return 'Maths';
  if (prompt.includes('space')) return 'Space';
  return prompt;
}

export default function Composer({
  quickPrompts,
  inputValue,
  isLoading,
  isListening,
  voiceSupported,
  canInterrupt,
  setInputValue,
  onQuickPrompt,
  onUpload,
  onFlashcards,
  onQuiz,
  onToggleVoice,
  onInterrupt,
  onSend
}) {
  return (
    <div className="input-area">
      <div className="quick-prompts">
        {quickPrompts.map(prompt => (
          <button key={prompt} className="quick-btn" type="button" onClick={() => onQuickPrompt(prompt)}>
            <QuickPromptLabel prompt={prompt} />
          </button>
        ))}
      </div>

      <input
        className="file-upload"
        type="file"
        accept=".pdf,.txt,.docx"
        onChange={event => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
          event.target.value = '';
        }}
      />

      <div className="study-tools">
        <button className="tool-btn" type="button" onClick={onFlashcards}>
          Flashcards
        </button>
        <button className="tool-btn" type="button" onClick={onQuiz}>
          Auto Quiz
        </button>
      </div>

      <div className="input-row">
        <button
          className={`voice-btn ${isListening ? 'listening' : ''} ${!voiceSupported ? 'disabled' : ''}`}
          type="button"
          title={voiceSupported ? 'Voice input' : 'Voice input unavailable'}
          onClick={onToggleVoice}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>

        <button className="interrupt-btn" type="button" disabled={!canInterrupt} onClick={onInterrupt}>
          Stop
        </button>

        <textarea
          className="chat-input"
          rows="1"
          placeholder="Ask Lexi anything..."
          value={inputValue}
          onChange={event => setInputValue(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
        />

        <button className="send-btn" type="button" disabled={isLoading} onClick={onSend}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

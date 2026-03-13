import { useEffect, useRef } from 'react';

export default function ChatPanel({ topicBadge, msgCount, messages, isThinking }) {
  const messagesRef = useRef(null);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, isThinking]);

  return (
    <>
      <div className="chat-top">
        <div>
          <div className="chat-title">CONVERSATION</div>
          <div className="topic-badge">{topicBadge}</div>
        </div>
        <div className="msg-count">{msgCount} msgs</div>
      </div>

      <div className="messages" ref={messagesRef}>
        {messages.map(message => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="msg-label">{message.role === 'user' ? 'YOU' : 'LEXI'}</div>
            <div className="msg-bubble">{message.content}</div>
          </div>
        ))}

        {isThinking ? (
          <div className="message lexi">
            <div className="msg-label">LEXI</div>
            <div className="thinking-bubble">
              <span />
              <span />
              <span />
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

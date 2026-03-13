import { useEffect, useState } from 'react';

export default function ApiKeyModal({
  show,
  endpoint,
  model,
  isConnecting,
  error,
  onConnect,
  onSkip
}) {
  const [endpointInput, setEndpointInput] = useState(endpoint);
  const [modelInput, setModelInput] = useState(model);

  useEffect(() => {
    setEndpointInput(endpoint);
  }, [endpoint]);

  useEffect(() => {
    setModelInput(model);
  }, [model]);

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Set up Lexi</h2>
        <p>
          Lexi runs locally with <strong>Ollama</strong> for offline help.
          <br />
          <br />
          1) Start Ollama: <code>ollama serve</code>
          <br />
          2) Pull a model: <code>ollama pull qwen2.5:7b</code>
          <br />
          3) Set endpoint and model below
        </p>

        <input
          className="modal-input"
          type="text"
          placeholder="http://127.0.0.1:11434"
          autoComplete="off"
          value={endpointInput}
          onChange={event => setEndpointInput(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !isConnecting) onConnect(endpointInput, modelInput);
          }}
        />

        <input
          className="modal-input"
          type="text"
          placeholder="qwen2.5:7b"
          autoComplete="off"
          value={modelInput}
          onChange={event => setModelInput(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !isConnecting) onConnect(endpointInput, modelInput);
          }}
        />

        <div className={`modal-error ${error ? 'show' : ''}`}>{error || 'Connection error'}</div>

        <button
          className="modal-btn"
          type="button"
          disabled={isConnecting}
          onClick={() => onConnect(endpointInput, modelInput)}
        >
          {isConnecting ? 'Connecting...' : 'Connect Ollama'}
        </button>

        <button className="modal-skip" type="button" onClick={onSkip}>
          Skip - built-in answers only
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';

export default function SettingsPanel({ show, endpoint, model, feedback, onSave }) {
  const [endpointInput, setEndpointInput] = useState(endpoint);
  const [modelInput, setModelInput] = useState(model);

  useEffect(() => {
    setEndpointInput(endpoint);
  }, [endpoint]);

  useEffect(() => {
    setModelInput(model);
  }, [model]);

  return (
    <div
      className={`settings-panel ${show ? 'show' : ''}`}
      onClick={event => {
        event.stopPropagation();
      }}
    >
      <div className="settings-title">OLLAMA SETTINGS</div>

      <input
        className="settings-input"
        type="text"
        placeholder="http://127.0.0.1:11434"
        value={endpointInput}
        onChange={event => setEndpointInput(event.target.value)}
      />

      <input
        className="settings-input"
        type="text"
        placeholder="qwen2.5:7b"
        value={modelInput}
        onChange={event => setModelInput(event.target.value)}
      />

      <button className="settings-save" type="button" onClick={() => onSave(endpointInput, modelInput)}>
        {feedback}
      </button>
    </div>
  );
}

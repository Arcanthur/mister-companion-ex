/**
 * ApiKeyModal.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: ApiKeyModal
 */

import React, { useState } from "react";

export function ApiKeyModal({ onSave, onSkip }) {
  const [key, setKey] = useState("");

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-title-row">
          <div className="app-icon">LD</div>
          <div>
            <div className="modal-title">TMDB API key</div>
            <div className="muted">For poster and metadata lookup</div>
          </div>
        </div>
        <p className="modal-copy">
          Enter your free <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">TMDB API v3 key</a> to fetch movie posters and metadata.
          Your imported library and fetched metadata are saved automatically on this PC.
        </p>
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste your API key here..." className="key-input" />
        <div className="button-row">
          <button className="primary-button" onClick={() => onSave(key.trim())} disabled={!key.trim()}>Save key</button>
          <button className="secondary-button" onClick={onSkip}>Skip for now</button>
        </div>
      </div>
    </div>
  );
}

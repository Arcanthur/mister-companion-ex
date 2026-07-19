/**
 * AddCoverModal.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: AddCoverModal
 */

import React, { useState } from "react";

export function AddCoverModal({ disc, onClose, onSaveUrl, onChooseFile }) {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!url.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      await onSaveUrl(url.trim());
    } catch (e) {
      setError(e.message || "Could not save this cover URL.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal add-cover-modal">
        <div className="modal-title-row">
          <div className="app-icon">LD</div>
          <div>
            <div className="modal-title">Add LDDB cover</div>
            <div className="muted">{disc.title}</div>
          </div>
        </div>
        <label className="tmdb-key-field">
          <span>Cover image URL</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://...jpg" disabled={saving} />
        </label>
        <p className="settings-note">Images downloaded from LDDB public URLs may include an LDDB watermark. Choose a local file when you want to preserve clean artwork.</p>
        {error && <div className="error-box modal-error">{error}</div>}
        <div className="button-row add-cover-actions">
          <button className="primary-button" disabled={!url.trim() || saving} onClick={save}>{saving ? "Downloading..." : "Save URL"}</button>
          <button className="secondary-button" disabled={saving} onClick={onChooseFile}>Choose local file</button>
          <button className="secondary-button" disabled={saving} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

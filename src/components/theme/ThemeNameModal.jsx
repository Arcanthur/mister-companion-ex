/**
 * ThemeNameModal.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: ThemeNameModal
 */

import { useState } from "react";
import { WindowTitlebar } from "../common/WindowTitlebar";

export function ThemeNameModal({ onSave, onClose, placeholder = "My Theme" }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      await onSave(name.trim());
      onClose();
    } catch (error) {
      setSaveError(error.message || "Could not save the theme.");
      setSaving(false);
    }
  };
  return (
    <div className="modal-backdrop theme-name-backdrop">
      <form className="modal theme-name-modal" onSubmit={submit}>
        <WindowTitlebar title="Save current theme" onClose={onClose} />
        <div className="modal-title">Save current theme</div>
        <label className="edit-field">
          <span>Theme name</span>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder={placeholder} />
        </label>
        {saveError && <div className="error-box modal-error">{saveError}</div>}
        <div className="button-row settings-actions">
          <button type="submit" className="primary-button" disabled={!name.trim() || saving}>{saving ? "Saving..." : "Save theme"}</button>
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

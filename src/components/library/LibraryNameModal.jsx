/**
 * LibraryNameModal.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: LibraryNameModal
 */

import { useState } from "react";

export function LibraryNameModal({ onSave, onClose }) {
  const [name, setName] = useState("");
  const cleanName = name.trim();
  return (
    <div className="modal-backdrop library-name-backdrop">
      <form className="modal library-name-modal" onSubmit={(event) => {
        event.preventDefault();
        if (cleanName) onSave(cleanName);
      }}>
        <div className="modal-title">New Library</div>
        <p className="modal-copy">Choose the name shown in the library sidebar.</p>
        <input autoFocus className="key-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Library name" />
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-button" disabled={!cleanName}>Create Library</button>
        </div>
      </form>
    </div>
  );
}

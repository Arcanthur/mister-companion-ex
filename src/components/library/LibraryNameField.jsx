/**
 * LibraryNameField.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: LibraryNameField
 */

import React, { useState, useEffect } from "react";

export function LibraryNameField({ library, onRename }) {
  const [draft, setDraft] = useState(library.name);
  useEffect(() => setDraft(library.name), [library.name]);
  const commit = () => {
    const cleanName = draft.trim();
    if (!cleanName) {
      setDraft(library.name);
      return;
    }
    if (cleanName !== library.name) onRename(cleanName);
  };
  return (
    <input
      className="library-name-input"
      aria-label={`Name for ${library.name}`}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(library.name);
          event.currentTarget.blur();
        }
      }}
    />
  );
}

/**
 * CollectionsModal.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: CollectionsModal
 */

import { useState, useRef } from "react";
import { SettingsSectionHeading } from "../common/FormFields";
import { ThemedScrollbar } from "../common/ThemedScrollbar";

export function CollectionsModal({ collections, discs, onCreate, onRename, onDelete, onClose }) {
  const [name, setName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const collectionsScrollRef = useRef(null);
  const create = () => {
    const value = name.trim();
    if (!value) return;
    onCreate(value);
    setName("");
  };

  return (
    <div className="modal-backdrop collections-modal-backdrop">
      <div className="modal collections-modal settings-style-collections-modal">
        <header className="settings-page-header collections-page-header">
          <div className="edit-page-heading">
            <h2>Collections</h2>
            <span>{collections.length} {collections.length === 1 ? "custom shelf" : "custom shelves"}</span>
          </div>
          <button type="button" className="settings-close-button" aria-label="Close collections" title="Close collections" onClick={onClose}>
            <span className="window-control-glyph window-close-glyph" aria-hidden="true" />
          </button>
        </header>
        <section className="collections-content">
          <div ref={collectionsScrollRef} className="collections-scroll-area">
            <div className="collections-settings-panel">
              <section className="collections-section">
                <SettingsSectionHeading title="Create collection" description="Add a custom shelf for organizing discs across the library." />
                <form className="collection-create-row collection-preference-group" onSubmit={(event) => { event.preventDefault(); create(); }}>
                  <input className="key-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="New collection name" />
                  <button className="primary-small" disabled={!name.trim()}>Add</button>
                </form>
              </section>
              <section className="collections-section">
                <SettingsSectionHeading title="Manage collections" description="Rename shelves or remove them without deleting their discs." />
                <div className="collection-manager-list collection-preference-group">
                  {collections.length === 0 && <div className="collection-empty">No custom collections yet.</div>}
                  {collections.map((collection) => {
                    const count = discs.filter((disc) => disc.collectionIds?.includes(collection.id)).length;
                    return (
                      <div className="collection-manager-row" key={collection.id}>
                        <div><strong>{collection.name}</strong><span>{count} {count === 1 ? "disc" : "discs"}</span></div>
                        <div className="collection-row-actions">
                          <button className="secondary-button" onClick={() => {
                            const nextName = window.prompt("Rename collection", collection.name);
                            if (nextName?.trim()) onRename(collection.id, nextName.trim());
                          }}>Rename</button>
                          <button className="secondary-button danger-action" onClick={() => setDeleteTarget(collection)}>Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
          <ThemedScrollbar scrollRef={collectionsScrollRef} className="collections-themed-scrollbar" />
        </section>
        {deleteTarget ? (
          <div className="modal-backdrop mister-confirm-backdrop nested-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteTarget(null); }}>
            <div className="modal mister-confirm-modal tone-danger" role="dialog" aria-modal="true">
              <header className="mister-confirm-header">
                <div><span className="mister-confirm-eyebrow">Confirmation</span><h2>Delete collection</h2></div>
                <button className="settings-close-button mister-confirm-close" type="button" aria-label="Cancel" onClick={() => setDeleteTarget(null)}><span className="window-control-glyph window-close-glyph" /></button>
              </header>
              <p className="mister-confirm-message">Delete {deleteTarget.name}? Discs will remain in the library.</p>
              <footer className="mister-confirm-actions">
                <button className="secondary-button" type="button" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="danger-button" type="button" onClick={() => { onDelete(deleteTarget.id); setDeleteTarget(null); }}>Delete</button>
              </footer>
            </div>
          </div>
        ) : null}
        <footer className="collections-action-footer">
          <button className="primary-button" onClick={onClose}>Done</button>
        </footer>
      </div>
    </div>
  );
}

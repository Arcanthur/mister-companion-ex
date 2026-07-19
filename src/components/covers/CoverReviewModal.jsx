/**
 * CoverReviewModal.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: CoverReviewModal
 */

import React from "react";

export function CoverReviewModal({ disc, index, total, onClose, onOpenLddb, onAddCover, onPasteCover, onUseNewestScan, onSkip, onPrevious }) {
  return (
    <div className="modal-backdrop">
      <div className="modal cover-review-modal">
        <div className="modal-title-row">
          <div className="app-icon">LD</div>
          <div>
            <div className="modal-title">Cover review queue</div>
            <div className="muted">{index + 1} of {total}</div>
          </div>
        </div>
        <div className="cover-review-title">{disc.title}</div>
        <div className="cover-review-meta">{disc.year}{disc.reference ? " - " + disc.reference : ""}</div>
        <div className="settings-action-grid cover-review-actions">
          <button className="primary-button" onClick={() => onOpenLddb(disc)}>Search LDDB</button>
          <button className="secondary-button" onClick={() => onPasteCover(disc)}>Paste copied image</button>
          <button className="secondary-button" onClick={() => onUseNewestScan(disc)}>Use newest scan image</button>
          <button className="secondary-button" onClick={() => onAddCover(disc)}>Add cover</button>
          <button className="secondary-button" onClick={onPrevious} disabled={index === 0}>Previous</button>
          <button className="secondary-button" onClick={onSkip}>Skip</button>
        </div>
        <div className="button-row settings-actions">
          <button className="secondary-button" onClick={onClose}>Close queue</button>
        </div>
      </div>
    </div>
  );
}

/**
 * LibraryHealthContent.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: LibraryHealthContent
 */

import { useState } from "react";
import { SettingsSectionHeading } from "../common/FormFields";
import { selectedCover } from "../../utils/discUtils";

export function LibraryHealthContent({ items, coverSource, metadataBusy, metadataProgress, onEdit, onRemove, onFetchMissing, onRefreshAll }) {
  const [filter, setFilter] = useState("all");
  const categories = [
    ["all", "All"],
    ["duplicate", "Duplicates"],
    ["cover", "Missing art"],
    ["metadata", "Missing metadata"],
    ["fields", "Incomplete"],
  ];
  const visible = filter === "all" ? items : items.filter((item) => item.issues.some((issue) => issue.id === filter));
  const countFor = (id) => id === "all" ? items.length : items.filter((item) => item.issues.some((issue) => issue.id === id)).length;

  return (
    <div className="settings-health-content">
        <SettingsSectionHeading title="Library status" description="Review artwork, metadata, required fields, and possible duplicates." />
        <div className="health-summary">
          <div className="health-status-mark">{items.length ? items.length : "OK"}</div>
          <div>
            <strong>{items.length ? `${items.length} ${items.length === 1 ? "item needs" : "items need"} attention` : "Everything looks complete"}</strong>
            <span>{items.length ? "Use the filters below to work through each issue type." : "No library maintenance is currently required."}</span>
          </div>
        </div>
        <SettingsSectionHeading title="Issue filter" description="Narrow the results or run a bulk metadata update." />
        <div className="health-control-panel">
          <div className="health-tabs" role="tablist" aria-label="Health issue type">
            {categories.map(([id, label]) => <button key={id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>{label}<span>{countFor(id)}</span></button>)}
          </div>
          <div className="health-bulk-actions">
            <button className="secondary-button" disabled={metadataBusy} onClick={onFetchMissing}>{metadataBusy ? "Working..." : "Fetch missing metadata"}</button>
            <button className="secondary-button" disabled={metadataBusy} onClick={onRefreshAll}>Refresh all TMDB metadata</button>
          </div>
          {metadataProgress && <div className="health-progress">{metadataProgress}</div>}
        </div>
        <SettingsSectionHeading title="Results" description={`${visible.length} ${visible.length === 1 ? "item" : "items"} in this view.`} />
        <div className="health-list">
          {visible.length === 0 && <div className="health-empty">No issues in this category.</div>}
          {visible.map(({ disc, issues }, index) => {
            const art = selectedCover(disc, coverSource);
            return (
              <div className="health-row" key={[disc.id, disc.reference, disc.rawTitle, index].join("|")}>
                <div className="health-thumb">{art ? <img src={art} alt="" /> : <span>LD</span>}</div>
                <div className="health-copy"><strong>{disc.title}</strong><span>{disc.year}{disc.reference ? " · " + disc.reference : ""}</span><div className="health-issues">{issues.map((issue) => <span key={issue.id}>{issue.label}</span>)}</div></div>
                <div className="health-actions">
                  <button className="secondary-button" onClick={() => onEdit(disc)}>Edit</button>
                  {issues.some((issue) => issue.id === "duplicate") && <button className="secondary-button danger-action" onClick={() => onRemove(disc)}>Remove</button>}
                </div>
              </div>
            );
          })}
        </div>
    </div>
  );
}

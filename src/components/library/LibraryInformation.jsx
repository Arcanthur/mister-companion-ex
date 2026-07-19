/**
 * LibraryInformation.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: LibraryInformation
 */

import React from "react";

export function LibraryInformation({ info }) {
  const total = info?.totalDiscs || 0;
  const statistics = [
    ["Discs", total],
    ["Artwork", `${info?.artworkCount || 0} / ${total}`],
    ["TMDB metadata", `${info?.metadataCount || 0} / ${total}`],
    ["Local covers", info?.localCoverCount || 0],
    ["TMDB posters", info?.tmdbPosterCount || 0],
    ["Collections", info?.collectionCount || 0],
  ];
  const details = [
    ["Year range", info?.yearRange || "Unknown"],
    ["Genres", info?.genreCount || 0],
    ["Last saved", info?.savedLabel || "Not saved yet"],
    ["Storage", info?.storageLabel || "Browser preview data"],
    ["Library file", info?.libraryFile || "Browser local storage"],
    ["File size", info?.fileSizeLabel || "Not available"],
  ];
  return (
    <section className="library-information" aria-label="Library information">
      <div className="library-information-heading">
        <h4>Library information</h4>
        <span>{total ? "Saved locally" : "No library loaded"}</span>
      </div>
      <div className="library-stat-grid">
        {statistics.map(([label, value]) => (
          <div className="library-stat" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <dl className="library-detail-list">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd title={String(value)}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

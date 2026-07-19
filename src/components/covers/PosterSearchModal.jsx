/**
 * PosterSearchModal.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: PosterSearchModal
 */

import React, { useState, useEffect, useCallback } from "react";
import { fetchTMDBDetails, searchTMDB } from "../../api/tmdb";

export function PosterSearchModal({ disc, apiKey, onClose, onChoose }) {
  const [query, setQuery] = useState(disc.title);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const runSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    try {
      const found = await searchTMDB(query.trim(), apiKey);
      setResults(await Promise.all(found.map((item) => fetchTMDBDetails(item, apiKey))));
      if (found.length === 0) setError("No TMDB matches found.");
    } catch (e) {
      setError(e.message || "Search failed");
    } finally {
      setSearching(false);
    }
  }, [apiKey, query]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  return (
    <div className="modal-backdrop">
      <div className="modal poster-search-modal">
        <div className="modal-title-row">
          <div className="app-icon">LD</div>
          <div>
            <div className="modal-title">Find poster</div>
            <div className="muted">{disc.title}{disc.year ? " - " + disc.year : ""}</div>
          </div>
        </div>
        <form className="poster-search-form" onSubmit={(e) => { e.preventDefault(); runSearch(); }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="key-input poster-search-input" placeholder="Search TMDB..." />
          <button className="primary-button poster-search-button" disabled={searching || !query.trim()}>{searching ? "Searching..." : "Search"}</button>
        </form>
        {error && <div className="error-box modal-error">{error}</div>}
        <div className="poster-result-grid">
          {results.map((result) => (
            <button className="poster-result" key={result.mediaType + result.tmdbId} onClick={() => onChoose(result)} disabled={!result.poster}>
              <div className="poster-result-image">
                {result.poster ? <img src={result.poster} alt={result.tmdbTitle || "Poster"} /> : <span>No poster</span>}
              </div>
              <div className="poster-result-title">{result.tmdbTitle || "Untitled"}</div>
              <div className="poster-result-meta">{result.releaseDate?.slice(0, 4) || "Unknown"}{result.mediaType ? " - " + result.mediaType.toUpperCase() : ""}</div>
            </button>
          ))}
        </div>
        <div className="button-row poster-search-actions">
          <button className="secondary-button" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

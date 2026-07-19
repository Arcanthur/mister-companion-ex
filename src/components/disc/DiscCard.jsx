/**
 * DiscCard.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: DiscCard
 */

import React from "react";
import { selectedCover } from "../../utils/discUtils";
import { SpecPill } from "./SpecPill";

function DiscCardComponent({ disc, libraryGlyph = "LD", onFetch, onSearch, onOpenDetails, onEdit, editMode, apiKey, theme, coverSource, viewType = "grid" }) {
  const tmdb = disc.tmdb;
  const cover = selectedCover(disc, coverSource);

  const openPoster = (e) => {
    if (editMode) {
      e.stopPropagation();
      onEdit(disc);
      return;
    }
    if (!cover) return;
    e.stopPropagation();
    onOpenDetails(disc);
  };

  const openCard = () => {
    if (editMode) onEdit(disc);
  };

  return (
    <article className={`disc-card disc-card-${viewType}${editMode ? " edit-mode-card" : ""}`} onClick={openCard}>
      <div className={(cover ? "poster-frame poster-clickable" : "poster-frame") + (["lddb", "local"].includes(coverSource) ? " cover-frame" : "")} onClick={openPoster}>
        {cover ? (
          <img src={cover} alt={disc.title} loading="lazy" />
        ) : (
          <div className="poster-empty">
            <div className="disc-mark">{libraryGlyph}</div>
            <div>{disc.fetching ? "Fetching..." : apiKey ? "No poster found" : "Add TMDB key"}</div>
            {apiKey && !disc.fetching && !tmdb && (
              <span
                className="tiny-fetch"
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onFetch(disc);
                }}
              >
                Auto
              </span>
            )}
            {apiKey && !disc.fetching && (
              <span
                className="tiny-fetch search-fetch"
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onSearch(disc);
                }}
              >
                Search
              </span>
            )}
            {disc.fetchError && <div className="fetch-error">{disc.fetchError}</div>}
          </div>
        )}
        {disc.fetching && <div className="fetch-overlay"><div className="spinner" /></div>}
      </div>
      <div className="card-info">
        <div className="card-title">{disc.title}</div>
        {viewType === "grid" ? (
          <>
            <div className="card-subtitle card-year-rating">
              <span>{disc.year || "Year unknown"}</span>
            {tmdb?.tmdbRating && <><span className="card-meta-separator">·</span><span className="card-inline-rating"><span className="rating-star">★</span><span>{tmdb.tmdbRating}</span></span></>}
            {tmdb?.usRating && <><span className="card-meta-separator">·</span><span className="card-us-rating">{tmdb.usRating}</span></>}
            </div>
            <div className="card-catalog">{disc.reference || "No catalog ID"}</div>
          </>
        ) : viewType === "list" ? (
          <>
            <div className="list-year">{disc.year || "—"}</div>
            <div className="list-catalog">{disc.reference || "—"}</div>
            <div className="list-summary">{tmdb?.directors?.[0] || tmdb?.studios?.[0] || tmdb?.genres?.[0] || "—"}</div>
          </>
        ) : (
          <div className="card-subtitle">{disc.year}{disc.reference ? " - " + disc.reference : ""}</div>
        )}
        {viewType === "details" && (
          <div className="item-details-content">
            {tmdb?.overview && <p className="item-overview">{tmdb.overview}</p>}
            <div className="item-detail-grid">
              {[["Genre", tmdb?.genres?.join(", ")], ["Director", tmdb?.directors?.join(", ")], ["Studio", tmdb?.studios?.join(", ")], ["Catalog", disc.reference], ["Video", disc.video], ["Country", disc.country], ["UPC", disc.upc]]
                .filter(([, value]) => value)
                .map(([label, value]) => <div className="item-detail" key={label}><span>{label}</span><strong>{value}</strong></div>)}
            </div>
          </div>
        )}
        <div className="spec-row">{disc.specParts.map((item) => <SpecPill key={item} spec={item} theme={theme} />)}{viewType !== "grid" && tmdb?.tmdbRating && <span className="rating-pill"><span className="rating-star">★</span> {tmdb.tmdbRating}</span>}</div>
      </div>
    </article>
  );
}

// Memoized: the library grid can render hundreds of these, and most props
// (disc, theme, apiKey, etc.) stay referentially stable between renders, so
// this avoids re-rendering every card whenever unrelated app state changes.
export const DiscCard = React.memo(DiscCardComponent);

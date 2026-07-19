/**
 * DetailsOverlay.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: DetailsOverlay
 */

import React, { useState } from "react";
import { selectedCoverLarge } from "../../utils/discUtils";
import { fetchTMDBTrailer, savedTrailerForDisc, searchTMDB, trailerPlayerUrl } from "../../api/tmdb";
import { SpecPill } from "./SpecPill";

export function DetailsOverlay({ disc, onClose, theme, coverSource, apiKey }) {
  const tmdb = disc.tmdb;
  const cover = selectedCoverLarge(disc, coverSource);
  const [trailer, setTrailer] = useState(() => savedTrailerForDisc(disc, tmdb));
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [trailerError, setTrailerError] = useState("");

  const playTrailer = async (event) => {
    event.stopPropagation();
    if (trailer) {
      if (trailer.provider === "youtube" && trailer.source === "tmdb" && apiKey && tmdb?.tmdbId && tmdb?.mediaType) {
        setTrailerLoading(true);
        setTrailerError("");
        try {
          const refreshedTrailer = await fetchTMDBTrailer(tmdb, apiKey, true);
          if (refreshedTrailer) setTrailer({ ...refreshedTrailer, source: "tmdb" });
        } catch {}
        setTrailerLoading(false);
      }
      setShowTrailer(true);
      return;
    }
    if (!apiKey) {
      setTrailerError("Add a TMDB API key in Settings to find trailers.");
      return;
    }

    setTrailerLoading(true);
    setTrailerError("");
    try {
      let metadata = tmdb;
      if (!metadata?.tmdbId || !metadata?.mediaType) {
        const results = await searchTMDB(disc.title, apiKey, disc.year);
        metadata = results[0] || null;
      }
      const foundTrailer = await fetchTMDBTrailer(metadata, apiKey);
      if (!foundTrailer) throw new Error("No online trailer was found for this title.");
      setTrailer({ ...foundTrailer, source: "tmdb" });
      setShowTrailer(true);
    } catch (error) {
      setTrailerError(error.message || "Could not load the trailer.");
    } finally {
      setTrailerLoading(false);
    }
  };

  return (
    <div className="details-backdrop" onClick={onClose}>
      <div className={showTrailer ? "details-window trailer-open" : "details-window"}>
        <div className="details-poster-wrap">
          {cover ? <img src={cover} alt={disc.title} /> : <div className="details-empty">LD</div>}
        </div>
        <div className="details-copy">
          <h2>{tmdb?.tmdbTitle || disc.title}</h2>
          <div className="details-subtitle"><span>{disc.year}</span>{tmdb?.tmdbRating && <><span> - </span><span className="rating-star">★</span><span> {tmdb.tmdbRating}</span></>}{tmdb?.usRating && <span> - {tmdb.usRating}</span>}</div>
          <div className="details-actions">
            <button type="button" className="primary-small trailer-button" disabled={trailerLoading} onClick={playTrailer}>{trailerLoading ? "Loading..." : "Trailer"}</button>
            {trailer && <span className="trailer-provider">{trailer.provider === "local" ? "Local" : trailer.provider.charAt(0).toUpperCase() + trailer.provider.slice(1)}</span>}
          </div>
          {trailerError && <div className="trailer-error" onClick={(event) => event.stopPropagation()}>{trailerError}</div>}
          {showTrailer && trailer && (
            <div className="trailer-player" onClick={(event) => event.stopPropagation()}>
              {["local", "direct"].includes(trailer.provider) ? (
                <video src={trailerPlayerUrl(trailer)} controls autoPlay title={`${tmdb?.tmdbTitle || disc.title} trailer`} />
              ) : (
                <webview
                  src={trailerPlayerUrl(trailer)}
                  partition="persist:trailer-players"
                  webpreferences="contextIsolation=yes,nodeIntegration=no,sandbox=yes"
                  title={`${tmdb?.tmdbTitle || disc.title} trailer`}
                />
              )}
            </div>
          )}
          {tmdb?.overview && <p>{tmdb.overview}</p>}
          {[["Genre", tmdb?.genres?.join(", ")], ["Director", tmdb?.directors?.join(", ")], ["Studio", tmdb?.studios?.join(", ")], ["Catalog", disc.reference], ["Video", disc.video], ["Country", disc.country], ["UPC", disc.upc]]
            .filter(([, value]) => value)
            .map(([label, value]) => <div className="detail-row detail-large" key={label}><span>{label}</span><strong>{value}</strong></div>)}
          {disc.specParts?.length > 0 && (
            <div className="details-spec-row">
              {disc.specParts.map((item) => <SpecPill key={item} spec={item} theme={theme} expanded />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

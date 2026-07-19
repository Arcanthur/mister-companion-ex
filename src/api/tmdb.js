/**
 * tmdb.js
 * Auto-split from the original monolithic main.jsx.
 * Exports: tmdbResultToMetadata, searchTMDB, fetchTMDBDetails, trailerScore, pickTMDBTrailer, pickYoutubeTrailer, fetchTMDBTrailer, fetchTMDB, trailerFromUrl, trailerPlayerUrl, savedTrailerForDisc
 */

import { getHostBridge } from "../framework/host/hostBridge";


/** Maps a raw TMDB API result into the metadata shape stored on a disc. */
export function tmdbResultToMetadata(result) {
  return {
    tmdbId: result.id || null,
    tmdbTitle: result.title || result.name || null,
    overview: result.overview || "",
    poster: result.poster_path ? "https://image.tmdb.org/t/p/w342" + result.poster_path : null,
    posterLarge: result.poster_path ? "https://image.tmdb.org/t/p/w500" + result.poster_path : null,
    tmdbRating: typeof result.vote_average === "number" ? result.vote_average.toFixed(1) : null,
    releaseDate: result.release_date || result.first_air_date || null,
    mediaType: result.media_type || null,
    genres: [],
    studios: [],
    directors: [],
  };
}

/** Searches TMDB for movies/TV matching a title (and optional year). */
export async function searchTMDB(query, apiKey, year = "") {
  const params = new URLSearchParams({ api_key: apiKey, query, include_adult: "false" });
  if (year) params.set("year", year);
  const res = await fetch("https://api.themoviedb.org/3/search/multi?" + params.toString());
  if (!res.ok) throw new Error("TMDB " + res.status);
  const data = await res.json();
  return (data.results || [])
    .filter((item) => item.media_type === "movie" || item.media_type === "tv")
    .map(tmdbResultToMetadata);
}

/** Fetches full TMDB details (credits, release dates, videos) for a specific result. */
export async function fetchTMDBDetails(metadata, apiKey) {
  if (!metadata?.tmdbId || !metadata?.mediaType) return metadata;

  const params = new URLSearchParams({ api_key: apiKey, append_to_response: "credits,videos,release_dates,content_ratings" });
  const res = await fetch(`https://api.themoviedb.org/3/${metadata.mediaType}/${metadata.tmdbId}?${params.toString()}`);
  if (!res.ok) return metadata;

  const details = await res.json();
  const crew = details.credits?.crew || [];
  const directors = metadata.mediaType === "movie"
    ? crew.filter((person) => person.job === "Director").map((person) => person.name)
    : (details.created_by || []).map((person) => person.name);
  const studios = metadata.mediaType === "movie"
    ? (details.production_companies || []).map((company) => company.name)
    : (details.networks || []).map((network) => network.name);
  const usRating = metadata.mediaType === "movie"
    ? (details.release_dates?.results || [])
      .find((item) => item.iso_3166_1 === "US")
      ?.release_dates
      ?.filter((item) => item.certification)
      ?.sort((a, b) => [3, 4, 5, 6, 2, 1].indexOf(a.type) - [3, 4, 5, 6, 2, 1].indexOf(b.type))[0]
      ?.certification
    : (details.content_ratings?.results || []).find((item) => item.iso_3166_1 === "US")?.rating;

  return {
    ...metadata,
    overview: details.overview || metadata.overview,
    poster: details.poster_path ? "https://image.tmdb.org/t/p/w342" + details.poster_path : metadata.poster,
    posterLarge: details.poster_path ? "https://image.tmdb.org/t/p/w500" + details.poster_path : metadata.posterLarge,
    tmdbRating: typeof details.vote_average === "number" ? details.vote_average.toFixed(1) : metadata.tmdbRating,
    releaseDate: details.release_date || details.first_air_date || metadata.releaseDate,
    genres: (details.genres || []).map((genre) => genre.name),
    studios,
    directors,
    usRating: usRating || metadata.usRating || null,
    trailer: pickTMDBTrailer(details.videos?.results) || metadata.trailer || null,
    youtubeTrailerKey: pickYoutubeTrailer(details.videos?.results) || metadata.youtubeTrailerKey || null,
  };
}

/** Scores a TMDB video entry so the best official trailer can be picked first. */
export function trailerScore(video) {
  const typeScore = video.type === "Trailer" ? 30 : video.type === "Teaser" ? 20 : 10;
  const officialScore = video.official ? 20 : 0;
  const providerScore = video.site === "Vimeo" ? 200 : video.site === "Dailymotion" ? 100 : 0;
  return typeScore + officialScore + providerScore;
}

/** Picks the best trailer from a list of TMDB video entries. */
export function pickTMDBTrailer(videos = []) {
  const supported = videos
    .filter((video) => ["YouTube", "Vimeo", "Dailymotion"].includes(video.site) && video.key)
    .sort((a, b) => trailerScore(b) - trailerScore(a));
  const selected = supported[0];
  if (!selected) return null;
  return {
    provider: selected.site.toLowerCase(),
    key: selected.key,
    name: selected.name || selected.type || "Trailer",
  };
}

/** Picks the best YouTube trailer from a list of TMDB video entries. */
export function pickYoutubeTrailer(videos = []) {
  const youtube = videos.filter((video) => video.site === "YouTube" && video.key);
  return (youtube.find((video) => video.type === "Trailer" && video.official)
    || youtube.find((video) => video.type === "Trailer")
    || youtube.find((video) => video.type === "Teaser")
    || youtube[0])?.key || null;
}

/** Fetches and picks the best trailer for a TMDB title. */
export async function fetchTMDBTrailer(metadata, apiKey, refresh = false) {
  if (!metadata?.tmdbId || !metadata?.mediaType || !apiKey) return null;
  if (!refresh && metadata.trailer?.provider && metadata.trailer?.key) return metadata.trailer;
  if (!refresh && metadata.youtubeTrailerKey) return { provider: "youtube", key: metadata.youtubeTrailerKey, name: "Trailer" };
  const params = new URLSearchParams({ api_key: apiKey });
  const response = await fetch(`https://api.themoviedb.org/3/${metadata.mediaType}/${metadata.tmdbId}/videos?${params.toString()}`);
  if (!response.ok) throw new Error("TMDB trailer lookup failed (" + response.status + ").");
  const data = await response.json();
  return pickTMDBTrailer(data.results);
}

/** Full lookup flow: search TMDB for a title/year, then fetch and merge in details + trailer. */
export async function fetchTMDB(title, year, apiKey) {
  const results = await searchTMDB(title, apiKey, year);
  const best = results.find((item) => item.poster) || results[0] || null;
  return best ? fetchTMDBDetails(best, apiKey) : null;
}

/** Parses a pasted trailer URL (YouTube, Vimeo, etc.) into a normalized {site, key} trailer reference. */
export function trailerFromUrl(value) {
  const rawUrl = String(value || "").trim();
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const pathParts = parsed.pathname.split("/").filter(Boolean);

    if (hostname === "youtu.be") {
      return pathParts[0] ? { provider: "youtube", key: pathParts[0], name: "Trailer" } : null;
    }
    if (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
      const key = parsed.searchParams.get("v") || (pathParts[0] === "embed" || pathParts[0] === "shorts" ? pathParts[1] : "");
      return key ? { provider: "youtube", key, name: "Trailer" } : null;
    }
    if (hostname === "vimeo.com" || hostname.endsWith(".vimeo.com")) {
      const key = [...pathParts].reverse().find((part) => /^\d+$/.test(part));
      return key ? { provider: "vimeo", key, hash: parsed.searchParams.get("h") || "", name: "Trailer" } : null;
    }
    if (hostname === "dai.ly") {
      return pathParts[0] ? { provider: "dailymotion", key: pathParts[0], name: "Trailer" } : null;
    }
    if (hostname === "dailymotion.com" || hostname.endsWith(".dailymotion.com")) {
      const videoIndex = pathParts.findIndex((part) => part === "video");
      const key = videoIndex >= 0 ? pathParts[videoIndex + 1] : "";
      return key ? { provider: "dailymotion", key: key.split("_")[0], name: "Trailer" } : null;
    }
    if (/\.(mp4|m4v|webm|ogv|ogg|mov)$/i.test(parsed.pathname)) {
      return { provider: "direct", url: parsed.href, name: "Trailer" };
    }
  } catch {}
  return null;
}

/** Builds an embeddable player URL for a normalized trailer reference. */
export function trailerPlayerUrl(trailer) {
  if (!trailer) return "";
  if (trailer.provider === "youtube") {
    return getHostBridge()?.youtubeTrailerUrl?.(trailer.key)
      || `https://www.youtube.com/embed/${encodeURIComponent(trailer.key)}?autoplay=1&rel=0`;
  }
  if (trailer.provider === "vimeo") {
    const hash = trailer.hash ? `&h=${encodeURIComponent(trailer.hash)}` : "";
    return `https://player.vimeo.com/video/${encodeURIComponent(trailer.key)}?autoplay=1${hash}`;
  }
  if (trailer.provider === "dailymotion") return `https://www.dailymotion.com/embed/video/${encodeURIComponent(trailer.key)}?autoplay=1`;
  return trailer.url || "";
}

/** Resolves the trailer to show for a disc: a manually-set URL/local file, or the TMDB-fetched one. */
export function savedTrailerForDisc(disc, tmdb) {
  if (disc.localTrailerFile && getHostBridge()?.localTrailerUrl) {
    const url = getHostBridge().localTrailerUrl(disc.localTrailerFile);
    if (url) return { provider: "local", url, name: disc.localTrailerName || "Local trailer", source: "local" };
  }
  const manualTrailer = trailerFromUrl(disc.trailerUrl);
  if (manualTrailer) return { ...manualTrailer, source: "manual" };
  if (tmdb?.trailer?.provider && tmdb?.trailer?.key) return { ...tmdb.trailer, source: "tmdb" };
  if (tmdb?.youtubeTrailerKey) return { provider: "youtube", key: tmdb.youtubeTrailerKey, name: "Trailer", source: "tmdb" };
  return null;
}

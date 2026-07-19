/**
 * discUtils.js
 * Auto-split from the original monolithic main.jsx.
 * Exports: selectedCover, selectedCoverLarge, splitCsv, coverMatchKeys, downloadUrlCover, urlToDataUrl, fileToDataUrl, lddbSearchUrl, normalizeMediaLibraries, normalizeDisc, sameDisc, healthDuplicateKey, hasMeaningfulTmdbMetadata, formatLibraryDate, formatFileSize, specLabel, specColor
 */

import { DEFAULT_MEDIA_LIBRARIES } from "../constants/libraryDefaults";
import { getHostBridge } from "../framework/host/hostBridge";

/** Picks the small/grid poster image for a disc, honoring the active cover-source preference (tmdb, lddb, or local). */
export function selectedCover(disc, coverSource) {
  if (coverSource === "lddb" && disc?.lddbCover) return disc.lddbCover;
  if (coverSource === "local") {
    if (disc?.lddbCoverSourceType === "local" && disc?.lddbCover) return disc.lddbCover;
    return disc?.tmdb?.poster || disc?.tmdb?.posterLarge || null;
  }
  return disc?.tmdb?.poster || disc?.tmdb?.posterLarge || disc?.lddbCover || null;
}

/** Picks the large/details-view poster image for a disc, honoring the active cover-source preference. */
export function selectedCoverLarge(disc, coverSource) {
  if (coverSource === "lddb" && disc?.lddbCover) return disc.lddbCover;
  if (coverSource === "local") {
    if (disc?.lddbCoverSourceType === "local" && disc?.lddbCover) return disc.lddbCover;
    return disc?.tmdb?.posterLarge || disc?.tmdb?.poster || null;
  }
  return disc?.tmdb?.posterLarge || disc?.tmdb?.poster || disc?.lddbCover || null;
}

/** Splits a comma-separated string into a trimmed array, dropping empty entries. */
export function splitCsv(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

/** Builds a set of normalized (lowercase, alphanumeric-only) keys used to match a disc against scanned cover files. */
export function coverMatchKeys(disc) {
  const slug = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
  return [disc?.id, disc?.reference, disc?.upc, disc?.title, disc?.rawTitle].map(slug).filter(Boolean);
}

export async function downloadUrlCover(url) {
  if (getHostBridge()?.downloadCoverToScan) return await getHostBridge().downloadCoverToScan(url);
  const dataUrl = await urlToDataUrl(url);
  return { dataUrl, filePath: url };
}

export async function urlToDataUrl(url) {
  if (getHostBridge()?.imageToDataUrl) return await getHostBridge().imageToDataUrl(url);
  const response = await fetch(url, { headers: { accept: "image/*" } });
  if (!response.ok) throw new Error("Image " + response.status);
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("URL did not return an image");
  return await fileToDataUrl(blob);
}

/** Reads a File/Blob and resolves to a base64 data: URL. */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Builds an LDDB.com search URL for a disc, preferring its catalog reference over its title. */
export function lddbSearchUrl(disc) {
  const query = disc.reference || disc.id || disc.title;
  return "https://www.lddb.com/search.php?search=" + encodeURIComponent(query);
}

/** Merges user-defined libraries with the built-in defaults, sanitizing ids/names/glyphs and de-duplicating by id. */
export function normalizeMediaLibraries(libraries) {
  const custom = Array.isArray(libraries)
    ? libraries.filter((library) => library?.id && library?.name).map((library) => ({
      id: String(library.id),
      name: String(library.name),
      glyph: String(library.glyph || library.name).replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "LIB",
      kind: library.kind === "wishlist" ? "wishlist" : "physical",
      locked: Boolean(library.locked),
      hidden: Boolean(library.hidden),
    }))
    : [];
  const ordered = [...custom];
  DEFAULT_MEDIA_LIBRARIES.forEach((library) => {
    if (!ordered.some((item) => item.id === library.id)) ordered.push({ ...library });
  });
  return ordered;
}

/** Fills in defaults and coerces types for a raw disc record so the rest of the app can rely on a consistent shape. */
export function normalizeDisc(disc) {
  const specs = typeof disc?.specs === "string" ? disc.specs : "";
  const specParts = Array.isArray(disc?.specParts)
    ? disc.specParts.filter(Boolean)
    : specs.split("/").map((item) => item.trim()).filter(Boolean);
  const tmdb = disc?.tmdb ? {
    ...disc.tmdb,
    genres: Array.isArray(disc.tmdb.genres) ? disc.tmdb.genres : [],
    studios: Array.isArray(disc.tmdb.studios) ? disc.tmdb.studios : [],
    directors: Array.isArray(disc.tmdb.directors) ? disc.tmdb.directors : [],
  } : null;
  const libraryId = String(disc?.libraryId || "laserdisc");

  return {
    rawTitle: disc?.rawTitle || disc?.title || "",
    title: disc?.title || disc?.rawTitle || "Untitled",
    sortTitle: String(disc?.sortTitle || ""),
    year: String(disc?.year || ""),
    id: String(disc?.id || ""),
    reference: String(disc?.reference || ""),
    release: String(disc?.release || ""),
    video: String(disc?.video || ""),
    specs,
    specParts,
    country: String(disc?.country || ""),
    upc: String(disc?.upc || ""),
    condition: String(disc?.condition || ""),
    notes: String(disc?.notes || ""),
    trailerUrl: String(disc?.trailerUrl || ""),
    localTrailerFile: String(disc?.localTrailerFile || ""),
    localTrailerName: String(disc?.localTrailerName || ""),
    libraryId,
    mediaFormat: String(disc?.mediaFormat || (libraryId === "wishlist" ? "any" : libraryId)),
    favorite: Boolean(disc?.favorite),
    addedAt: String(disc?.addedAt || new Date().toISOString()),
    collectionIds: Array.isArray(disc?.collectionIds) ? [...new Set(disc.collectionIds.filter(Boolean))] : [],
    tmdb,
    lddbCover: disc?.lddbCover || null,
    lddbCoverFile: disc?.lddbCoverFile || null,
    lddbCoverSourceType: disc?.lddbCoverSourceType || null,
    fetching: false,
    fetchError: null,
  };
}

/** Identity check for two disc records, based on library + id + reference + raw title rather than object reference. */
export function sameDisc(a, b) {
  return [a?.libraryId, a?.id, a?.reference, a?.rawTitle].join("|") === [b?.libraryId, b?.id, b?.reference, b?.rawTitle].join("|");
}

/** Builds a dedupe key for library-health checks, preferring UPC, then catalog reference, then normalized title+year. */
export function healthDuplicateKey(disc) {
  const libraryPrefix = String(disc?.libraryId || "laserdisc") + ":";
  const upc = String(disc?.upc || "").replace(/\D/g, "");
  if (upc) return libraryPrefix + "upc:" + upc;
  const reference = String(disc?.reference || "").trim().toLowerCase();
  if (reference) return libraryPrefix + "reference:" + reference;
  const title = String(disc?.title || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
  return title ? libraryPrefix + "title:" + title + ":" + String(disc?.year || "") : "";
}

/** Returns true if a disc has at least one non-trivial piece of fetched TMDB metadata. */
export function hasMeaningfulTmdbMetadata(disc) {
  const metadata = disc?.tmdb;
  return Boolean(metadata && (
    metadata.tmdbId
    || metadata.tmdbTitle
    || metadata.overview?.trim()
    || metadata.releaseDate
    || metadata.tmdbRating
    || metadata.genres?.length
    || metadata.directors?.length
    || metadata.studios?.length
  ));
}

/** Formats a saved-library timestamp for display, or a friendly fallback if it is missing/invalid. */
export function formatLibraryDate(value) {
  if (!value) return "Not saved yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not saved yet";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** Formats a byte count as a human-readable size string (B/KB/MB/GB). */
export function formatFileSize(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 1) return "Not available";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const amount = bytes / (1024 ** index);
  return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}

/** Expands a short spec code (e.g. "THX", "CAV") into its full display label. */
export function specLabel(spec) {
  const s = spec.toUpperCase();
  if (s === "AC3") return "Dolby AC-3";
  if (s === "THX") return "THX Mastered";
  if (s === "SRD") return "Dolby Digital SRD";
  if (s === "LBX") return "Letterboxed";
  if (s === "CAV" || s === "+CAV") return "CAV Format";
  if (s === "P&S") return "Pan and Scan";
  if (s === "ANA") return "Anamorphic";
  if (s === "BILINGUAL") return "Bilingual";
  if (s === "UNCUT") return "Uncut";
  return spec;
}

/** Looks up the [background, text, border] theme colors for a spec badge. */
export function specColor(spec, theme) {
  const s = spec.toUpperCase();
  if (s === "AC3") return [theme.badgeAc3Bg, theme.badgeAc3Text, theme.badgeAc3Border];
  if (s === "THX") return [theme.badgeThxBg, theme.badgeThxText, theme.badgeThxBorder];
  if (s === "SRD") return [theme.badgeSrdBg, theme.badgeSrdText, theme.badgeSrdBorder];
  if (s === "LBX") return [theme.badgeLbxBg, theme.badgeLbxText, theme.badgeLbxBorder];
  if (s === "CAV" || s === "+CAV") return [theme.badgeCavBg, theme.badgeCavText, theme.badgeCavBorder];
  if (s === "P&S") return [theme.badgePsBg, theme.badgePsText, theme.badgePsBorder];
  if (s === "ANA") return [theme.badgeAnaBg, theme.badgeAnaText, theme.badgeAnaBorder];
  if (s === "BILINGUAL") return [theme.badgeBilingualBg, theme.badgeBilingualText, theme.badgeBilingualBorder];
  if (s === "UNCUT") return [theme.badgeUncutBg, theme.badgeUncutText, theme.badgeUncutBorder];
  return [theme.badgeDefaultBg, theme.badgeDefaultText, theme.badgeDefaultBorder];
}

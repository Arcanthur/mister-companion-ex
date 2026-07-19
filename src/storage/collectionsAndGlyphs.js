/**
 * collectionsAndGlyphs.js
 * Auto-split from the original monolithic main.jsx.
 * Exports: loadCollections, saveCollections, loadSidebarGlyphs, saveSidebarGlyphs
 */

import { COLLECTIONS_STORAGE_KEY, SIDEBAR_GLYPHS_STORAGE_KEY } from "../constants/storageKeys";

/** Loads saved user collections from localStorage. */
export function loadCollections() {
  try {
    const saved = JSON.parse(localStorage.getItem(COLLECTIONS_STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((item) => item?.id && item?.name).map((item) => ({ id: String(item.id), name: String(item.name) })) : [];
  } catch {
    return [];
  }
}

/** Persists user collections to localStorage. */
export function saveCollections(collections) {
  localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(collections));
}

/** Loads custom sidebar glyph images from localStorage. */
export function loadSidebarGlyphs() {
  try {
    const saved = JSON.parse(localStorage.getItem(SIDEBAR_GLYPHS_STORAGE_KEY) || "{}");
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
}

/** Persists custom sidebar glyph images to localStorage. */
export function saveSidebarGlyphs(glyphs) {
  try {
    localStorage.setItem(SIDEBAR_GLYPHS_STORAGE_KEY, JSON.stringify(glyphs));
  } catch {}
}

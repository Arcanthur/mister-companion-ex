/**
 * apiKey.js
 * Auto-split from the original monolithic main.jsx.
 * Exports: loadSavedApiKey, saveApiKey
 */

import { API_KEY_STORAGE_KEY } from "../constants/storageKeys";

/** Loads the saved TMDB API key from localStorage. */
export function loadSavedApiKey() {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || "";
}

/** Persists the TMDB API key to localStorage. */
export function saveApiKey(key) {
  if (key) localStorage.setItem(API_KEY_STORAGE_KEY, key);
  else localStorage.removeItem(API_KEY_STORAGE_KEY);
}

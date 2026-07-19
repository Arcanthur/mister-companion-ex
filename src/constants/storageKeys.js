/**
 * storageKeys.js
 * Compatibility constants built from the active VaultKit app module namespace.
 */

import { buildStorageKeys } from "../framework/app/storageKeys";
import { ACTIVE_APP_CONFIG } from "../apps/registry";

const keys = buildStorageKeys(ACTIVE_APP_CONFIG);

export const STORAGE_KEY = keys.STORAGE_KEY;
export const API_KEY_STORAGE_KEY = keys.API_KEY_STORAGE_KEY;
export const THEME_STORAGE_KEY = keys.THEME_STORAGE_KEY;
export const THEME_PREVIEW_STORAGE_KEY = keys.THEME_PREVIEW_STORAGE_KEY;
export const SAVED_THEMES_STORAGE_KEY = keys.SAVED_THEMES_STORAGE_KEY;
export const COLLECTIONS_STORAGE_KEY = keys.COLLECTIONS_STORAGE_KEY;
export const MEDIA_SCOPE_STORAGE_KEY = keys.MEDIA_SCOPE_STORAGE_KEY;
export const SIDEBAR_GLYPHS_STORAGE_KEY = keys.SIDEBAR_GLYPHS_STORAGE_KEY;

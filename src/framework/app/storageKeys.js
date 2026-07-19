/**
 * storageKeys.js
 * Builds namespaced localStorage keys for each VaultKit app module.
 */

export function appStorageKey(appConfig, key, version = "v1") {
  const namespace = appConfig?.storageNamespace || appConfig?.id || "vaultkit";
  return `${namespace}-${key}-${version}`;
}

export function buildStorageKeys(appConfig) {
  const explicit = appConfig?.storageKeys || {};
  return Object.freeze({
    STORAGE_KEY: explicit.library || appStorageKey(appConfig, "library"),
    API_KEY_STORAGE_KEY: explicit.apiKey || appStorageKey(appConfig, "metadata-api-key"),
    THEME_STORAGE_KEY: explicit.theme || appStorageKey(appConfig, "theme"),
    THEME_PREVIEW_STORAGE_KEY: explicit.themePreview || appStorageKey(appConfig, "theme-preview"),
    SAVED_THEMES_STORAGE_KEY: explicit.savedThemes || appStorageKey(appConfig, "saved-themes"),
    COLLECTIONS_STORAGE_KEY: explicit.collections || appStorageKey(appConfig, "collections"),
    MEDIA_SCOPE_STORAGE_KEY: explicit.mediaScope || appStorageKey(appConfig, "media-scope"),
    SIDEBAR_GLYPHS_STORAGE_KEY: explicit.sidebarGlyphs || appStorageKey(appConfig, "sidebar-glyphs"),
  });
}

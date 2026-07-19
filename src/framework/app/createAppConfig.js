/**
 * createAppConfig.js
 * Small helper for defining a VaultKit app module.
 */

const DEFAULT_FEATURE_FLAGS = {
  apiKeys: false,
  collections: true,
  coverArtwork: true,
  importExport: true,
  libraryHealth: true,
  localTrailers: false,
  mediaMetadata: false,
  themePreview: true,
  themes: true,
};

export function createAppConfig(config) {
  const normalized = {
    ...config,
    storageNamespace: config.storageNamespace || config.id,
    bridgeName: config.bridgeName || "vaultKit",
    features: { ...DEFAULT_FEATURE_FLAGS, ...(config.features || {}) },
    libraries: Array.isArray(config.libraries) ? config.libraries : [],
    categories: Array.isArray(config.categories) ? config.categories : [],
    labels: config.labels || {},
    files: config.files || {},
    assets: config.assets || {},
  };

  if (!normalized.id) throw new Error("VaultKit app config requires an id.");
  if (!normalized.name) throw new Error("VaultKit app config requires a name.");
  return Object.freeze(normalized);
}

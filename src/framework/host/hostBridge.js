/**
 * hostBridge.js
 * Renderer-side adapter for the Electron preload bridge. New apps should use
 * window.vaultKit; LaserVault keeps window.laserVault as a legacy alias.
 */

export function getHostBridge() {
  if (typeof window === "undefined") return {};
  return window.vaultKit || window.laserVault || {};
}

export function hasDesktopHost() {
  const host = getHostBridge();
  return Boolean(host?.minimizeWindow || host?.loadLibraryFile || host?.saveLibraryFile);
}

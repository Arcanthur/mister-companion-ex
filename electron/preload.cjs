const { contextBridge, ipcRenderer, webUtils } = require("electron");

function reportRendererStartupProblem(kind, payload) {
  try {
    ipcRenderer.send("renderer:startup-problem", {
      kind,
      message: payload?.message || String(payload || "Unknown renderer problem"),
      stack: payload?.stack || "",
      href: globalThis.location?.href || "",
    });
  } catch {}
}

window.addEventListener("error", (event) => {
  reportRendererStartupProblem("error", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  reportRendererStartupProblem("unhandledrejection", event.reason || "Unhandled promise rejection");
});

const vaultKitBridge = {
  rendererReady: () => ipcRenderer.send("app:renderer-ready"),
  getAboutInfo: () => ipcRenderer.invoke("app:get-about-info"),
  openThemePreview: (theme) => ipcRenderer.invoke("theme-preview:open", theme),
  updateThemePreview: (theme) => ipcRenderer.invoke("theme-preview:update", theme),
  onThemePreviewUpdate: (callback) => {
    const listener = (_event, theme) => callback(theme);
    ipcRenderer.on("theme-preview:update", listener);
    return () => ipcRenderer.removeListener("theme-preview:update", listener);
  },
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximizeWindow: () => ipcRenderer.invoke("window:toggle-maximize"),
  isWindowMaximized: () => ipcRenderer.invoke("window:is-maximized"),
  isWindowFocused: () => ipcRenderer.invoke("window:is-focused"),
  setPlatinumSmallerWindow: (enabled) => ipcRenderer.invoke("window:set-platinum-smaller", Boolean(enabled)),
  startWindowMove: (point) => ipcRenderer.send("window:move-start", point),
  updateWindowMove: (point) => ipcRenderer.send("window:move-update", point),
  endWindowMove: () => ipcRenderer.send("window:move-end"),
  startWindowResize: (details) => ipcRenderer.send("window:resize-start", details),
  updateWindowResize: (point) => ipcRenderer.send("window:resize-update", point),
  endWindowResize: () => ipcRenderer.send("window:resize-end"),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  onWindowMaximizedChange: (callback) => {
    const listener = (_event, maximized) => callback(Boolean(maximized));
    ipcRenderer.on("window:maximized-change", listener);
    return () => ipcRenderer.removeListener("window:maximized-change", listener);
  },
  onWindowFocusChange: (callback) => {
    const listener = (_event, focused) => callback(Boolean(focused));
    ipcRenderer.on("window:focus-change", listener);
    return () => ipcRenderer.removeListener("window:focus-change", listener);
  },
  onFileBrowserHistoryCommand: (callback) => {
    const listener = (_event, direction) => callback(Number(direction) < 0 ? -1 : 1);
    ipcRenderer.on("file-browser:history-command", listener);
    return () => ipcRenderer.removeListener("file-browser:history-command", listener);
  },
  loadLibraryFile: () => ipcRenderer.sendSync("library:load"),
  saveLibraryFile: (serializedLibrary) => ipcRenderer.invoke("library:save", serializedLibrary),
  clearLibraryFile: () => ipcRenderer.invoke("library:clear"),
  getLibraryInfo: () => ipcRenderer.invoke("library:info"),
  loadThemes: () => ipcRenderer.sendSync("themes:list"),
  loadThemeState: () => ipcRenderer.sendSync("themes:state-load"),
  saveThemeState: (state) => ipcRenderer.invoke("themes:state-save", state),
  saveThemeFile: (theme) => ipcRenderer.invoke("themes:save", theme),
  openThemesFolder: () => ipcRenderer.invoke("themes:open-folder"),
  loadFonts: () => ipcRenderer.sendSync("fonts:list"),
  openFontsFolder: () => ipcRenderer.invoke("fonts:open-folder"),
  openAssetsFolder: () => ipcRenderer.invoke("assets:open-folder"),
  reloadThemeAssets: () => ipcRenderer.invoke("assets:reload"),
  importThemeFile: () => ipcRenderer.invoke("themes:import"),
  importThemeBundle: () => ipcRenderer.invoke("themes:import-bundle"),
  openYoutubeLogin: () => ipcRenderer.invoke("youtube:open-login"),
  chooseLocalTrailer: (details) => ipcRenderer.invoke("trailers:choose-local", details),
  removeLocalTrailer: (fileName) => ipcRenderer.invoke("trailers:remove-local", fileName),
  localTrailerUrl: (fileName) => ipcRenderer.sendSync("trailers:url", fileName),
  youtubeTrailerUrl: (videoId) => ipcRenderer.sendSync("trailers:youtube-player-url", videoId),
  openLddbSession: () => ipcRenderer.invoke("lddb:open-session"),
  findLddbCover: (disc) => ipcRenderer.invoke("lddb:find-cover", disc),
  findLddbCoverSession: (disc) => ipcRenderer.invoke("lddb:find-cover-session", disc),
  findLddbCoverFromSearchWindow: () => ipcRenderer.invoke("lddb:cover-from-search-window"),
  imageToDataUrl: (url) => ipcRenderer.invoke("lddb:image-to-data-url", url),
  downloadCoverToScan: (url) => ipcRenderer.invoke("lddb:download-cover-to-scan", url),
  importCoverFolder: () => ipcRenderer.invoke("covers:import-folder"),
  openScanFolder: () => ipcRenderer.invoke("covers:open-scan-folder"),
  clipboardImage: () => ipcRenderer.invoke("covers:clipboard-image"),
  newestScanImage: () => ipcRenderer.invoke("covers:newest-scan-image"),
  openSearchWindow: (url) => ipcRenderer.invoke("browser:open-search", url),
  backendCall: (method, params, options) => ipcRenderer.invoke("backend:call", method, params, options),
  backendInfo: () => ipcRenderer.invoke("backend:info"),
  chooseDirectory: (options) => ipcRenderer.invoke("dialog:choose-directory", options),
  chooseFile: (options) => ipcRenderer.invoke("dialog:choose-file", options),
  chooseSaveFile: (options) => ipcRenderer.invoke("dialog:save-file", options),
  getDroppedFilePath: (file) => {
    try {
      if (webUtils?.getPathForFile && file) return webUtils.getPathForFile(file) || "";
    } catch {}
    return file?.path || "";
  },
  getDroppedFilePaths: (files) => {
    try {
      return Array.from(files || []).map((file) => {
        try {
          if (webUtils?.getPathForFile) return webUtils.getPathForFile(file) || file?.path || "";
        } catch {}
        return file?.path || "";
      }).filter(Boolean);
    } catch {
      return [];
    }
  },
  manualFileUrl: (filePath) => ipcRenderer.invoke("manuals:file-url", filePath),
  openManualWindow: (filePath, options) => ipcRenderer.invoke("manuals:open-window", filePath, options),
  openPath: (filePath) => ipcRenderer.invoke("shell:open-path", filePath),
};

contextBridge.exposeInMainWorld("vaultKit", vaultKitBridge);
// Legacy alias retained so the existing LaserVault module keeps working while
// new apps consume the generic VaultKit bridge.
contextBridge.exposeInMainWorld("laserVault", vaultKitBridge);

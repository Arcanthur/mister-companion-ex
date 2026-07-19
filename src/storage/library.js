/**
 * library.js
 * Auto-split from the original monolithic main.jsx.
 * Exports: pendingLibrarySave, librarySaveTimer, queuePortableLibrarySave, saveLibrary, loadSavedLibrary
 */

import { STORAGE_KEY } from "../constants/storageKeys";
import { DEFAULT_MEDIA_LIBRARIES } from "../constants/libraryDefaults";
import { normalizeDisc, normalizeMediaLibraries } from "../utils/discUtils";
import { getHostBridge } from "../framework/host/hostBridge";

/** Loads the saved disc library and media libraries on startup. */
export function loadSavedLibrary() {
  const host = getHostBridge();
  try {
    const portableValue = host?.loadLibraryFile?.();
    const portableSaved = portableValue ? JSON.parse(portableValue) : null;
    if (portableSaved && Array.isArray(portableSaved.discs)) {
      return {
        discs: portableSaved.discs.map(normalizeDisc),
        libraries: normalizeMediaLibraries(portableSaved.libraries),
        savedAt: portableSaved.savedAt || null,
      };
    }
  } catch (error) {
    console.error("Could not read portable library file", error);
  }

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || !Array.isArray(saved.discs)) return { discs: [], libraries: normalizeMediaLibraries(), savedAt: null };
    return {
      discs: saved.discs.map(normalizeDisc),
      libraries: normalizeMediaLibraries(saved.libraries),
      savedAt: saved.savedAt || null,
    };
  } catch (error) {
    console.error("Could not read legacy browser library", error);
    return { discs: [], libraries: normalizeMediaLibraries(), savedAt: null };
  }
}

export let pendingLibrarySave = null;

export let librarySaveTimer = null;

/** Debounces writes of the portable (host-app) library save to avoid excessive disk I/O. */
export function queuePortableLibrarySave(payload) {
  pendingLibrarySave = payload;
  if (librarySaveTimer) window.clearTimeout(librarySaveTimer);
  librarySaveTimer = window.setTimeout(async () => {
    const latest = pendingLibrarySave;
    pendingLibrarySave = null;
    librarySaveTimer = null;
    try {
      await getHostBridge().saveLibraryFile(JSON.stringify(latest));
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Could not save portable library file", error);
      window.dispatchEvent(new CustomEvent("laservault-save-error", { detail: error?.message || "Could not save library" }));
    }
  }, 180);
}

/** Persists the disc library and media libraries, via the host app if available or localStorage otherwise. */
export function saveLibrary(discs, libraries = DEFAULT_MEDIA_LIBRARIES) {
  const normalizedLibraries = normalizeMediaLibraries(libraries);
  const hasCustomLibraries = normalizedLibraries.some((library) => !DEFAULT_MEDIA_LIBRARIES.some((item) => item.id === library.id));
  if (discs.length === 0 && !hasCustomLibraries) {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    getHostBridge()?.clearLibraryFile?.().catch((error) => console.error("Could not clear portable library", error));
    return null;
  }

  const savedAt = new Date().toISOString();
  const payload = { discs: discs.map(normalizeDisc), libraries: normalizedLibraries, savedAt };
  if (getHostBridge()?.saveLibraryFile) {
    queuePortableLibrarySave(payload);
  } else {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error("Browser storage is full", error);
      window.dispatchEvent(new CustomEvent("laservault-save-error", { detail: "Browser storage is full. Use the Windows app for large cover libraries." }));
    }
  }
  return savedAt;
}

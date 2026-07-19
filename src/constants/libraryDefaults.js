import { ACTIVE_APP_CONFIG } from "../apps/registry";

export const DEFAULT_MEDIA_LIBRARIES = ACTIVE_APP_CONFIG.libraries || [];
export const DEFAULT_SIDEBAR_GLYPHS = Object.freeze(Object.fromEntries([
  ...DEFAULT_MEDIA_LIBRARIES.map((library) => [`library:${library.id}`, library.icon]).filter(([, icon]) => Boolean(icon)),
  ...(ACTIVE_APP_CONFIG.categories || []).map((category) => [category.scope, category.icon]).filter(([, icon]) => Boolean(icon)),
]));

export const FALLBACK_ABOUT_INFO = {
  version: "Development build",
  author: "Arcanthur",
  buildDate: "Development build",
  electron: "Desktop build only",
  chromium: "Desktop build only",
  node: "Desktop build only",
};

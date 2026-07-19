/**
 * LaserVault app module configuration.
 * This file is intentionally the only place the reusable framework should need
 * to know LaserVault's name, default media libraries, sidebar categories, and
 * app-specific file names.
 */

import { createAppConfig } from "../../framework/app/createAppConfig";
import sidebarAllTitlesUrl from "../../assets/sidebar-all-titles.svg";
import sidebarFavoritesUrl from "../../assets/sidebar-favorites-custom.svg";
import sidebarRecentlyAddedUrl from "../../assets/sidebar-recently-added.svg";
import sidebarWishlistUrl from "../../assets/sidebar-wishlist.svg";
import sidebarTopRatedUrl from "../../assets/sidebar-top-rated-custom.svg";
import sidebarLaserdiscUrl from "../../assets/sidebar-laserdisc-custom.png";
import sidebarVhsUrl from "../../assets/sidebar-vhs-custom.png";
import sidebarDvdBlurayUrl from "../../assets/sidebar-dvd-bluray.png";
import wordmarkUrl from "../../assets/laservault-header.png";

export const LASERVAULT_APP_CONFIG = createAppConfig({
  id: "laservault",
  name: "LaserVault",
  productName: "LaserVault EX",
  description: "Desktop vault for physical video libraries.",
  storageNamespace: "laservault",
  legacyStorageNamespace: "laserdisc-vault",

  storageKeys: {
    library: "laserdisc-vault-library-v1",
    apiKey: "laserdisc-vault-tmdb-api-key-v1",
    theme: "laserdisc-vault-theme-v1",
    themePreview: "laserdisc-vault-theme-preview-v1",
    savedThemes: "laservault-saved-themes-v1",
    collections: "laservault-collections-v1",
    mediaScope: "laservault-media-scope-v1",
    sidebarGlyphs: "laservault-sidebar-glyphs-v1",
  },
  bridgeName: "vaultKit",
  legacyBridgeName: "laserVault",
  itemName: "title",
  itemNamePlural: "titles",
  defaultLibraryId: "laserdisc",
  initialScope: "library:laserdisc",
  recentDays: 90,
  minimumTopRating: 7.5,
  assets: {
    wordmark: wordmarkUrl,
  },
  files: {
    exportArchiveName: "LaserVault-library.zip",
    coverLinksName: "LaserVault-LDDB-cover-links.html",
    portableDataFolder: "LaserVaultData",
    portableLibraryFile: "LaserVaultData\\library.json",
    iconPng: "build/laservaulticon.png",
  },
  labels: {
    emptyBadge: "LD",
    emptyTitle: "Drop your LDDB XML here",
    emptyDescription: "Export from lddb.com - My Collection - Export - XML, then drop it here or browse to open it.",
    browseImport: "Browse XML...",
    importArchive: "Import ZIP",
    settingsStorageLabel: "Portable application data",
    browserStorageLabel: "Browser preview data",
    browserLibraryFile: "Browser local storage",
    searchPlaceholder: "Search titles, years, catalog numbers, specs...",
    noResultsPrefix: "No titles in",
    allItems: "All Titles",
    favorites: "Favorites",
    recentlyAdded: "Recently Added",
    topRated: "Top Rated",
    collections: "Collections",
  },
  libraries: [
    { id: "laserdisc", name: "LaserDisc", glyph: "LD", kind: "physical", locked: true, hidden: false, icon: sidebarLaserdiscUrl },
    { id: "vhs", name: "VHS", glyph: "VHS", kind: "physical", locked: true, hidden: false, icon: sidebarVhsUrl },
    { id: "dvd", name: "DVD", glyph: "DVD", kind: "physical", locked: true, hidden: false, icon: sidebarDvdBlurayUrl },
    { id: "bluray", name: "Blu-ray", glyph: "BD", kind: "physical", locked: true, hidden: false, icon: sidebarDvdBlurayUrl },
    { id: "wishlist", name: "Wishlist", glyph: "WL", kind: "wishlist", locked: true, hidden: false, icon: sidebarWishlistUrl, excludeFromCategories: true },
  ],
  categories: [
    { id: "all", scope: "category:all", name: "All Titles", glyph: "ALL", icon: sidebarAllTitlesUrl, predicate: "all" },
    { id: "favorites", scope: "category:favorites", name: "Favorites", glyph: "FAV", icon: sidebarFavoritesUrl, predicate: "favorites" },
    { id: "recent", scope: "category:recent", name: "Recently Added", glyph: "NEW", icon: sidebarRecentlyAddedUrl, predicate: "recent" },
    { id: "top", scope: "category:top", name: "Top Rated", glyph: "TOP", icon: sidebarTopRatedUrl, predicate: "top" },
  ],
  features: {
    apiKeys: true,
    lddbCoverLookup: true,
    localTrailers: true,
    mediaMetadata: true,
    tmdbMetadata: true,
  },
});

export const DEFAULT_MEDIA_LIBRARIES = LASERVAULT_APP_CONFIG.libraries;
export const DEFAULT_SIDEBAR_GLYPHS = Object.freeze(Object.fromEntries([
  ...LASERVAULT_APP_CONFIG.libraries.map((library) => [`library:${library.id}`, library.icon]).filter(([, icon]) => Boolean(icon)),
  ...LASERVAULT_APP_CONFIG.categories.map((category) => [category.scope, category.icon]).filter(([, icon]) => Boolean(icon)),
]));

export const FALLBACK_ABOUT_INFO = {
  version: "1.0.1a",
  author: "Arcanthur",
  buildDate: "Development build",
  electron: "Desktop build only",
  chromium: "Desktop build only",
  node: "Desktop build only",
};

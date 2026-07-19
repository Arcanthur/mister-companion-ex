import { createAppConfig } from "../../framework/app/createAppConfig";

export const EMULATION_APP_CONFIG = createAppConfig({
  id: "emulation",
  name: "LaunchVault",
  productName: "LaunchVault",
  description: "Emulation frontend module built on VaultKit.",
  storageNamespace: "launchvault",
  defaultLibraryId: "systems",
  initialScope: "library:systems",
  itemName: "game",
  itemNamePlural: "games",
  labels: {
    emptyBadge: "▶",
    emptyTitle: "Add game libraries",
    emptyDescription: "Point LaunchVault at ROM folders and emulator profiles to build a launchable collection.",
    searchPlaceholder: "Search games, systems, publishers, release years...",
    allItems: "All Games",
    favorites: "Favorites",
    recentlyAdded: "Recently Added",
    topRated: "Top Rated",
  },
  libraries: [
    { id: "systems", name: "Systems", glyph: "SYS", kind: "platform", locked: true, hidden: false },
    { id: "arcade", name: "Arcade", glyph: "ARC", kind: "platform", locked: true, hidden: false },
    { id: "handheld", name: "Handheld", glyph: "HH", kind: "platform", locked: true, hidden: false },
    { id: "favorites", name: "Favorites", glyph: "FAV", kind: "smart", locked: true, hidden: false },
  ],
  categories: [
    { id: "all", scope: "category:all", name: "All Games", glyph: "ALL", predicate: "all" },
    { id: "favorites", scope: "category:favorites", name: "Favorites", glyph: "FAV", predicate: "favorites" },
    { id: "recent", scope: "category:recent", name: "Recently Added", glyph: "NEW", predicate: "recent" },
    { id: "top", scope: "category:top", name: "Top Rated", glyph: "TOP", predicate: "top" },
  ],
  features: {
    externalLaunchers: true,
    coverArtwork: true,
    mediaMetadata: true,
  },
});

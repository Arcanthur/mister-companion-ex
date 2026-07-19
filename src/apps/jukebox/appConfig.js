import { createAppConfig } from "../../framework/app/createAppConfig";

export const JUKEBOX_APP_CONFIG = createAppConfig({
  id: "jukebox",
  name: "JukeVault",
  productName: "JukeVault",
  description: "Music player and jukebox module built on VaultKit.",
  storageNamespace: "jukevault",
  defaultLibraryId: "albums",
  initialScope: "library:albums",
  itemName: "track",
  itemNamePlural: "tracks",
  labels: {
    emptyBadge: "♪",
    emptyTitle: "Drop music here",
    emptyDescription: "Import folders, playlists, or metadata exports to build a jukebox library.",
    searchPlaceholder: "Search songs, albums, artists, genres...",
    allItems: "All Music",
    favorites: "Favorites",
    recentlyAdded: "Recently Added",
    topRated: "Top Rated",
  },
  libraries: [
    { id: "albums", name: "Albums", glyph: "ALB", kind: "music", locked: true, hidden: false },
    { id: "artists", name: "Artists", glyph: "ART", kind: "music", locked: true, hidden: false },
    { id: "playlists", name: "Playlists", glyph: "PL", kind: "playlist", locked: true, hidden: false },
    { id: "radio", name: "Radio", glyph: "RAD", kind: "stream", locked: true, hidden: false },
  ],
  categories: [
    { id: "all", scope: "category:all", name: "All Music", glyph: "ALL", predicate: "all" },
    { id: "favorites", scope: "category:favorites", name: "Favorites", glyph: "FAV", predicate: "favorites" },
    { id: "recent", scope: "category:recent", name: "Recently Added", glyph: "NEW", predicate: "recent" },
    { id: "top", scope: "category:top", name: "Top Rated", glyph: "TOP", predicate: "top" },
  ],
  features: {
    audioPlayback: true,
    coverArtwork: true,
    mediaMetadata: true,
  },
});

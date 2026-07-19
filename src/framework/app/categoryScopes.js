/**
 * categoryScopes.js
 * Reusable sidebar category helpers. App modules provide labels/icons; the shell
 * computes counts and matching records through these generic predicates.
 */

export const BUILT_IN_CATEGORY_PREDICATES = {
  all: () => true,
  favorites: (item) => Boolean(item.favorite),
  recent: (item, context = {}) => {
    const days = Number(context.recentDays || 90);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return new Date(item.addedAt).getTime() >= cutoff;
  },
  top: (item, context = {}) => {
    const minimum = Number(context.minimumRating || 7.5);
    return (parseFloat(item.tmdb?.tmdbRating) || parseFloat(item.rating) || 0) >= minimum;
  },
};

export function categoryScopeId(categoryId) {
  return `category:${categoryId}`;
}

export function libraryScopeId(libraryId) {
  return `library:${libraryId}`;
}

export function scopeLibraryId(scopeId) {
  return String(scopeId || "").startsWith("library:") ? String(scopeId).slice("library:".length) : null;
}

export function scopeCategoryId(scopeId) {
  return String(scopeId || "").startsWith("category:") ? String(scopeId).slice("category:".length) : null;
}

export function visibleCollectionItems(items, libraries) {
  const excludedLibraryIds = new Set((libraries || []).filter((library) => library.excludeFromCategories || library.kind === "wishlist").map((library) => library.id));
  return (items || []).filter((item) => !excludedLibraryIds.has(item.libraryId));
}

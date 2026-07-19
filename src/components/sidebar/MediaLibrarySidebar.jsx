/**
 * MediaLibrarySidebar.jsx
 * Reusable media sidebar. App-specific names, categories, and rating/recent
 * thresholds now come from the app module config instead of being hardcoded.
 */

import { SidebarGlyph } from "./SidebarGlyph";
import { BUILT_IN_CATEGORY_PREDICATES, visibleCollectionItems } from "../../framework/app/categoryScopes";

function categoryCount(category, items, appConfig) {
  const predicate = BUILT_IN_CATEGORY_PREDICATES[category.predicate || category.id] || BUILT_IN_CATEGORY_PREDICATES.all;
  return items.filter((item) => predicate(item, {
    recentDays: appConfig?.recentDays,
    minimumRating: appConfig?.minimumTopRating,
  })).length;
}

export function MediaLibrarySidebar({ open, appConfig, libraries, discs, activeScope, customGlyphs, windowControls, onSelect, onCreate }) {
  const visibleLibraries = libraries.filter((library) => !library.hidden);
  const categoryItems = visibleCollectionItems(discs, libraries);
  const categories = (appConfig?.categories || []).map((category) => ({
    ...category,
    id: category.scope || `category:${category.id}`,
    count: categoryCount(category, categoryItems, appConfig),
  }));

  return (
    <aside className={`media-library-sidebar${open ? " open" : ""}`} aria-hidden={!open}>
      <div className="media-sidebar-window-controls">{windowControls}</div>
      <div className="media-sidebar-scroll">
        <section className="media-sidebar-section">
          <h2>Libraries</h2>
          <nav aria-label="Media libraries">
            {visibleLibraries.map((library) => (
              <button type="button" key={library.id} className={activeScope === `library:${library.id}` ? "active" : ""} aria-pressed={activeScope === `library:${library.id}`} onClick={() => onSelect(`library:${library.id}`)}>
                <SidebarGlyph customGlyphs={customGlyphs} scopeId={`library:${library.id}`} fallback={library.glyph} />
                <span className="media-sidebar-label">{library.name}</span>
                <span className="media-sidebar-count">{discs.filter((disc) => disc.libraryId === library.id).length}</span>
              </button>
            ))}
          </nav>
        </section>
        <section className="media-sidebar-section">
          <h2>Categories</h2>
          <nav aria-label="Cross-library categories">
            {categories.map((category) => (
              <button type="button" key={category.id} className={activeScope === category.id ? "active" : ""} aria-pressed={activeScope === category.id} onClick={() => onSelect(category.id)}>
                <SidebarGlyph customGlyphs={customGlyphs} scopeId={category.id} fallback={category.glyph} />
                <span className="media-sidebar-label">{category.name}</span>
                <span className="media-sidebar-count">{category.count}</span>
              </button>
            ))}
          </nav>
        </section>
      </div>
      <button type="button" className="media-sidebar-new-library" onClick={onCreate}>
        <span aria-hidden="true">+</span>
        <span>New Library</span>
      </button>
    </aside>
  );
}

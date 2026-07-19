/**
 * SidebarGlyph.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: SidebarGlyphArtwork, SidebarGlyph
 */

import React from "react";
import { DEFAULT_SIDEBAR_GLYPHS } from "../../constants/libraryDefaults";

export function SidebarGlyphArtwork({ glyphUrl, fallback, className = "media-sidebar-glyph" }) {
  return (
    <span
      className={className}
      style={glyphUrl ? { "--sidebar-glyph-image": `url("${glyphUrl}")` } : undefined}
      aria-hidden="true"
    >
      {glyphUrl ? <span className={`${className}-image`} /> : fallback}
    </span>
  );
}

export function SidebarGlyph({ customGlyphs, scopeId, fallback }) {
  const glyphUrl = customGlyphs?.[scopeId] || DEFAULT_SIDEBAR_GLYPHS[scopeId];
  return <SidebarGlyphArtwork glyphUrl={glyphUrl} fallback={fallback} />;
}

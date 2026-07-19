/**
 * SpecPill.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: SpecPill
 */

import React from "react";
import { specColor, specLabel } from "../../utils/discUtils";

function SpecPillComponent({ spec, theme, expanded = false }) {
  const [bg, color, borderColor] = specColor(spec, theme);
  return <span className="spec-pill" style={{ background: bg, color, borderColor }}>{expanded ? specLabel(spec) : spec}</span>;
}

// Memoized: rendered several times per DiscCard, across every card in the grid.
export const SpecPill = React.memo(SpecPillComponent);

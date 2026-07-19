/**
 * ShadowGlowGroups.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: ShadowSettingsGroup, GlowSettingsGroup
 */

import { ColorField, RangeField, ToggleField } from "../common/FormFields";
import { themeToggleEnabled } from "../../theme/themeUtils";
import { DEFAULT_THEME } from "../../theme/themePresets";

export function ShadowSettingsGroup({ title, prefix, theme, onChange }) {
  const key = (suffix) => prefix + suffix;
  return (
    <>
      <h5>{title}</h5>
      <div className="effects-grid shape-depth-grid">
        <ToggleField label="Enable shadow" checked={themeToggleEnabled(theme[key("ShadowEnabled")] ?? DEFAULT_THEME[key("ShadowEnabled")])} onChange={(value) => onChange(key("ShadowEnabled"), value)} className="shadow-toggle-row" />
        <RangeField label="Horizontal offset" value={theme[key("ShadowOffsetX")] || DEFAULT_THEME[key("ShadowOffsetX")]} min="-32" max="32" step="1" suffix="px" onChange={(value) => onChange(key("ShadowOffsetX"), value)} />
        <RangeField label="Vertical offset" value={theme[key("ShadowOffsetY")] || DEFAULT_THEME[key("ShadowOffsetY")]} min="-32" max="48" step="1" suffix="px" onChange={(value) => onChange(key("ShadowOffsetY"), value)} />
        <RangeField label="Gaussian blur" value={theme[key("ShadowBlur")] || DEFAULT_THEME[key("ShadowBlur")]} min="0" max="96" step="1" suffix="px" onChange={(value) => onChange(key("ShadowBlur"), value)} />
        <RangeField label="Spread" value={theme[key("ShadowSpread")] || DEFAULT_THEME[key("ShadowSpread")]} min="-24" max="32" step="1" suffix="px" onChange={(value) => onChange(key("ShadowSpread"), value)} />
        <RangeField label="Shadow transparency" value={(100 - parseFloat(theme[key("ShadowOpacity")] || DEFAULT_THEME[key("ShadowOpacity")])) + "%"} min="0" max="100" step="1" suffix="%" onChange={(value) => onChange(key("ShadowOpacity"), (100 - parseFloat(value)) + "%")} />
        <ColorField label="Shadow color" value={theme[key("ShadowColor")] || DEFAULT_THEME[key("ShadowColor")]} onChange={(value) => onChange(key("ShadowColor"), value)} />
      </div>
    </>
  );
}

export function GlowSettingsGroup({ title, prefix, theme, onChange, hover = false }) {
  const key = (suffix) => prefix + suffix;
  return (
    <section className="glow-settings-group">
      <h5>{title}</h5>
      <div className="effects-grid shape-depth-grid">
        <ToggleField label="Enable glow" checked={themeToggleEnabled(theme[key("GlowEnabled")])} onChange={(value) => onChange(key("GlowEnabled"), value)} className="shadow-toggle-row" />
        <RangeField label="Glow blur" value={theme[key("GlowSize")] || DEFAULT_THEME[key("GlowSize")]} min="0" max="64" step="1" suffix="px" onChange={(value) => onChange(key("GlowSize"), value)} />
        <RangeField label="Glow spread" value={theme[key("GlowSpread")] || DEFAULT_THEME[key("GlowSpread")]} min="-8" max="20" step="1" suffix="px" onChange={(value) => onChange(key("GlowSpread"), value)} />
        {hover && <RangeField label="Hover boost" value={theme[key("GlowHoverBoost")] || DEFAULT_THEME[key("GlowHoverBoost")]} min="0" max="32" step="1" suffix="px" onChange={(value) => onChange(key("GlowHoverBoost"), value)} />}
        <RangeField label="Glow transparency" value={(100 - parseFloat(theme[key("GlowOpacity")] || DEFAULT_THEME[key("GlowOpacity")])) + "%"} min="0" max="100" step="5" suffix="%" onChange={(value) => onChange(key("GlowOpacity"), (100 - parseFloat(value)) + "%")} />
        <RangeField label="Outline transparency" value={(100 - parseFloat(theme[key("GlowOutlineOpacity")] || DEFAULT_THEME[key("GlowOutlineOpacity")])) + "%"} min="0" max="100" step="5" suffix="%" onChange={(value) => onChange(key("GlowOutlineOpacity"), (100 - parseFloat(value)) + "%")} />
        <ColorField label="Glow color" value={theme[key("GlowColor")] || DEFAULT_THEME[key("GlowColor")]} onChange={(value) => onChange(key("GlowColor"), value)} />
      </div>
    </section>
  );
}

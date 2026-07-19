/**
 * FormFields.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: RangeField, SettingsSectionHeading, ColorField, ToggleField
 */

import { colorWithOpacity, parseThemeColor } from "../../theme/themeUtils";

export function RangeField({ label, value, min, max, step, suffix, onChange }) {
  const numberValue = parseFloat(value) || 0;
  return (
    <label className="range-field">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={numberValue} onChange={(e) => onChange(e.target.value + suffix)} />
      <strong>{numberValue}{suffix}</strong>
    </label>
  );
}

export function SettingsSectionHeading({ title, description }) {
  return (
    <div className="settings-group-header">
      <h4>{title}</h4>
      {description && <p>{description}</p>}
    </div>
  );
}

export function ColorField({ label, value, onChange, allowTransparency = true }) {
  const parsed = parseThemeColor(value);
  const transparency = Math.round((1 - parsed.opacity) * 100);
  return (
    <div className="color-field">
      <span className="color-field-label">{label}</span>
      <div className="color-value-row">
        <label className="color-picker-circle" style={{ "--color-picker-current": parsed.hex }}>
          <input aria-label={`${label} color picker`} type="color" value={parsed.hex} onChange={(event) => onChange(colorWithOpacity(event.target.value, parsed.opacity))} />
        </label>
        <input aria-label={`${label} color value`} value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
      {allowTransparency && (
        <label className="color-alpha-row">
          <span>Transparency</span>
          <input aria-label={`${label} transparency`} type="range" min="0" max="100" step="1" value={transparency} onChange={(event) => onChange(colorWithOpacity(parsed.hex, 1 - Number(event.target.value) / 100))} />
          <strong>{transparency}%</strong>
        </label>
      )}
    </div>
  );
}

export function ToggleField({ label, checked, onChange, className = "" }) {
  return (
    <label className={`settings-toggle-row${className ? " " + className : ""}`}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="settings-toggle-track" aria-hidden="true"><span /></span>
    </label>
  );
}

/**
 * ThemePreviewWindow.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: ThemePreviewWindow, loadThemePreviewTheme, storeThemePreviewTheme, openThemePreviewWindow, updateThemePreviewWindow, ThemePreviewApp
 */

import { useState, useEffect } from "react";
import { hydrateTheme, themeStyle, themeToggleEnabled, useCustomFont } from "../../theme/themeUtils";
import { DEFAULT_THEME } from "../../theme/themePresets";
import { ToggleField } from "../common/FormFields";
import { THEME_PREVIEW_STORAGE_KEY } from "../../constants/storageKeys";
import { getHostBridge } from "../../framework/host/hostBridge";

export function ThemePreviewWindow({ theme, onClose, standalone = false }) {
  const [sampleToggle, setSampleToggle] = useState(true);
  const compactHeader = themeToggleEnabled(theme.compactHeaderEnabled ?? DEFAULT_THEME.compactHeaderEnabled);
  const compactFilterBar = themeToggleEnabled(theme.compactFilterBarEnabled ?? DEFAULT_THEME.compactFilterBarEnabled);
  const compactFooter = themeToggleEnabled(theme.compactFooterEnabled ?? DEFAULT_THEME.compactFooterEnabled);
  return (
    <aside className={`theme-preview-window app-style-${theme.appStyle || "classic"}${compactHeader ? " compact-header" : ""}${compactFilterBar ? " compact-filter" : ""}${compactFooter ? " compact-footer" : ""}${standalone ? " standalone" : ""}`} style={themeStyle(theme)} aria-label="Theme preview">
      <div className="theme-preview-titlebar">
        <strong>Theme preview</strong>
        <button type="button" className="theme-preview-close" aria-label="Close theme preview" onClick={onClose}>
          <span className="window-control-glyph window-close-glyph" aria-hidden="true" />
        </button>
      </div>
      <div className="theme-preview-canvas">
        <section className="theme-preview-header">
          <span className="preview-label">Header</span>
          <strong>VaultKit</strong>
          <div className="preview-header-actions"><span /><span /><span /></div>
        </section>
        <section className="theme-preview-filter">
          <span className="preview-label">Filter bar</span>
          <div className="preview-search">Search library</div>
          <div className="preview-select">Title A-Z <span className="custom-select-chevron" /></div>
        </section>
        <div className="theme-preview-body">
          <section className="theme-preview-card">
            <span className="preview-label">Grid card</span>
            <div className="preview-poster">LASERDISC</div>
            <strong>Sample title</strong>
            <span className="preview-meta">1994 · ★ 8.2 · PG-13</span>
            <div className="spec-row">
              <span className="spec-pill">LBX</span>
              <span className="spec-pill">SRD</span>
            </div>
          </section>
          <section className="theme-preview-controls">
            <span className="preview-label">Controls</span>
            <label><span>Text input</span><input value="Sample value" readOnly /></label>
            <label><span>Slider</span><input type="range" min="0" max="100" defaultValue="62" /></label>
            <ToggleField label="Toggle" checked={sampleToggle} onChange={setSampleToggle} />
            <div className="preview-button-row">
              <button type="button" className="secondary-button">Secondary</button>
              <button type="button" className="primary-small">Primary</button>
            </div>
            <div className="preview-type-samples">
              <strong>Main text</strong>
              <span>Muted text</span>
              <small>Faint text</small>
            </div>
          </section>
        </div>
        <section className="theme-preview-footer">
          <span className="preview-label">Footer</span>
          <span>24 discs</span>
          <div className="preview-view-icons"><i /><i /><i /></div>
        </section>
      </div>
    </aside>
  );
}

export function loadThemePreviewTheme() {
  try {
    return hydrateTheme(JSON.parse(localStorage.getItem(THEME_PREVIEW_STORAGE_KEY) || "{}"));
  } catch {
    return DEFAULT_THEME;
  }
}

export function storeThemePreviewTheme(theme) {
  localStorage.setItem(THEME_PREVIEW_STORAGE_KEY, JSON.stringify(theme));
}

export function openThemePreviewWindow(theme) {
  storeThemePreviewTheme(theme);
  if (getHostBridge()?.openThemePreview) return getHostBridge().openThemePreview(theme);
  const previewUrl = new URL(window.location.href);
  previewUrl.search = "?themePreview=1";
  window.open(previewUrl.toString(), "VaultKitThemePreview", "popup,width=520,height=540,resizable=yes");
  return null;
}

export function updateThemePreviewWindow(theme) {
  storeThemePreviewTheme(theme);
  return getHostBridge()?.updateThemePreview?.(theme);
}

export function ThemePreviewApp() {
  const [theme, setTheme] = useState(loadThemePreviewTheme);
  useCustomFont(theme);
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "VaultKit Theme Preview";
    document.documentElement.classList.add("theme-preview-document");
    const removeThemeListener = getHostBridge()?.onThemePreviewUpdate?.((nextTheme) => {
      setTheme(hydrateTheme(nextTheme));
    });
    const handleStorage = (event) => {
      if (event.key !== THEME_PREVIEW_STORAGE_KEY || !event.newValue) return;
      try {
        setTheme(hydrateTheme(JSON.parse(event.newValue)));
      } catch {}
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      document.documentElement.classList.remove("theme-preview-document");
      document.title = previousTitle;
      window.removeEventListener("storage", handleStorage);
      removeThemeListener?.();
    };
  }, []);
  const closePreview = () => {
    if (getHostBridge()?.closeWindow) getHostBridge().closeWindow();
    else window.close();
  };
  return <ThemePreviewWindow theme={theme} onClose={closePreview} standalone />;
}

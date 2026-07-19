import React from "react";
import { DEFAULT_THEME } from "../../theme/themePresets";
import { themeStyle, themeToggleEnabled } from "../../theme/themeUtils";

/**
 * Reusable glass/acrylic window frame. App modules provide the children;
 * VaultKit owns the consistent window surface and theme class plumbing.
 */
export function AppShellFrame({
  shellRef,
  theme,
  windowFocused,
  windowMaximized,
  windowAnimation,
  leftWindowControlsEnabled,
  sidebarOpen,
  hasLibrary,
  children,
}) {
  return (
    <div className={`app-window-frame ${windowFocused ? "window-focused" : "window-unfocused"}${windowMaximized ? " is-maximized" : ""}${windowAnimation ? ` window-animation-${windowAnimation}` : ""}`} style={themeStyle(theme)}>
      <div className="app-window-shadow-layer" aria-hidden="true" />
      <div className="app-window-outer-glow-layer" aria-hidden="true" />
      <div className="app-window-border-layer" aria-hidden="true" />
      <div className="app-window-surface">
        <div className="app-window-inner-glow-layer" aria-hidden="true" />
        <div ref={shellRef} className={`app-shell app-style-${theme.appStyle || "classic"} window-controls-${theme.windowControlStyle || DEFAULT_THEME.windowControlStyle}${leftWindowControlsEnabled ? " window-controls-left" : ""}${themeToggleEnabled(theme.compactHeaderEnabled ?? DEFAULT_THEME.compactHeaderEnabled) ? " compact-header" : ""}${themeToggleEnabled(theme.compactFilterBarEnabled ?? DEFAULT_THEME.compactFilterBarEnabled) ? " compact-filter" : ""}${themeToggleEnabled(theme.compactFooterEnabled ?? DEFAULT_THEME.compactFooterEnabled) ? " compact-footer" : ""}${themeToggleEnabled(theme.cleanSidebarEnabled ?? DEFAULT_THEME.cleanSidebarEnabled) ? " clean-sidebars" : ""}${themeToggleEnabled(theme.respectReducedMotionEnabled ?? DEFAULT_THEME.respectReducedMotionEnabled) ? " motion-respect-reduced" : ""}${themeToggleEnabled(theme.mac9ScrollbarButtonsAtBottom ?? DEFAULT_THEME.mac9ScrollbarButtonsAtBottom) ? " mac9-scrollbar-buttons-bottom" : ""}${sidebarOpen ? " media-sidebar-open" : ""}${hasLibrary ? " has-library" : ""}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

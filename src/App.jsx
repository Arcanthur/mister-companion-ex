import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AppShellFrame } from "./framework/layout/AppShellFrame";
import { getHostBridge } from "./framework/host/hostBridge";
import { WindowControls } from "./components/window/WindowControls";
import { SettingsModal } from "./components/settings/SettingsModal";
import { SettingsSectionHeading } from "./components/common/FormFields";
import { CustomSelect } from "./components/common/CustomSelect";
import { ThemeAwareSelect } from "./components/common/ThemeAwareSelect";
import { ThemedScrollbar } from "./components/common/ThemedScrollbar";
import { WindowTitlebar } from "./components/common/WindowTitlebar";
import { DEFAULT_THEME } from "./theme/themePresets";
import { THEME_PRESETS, applyStyleSelection, hydrateTheme, saveSavedThemes, themeToggleEnabled, useCustomFont } from "./theme/themeUtils";
import { MISTER_APP_CONFIG, MISTER_SAVED_THEMES_STORAGE_KEY, MISTER_SIDEBAR_GLYPHS_STORAGE_KEY, MISTER_THEME_STORAGE_KEY, misterThemeAssetUrl } from "./apps/mister/appConfig";

const MISTER_INSTALL_ARTWORK_STORAGE_KEY = "mister-companion:install-artwork:v1";

const misterWordmarkUrl = misterThemeAssetUrl("mister-companion-ex-logo.png");
const macos9SettingsGlyphUrl = misterThemeAssetUrl("macos9/settings.svg");


const SECTION_PROBE_CACHE_MS = {
  dashboard: 30_000,
  connection: 12_000,
  profiles: 300_000,
  device: 180_000,
  remote: 45_000,
  files: 120_000,
  install: 900_000,
  scripts: 300_000,
  saves: 300_000,
  manuals: 600_000,
  flash: 300_000,
  zapscripts: 30_000,
  zapscraper: 300_000,
  retroachievements: 600_000,
  settings: 300_000,
  backend: 30_000,
};

function isDomEvent(value) {
  return Boolean(value && typeof value === "object" && ("currentTarget" in value || "nativeEvent" in value || "preventDefault" in value));
}

function coerceRefreshOptions(options) {
  if (isDomEvent(options)) return { force: true };
  if (!options || typeof options !== "object") return {};
  return options;
}

function safeJson(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function isThemeObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeMisterThemeList(themes = []) {
  const byName = new Map();
  for (const item of themes || []) {
    const name = String(item?.name || "").trim();
    const theme = item?.theme;
    if (!name || !isThemeObject(theme)) continue;
    byName.set(name, { name, theme: hydrateTheme(theme) });
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function buildMisterDefaultSidebarGlyphs(appConfig = MISTER_APP_CONFIG) {
  const entries = [];
  for (const section of appConfig.sidebar || []) {
    for (const item of section.items || []) {
      if (item?.id && item?.iconImage) entries.push([`library:${item.id}`, item.iconImage]);
    }
  }
  return Object.freeze(Object.fromEntries(entries));
}

function loadMisterPortableThemeState() {
  try {
    const state = getHostBridge()?.loadThemeState?.();
    return state && typeof state === "object" ? state : null;
  } catch {
    return null;
  }
}

function loadMisterTheme() {
  const portableState = loadMisterPortableThemeState();
  if (isThemeObject(portableState?.activeTheme)) return hydrateTheme(portableState.activeTheme);
  const saved = safeJson(localStorage.getItem(MISTER_THEME_STORAGE_KEY), null);
  return hydrateTheme(saved?.theme || DEFAULT_THEME);
}

function saveMisterTheme(theme) {
  localStorage.setItem(MISTER_THEME_STORAGE_KEY, JSON.stringify({ theme }));
}

function loadMisterSavedThemes() {
  const portableState = loadMisterPortableThemeState();
  let portableThemeFiles = [];
  try {
    const loaded = getHostBridge()?.loadThemes?.();
    if (Array.isArray(loaded)) portableThemeFiles = loaded;
  } catch {}
  const saved = safeJson(localStorage.getItem(MISTER_SAVED_THEMES_STORAGE_KEY), []);
  const legacyThemes = Array.isArray(saved) ? saved : [];
  return normalizeMisterThemeList([
    ...legacyThemes,
    ...(Array.isArray(portableState?.savedThemes) ? portableState.savedThemes : []),
    ...portableThemeFiles,
  ]);
}

function saveMisterSavedThemes(themes) {
  const normalized = normalizeMisterThemeList(themes);
  localStorage.setItem(MISTER_SAVED_THEMES_STORAGE_KEY, JSON.stringify(normalized));
  try { saveSavedThemes(normalized); } catch {}
}

function loadMisterSidebarGlyphs() {
  const portableState = loadMisterPortableThemeState();
  if (portableState?.sidebarGlyphs && typeof portableState.sidebarGlyphs === "object" && !Array.isArray(portableState.sidebarGlyphs)) return portableState.sidebarGlyphs;
  const saved = safeJson(localStorage.getItem(MISTER_SIDEBAR_GLYPHS_STORAGE_KEY), {});
  return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
}

function saveMisterSidebarGlyphs(glyphs) {
  localStorage.setItem(MISTER_SIDEBAR_GLYPHS_STORAGE_KEY, JSON.stringify(glyphs || {}));
}

function saveMisterPortableThemeState({ theme, sidebarGlyphs }) {
  try {
    getHostBridge()?.saveThemeState?.({
      activeTheme: theme,
      sidebarGlyphs: sidebarGlyphs || {},
    })?.catch?.(() => {});
  } catch {}
}

function loadMisterInstallArtwork() {
  const saved = safeJson(localStorage.getItem(MISTER_INSTALL_ARTWORK_STORAGE_KEY), {});
  return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
}

function saveMisterInstallArtwork(artwork) {
  localStorage.setItem(MISTER_INSTALL_ARTWORK_STORAGE_KEY, JSON.stringify(artwork || {}));
}

const INSTALL_DEFAULT_ARTWORK = {
  cores: misterThemeAssetUrl("install-center/defaults/cores.png"),
  extras: misterThemeAssetUrl("install-center/defaults/extras.png"),
  roms: misterThemeAssetUrl("install-center/defaults/roms.png"),
  scripts: misterThemeAssetUrl("install-center/defaults/scripts.png"),
  wallpaper_packs: misterThemeAssetUrl("install-center/defaults/wallpaper_packs.png"),
};

function resolveBundledInstallArtwork(value, category) {
  const text = String(value || "").trim();
  if (!text) return INSTALL_DEFAULT_ARTWORK[category] || "";
  if (text.startsWith("http://") || text.startsWith("https://") || text.startsWith("data:") || text.startsWith("blob:")) return text;
  const normalized = text.replace(/\\/g, "/").replace(/[?#].*$/, "");
  const thumbnailMatch = normalized.match(/(?:^|\/)assets\/thumbnails\/(.+\.(?:png|jpe?g|webp))$/i);
  if (thumbnailMatch) {
    return misterThemeAssetUrl(`install-center/thumbnails/${thumbnailMatch[1]}`);
  }
  const defaultMatch = normalized.match(/(?:^|\/)defaults\/([^/]+\.png)$/i);
  if (defaultMatch) {
    const key = defaultMatch[1].replace(/\.png$/i, "");
    return INSTALL_DEFAULT_ARTWORK[key] || INSTALL_DEFAULT_ARTWORK[category] || "";
  }
  return text;
}

function getInstallItemArtwork(item, artworkMap) {
  if (!item) return "";
  const custom = artworkMap?.[item.id];
  if (custom) return custom;
  return resolveBundledInstallArtwork(item.artwork || item.resolved_thumbnail || item.thumbnail || item.image || item.icon, item.category);
}

function useWindowState(host) {
  const [windowMaximized, setWindowMaximized] = useState(false);
  const [windowFocused, setWindowFocused] = useState(true);

  useEffect(() => {
    let active = true;
    host?.isWindowMaximized?.().then((value) => active && setWindowMaximized(Boolean(value))).catch(() => {});
    const unsubscribe = host?.onWindowMaximizedChange?.((value) => active && setWindowMaximized(Boolean(value)));
    return () => { active = false; unsubscribe?.(); };
  }, [host]);

  useEffect(() => {
    let active = true;
    host?.isWindowFocused?.().then((value) => active && setWindowFocused(Boolean(value))).catch(() => {});
    const unsubscribe = host?.onWindowFocusChange?.((value) => active && setWindowFocused(Boolean(value)));
    return () => { active = false; unsubscribe?.(); };
  }, [host]);

  return { windowMaximized, windowFocused };
}

function useWindowDrag(host) {
  const dragging = useRef(false);
  return {
    onPointerDown: (event) => {
      if (event.button !== 0 || event.target.closest("button,input,select,textarea,a")) return;
      dragging.current = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      host?.startWindowMove?.({ x: event.screenX, y: event.screenY });
    },
    onPointerMove: (event) => {
      if (!dragging.current) return;
      host?.updateWindowMove?.({ x: event.screenX, y: event.screenY });
    },
    onPointerUp: (event) => {
      if (!dragging.current) return;
      dragging.current = false;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      host?.endWindowMove?.();
    },
    onPointerCancel: () => {
      if (!dragging.current) return;
      dragging.current = false;
      host?.endWindowMove?.();
    },
  };
}

function StatusPill({ connected, sdMode }) {
  const sdActive = Boolean(sdMode?.active);
  const className = connected ? "connected" : sdActive ? "connected sd-mode" : "disconnected";
  const label = connected ? "Connected" : sdActive ? "SD Card Mode" : "Disconnected";
  return <span className={`mister-status-pill ${className}`}>{label}</span>;
}

function storageModeLabel(connection, sdMode) {
  if (connection?.connected) return "Connected MiSTer";
  if (sdMode?.active) return "SD Card Mode";
  return "Offline";
}

function EmptyValue({ children = "Not loaded" }) {
  return <span className="mister-empty-value">{children}</span>;
}

function ThemedConfirmModal({ dialog, onResolve }) {
  if (!dialog) return null;
  const title = dialog.title || "Confirm action";
  const confirmLabel = dialog.confirmLabel || "Continue";
  const cancelLabel = dialog.cancelLabel || "Cancel";
  const tone = dialog.tone || "default";
  return (
    <div className="modal-backdrop mister-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onResolve(false); }}>
      <div className={`modal mister-confirm-modal tone-${tone}`} role="dialog" aria-modal="true" aria-labelledby="mister-confirm-title" aria-describedby="mister-confirm-message">
        <WindowTitlebar title={title} onClose={() => onResolve(false)} closeLabel="Cancel" />
        <header className="mister-confirm-header">
          <div>
            <span className="mister-confirm-eyebrow">Confirmation</span>
            <h2 id="mister-confirm-title">{title}</h2>
          </div>
          <button className="settings-close-button mister-confirm-close" type="button" aria-label="Cancel" onClick={() => onResolve(false)}><span className="window-control-glyph window-close-glyph" /></button>
        </header>
        <p id="mister-confirm-message" className="mister-confirm-message">{dialog.message}</p>
        <footer className="mister-confirm-actions">
          <button className="secondary-button" type="button" onClick={() => onResolve(false)}>{cancelLabel}</button>
          <button className={tone === "danger" ? "danger-button" : "primary-button"} type="button" onClick={() => onResolve(true)} autoFocus>{confirmLabel}</button>
        </footer>
      </div>
    </div>
  );
}

function HamburgerIcon() {
  return <span className="mister-hamburger-icon" aria-hidden="true"><span></span><span></span><span></span></span>;
}

function SidebarNavGlyph({ item, glyphs, theme }) {
  const customGlyph = glyphs?.[`library:${item.id}`];
  const appStyle = String(theme?.appStyle || theme?.style || "").toLowerCase();
  const imageGlyph = customGlyph || (appStyle === "macos9platinum" ? (item.macos9IconImage || item.iconImage) : appStyle === "windows9x" ? (item.win9xIconImage || item.iconImage) : item.iconImage);
  if (imageGlyph) {
    return (
      <span className="media-sidebar-glyph custom-sidebar-glyph" aria-hidden="true">
        <span className="media-sidebar-glyph-image" style={{ "--sidebar-glyph-image": `url("${imageGlyph}")` }} />
      </span>
    );
  }
  return <span className="media-sidebar-glyph" aria-hidden="true">{item.icon}</span>;
}

function StatusCheckBar({ active, label = "Checking status…" }) {
  if (!active) return null;
  return (
    <div className="mister-status-check" role="status" aria-live="polite">
      <div className="mister-status-check-copy">{label}</div>
      <div className="mister-status-check-track"><span /></div>
    </div>
  );
}

function PageHeader({ title, subtitle, badge, badgeBare = false, checking = false, checkLabel = "Checking status…" }) {
  return (
    <div className={`mister-page-header${checking ? " checking" : ""}`} data-check-label={checking ? checkLabel : undefined}>
      <div className="mister-page-header-copy">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {badge ? <div className="mister-page-header-status-slot"><span className={badgeBare ? "mister-page-badge bare" : "mister-page-badge"}>{badge}</span></div> : null}
    </div>
  );
}

function Field({ label, children }) {
  return <label className="mister-field"><span>{label}</span>{children}</label>;
}

function Card({ title, children, footer, className = "", sectionRef = null, style = undefined }) {
  return <section ref={sectionRef} style={style} className={`mister-card ${className}`}><h2>{title}</h2><div className="mister-card-body">{children}</div>{footer ? <div className="mister-card-footer">{footer}</div> : null}</section>;
}

function LogBox({ value }) {
  return <pre className="mister-log-box">{value || "No output yet."}</pre>;
}

export function ThemeSettingsModal({ theme, savedThemes, onThemeChange, onSavedThemesChange, onClose }) {
  const [saveName, setSaveName] = useState("");
  const presets = useMemo(() => [...THEME_PRESETS, ...savedThemes.map((item) => ({ name: item.name, theme: item.theme, saved: true }))], [savedThemes]);
  const colorFields = [
    ["appBackground", "App Background"],
    ["panelBackground", "Panels"],
    ["modalBackground", "Modal Surface"],
    ["borderColor", "Borders"],
    ["highlightColor", "Accent"],
    ["textColor", "Text"],
    ["mutedTextColor", "Muted Text"],
    ["mediaSidebarBackgroundColor", "Sidebar"],
    ["mediaSidebarBorderColor", "Sidebar Divider"],
    ["mediaSidebarDividerColor", "Sidebar Section Lines"],
    ["mediaSidebarButtonActiveBackgroundColor", "Sidebar Active"],
  ];
  const update = (changes) => onThemeChange(hydrateTheme({ ...theme, ...changes }));
  const saveCurrent = () => {
    const name = saveName.trim() || `MiSTer Theme ${savedThemes.length + 1}`;
    const next = [...savedThemes.filter((item) => item.name !== name), { name, theme }];
    onSavedThemesChange(next);
    setSaveName("");
  };
  return (
    <div className="modal-backdrop">
      <div className="modal mister-theme-modal">
        <WindowTitlebar title="Theme Configuration" onClose={onClose} />
        <div className="mister-modal-header">
          <div>
            <h2>Theme Configuration</h2>
            <p>Fine-tune the MiSTer Companion EX window style.</p>
          </div>
          <button className="icon-button" onClick={onClose}>×</button>
        </div>

        <div className="mister-theme-grid">
          <Card title="Presets">
            <div className="mister-preset-grid">
              {presets.map((preset, index) => (
                <button key={`${preset.name}-${index}`} className="mister-preset" onClick={() => onThemeChange(hydrateTheme(preset.theme))}>
                  <span style={{ background: preset.theme?.appBackground || DEFAULT_THEME.appBackground }} />
                  <strong>{preset.name}</strong>
                  <em>{preset.saved ? "Saved" : "Built in"}</em>
                </button>
              ))}
            </div>
          </Card>

          <Card title="Shell Style">
            <div className="mister-segmented">
              {['classic', 'glass', 'minimal', 'neon', 'brutalist'].map((style) => (
                <button key={style} className={theme.appStyle === style ? "active" : ""} onClick={() => onThemeChange(applyStyleSelection(theme, style))}>{style}</button>
              ))}
            </div>
            <div className="mister-slider-row">
              <span>Sidebar opacity</span>
              <input type="range" min="0.35" max="1" step="0.05" value={Number(theme.mediaSidebarSurfaceOpacity || 1)} onChange={(event) => update({ mediaSidebarSurfaceOpacity: event.target.value })} />
              <strong>{theme.mediaSidebarSurfaceOpacity || 1}</strong>
            </div>
            <div className="mister-slider-row">
              <span>Blur</span>
              <input type="range" min="0" max="36" step="1" value={parseInt(theme.mediaSidebarBlurAmount || "0", 10) || 0} onChange={(event) => update({ mediaSidebarBlurAmount: `${event.target.value}px`, headerBlurAmount: `${event.target.value}px`, footerBlurAmount: `${event.target.value}px` })} />
              <strong>{theme.mediaSidebarBlurAmount || "0px"}</strong>
            </div>
          </Card>

          <Card title="Core Colors" className="mister-color-card">
            {colorFields.map(([key, label]) => (
              <label key={key} className="mister-color-field"><span>{label}</span><input type="color" value={String(theme[key] || DEFAULT_THEME[key] || "#000000").slice(0, 7)} onChange={(event) => update({ [key]: event.target.value })} /></label>
            ))}
          </Card>

          <Card title="Save Theme">
            <div className="mister-save-theme-row">
              <input value={saveName} onChange={(event) => setSaveName(event.target.value)} placeholder="Theme name" />
              <button className="primary-small" onClick={saveCurrent}>Save</button>
            </div>
            <div className="mister-action-row">
              <button className="secondary-button" onClick={() => onThemeChange(hydrateTheme(DEFAULT_THEME))}>Reset</button>
              <button className="primary-button" onClick={onClose}>Done</button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CommandRunnerCard({ commandOutput, runCommand, startCommandJob, connected, busy }) {
  const [command, setCommand] = useState("uname -a");
  return (
    <Card title="Command Runner">
      <div className="mister-save-theme-row mister-command-runner-row">
        <input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Command" />
        <button className="primary-small" disabled={!connected || busy} onClick={() => runCommand(command)}>Run Now</button>
        <button className="secondary-button" disabled={!connected || busy} onClick={() => startCommandJob(command)}>Run as Job</button>
      </div>
      <LogBox value={commandOutput} />
    </Card>
  );
}

function DashboardPage({ state, summary, commandOutput, runCommand, startCommandJob, refresh, setPage, connected, busy, checking }) {
  const isConnected = connected ?? state.connection?.connected;
  const raw = summary?.raw || {};
  return (
    <>
      <PageHeader title="MiSTer Companion EX" subtitle="MiSTer tools, saves, installs, and media helpers in one polished desktop app." badge="Ready" checking={checking} checkLabel="Loading dashboard…" />
      <div className="mister-card-grid four">
        <Card title="App"><strong>{state.backend?.version || "Unknown"}</strong><p>{state.backend?.python ? "Runtime ready" : "Starting up"}</p></Card>
        <Card title="Connection"><strong>{isConnected ? state.connection.host : "Offline"}</strong><p>{isConnected ? `Profile: ${state.connection.profileName || "manual"}` : "Not connected"}</p></Card>
        <Card title="Profiles"><strong>{state.profiles.length}</strong><p>Saved MiSTer devices</p></Card>
        <Card title="Install Center"><strong>{state.catalog?.items?.length || 0}</strong><p>Available items</p></Card>
      </div>
      <div className="mister-card-grid two">
        <Card title="Quick Actions">
          <div className="mister-action-row wrap">
            <button className="primary-button" onClick={() => setPage("connection")}>{isConnected ? "Manage Connection" : "Connect"}</button>
            <button className="secondary-button" onClick={() => setPage("device")}>Device Summary</button>
            <button className="secondary-button" onClick={() => setPage("install")}>Install Center</button>
            <button className="secondary-button" onClick={refresh}>Refresh</button>
          </div>
        </Card>
        <Card title="At a Glance">
          <div className="mister-stat-list compact">
            <div><span>Connection</span><strong>{isConnected ? "Online" : "Offline"}</strong></div>
            <div><span>Profiles</span><strong>{state.profiles.length}</strong></div>
            <div><span>Catalog</span><strong>{state.catalog?.items?.length || 0}</strong></div>
          </div>
        </Card>
      </div>
      <div className="mister-card-grid two mister-dashboard-advanced-grid">
        <Card title="Raw Storage Output"><LogBox value={raw.storage} /></Card>
        <CommandRunnerCard commandOutput={commandOutput} runCommand={runCommand} startCommandJob={startCommandJob} connected={isConnected} busy={busy} />
      </div>
    </>
  );
}

function ConnectionPage({ profiles, connection, sdMode, chooseSdRoot, enableSdMode, disableSdMode, draft, setDraft, selectedIndex, setSelectedIndex, scanResults, onScan, onUseScanResult, onSave, onDelete, onConnect, onDisconnect, onTest, busy, scanning, checking, platinumStyle = false }) {
  const profileListRef = useRef(null);
  const selected = profiles[selectedIndex] || null;
  useEffect(() => {
    if (selected) setDraft({ ...selected, password: selected.password || "" });
  }, [selected, setDraft]);
  return (
    <>
      <PageHeader title="Connection" subtitle="Saved MiSTer profiles, SSH controls, and local SD Card Mode." badge={<StatusPill connected={connection?.connected} sdMode={sdMode} />} badgeBare checking={checking} checkLabel="Checking connection…" />
      <div className="mister-card-grid two connection-layout">
        <Card title="Saved Profiles">
          {platinumStyle ? (
            <div className="mister-profile-dropdown-shell">
              <CustomSelect
                value={String(selectedIndex)}
                onChange={(value) => setSelectedIndex(Number.parseInt(value, 10))}
                ariaLabel="Saved profile"
                options={profiles.map((profile, index) => ({ value: String(index), label: profile.name || `Profile ${index + 1}` }))}
                placeholder={profiles.length ? "Choose a saved profile" : "No saved profiles yet"}
                disabled={!profiles.length}
              />
            </div>
          ) : (
            <div className="mister-profile-list-shell">
              <div ref={profileListRef} className="mister-profile-list">
                {profiles.length ? profiles.map((profile, index) => (
                  <button key={`${profile.name}-${index}`} className={index === selectedIndex ? "active" : ""} onClick={() => setSelectedIndex(index)}>
                    <strong>{profile.name}</strong><span>{profile.ip || profile.host || "No IP"}</span>
                  </button>
                )) : <EmptyValue>No saved profiles yet.</EmptyValue>}
              </div>
              <ThemedScrollbar scrollRef={profileListRef} className="mister-profile-themed-scrollbar" />
            </div>
          )}
          <div className="mister-action-row">
            <button className="secondary-button" onClick={() => { setSelectedIndex(-1); setDraft({ name: "", ip: "", username: "root", password: "", use_ssh_agent: false, look_for_ssh_keys: false }); }}>New Profile</button>
            <button className="secondary-button" onClick={onScan} disabled={busy || scanning}>{scanning ? "Scanning…" : "Scan Network"}</button>
            <button className="secondary-button danger" onClick={onDelete} disabled={selectedIndex < 0}>Delete</button>
          </div>
          {scanResults?.devices?.length ? (
            <div className="mister-network-scan-list">
              <h3>Discovered devices</h3>
              {scanResults.devices.map((device) => (
                <button key={device.ip} type="button" onClick={() => onUseScanResult(device)}>
                  <span><strong>{device.label || device.hostname || "MiSTer"}</strong><small>{device.ip}</small></span>
                  <em>Use</em>
                </button>
              ))}
            </div>
          ) : scanResults?.message ? <p className="mister-scan-note">{scanResults.message}</p> : null}
        </Card>

        <Card title="Profile Details">
          <div className="mister-form-grid">
            <Field label="Name"><input value={draft.name || ""} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="MiSTer OG" /></Field>
            <Field label="IP Address"><input value={draft.ip || ""} onChange={(event) => setDraft({ ...draft, ip: event.target.value })} placeholder="192.168.1.91" /></Field>
            <Field label="Username"><input value={draft.username || "root"} onChange={(event) => setDraft({ ...draft, username: event.target.value })} /></Field>
            <Field label="Password"><input type="password" value={draft.password || ""} onChange={(event) => setDraft({ ...draft, password: event.target.value })} /></Field>
          </div>
          <div className="mister-toggle-row">
            <label><input type="checkbox" checked={Boolean(draft.use_ssh_agent)} onChange={(event) => setDraft({ ...draft, use_ssh_agent: event.target.checked })} /> Use OS SSH Agent</label>
            <label><input type="checkbox" checked={Boolean(draft.look_for_ssh_keys)} onChange={(event) => setDraft({ ...draft, look_for_ssh_keys: event.target.checked })} /> Use local SSH key files</label>
          </div>
          <div className="mister-action-row">
            <button className="secondary-button" onClick={onSave} disabled={busy}>Save Profile</button>
            <button className="secondary-button" onClick={onTest} disabled={busy}>Test SSH</button>
            <button className="primary-button platinum-primary-action" onClick={onConnect} disabled={busy}>{connection?.connected ? "Reconnect" : "Connect"}</button>
            <button className="secondary-button" onClick={onDisconnect} disabled={busy || !connection?.connected}>Disconnect</button>
          </div>
        </Card>
      </div>

      <Card title="SD Card Mode" className="mister-sd-mode-card">
        <div className="mister-sd-mode-layout">
          <div className="mister-path-list">
            <div><span>Mode</span><strong>{sdMode?.active ? "Active" : sdMode?.enabled ? "Configured" : "Off"}</strong></div>
            <div><span>Folder</span><code>{sdMode?.root || "Choose the mounted SD Card root"}</code></div>
            <div><span>Status</span><strong>{sdMode?.reason || "Not configured"}</strong></div>
          </div>
          <div className="mister-action-row wrap">
            <button className="secondary-button" onClick={chooseSdRoot} disabled={busy}>Choose SD Folder</button>
            <button className="primary-button" onClick={enableSdMode} disabled={busy || !sdMode?.root}>Enable SD Card Mode</button>
            <button className="secondary-button" onClick={disableSdMode} disabled={busy || !sdMode?.enabled}>Disable SD Card Mode</button>
          </div>
        </div>
        <p className="mister-settings-note">SD Card Mode lets supported sections work directly against a mounted MiSTer SD card: MiSTer.ini editing, SaveManager, Install Center status/install paths, and offline update_all.</p>
      </Card>
    </>
  );
}

function StorageMeter({ title, info }) {
  if (!info || info.error) {
    return <Card title={title}><EmptyValue>{info?.error || "Not detected"}</EmptyValue></Card>;
  }
  const percent = Number(info.percent || 0);
  return (
    <Card title={title}>
      <div className="mister-storage-meter">
        <div className="mister-storage-meter-bar"><span style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} /></div>
        <strong>{info.label || `${percent}% used`}</strong>
        {info.present === false ? <p>No USB storage detected.</p> : null}
      </div>
    </Card>
  );
}

function UptimeValue({ value }) {
  const text = String(value || "Unknown").trim();
  const matches = [...text.matchAll(/(\d+)\s*(hr|min|sec)/gi)];
  if (!matches.length) return <strong>{text}</strong>;
  return (
    <strong className="mister-uptime-value" aria-label={text}>
      {matches.map((match, index) => (
        <React.Fragment key={`${match[1]}-${match[2]}-${index}`}>
          {index > 0 ? <span className="mister-uptime-space"> </span> : null}
          <span className="mister-uptime-number">{match[1]}</span><span className="mister-uptime-unit">{match[2].toLowerCase()}</span>
        </React.Fragment>
      ))}
    </strong>
  );
}

function DeviceSummaryValue({ card }) {
  if (card?.label === "Uptime") return <UptimeValue value={card.value} />;
  return <strong>{card?.value}</strong>;
}

function DevicePage({ summary, refreshDevice, setSmbEnabled, returnToMenu, rebootMiSTer, connected, busy, checking }) {
  const nowPlaying = summary?.nowPlaying || {};
  const storage = summary?.storage || {};
  const smbEnabled = summary?.smbEnabled;
  return (
    <>
      <PageHeader title="Device" subtitle="MiSTer status, storage, core, and system actions." badge={connected ? "Online" : "Offline"} checking={checking} checkLabel="Checking device status…" />
      <div className="mister-card-grid four">
        {(summary?.cards || []).length ? summary.cards.map((card) => <Card key={card.label} title={card.label}><DeviceSummaryValue card={card} /></Card>) : <Card title="Device"><EmptyValue>Connect to a MiSTer first.</EmptyValue></Card>}
      </div>

      <div className="mister-card-grid two">
        <Card title="Now Playing">
          {nowPlaying?.playing ? (
            <div className="mister-now-playing">
              <strong>{nowPlaying.core_display || "Unknown Core"}</strong>
              <span>{nowPlaying.game_display || "Unknown Game"}</span>
              <em>{nowPlaying.short_path || nowPlaying.game_path || ""}</em>
            </div>
          ) : <EmptyValue>No active game detected, or the MiSTer menu is loaded.</EmptyValue>}
        </Card>
        <Card title="Device Actions" className="mister-device-actions-card">
          <div className="mister-action-row wrap">
            <button className="secondary-button platinum-primary-action" disabled={!connected || busy} onClick={returnToMenu}>Return to Menu</button>
            <button className="secondary-button" disabled={!connected || busy || smbEnabled === null || smbEnabled === undefined} onClick={() => setSmbEnabled(!smbEnabled)}>{smbEnabled ? "Disable SMB" : "Enable SMB"}</button>
            <button className="secondary-button danger" disabled={!connected || busy} onClick={rebootMiSTer}>Soft Reboot</button>
            <button className="secondary-button" onClick={refreshDevice} disabled={!connected || busy}>Refresh Device</button>
          </div>
          <p className="mister-settings-note">SMB toggles the startup script in /media/fat/linux. Return to Menu writes to /dev/MiSTer_cmd.</p>
        </Card>
      </div>

      <div className="mister-card-grid two">
        <StorageMeter title="SD Storage" info={storage.sd} />
        <StorageMeter title="USB Storage" info={storage.usb} />
      </div>
    </>
  );
}


function remoteStatusText(status) {
  if (!status?.connected) return "Offline";
  if (status.updateAvailable) return `Update available (${status.versionLabel || "unknown"})`;
  if (status.ready) return "Ready";
  if (status.installed && status.running) return "Daemon starting";
  if (status.installed) return "Installed";
  if (status.scriptExists) return "Script installed";
  return "Not installed";
}

function remoteKeyboardCodeToKey(code) {
  const direct = {
    Escape: "KEY_ESC",
    Backspace: "KEY_BACKSPACE",
    Tab: "KEY_TAB",
    Enter: "KEY_ENTER",
    Space: "KEY_SPACE",
    ArrowUp: "KEY_UP",
    ArrowDown: "KEY_DOWN",
    ArrowLeft: "KEY_LEFT",
    ArrowRight: "KEY_RIGHT",
    Home: "KEY_HOME",
    End: "KEY_END",
    PageUp: "KEY_PAGEUP",
    PageDown: "KEY_PAGEDOWN",
    Insert: "KEY_INSERT",
    Delete: "KEY_DELETE",
    Minus: "KEY_MINUS",
    Equal: "KEY_EQUAL",
    BracketLeft: "KEY_LEFTBRACE",
    BracketRight: "KEY_RIGHTBRACE",
    Backslash: "KEY_BACKSLASH",
    Semicolon: "KEY_SEMICOLON",
    Quote: "KEY_APOSTROPHE",
    Comma: "KEY_COMMA",
    Period: "KEY_DOT",
    Slash: "KEY_SLASH",
    Backquote: "KEY_GRAVE",
    ShiftLeft: "KEY_LEFTSHIFT",
    ShiftRight: "KEY_RIGHTSHIFT",
    ControlLeft: "KEY_LEFTCTRL",
    ControlRight: "KEY_RIGHTCTRL",
    AltLeft: "KEY_LEFTALT",
    AltRight: "KEY_RIGHTALT",
  };
  if (direct[code]) return direct[code];
  if (/^Key[A-Z]$/.test(code)) return `KEY_${code.slice(3)}`;
  if (/^Digit[0-9]$/.test(code)) return `KEY_${code.slice(5)}`;
  if (/^F([1-9]|1[0-2])$/.test(code)) return `KEY_${code}`;
  return "";
}

function RemoteControlButton({ children, disabled, onPress, className = "" }) {
  const pressedRef = useRef(false);
  const down = async (event) => {
    event.preventDefault();
    if (disabled || pressedRef.current) return;
    pressedRef.current = true;
    try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch {}
    await onPress?.("down");
  };
  const up = async (event) => {
    if (!pressedRef.current) return;
    event?.preventDefault?.();
    pressedRef.current = false;
    await onPress?.("up");
  };
  return (
    <button
      className={`mister-remote-button ${className}`}
      disabled={disabled}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerLeave={up}
    >
      {children}
    </button>
  );
}

function RemotePage({ status, refresh, startCommand, sendInput, disconnectRemote, connected, refreshJobs, checking, confirmAction }) {
  const [localStatus, setLocalStatus] = useState("");
  const [keyboardEnabled, setKeyboardEnabled] = useState(false);
  const [heldKeys, setHeldKeys] = useState(() => new Set());
  const [showOutput, setShowOutput] = useState(false);
  const [logLines, setLogLines] = useState([]);
  const ready = Boolean(status?.ready && !status?.updateAvailable && status?.websocketConnected !== false);
  const canManage = Boolean(connected);

  const addLog = useCallback((line) => {
    const text = String(line || "").trim();
    if (!text) return;
    setLogLines((current) => [...current.slice(-60), `${new Date().toLocaleTimeString()}  ${text}`]);
  }, []);

  useEffect(() => {
    refresh?.().catch((error) => {
      setLocalStatus(error.message || "Remote status check failed.");
      addLog(error.message || "Remote status check failed.");
    });
    return () => {
      disconnectRemote?.().catch(() => {});
    };
  }, [refresh, disconnectRemote, addLog]);

  const send = useCallback(async (payload, label) => {
    if (!ready && payload.kind !== "ping") return;
    try {
      await sendInput(payload);
      setLocalStatus(`${label || payload.name || payload.kind} sent.`);
    } catch (error) {
      const message = error.message || "Remote command failed.";
      setLocalStatus(message);
      addLog(message);
      setKeyboardEnabled(false);
    }
  }, [sendInput, ready, addLog]);

  useEffect(() => {
    if (!keyboardEnabled || !ready) return undefined;
    const down = (event) => {
      if (event.repeat) return;
      const key = remoteKeyboardCodeToKey(event.code);
      if (!key) return;
      event.preventDefault();
      setHeldKeys((current) => {
        if (current.has(key)) return current;
        const next = new Set(current);
        next.add(key);
        send({ kind: "keyboard", name: key, action: "down" }, key);
        return next;
      });
    };
    const up = (event) => {
      const key = remoteKeyboardCodeToKey(event.code);
      if (!key) return;
      event.preventDefault();
      setHeldKeys((current) => {
        if (!current.has(key)) return current;
        const next = new Set(current);
        next.delete(key);
        send({ kind: "keyboard", name: key, action: "up" }, key);
        return next;
      });
    };
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    return () => {
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up, true);
      sendInput({ kind: "system", name: "release_all", action: "tap" }).catch(() => {});
      setHeldKeys(new Set());
    };
  }, [keyboardEnabled, ready, send, sendInput]);

  const runDaemonCommand = async (command, label, confirmMessage = "") => {
    if (confirmMessage && !(await confirmAction(confirmMessage, { title: label || "Confirm action", tone: "danger" }))) return;
    setLocalStatus(`${label} started.`);
    addLog(`${label} started.`);
    try {
      await startCommand(command);
      await refreshJobs?.().catch(() => {});
    } catch (error) {
      const message = error.message || `${label} failed.`;
      setLocalStatus(message);
      addLog(message);
    }
  };

  const installLabel = status?.updateAvailable ? "Update" : "Install";
  const startStopLabel = status?.running ? "Stop Daemon" : "Start Daemon";
  const bootLabel = status?.startupEnabled ? "Disable Start on Boot" : "Enable Start on Boot";

  return (
    <>
      <PageHeader title="Remote" subtitle="Controller, keyboard, and daemon controls for your MiSTer." badge={remoteStatusText(status)} checking={checking} checkLabel="Checking remote daemon…" />
      <Card title="Daemon Status" footer={<span>{status?.url || "Remote WebSocket appears here once connected."}</span>}>
        <div className="mister-remote-status-grid">
          <div><span>Installed</span><strong>{status?.installed ? status.updateAvailable ? `Update (${status.versionLabel})` : `Yes (${status.versionLabel})` : "No"}</strong></div>
          <div><span>Running</span><strong>{status?.running ? "Yes" : "No"}</strong></div>
          <div><span>Start on boot</span><strong>{status?.startupEnabled ? "Enabled" : "Disabled"}</strong></div>
          <div><span>WebSocket</span><strong>{status?.websocketConnected ? "Connected" : status?.ready ? "Available" : "Offline"}</strong></div>
        </div>
        {status?.error ? <div className="mister-warning-box">{status.error}</div> : null}
        {status?.websocketError ? <div className="mister-warning-box">WebSocket: {status.websocketError}</div> : null}
        <div className="mister-action-row wrap">
          <button className="secondary-button" onClick={refresh} disabled={!canManage}>Refresh</button>
          <button className="secondary-button" onClick={() => runDaemonCommand("install", installLabel)} disabled={!canManage || (status?.installed && !status?.updateAvailable)}>{installLabel}</button>
          <button className="secondary-button" onClick={() => runDaemonCommand("start-stop", startStopLabel)} disabled={!canManage || !status?.installed || status?.updateAvailable}>{startStopLabel}</button>
          <button className="secondary-button" onClick={() => runDaemonCommand("toggle-boot", bootLabel)} disabled={!canManage || !status?.scriptExists || status?.updateAvailable}>{bootLabel}</button>
          <button className="danger-button" onClick={() => runDaemonCommand("uninstall", "Uninstall", "This will stop Companion Remote, disable start on boot, remove the daemon files, and remove the script from the MiSTer. Continue?")} disabled={!canManage || !status?.scriptExists}>Uninstall</button>
        </div>
      </Card>

      <Card title="Controller" footer={<span>{ready ? "Hold buttons with mouse/touch. OSD sends F12." : "Install and start the Remote daemon to enable controls."}</span>}>
        <div className="mister-remote-controller">
          <div className="mister-remote-dpad">
            <RemoteControlButton disabled={!ready} onPress={(action) => send({ kind: "dpad", name: "up", action }, "D-pad up")}>Up</RemoteControlButton>
            <RemoteControlButton disabled={!ready} onPress={(action) => send({ kind: "dpad", name: "left", action }, "D-pad left")}>Left</RemoteControlButton>
            <RemoteControlButton disabled={!ready} onPress={(action) => send({ kind: "dpad", name: "right", action }, "D-pad right")}>Right</RemoteControlButton>
            <RemoteControlButton disabled={!ready} onPress={(action) => send({ kind: "dpad", name: "down", action }, "D-pad down")}>Down</RemoteControlButton>
          </div>
          <div className="mister-remote-system-buttons">
            <RemoteControlButton disabled={!ready} className="system" onPress={(action) => send({ kind: "keyboard", name: "KEY_F12", action }, "OSD")}>OSD</RemoteControlButton>
            <RemoteControlButton disabled={!ready} className="system" onPress={(action) => send({ kind: "button", name: "select", action }, "Select")}>Select</RemoteControlButton>
            <RemoteControlButton disabled={!ready} className="system" onPress={(action) => send({ kind: "button", name: "start", action }, "Start")}>Start</RemoteControlButton>
            <button className="secondary-button" disabled={!ready} onClick={() => send({ kind: "system", name: "release_all", action: "tap" }, "Release all")}>Release All</button>
          </div>
          <div className="mister-remote-face-buttons">
            <RemoteControlButton disabled={!ready} onPress={(action) => send({ kind: "button", name: "x", action }, "Y")}>Y</RemoteControlButton>
            <RemoteControlButton disabled={!ready} onPress={(action) => send({ kind: "button", name: "y", action }, "X")}>X</RemoteControlButton>
            <RemoteControlButton disabled={!ready} onPress={(action) => send({ kind: "button", name: "b", action }, "A")}>A</RemoteControlButton>
            <RemoteControlButton disabled={!ready} onPress={(action) => send({ kind: "button", name: "a", action }, "B")}>B</RemoteControlButton>
          </div>
        </div>
      </Card>

      <div className="mister-card-grid two">
        <Card title="Keyboard Passthrough">
          <div className="mister-action-row wrap">
            <button className={keyboardEnabled ? "danger-button" : "secondary-button"} disabled={!ready} onClick={() => setKeyboardEnabled((value) => !value)}>{keyboardEnabled ? "Disable" : "Enable"}</button>
            <button className="secondary-button" disabled={!ready} onClick={() => send({ kind: "system", name: "release_all", action: "tap" }, "Release all")}>Release All</button>
          </div>
          <p className="mister-settings-note">Keyboard capture supports letters, numbers, arrows, Enter, Space, F-keys, and common modifiers.</p>
          {keyboardEnabled ? <p className="mister-settings-note">Held keys: {[...heldKeys].join(", ") || "none"}</p> : null}
        </Card>
        <Card title="Output" footer={<button className="secondary-button" onClick={() => setShowOutput((value) => !value)}>{showOutput ? "Hide Output" : "Show Output"}</button>}>
          <p className="mister-settings-note">{localStatus || "Remote output and command notes will appear here."}</p>
          {showOutput ? <LogBox value={logLines.join("\n")} /> : null}
        </Card>
      </div>
    </>
  );
}


const SCRIPT_ACTION_LABELS = {
  install: "Install / Update",
  uninstall: "Uninstall",
  configure: "Configure",
  run: "Run",
  enable_boot: "Enable Start on Boot",
  disable_boot: "Disable Start on Boot",
  toggle_boot: "Toggle Start on Boot",
  open_web: "Open Web Config",
  mount: "Mount",
  unmount: "Unmount",
  remove_config: "Remove Config",
};

const SCRIPT_CONFIG_FIELDS = {
  cifs_mount: [
    ["server", "Server"], ["share", "Share"], ["shareDirectory", "Share Directory"], ["domain", "Domain"],
    ["username", "Username"], ["password", "Password", "password"], ["localDir", "Local Dir"], ["additionalMountOptions", "Additional Mount Options"], ["mountAtBoot", "Mount at boot", "checkbox"],
  ],
  dav_browser: [
    ["serverUrl", "Server URL"], ["remotePath", "Remote Path"], ["username", "Username"], ["password", "Password", "password"], ["skipTlsVerify", "Skip TLS verify", "checkbox"],
  ],
  ftp_save_sync: [
    ["protocol", "Protocol"], ["host", "Host"], ["port", "Port"], ["username", "Username"], ["password", "Password", "password"],
    ["remoteBase", "Remote Base"], ["deviceName", "Device Name"], ["syncSavestates", "Sync savestates", "checkbox"],
  ],
  ra_viewer: [["username", "Username"], ["apiKey", "API Key", "password"]],
};

function normalizeScriptConfig(id, values) {
  const source = values || {};
  if (id === "cifs_mount") return {
    server: source.server || "", share: source.share || "", shareDirectory: source.share_directory || source.shareDirectory || "",
    domain: source.domain || "", username: source.username || "", password: source.password || "",
    localDir: source.local_dir || source.localDir || "cifs/games", additionalMountOptions: source.additional_mount_options || source.additionalMountOptions || "",
    mountAtBoot: Boolean(source.mount_at_boot ?? source.mountAtBoot),
  };
  if (id === "dav_browser") return { serverUrl: source.server_url || source.serverUrl || "", remotePath: source.remote_path || source.remotePath || "", username: source.username || "", password: source.password || "", skipTlsVerify: Boolean(source.skip_tls_verify ?? source.skipTlsVerify) };
  if (id === "ftp_save_sync") return { protocol: source.protocol || "sftp", host: source.host || "", port: source.port || "22", username: source.username || "", password: source.password || "", remoteBase: source.remote_base || source.remoteBase || "", deviceName: source.device_name || source.deviceName || "MiSTer", syncSavestates: Boolean(source.sync_savestates ?? source.syncSavestates) };
  if (id === "ra_viewer") return { username: source.username || "", apiKey: source.api_key || source.apiKey || "" };
  return { ...source };
}

function ScriptConfigModal({ script, values, setValues, onSave, onRemove, onClose }) {
  const fields = SCRIPT_CONFIG_FIELDS[script?.id] || [];
  return (
    <div className="modal-backdrop">
      <div className="modal mister-script-config-modal">
        <WindowTitlebar title={`${script?.name || "Script"} Config`} onClose={onClose} />
        <div className="mister-modal-header"><div><h2>{script?.name || "Script"} Config</h2><p>Edit script settings.</p></div><button className="icon-button" onClick={onClose}>×</button></div>
        <div className="mister-form-grid two">
          {fields.map(([key, label, type]) => (
            <Field key={key} label={label}>
              {type === "checkbox" ? <input type="checkbox" checked={Boolean(values?.[key])} onChange={(event) => setValues((current) => ({ ...(current || {}), [key]: event.target.checked }))} /> : <input type={type || "text"} value={values?.[key] || ""} onChange={(event) => setValues((current) => ({ ...(current || {}), [key]: event.target.value }))} />}
            </Field>
          ))}
        </div>
        <div className="mister-action-row wrap">
          <button className="primary-button" onClick={onSave}>Save Config</button>
          {script?.id !== "ra_viewer" ? <button className="secondary-button danger" onClick={onRemove}>Remove Config</button> : null}
          <button className="secondary-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function ScriptsPage({ summary, refresh, runAction, loadConfig, saveConfig, removeConfig, openFolder, connected, checking, confirmAction }) {
  const items = useMemo(() => summary?.items || [], [summary?.items]);
  const actions = summary?.actions || {};
  const statuses = summary?.statuses || {};
  const [selectedId, setSelectedId] = useState(items[0]?.id || "update_all");
  const [configOpen, setConfigOpen] = useState(false);
  const [configValues, setConfigValues] = useState({});
  useEffect(() => { if (!items.some((item) => item.id === selectedId) && items[0]?.id) setSelectedId(items[0].id); }, [items, selectedId]);
  const selected = items.find((item) => item.id === selectedId) || items[0];
  const status = selected ? statuses[selected.id] || {} : {};
  const canConfigure = Boolean(SCRIPT_CONFIG_FIELDS[selected?.id]);
  const openConfig = async () => {
    if (!selected) return;
    const raw = await loadConfig(selected.id).catch(() => ({}));
    setConfigValues(normalizeScriptConfig(selected.id, raw || {}));
    setConfigOpen(true);
  };
  const executeAction = async (action) => {
    if (!selected) return;
    if (action === "configure") { await openConfig(); return; }
    if (action === "uninstall" && !(await confirmAction(`Uninstall ${selected.name}?`, { title: "Uninstall script", confirmLabel: "Uninstall", tone: "danger" }))) return;
    if (action === "remove_config" && !(await confirmAction(`Remove ${selected.name} config?`, { title: "Remove configuration", confirmLabel: "Remove", tone: "danger" }))) return;
    await runAction(selected.id, action);
  };
  return (
    <>
      <PageHeader title="Scripts" subtitle="Install, configure, and run MiSTer helper scripts." badge={summary?.ready ? "Connected" : "Needs connection"} checking={checking} checkLabel="Checking scripts…" />
      <div className="mister-scripts-layout">
        <Card title="Scripts" className="mister-scripts-list-card">
          <div className="mister-scripts-list">
            {items.map((item) => {
              const itemStatus = statuses[item.id] || {};
              const isSelected = item.id === selected?.id;
              return <button key={item.id} className={`mister-script-row${isSelected ? " selected" : ""}`} aria-pressed={isSelected} onClick={() => setSelectedId(item.id)}><strong>{item.name}</strong><span>{itemStatus.statusText || "Unknown"}</span></button>;
            })}
          </div>
          <div className="mister-action-row wrap"><button className="secondary-button" onClick={refresh}>Refresh Status</button><button className="secondary-button" disabled={!connected} onClick={openFolder}>Open Scripts Folder</button></div>
        </Card>
        <Card title={selected?.name || "Details"} className="mister-scripts-detail-card">
          <div className="mister-status-panel">
            <span className={`mister-install-status-pill ${status.installed ? "installed" : "not_installed"}`}>{status.statusText || "Unknown"}</span>
            <p>{selected?.description || "Select a script."}</p>
          </div>
          <div className="mister-script-status-grid">
            <div><span>Installed</span><strong>{status.installed ? "Yes" : "No"}</strong></div>
            <div><span>Configured</span><strong>{status.configured ? "Yes" : "No"}</strong></div>
            <div><span>Running</span><strong>{status.running ? "Yes" : "No"}</strong></div>
            <div><span>Service</span><strong>{status.serviceEnabled || status.start_on_boot_enabled ? "Enabled" : "Disabled / n/a"}</strong></div>
          </div>
          {status.missingRequiredFiles?.length ? <div className="mister-inline-warning">Missing: {status.missingRequiredFiles.join(", ")}</div> : null}
          <div className="mister-action-row wrap">
            {(actions[selected?.id] || []).map((action) => <button key={action} className={action === "uninstall" || action === "remove_config" ? "secondary-button danger" : action === "install" ? "primary-button" : "secondary-button"} disabled={!connected} onClick={() => executeAction(action)}>{SCRIPT_ACTION_LABELS[action] || action}</button>)}
            {canConfigure && !(actions[selected?.id] || []).includes("configure") ? <button className="secondary-button" disabled={!connected} onClick={openConfig}>Configure</button> : null}
          </div>
        </Card>
      </div>
      {configOpen ? <ScriptConfigModal script={selected} values={configValues} setValues={setConfigValues} onSave={async () => { await saveConfig(selected.id, configValues); setConfigOpen(false); }} onRemove={async () => { if (await confirmAction(`Remove ${selected?.name} config?`, { title: "Remove configuration", confirmLabel: "Remove", tone: "danger" })) { await removeConfig(selected.id); setConfigOpen(false); } }} onClose={() => setConfigOpen(false)} /> : null}
    </>
  );
}

function installCategoryLabel(item, categories) {
  const category = categories.find((entry) => entry.id === item.category);
  return category?.name || item.category || item.type || "Install Item";
}

function installIconText(item) {
  const name = String(item?.name || item?.id || "?").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function installStateLabel(status) {
  const state = status?.state || "unknown";
  if (status?.update_available) return "Update available";
  if (status?.installed) return "Installed";
  if (state === "not_installed") return "Not installed";
  if (state === "needs_connection") return "Needs connection";
  return status?.status_text || "Unknown";
}

const InstallStatusPill = React.memo(function InstallStatusPill({ status }) {
  const state = status?.update_available ? "update" : status?.installed ? "installed" : status?.state || "unknown";
  return <span className={`mister-install-status-pill ${state}`}>{installStateLabel(status)}</span>;
});

const InstallItemIcon = React.memo(function InstallItemIcon({ item, artwork }) {
  const thumbnail = artwork || getInstallItemArtwork(item, null);
  const fallback = INSTALL_DEFAULT_ARTWORK[item?.category] || "";
  const handleError = (event) => {
    const image = event.currentTarget;
    if (fallback && image.src !== fallback && image.dataset.fallbackApplied !== "true") {
      image.dataset.fallbackApplied = "true";
      image.src = fallback;
      return;
    }
    image.style.display = "none";
    image.parentElement?.classList.remove("has-artwork");
  };
  return (
    <div className={`mister-install-icon${thumbnail ? " has-artwork" : ""}`}>
      {thumbnail ? <img loading="lazy" decoding="async" src={thumbnail} alt="" onError={handleError} /> : null}
      {!thumbnail ? <span>{installIconText(item)}</span> : null}
    </div>
  );
});

const InstallItemCard = React.memo(function InstallItemCard({ item, categoryLabel, status, artwork, onOpen }) {
  return (
    <button className="mister-install-item-card" onClick={() => onOpen(item)}>
      <InstallItemIcon item={item} artwork={artwork} />
      <div className="mister-install-card-copy">
        <div className="mister-install-card-meta">
          <span>{categoryLabel}</span>
          <InstallStatusPill status={status} />
        </div>
        <h2>{item.name}</h2>
        <div className="mister-install-card-footerline">
          <span className="mister-install-card-author"><small>Author</small><strong>{item.author || "MiSTer community"}</strong></span>
          <span className="mister-install-card-version"><small>Version</small><strong>{item.version || item.release_date || item.type || "Catalog"}</strong></span>
        </div>
      </div>
    </button>
  );
});

function clampPercent(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, number));
}

function installJobProgress(job) {
  if (!job) return 0;
  const status = String(job.status || "").toLowerCase();
  if (status === "completed") return 100;
  if (status === "failed") return 100;
  if (status === "queued") return 8;
  const logs = Array.isArray(job.logs) ? [...job.logs].reverse() : [];
  for (const line of logs) {
    const match = String(line || "").match(/(\d{1,3})\s*%/);
    if (match) return clampPercent(match[1], 28);
  }
  return status === "running" ? 36 : 0;
}

function installJobMessage(job) {
  if (!job) return "Ready for an Install Center action.";
  const status = String(job.status || "").toLowerCase();
  if (job.error) return job.error;
  const logs = Array.isArray(job.logs) ? job.logs.filter(Boolean) : [];
  if (logs.length) return String(logs[logs.length - 1]).trim();
  if (status === "queued") return "Queued.";
  if (status === "running") return "Working...";
  if (status === "completed") return "Completed.";
  if (status === "failed") return "Failed.";
  return job.status || "Ready.";
}

function InstallItemModal({ item, categories, status, connected, sdMode, busy, artwork, onClose, onRefresh, onRefreshLatest, onInstall, onUninstall, onAction, openScriptsPage, jobs, refreshJobs }) {
  const [installPath, setInstallPath] = useState(item?.default_install_path || "/games");
  const [activeJobId, setActiveJobId] = useState("");
  const [localMessage, setLocalMessage] = useState("");
  useEffect(() => {
    setInstallPath(item?.default_install_path || "/games");
    setActiveJobId("");
    setLocalMessage("");
  }, [item?.id, item?.default_install_path]);
  const activeJob = useMemo(() => {
    const list = jobs?.jobs || [];
    if (activeJobId) return list.find((job) => job.id === activeJobId) || null;
    const itemId = String(item?.id || "");
    return list.find((job) => String(job.kind || "").startsWith("install_center.") && (job.result?.itemId === itemId || String(job.label || "").includes(item?.name || itemId))) || null;
  }, [activeJobId, item?.id, item?.name, jobs]);
  const activeJobStatus = String(activeJob?.status || "").toLowerCase();
  const activeJobRunning = activeJobStatus === "queued" || activeJobStatus === "running";
  useEffect(() => {
    if (!activeJobRunning) return undefined;
    const timer = window.setInterval(() => refreshJobs?.().catch(() => {}), 1200);
    return () => window.clearInterval(timer);
  }, [activeJobRunning, refreshJobs]);
  if (!item) return null;
  const canUseInstall = Boolean(connected || sdMode?.active);
  const canInstall = Boolean(status?.can_install_update || status?.state === "not_installed" || status?.update_available);
  const canUninstall = Boolean(status?.can_uninstall || status?.installed);
  const handler = item.handler || item.id;
  const versionText = item.version || status?.latest_version || status?.installed_version || "Not specified";
  const authorText = item.author || "MiSTer community";
  const progress = installJobProgress(activeJob);
  const progressMessage = localMessage || installJobMessage(activeJob);
  const runAndTrack = async (runner, waitingMessage) => {
    if (!runner) return;
    setLocalMessage(waitingMessage || "Starting...");
    try {
      const job = await runner();
      if (job?.id) setActiveJobId(job.id);
      await refreshJobs?.().catch(() => {});
      setLocalMessage("");
    } catch (error) {
      setLocalMessage(error.message || "Action failed.");
    }
  };
  const extraActions = [];
  if (["update_all", "cifs_mount", "dav_browser", "ftp_save_sync", "syncthing", "ra_viewer", "zaparoo"].includes(handler)) extraActions.push(["Open in Scripts", () => openScriptsPage?.(handler)]);
  if (handler === "update_all" && status?.installed) extraActions.push(["Run Update All", () => runAndTrack(() => onAction?.(item, "run"), "Starting Update All...")]);
  if (handler === "zaparoo") extraActions.push(["Enable Start on Boot", () => runAndTrack(() => onAction?.(item, "enable_boot"), "Enabling Zaparoo startup...")], ["Open Web", () => runAndTrack(() => onAction?.(item, "open_web"), "Opening Zaparoo web interface...")]);
  if (handler === "cifs_mount") extraActions.push(["Mount", () => runAndTrack(() => onAction?.(item, "mount"), "Mounting share...")], ["Unmount", () => runAndTrack(() => onAction?.(item, "unmount"), "Unmounting share...")], ["Remove Config", () => runAndTrack(() => onAction?.(item, "remove_config"), "Removing config..."), true]);
  if (handler === "ftp_save_sync") extraActions.push(["Enable Save Sync", () => runAndTrack(() => onAction?.(item, "enable_boot"), "Enabling save sync...")], ["Disable Save Sync", () => runAndTrack(() => onAction?.(item, "disable_boot"), "Disabling save sync...")], ["Remove Config", () => runAndTrack(() => onAction?.(item, "remove_config"), "Removing config..."), true]);
  if (handler === "syncthing") extraActions.push(["Toggle Boot", () => runAndTrack(() => onAction?.(item, "toggle_boot"), "Updating startup setting...")], ["Open Web Config", () => runAndTrack(() => onAction?.(item, "open_web"), "Opening web config...")]);
  if (item.category === "wallpaper_packs" || item.type === "wallpaper_pack") {
    if (handler === "ranny_snice_wallpapers" || item.id === "ranny_snice_wallpapers") extraActions.push(["Install 16:9", () => runAndTrack(() => onAction?.(item, "install_wallpapers_169"), "Installing 16:9 wallpapers...")], ["Install 4:3", () => runAndTrack(() => onAction?.(item, "install_wallpapers_43"), "Installing 4:3 wallpapers...")]);
    extraActions.push(["Open Wallpaper Folder", () => runAndTrack(() => onAction?.(item, "open_wallpaper_folder"), "Opening wallpaper folder...")], ["Remove Pack", () => runAndTrack(() => onAction?.(item, "uninstall_wallpapers"), "Removing wallpaper pack..."), true]);
  }
  return (
    <div className="modal-backdrop mister-install-backdrop">
      <div className="modal mister-install-modal no-banner compact-install-modal">
        <WindowTitlebar title={item.name} onClose={onClose} />
        <div className="mister-install-modal-header">
          <InstallItemIcon item={item} artwork={artwork} />
          <div className="mister-install-modal-intro">
            <div className="mister-install-card-meta mister-install-modal-meta"><span>{installCategoryLabel(item, categories)}</span><InstallStatusPill status={status} /></div>
            <h2>{item.name}</h2>
            <p className="mister-install-modal-description">{item.description || "Install Center item."}</p>
            <div className="mister-install-modal-facts">
              <div><span>Author</span><strong>{authorText}</strong></div>
              <div><span>Version</span><strong>{versionText}</strong></div>
              {item.package_manifest ? <div><span>Manifest</span><strong>{(item.package_manifest.files || []).length || 0} mapped file{((item.package_manifest.files || []).length || 0) === 1 ? "" : "s"}</strong></div> : null}
            </div>
          </div>
        </div>

        {(item.category === "roms" || item.type === "rom" || item.category === "github" || item.type === "github_package") ? (
          <Field label="Install Path">
            <input value={installPath} onChange={(event) => setInstallPath(event.target.value)} placeholder="/games" />
          </Field>
        ) : null}

        <section className="mister-install-activity-box" aria-live="polite">
          <div className="mister-install-activity-header">
            <strong>Activity</strong>
            <span>{activeJob?.status || (canUseInstall ? "Idle" : "Offline")}</span>
          </div>
          <div className="mister-install-progress-track"><span style={{ width: `${progress}%` }} /></div>
          <p>{canUseInstall ? progressMessage : "Connect to a MiSTer or enable SD Card Mode before installing or checking this item."}</p>
          {activeJob?.logs?.length ? <LogBox value={activeJob.logs.slice(-6).join("\n")} /> : null}
        </section>

        <div className="mister-install-modal-actions">
          <button className="secondary-button" disabled={!canUseInstall || busy || activeJobRunning} onClick={() => runAndTrack(() => onRefresh(item.id), "Checking status...")}>Check Status</button>
          <button className="secondary-button" disabled={!canUseInstall || busy || activeJobRunning} onClick={() => runAndTrack(() => onRefreshLatest(item.id), "Checking latest version...")}>Version Check</button>
          <button className="secondary-button" disabled={!canUseInstall || busy || activeJobRunning || !canInstall} onClick={() => runAndTrack(() => onInstall(item, { installPath }), status?.update_available ? "Starting update..." : "Starting install...")}>{status?.update_available ? "Update" : status?.installed ? "Reinstall / Update" : "Install"}</button>
          <button className="secondary-button danger" disabled={!canUseInstall || busy || activeJobRunning || !canUninstall} onClick={() => runAndTrack(() => onUninstall(item), "Starting uninstall...")}>Uninstall</button>
        </div>
        {extraActions.length ? (
          <div className="mister-install-special-actions compact">
            <div className="mister-action-row wrap compact">{extraActions.map(([label, handler, danger]) => <button key={label} className={danger ? "secondary-button danger" : "secondary-button"} disabled={!canUseInstall || busy || activeJobRunning} onClick={handler}>{label}</button>)}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InstallCenterPage({ catalog, statuses, artworkMap, onArtworkChange, refreshCatalog, refreshInstallStatuses, checkInstallStatus, startInstall, startUninstall, startAction, openScriptsPage, connected, sdMode, busy, jobs, refreshJobs, checking }) {
  const categories = useMemo(() => catalog?.categories || [], [catalog?.categories]);
  const items = useMemo(() => catalog?.items || [], [catalog?.items]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  useEffect(() => {
    if (!selectedItem?.id) return;
    const refreshed = items.find((entry) => entry.id === selectedItem.id);
    if (refreshed && refreshed !== selectedItem) setSelectedItem(refreshed);
  }, [items, selectedItem]);
  const deferredQuery = useDeferredValue(query);
  const categoryLabels = useMemo(() => Object.fromEntries(categories.map((entry) => [entry.id, entry.name])), [categories]);
  const queryText = useMemo(() => deferredQuery.trim().toLowerCase(), [deferredQuery]);
  const visibleItems = useMemo(() => items.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    if (!queryText) return true;
    return [item.name, item.description, item.author, item.handler, item.type, item.category].some((value) => String(value || "").toLowerCase().includes(queryText));
  }), [items, category, queryText]);
  const installCounts = useMemo(() => {
    let installedCount = 0;
    let updateCount = 0;
    for (const status of Object.values(statuses || {})) {
      if (status?.installed) installedCount += 1;
      if (status?.update_available) updateCount += 1;
    }
    return { installedCount, updateCount };
  }, [statuses]);
  const catalogMeta = catalog?.meta || {};
  const selectedStatus = selectedItem ? statuses?.[selectedItem.id] : null;
  const canUseInstall = Boolean(connected || sdMode?.active);
  const openItem = useCallback(async (item) => {
    setSelectedItem(item);
    if (canUseInstall && checkInstallStatus) await checkInstallStatus(item.id, false).catch(() => {});
  }, [canUseInstall, checkInstallStatus]);
  return (
    <>
      <PageHeader
        title="Install Center"
        subtitle="Browse and install scripts, cores, extras, ROMs, and wallpaper packs from the Companion EX Hub."
        badge={`${items.length} item${items.length === 1 ? "" : "s"}`}
        checking={checking}
        checkLabel="Checking catalog and install status…"
      />
      <div className="mister-install-toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search installable items..." />
        <ThemeAwareSelect
          aria-label="Install Center category"
          className="mister-install-category-select"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </ThemeAwareSelect>
        <button className="secondary-button" onClick={() => refreshCatalog({ fresh: true, allowNetwork: true, force: true })}>Refresh</button>
        <button className="secondary-button" disabled={!canUseInstall || busy} onClick={() => refreshInstallStatuses(false)}>Check Installed</button>
        <button className="secondary-button" disabled={!canUseInstall || busy} onClick={() => refreshInstallStatuses(true)}>Check Versions</button>
      </div>

      <div className="mister-install-summary-row">
        <span>{visibleItems.length} shown</span>
        <span>{installCounts.installedCount} installed</span>
        <span>{installCounts.updateCount} updates</span>
        <span>{catalogMeta.live ? "Live" : "Bundled"}</span>
        <span>{storageModeLabel({ connected }, sdMode)}</span>
      </div>
      {catalogMeta.error ? <div className="mister-inline-warning">Using bundled catalog: {catalogMeta.error}</div> : null}

      <div className="mister-install-card-grid">
        {visibleItems.length ? visibleItems.map((item) => (
          <InstallItemCard key={item.id} item={item} categoryLabel={categoryLabels[item.category] || item.category || "Catalog"} status={statuses?.[item.id]} artwork={getInstallItemArtwork(item, artworkMap)} onOpen={openItem} />
        )) : <Card title="Install Center"><EmptyValue>No installable items match the current filter.</EmptyValue></Card>}
      </div>


      {selectedItem ? (
        <InstallItemModal
          item={selectedItem}
          categories={categories}
          status={selectedStatus}
          artwork={getInstallItemArtwork(selectedItem, artworkMap)}
          onArtworkChange={onArtworkChange}
          connected={connected}
          sdMode={sdMode}
          busy={busy}
          onClose={() => setSelectedItem(null)}
          onRefresh={(id) => checkInstallStatus(id, false)}
          onRefreshLatest={(id) => checkInstallStatus(id, true)}
          onInstall={startInstall}
          onUninstall={startUninstall}
          onAction={startAction}
          openScriptsPage={openScriptsPage}
          jobs={jobs}
          refreshJobs={refreshJobs}
        />
      ) : null}
    </>
  );
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; }
  return `${size >= 10 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`;
}

function formatTimestamp(value) {
  const stamp = Number(value || 0);
  if (!stamp) return "Unknown";
  try { return new Date(stamp * 1000).toLocaleString(); }
  catch { return "Unknown"; }
}

function backupName(backup) {
  return typeof backup === "string" ? backup : String(backup?.name || "");
}


function splitRemotePath(path) {
  const normalized = String(path || "/media/fat").replace(/\\/g, "/").replace(/\/+$/, "") || "/media/fat";
  const parts = normalized.split("/").filter(Boolean);
  const segments = [];
  let current = "";
  for (const part of parts) {
    current += `/${part}`;
    segments.push({ label: part, path: current });
  }
  return segments;
}

const FILE_BROWSER_PREFS_STORAGE_KEY = "mister-companion:file-browser:prefs:v2";
const FILE_BROWSER_DEFAULT_COLUMN_WIDTHS = { name: 58, type: 13, size: 11, modified: 18 };

function loadFileBrowserPrefs() {
  return safeJson(localStorage.getItem(FILE_BROWSER_PREFS_STORAGE_KEY), {}) || {};
}

function saveFileBrowserPrefs(prefs) {
  try { localStorage.setItem(FILE_BROWSER_PREFS_STORAGE_KEY, JSON.stringify(prefs || {})); } catch {}
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function FileBrowserEntryIcon({ isFolder }) {
  return (
    <span className={`mister-file-icon ${isFolder ? "folder" : "file"}`} aria-hidden="true">
      {isFolder ? (
        <svg viewBox="0 0 24 24" focusable="false">
          <path className="mister-file-icon-fill" d="M3.5 7.2c0-1.18.82-2 2-2h4.2c.62 0 1.05.18 1.46.68l1.14 1.34h6.2c1.18 0 2 .82 2 2v8.58c0 1.18-.82 2-2 2h-13c-1.18 0-2-.82-2-2V7.2Z" />
          <path className="mister-file-icon-line" d="M3.8 9.05h16.4M5.55 5.65h4.25c.48 0 .78.13 1.09.5l1.1 1.28h6.48c.96 0 1.68.72 1.68 1.68v8.5c0 .96-.72 1.68-1.68 1.68H5.53c-.96 0-1.68-.72-1.68-1.68V7.33c0-.96.72-1.68 1.7-1.68Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" focusable="false">
          <path className="mister-file-icon-fill" d="M6.6 3.6h7.05l3.75 3.78V18.4c0 1.15-.82 2-2 2H6.6c-1.18 0-2-.85-2-2V5.6c0-1.17.82-2 2-2Z" />
          <path className="mister-file-icon-line" d="M6.65 4.05h6.75l3.95 3.95v10.3c0 .94-.73 1.65-1.66 1.65H6.65c-.95 0-1.66-.71-1.66-1.65V5.7c0-.94.71-1.65 1.66-1.65Z" />
          <path className="mister-file-icon-line" d="M13.35 4.35v3.4c0 .36.25.6.6.6h3.08M8.05 12.25h6.1M8.05 15.05h5.25" />
        </svg>
      )}
    </span>
  );
}

function FileBrowserPage({ browser, connected, refresh, backendCall, host, jobs, refreshJobs, confirmAction, setBrowser, setError, checking }) {
  const savedPrefs = useMemo(() => loadFileBrowserPrefs(), []);
  const currentPath = browser?.path || savedPrefs.lastPath || "/media/fat";
  const entries = useMemo(() => browser?.entries || [], [browser?.entries]);
  const roots = browser?.roots || [{ name: "SD Card", path: "/media/fat", available: true }];
  const [selectedPaths, setSelectedPaths] = useState([]);
  const [nameDraft, setNameDraft] = useState("");
  const [clipboard, setClipboard] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [sortSpec, setSortSpec] = useState(savedPrefs.sort || { key: "name", direction: "asc" });
  const [columnWidths, setColumnWidths] = useState({ ...FILE_BROWSER_DEFAULT_COLUMN_WIDTHS, ...(savedPrefs.columnWidths || {}) });
  const lastSelectedPathRef = useRef("");
  const tableRef = useRef(null);
  const selectedEntries = useMemo(() => entries.filter((entry) => selectedPaths.includes(entry.path)), [entries, selectedPaths]);
  const selectedEntry = selectedEntries.length === 1 ? selectedEntries[0] : null;
  const selectedCount = selectedEntries.length;
  const fileJobs = useMemo(() => (jobs?.jobs || []).filter((job) => String(job.kind || "").startsWith("fileBrowser.")).slice(0, 8), [jobs]);
  const activeJob = fileJobs.find((job) => job.status === "running" || job.status === "queued") || fileJobs[0] || null;
  const downloadJob = fileJobs.find((job) => job.kind === "fileBrowser.download" && job.status === "completed" && (job.result?.localPath || job.result?.localPaths?.length));

  useEffect(() => {
    setSelectedPaths([]);
    setNameDraft("");
    saveFileBrowserPrefs({ ...loadFileBrowserPrefs(), lastPath: currentPath, sort: sortSpec, columnWidths });
  }, [columnWidths, currentPath, sortSpec]);

  useEffect(() => {
    setSelectedPaths((previous) => previous.filter((path) => entries.some((entry) => entry.path === path)));
  }, [entries]);

  useEffect(() => {
    if (selectedEntry) setNameDraft(selectedEntry.name || "");
    if (selectedCount !== 1) setNameDraft("");
  }, [selectedEntry, selectedCount]);

  useEffect(() => {
    saveFileBrowserPrefs({ ...loadFileBrowserPrefs(), lastPath: currentPath, sort: sortSpec, columnWidths });
  }, [sortSpec, columnWidths, currentPath]);

  const sortedEntries = useMemo(() => {
    const direction = sortSpec.direction === "desc" ? -1 : 1;
    const key = sortSpec.key || "name";
    return [...entries].sort((a, b) => {
      if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
      let left;
      let right;
      if (key === "size") { left = Number(a.size || 0); right = Number(b.size || 0); }
      else if (key === "modified") { left = Number(a.mtime || 0); right = Number(b.mtime || 0); }
      else if (key === "type") { left = String(a.type || (a.is_dir ? "Folder" : "File")); right = String(b.type || (b.is_dir ? "Folder" : "File")); }
      else { left = String(a.name || "").toLocaleLowerCase(); right = String(b.name || "").toLocaleLowerCase(); }
      if (typeof left === "number" && typeof right === "number") return (left - right) * direction;
      return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" }) * direction;
    });
  }, [entries, sortSpec]);

  const setPayload = (payload) => {
    if (payload?.summary) setBrowser(payload.summary);
    else if (payload?.entries) setBrowser(payload);
  };

  const run = async (task, fallback = "File Browser action failed.") => {
    try {
      setError?.("");
      return await task();
    } catch (error) {
      setError?.(error.message || fallback);
      return null;
    }
  };

  const openDirectory = async (path) => {
    await run(async () => refresh(path, { force: true }));
  };

  const refreshHere = async () => run(async () => refresh(currentPath, { force: true }));

  const maybeConfirmOverwrite = async (mode, params, options = {}) => {
    const result = await backendCall("fileBrowser.conflicts", { mode, ...params }, { timeoutMs: 15000 });
    const conflicts = result?.conflicts || [];
    if (!conflicts.length) return false;
    const hardConflict = conflicts.find((conflict) => conflict.kind === "same-path");
    if (hardConflict) throw new Error(hardConflict.message || "Source and destination are the same.");
    const names = conflicts.slice(0, 8).map((conflict) => `• ${conflict.name || conflict.path}`).join("\n");
    const more = conflicts.length > 8 ? `\n…and ${conflicts.length - 8} more` : "";
    const ok = await confirmAction?.(`${options.message || "One or more items already exist at the destination."}\n\n${names}${more}\n\nReplace existing item${conflicts.length === 1 ? "" : "s"}?`, {
      title: options.title || "Replace existing item?",
      confirmLabel: options.confirmLabel || "Replace",
      tone: "danger",
    });
    if (!ok) throw new Error("Action cancelled.");
    return true;
  };

  const makeFolder = async () => run(async () => {
    const name = nameDraft.trim();
    if (!name) throw new Error("Enter a folder name first.");
    const conflicts = await backendCall("fileBrowser.conflicts", { mode: "mkdir", path: currentPath, name }, { timeoutMs: 15000 });
    if (conflicts?.conflicts?.length) throw new Error("A folder or file with that name already exists.");
    const payload = await backendCall("fileBrowser.mkdir", { path: currentPath, name }, { timeoutMs: 30000 });
    setPayload(payload);
    setNameDraft("");
    return payload;
  });

  const renameSelected = async () => run(async () => {
    if (!selectedEntry) throw new Error("Select one item to rename.");
    const name = nameDraft.trim();
    if (!name || name === selectedEntry.name) return null;
    const overwrite = await maybeConfirmOverwrite("rename", { source: selectedEntry.path, name }, { title: "Replace existing item?" });
    const payload = await backendCall("fileBrowser.rename", { source: selectedEntry.path, name, overwrite }, { timeoutMs: 30000 });
    setPayload(payload);
    setSelectedPaths([]);
    return payload;
  });

  const startAndRefresh = async (method, params, options = {}) => run(async () => {
    const result = await backendCall(method, params, { timeoutMs: 10000 });
    await refreshJobs?.().catch(() => {});
    window.setTimeout(() => refreshJobs?.().catch(() => {}), 600);
    window.setTimeout(() => refreshJobs?.().catch(() => {}), 1600);
    if (options.refresh !== false) window.setTimeout(() => refresh(currentPath, { force: true }).catch(() => {}), options.refreshDelayMs || 1600);
    return result;
  });

  const deleteSelected = async () => {
    if (!selectedEntries.length) return setError?.("Select one or more items to delete.");
    const ok = await confirmAction?.(`Delete ${selectedEntries.length === 1 ? selectedEntries[0].name : `${selectedEntries.length} items`}? This cannot be undone.`, { title: "Delete remote item", confirmLabel: "Delete", tone: "danger" });
    if (!ok) return;
    await startAndRefresh("fileBrowser.delete.start", { sources: selectedEntries.map((entry) => entry.path) });
    setSelectedPaths([]);
  };

  const uploadPaths = async (paths) => {
    const localPaths = (Array.isArray(paths) ? paths : [paths]).filter(Boolean);
    if (!localPaths.length) return;
    await run(async () => {
      const overwrite = await maybeConfirmOverwrite("upload", { localPaths, path: currentPath }, { title: "Replace remote item?", message: "One or more uploads already exist in this MiSTer folder." });
      return await startAndRefresh("fileBrowser.upload.start", { localPaths, path: currentPath, overwrite });
    });
  };

  const uploadFile = async () => {
    const localPath = await host?.chooseFile?.({ title: "Choose file to upload" });
    if (!localPath) return;
    await uploadPaths([localPath]);
  };

  const uploadFolder = async () => {
    const localPath = await host?.chooseDirectory?.({ title: "Choose folder to upload" });
    if (!localPath) return;
    await uploadPaths([localPath]);
  };

  const downloadSelected = async () => {
    if (!selectedEntries.length) return setError?.("Select one or more items to download.");
    const localDir = await host?.chooseDirectory?.({ title: "Choose download destination" });
    if (!localDir) return;
    await run(async () => {
      const sources = selectedEntries.map((entry) => entry.path);
      const overwrite = await maybeConfirmOverwrite("download", { sources, localDir }, { title: "Replace local item?", message: "One or more downloads already exist in the destination folder." });
      return await startAndRefresh("fileBrowser.download.start", { sources, localDir, overwrite }, { refresh: false });
    });
  };

  const copySelected = (mode = "copy") => {
    if (!selectedEntries.length) return setError?.("Select one or more items first.");
    setClipboard({ mode, paths: selectedEntries.map((entry) => entry.path), names: selectedEntries.map((entry) => entry.name), count: selectedEntries.length });
  };

  const pasteClipboard = async () => {
    if (!clipboard?.paths?.length) return;
    await run(async () => {
      const mode = clipboard.mode === "cut" ? "move" : "copy";
      const method = clipboard.mode === "cut" ? "fileBrowser.move.start" : "fileBrowser.copy.start";
      const overwrite = await maybeConfirmOverwrite(mode, { sources: clipboard.paths, targetDir: currentPath }, { title: "Replace remote item?", message: "One or more clipboard items already exist in this folder." });
      await startAndRefresh(method, { sources: clipboard.paths, targetDir: currentPath, overwrite });
      if (clipboard.mode === "cut") setClipboard(null);
    });
  };

  const selectEntry = (entry, event) => {
    const path = entry.path;
    if (event.shiftKey && lastSelectedPathRef.current) {
      const startIndex = sortedEntries.findIndex((item) => item.path === lastSelectedPathRef.current);
      const endIndex = sortedEntries.findIndex((item) => item.path === path);
      if (startIndex >= 0 && endIndex >= 0) {
        const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
        setSelectedPaths(sortedEntries.slice(from, to + 1).map((item) => item.path));
        return;
      }
    }
    if (event.metaKey || event.ctrlKey) {
      setSelectedPaths((previous) => previous.includes(path) ? previous.filter((item) => item !== path) : [...previous, path]);
      lastSelectedPathRef.current = path;
      return;
    }
    setSelectedPaths([path]);
    lastSelectedPathRef.current = path;
  };

  const toggleSort = (key) => {
    setSortSpec((previous) => ({ key, direction: previous.key === key && previous.direction !== "desc" ? "desc" : "asc" }));
  };

  const startColumnResize = (event, key, nextKey) => {
    event.preventDefault();
    event.stopPropagation();
    const tableWidth = tableRef.current?.getBoundingClientRect?.().width || 1000;
    const startX = event.clientX;
    const startWidths = { ...columnWidths };
    const onMove = (moveEvent) => {
      const delta = ((moveEvent.clientX - startX) / tableWidth) * 100;
      setColumnWidths(() => {
        const next = { ...startWidths };
        const minimums = { name: 32, type: 9, size: 8, modified: 12 };
        next[key] = clampNumber(startWidths[key] + delta, minimums[key] || 8, 76);
        if (nextKey) next[nextKey] = clampNumber(startWidths[nextKey] - delta, minimums[nextKey] || 8, 44);
        const total = Object.values(next).reduce((sum, value) => sum + Number(value || 0), 0) || 100;
        return Object.fromEntries(Object.entries(next).map(([column, value]) => [column, (Number(value) / total) * 100]));
      });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const handleDragOver = (event) => {
    if (!connected) return;
    event.preventDefault();
    setDragActive(true);
  };

  const handleDrop = async (event) => {
    if (!connected) return;
    event.preventDefault();
    setDragActive(false);
    const files = Array.from(event.dataTransfer?.files || []);
    let paths = [];
    try {
      if (host?.getDroppedFilePaths) {
        const resolved = await host.getDroppedFilePaths(files);
        paths = Array.isArray(resolved) ? resolved.filter(Boolean) : [];
      }
      if (!paths.length && host?.getDroppedFilePath) {
        paths = files.map((file) => host.getDroppedFilePath(file)).filter(Boolean);
      }
    } catch {}
    if (!paths.length) paths = files.map((file) => file.path).filter(Boolean);
    if (!paths.length) return setError?.("Dropped items did not expose local file paths. Use Upload File or Upload Folder instead.");
    await uploadPaths(paths);
  };

  const parentPath = browser?.parent || currentPath;
  const canGoUp = parentPath && parentPath !== currentPath;
  const selectedLabel = selectedCount ? `${selectedCount} selected` : "No selection";
  const sortArrow = (key) => sortSpec.key === key ? (sortSpec.direction === "desc" ? " ↓" : " ↑") : "";
  const anyFileJobRunning = fileJobs.some((job) => job.status === "running" || job.status === "queued");
  const activeDownloadPath = activeJob?.kind === "fileBrowser.download" && activeJob.status === "completed" ? (activeJob.result?.localPath || activeJob.result?.localPaths?.[0] || "") : "";
  const firstDownloadPath = activeDownloadPath || (!anyFileJobRunning ? (downloadJob?.result?.localPath || downloadJob?.result?.localPaths?.[0] || "") : "");

  return (
    <>
      <PageHeader title="File Browser" subtitle="Browse, upload, download, and manage files on your connected MiSTer." badge={connected ? `${entries.length} items` : "Offline"} checking={checking} checkLabel="Reading directory…" />
      <Card title="Location" className="mister-file-browser-card">
        <div className="mister-file-location-row">
          <div className="mister-root-tabs">
            {roots.map((root) => (
              <button key={root.path} className={currentPath === root.path || currentPath.startsWith(`${root.path}/`) ? "active" : ""} disabled={!connected || root.available === false} onClick={() => openDirectory(root.path)}>{root.name || root.path}</button>
            ))}
          </div>
          <div className="mister-action-row compact">
            <button className="secondary-button" disabled={!connected || !canGoUp} onClick={() => openDirectory(parentPath)}>Up</button>
            <button className="secondary-button" disabled={!connected} onClick={refreshHere}>Refresh</button>
          </div>
        </div>
        <div className="mister-breadcrumbs" aria-label="Current path">
          {splitRemotePath(currentPath).map((segment, index, all) => (
            <React.Fragment key={segment.path}>
              <button disabled={!connected || index === all.length - 1} onClick={() => openDirectory(segment.path)}>{segment.label}</button>
              {index < all.length - 1 ? <span>/</span> : null}
            </React.Fragment>
          ))}
        </div>
        <div className="mister-file-command-strip">
          <Field label={selectedEntry ? "Rename selected" : "New folder name"}>
            <input value={nameDraft} disabled={!connected} onChange={(event) => setNameDraft(event.target.value)} placeholder="Folder or item name" />
          </Field>
          <div className="mister-action-row wrap file-browser-actions">
            <button className="primary-button" disabled={!connected || !nameDraft.trim()} onClick={makeFolder}>New Folder</button>
            <button className="secondary-button" disabled={!connected || !selectedEntry || !nameDraft.trim()} onClick={renameSelected}>Rename</button>
            <button className="secondary-button" disabled={!connected} onClick={uploadFile}>Upload File</button>
            <button className="secondary-button" disabled={!connected} onClick={uploadFolder}>Upload Folder</button>
            <button className="secondary-button" disabled={!connected || !selectedCount} onClick={downloadSelected}>Download</button>
            <button className="secondary-button" disabled={!connected || !selectedCount} onClick={() => copySelected("copy")}>Copy</button>
            <button className="secondary-button" disabled={!connected || !selectedCount} onClick={() => copySelected("cut")}>Move</button>
            <button className="secondary-button" disabled={!connected || !clipboard?.paths?.length} onClick={pasteClipboard}>Paste</button>
            <button className="danger-button" disabled={!connected || !selectedCount} onClick={deleteSelected}>Delete</button>
          </div>
        </div>
        {clipboard?.paths?.length ? <p className="mister-settings-note mister-file-clipboard-note">Clipboard: {clipboard.mode === "cut" ? "Move" : "Copy"} {clipboard.count === 1 ? clipboard.names?.[0] : `${clipboard.count} items`} to the current folder.</p> : null}
      </Card>

      <Card title="Files" className="mister-file-list-card" footer={<div className="mister-file-footer"><span>{selectedLabel}</span><span>{currentPath}</span></div>}>
        {connected ? (
          <div className={`mister-file-table-wrap${dragActive ? " drag-active" : ""}`} onDragOver={handleDragOver} onDragEnter={handleDragOver} onDragLeave={() => setDragActive(false)} onDrop={handleDrop}>
            {dragActive ? <div className="mister-file-drop-hint">Drop files or folders to upload to this MiSTer folder</div> : null}
            <table className="mister-file-table" ref={tableRef}>
              <colgroup>
                <col style={{ width: `${columnWidths.name}%` }} />
                <col style={{ width: `${columnWidths.type}%` }} />
                <col style={{ width: `${columnWidths.size}%` }} />
                <col style={{ width: `${columnWidths.modified}%` }} />
              </colgroup>
              <thead><tr>
                <th><button type="button" onClick={() => toggleSort("name")}>Name{sortArrow("name")}</button><span className="mister-column-resizer" onMouseDown={(event) => startColumnResize(event, "name", "type")} /></th>
                <th><button type="button" onClick={() => toggleSort("type")}>Type{sortArrow("type")}</button><span className="mister-column-resizer" onMouseDown={(event) => startColumnResize(event, "type", "size")} /></th>
                <th><button type="button" onClick={() => toggleSort("size")}>Size{sortArrow("size")}</button><span className="mister-column-resizer" onMouseDown={(event) => startColumnResize(event, "size", "modified")} /></th>
                <th><button type="button" onClick={() => toggleSort("modified")}>Modified{sortArrow("modified")}</button></th>
              </tr></thead>
              <tbody>
                {sortedEntries.length ? sortedEntries.map((entry) => (
                  <tr key={entry.path} className={selectedPaths.includes(entry.path) ? "selected" : ""} onClick={(event) => selectEntry(entry, event)} onDoubleClick={() => entry.is_dir && openDirectory(entry.path)}>
                    <td><span className="mister-file-name-cell"><FileBrowserEntryIcon isFolder={entry.is_dir} /><strong title={entry.name}>{entry.name}</strong></span></td>
                    <td>{entry.type || (entry.is_dir ? "Folder" : "File")}</td>
                    <td>{entry.is_dir ? "—" : (entry.sizeLabel || formatBytes(entry.size))}</td>
                    <td>{entry.modifiedAtLabel || formatTimestamp(entry.mtime)}</td>
                  </tr>
                )) : <tr><td colSpan="4"><EmptyValue>This folder is empty. Drag files here to upload.</EmptyValue></td></tr>}
              </tbody>
            </table>
          </div>
        ) : <EmptyValue>Connect to a MiSTer before browsing files.</EmptyValue>}
      </Card>

      <Card title="Activity" className="mister-file-activity-card">
        {activeJob ? (
          <div className="mister-file-job">
            <header><strong>{activeJob.label || activeJob.kind}</strong><span>{activeJob.status}</span></header>
            <div className="mister-file-progress"><span style={{ width: `${Number(activeJob.progress?.percent || (activeJob.status === "completed" ? 100 : 12))}%` }} /></div>
            <p>{activeJob.progress?.label || activeJob.error || "Waiting for file operation…"}</p>
            {firstDownloadPath ? <div className="mister-action-row compact"><button className="secondary-button" onClick={() => host?.openPath?.(firstDownloadPath)}>Open Download</button></div> : null}
            <LogBox value={(activeJob.logs || []).slice(-8).join("\n") || activeJob.error || "No file activity yet."} />
          </div>
        ) : <EmptyValue>No file operations have run yet.</EmptyValue>}
      </Card>
    </>
  );
}

function SavesPage({ summary, refresh, startBackup, startMerge, restoreBackup, rebuildSync, setRetention, connected, sdMode, checking }) {
  const devices = useMemo(() => summary?.devices || [], [summary?.devices]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [selectedBackup, setSelectedBackup] = useState("");
  const [backupBeforeRestore, setBackupBeforeRestore] = useState(true);
  const [backupBeforeMerge, setBackupBeforeMerge] = useState(true);
  const [retentionDraft, setRetentionDraft] = useState(summary?.retention || 10);

  useEffect(() => { setRetentionDraft(summary?.retention || 10); }, [summary?.retention]);
  useEffect(() => {
    if (!devices.length) { setSelectedDevice(""); setSelectedBackup(""); return; }
    if (!selectedDevice || !devices.some((device) => device.name === selectedDevice)) {
      const nextDevice = devices[0]?.name || "";
      setSelectedDevice(nextDevice);
      const firstBackup = devices[0]?.backups?.[0];
      setSelectedBackup(backupName(firstBackup));
    }
  }, [devices, selectedDevice]);

  const activeDevice = devices.find((device) => device.name === selectedDevice) || devices[0] || null;
  const activeBackups = useMemo(() => activeDevice?.backups || [], [activeDevice?.backups]);
  useEffect(() => {
    if (!activeBackups.length) { setSelectedBackup(""); return; }
    if (!selectedBackup || !activeBackups.some((backup) => backupName(backup) === selectedBackup)) {
      setSelectedBackup(backupName(activeBackups[0]));
    }
  }, [activeBackups, selectedBackup]);

  const current = summary?.currentDevice || {};
  const canUseSaves = Boolean(connected || sdMode?.active || summary?.offlineActive);
  const modeText = storageModeLabel({ connected }, sdMode || summary?.sdMode);

  return (
    <>
      <PageHeader
        title="SaveManager"
        subtitle={`Back up, restore, and merge MiSTer saves and savestates. ${modeText}`}
        badge={`${summary?.backupCount || 0} backups`}
        checking={checking}
        checkLabel="Checking save backups…"
      />

      <div className="mister-card-grid two">
        <Card title="Current Device">
          <div className="mister-stat-list">
            <div><span>Profile</span><strong>{current.profileName || (sdMode?.active ? "SD Card" : "Not connected")}</strong></div>
            <div><span>{sdMode?.active ? "SD Folder" : "IP Address"}</span><strong>{current.ipAddress || sdMode?.root || "None"}</strong></div>
            <div><span>Backups for this device</span><strong>{summary?.currentBackupCount || 0}</strong></div>
            <div><span>Merge folder size</span><strong>{formatBytes(summary?.syncStats?.sizeBytes)}</strong></div>
          </div>
        </Card>
        <Card title="Backup Retention">
          <div className="mister-save-retention-row">
            <Field label="Backups to keep per device">
              <input type="number" min="1" max="100" value={retentionDraft} onChange={(event) => setRetentionDraft(event.target.value)} />
            </Field>
            <button className="secondary-button" onClick={() => setRetention(retentionDraft)}>Save Retention</button>
          </div>
          <p className="mister-settings-note">Retention is applied after new backups are created.</p>
        </Card>
      </div>

      <Card title="Actions">
        <div className="mister-action-row wrap">
          <button className="primary-button platinum-primary-action" disabled={!canUseSaves} onClick={startBackup}>Backup Saves</button>
          <label className="mister-inline-check"><input type="checkbox" checked={backupBeforeMerge} onChange={(event) => setBackupBeforeMerge(event.target.checked)} /> Backup before merge</label>
          <button className="secondary-button" disabled={!canUseSaves} onClick={() => startMerge({ backupBeforeMerge })}>Merge Saves</button>
          <button className="secondary-button" onClick={rebuildSync}>Rebuild Merge Folder</button>
          <button className="secondary-button" onClick={refresh}>Refresh Backups</button>
        </div>
      </Card>

      <Card title="Restore Backup">
        <div className="mister-save-restore-grid">
          <Field label="Restore from device">
            <ThemeAwareSelect value={selectedDevice} onChange={(event) => { setSelectedDevice(event.target.value); setSelectedBackup(""); }}>
              {devices.length ? devices.map((device) => <option key={device.name} value={device.name}>{device.name}</option>) : <option value="">No backups found</option>}
            </ThemeAwareSelect>
          </Field>
          <Field label="Backup">
            <ThemeAwareSelect value={selectedBackup} onChange={(event) => setSelectedBackup(event.target.value)}>
              {activeBackups.length ? activeBackups.map((backup) => <option key={backupName(backup)} value={backupName(backup)}>{backupName(backup)}</option>) : <option value="">No backups found</option>}
            </ThemeAwareSelect>
          </Field>
          <label className="mister-inline-check"><input type="checkbox" checked={backupBeforeRestore} onChange={(event) => setBackupBeforeRestore(event.target.checked)} /> Backup current device before restoring</label>
          <button
            className="primary-button"
            disabled={!canUseSaves || !selectedDevice || !selectedBackup}
            onClick={() => restoreBackup({ deviceName: selectedDevice, backupName: selectedBackup, backupBeforeRestore })}
          >Restore Selected Backup</button>
        </div>
      </Card>

      <div className="mister-card-grid two">
        <Card title="Local Folders">
          <div className="mister-path-list">
            <div><span>Backups</span><code>{summary?.paths?.backupRoot || "Unknown"}</code></div>
            <div><span>Merge Folder</span><code>{summary?.paths?.syncRoot || "Unknown"}</code></div>
          </div>
        </Card>
        <Card title="Backup Devices">
          {devices.length ? <div className="mister-backup-device-list">{devices.map((device) => (
            <details key={device.name} className="mister-backup-device-card" open={device.name === selectedDevice}>
              <summary><strong>{device.name}</strong><span>{device.backupCount || device.backups?.length || 0} backups</span></summary>
              <div className="mister-backup-list">
                {(device.backups || []).map((backup) => (
                  <button key={backupName(backup)} onClick={() => { setSelectedDevice(device.name); setSelectedBackup(backupName(backup)); }}>
                    <strong>{backupName(backup)}</strong>
                    <span>{formatTimestamp(backup.modifiedAt)} · {formatBytes(backup.sizeBytes)} · {backup.fileCount || 0} files</span>
                  </button>
                ))}
              </div>
            </details>
          ))}</div> : <EmptyValue>No local backups found yet.</EmptyValue>}
        </Card>
      </div>
    </>
  );
}


function ZapScraperPage({ summary, updateSettings, chooseFolder, startScan, startPlan, startScrape, startLogin, startScrapeSelected, backendCall, refreshJobs, busy, checking, confirmAction }) {
  const options = summary?.options || {};
  const settings = summary?.settings || {};
  const systems = useMemo(() => summary?.systems || [], [summary?.systems]);
  const plans = summary?.plans || [];
  const [selectedPaths, setSelectedPaths] = useState(() => new Set());
  const [localStatus, setLocalStatus] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewPayload, setReviewPayload] = useState(null);
  const [reviewItemIndex, setReviewItemIndex] = useState(0);
  const [reviewQuery, setReviewQuery] = useState("");
  const [reviewResults, setReviewResults] = useState([]);
  const [reviewResultIndex, setReviewResultIndex] = useState(0);
  const outputFormat = settings.outputFormat || "Zaparoo Companion";
  const isZaparooFormat = outputFormat === "Zaparoo Companion";
  const selectedCount = [...selectedPaths].filter(Boolean).length;
  const latestPlan = plans[0] || null;
  const selectedSystems = useMemo(() => systems.filter((system) => selectedPaths.has(String(system.path || ""))), [systems, selectedPaths]);
  const hasDeveloperCredentials = Boolean(options.hasDevCredentials || (settings.devId && settings.devPassword));

  useEffect(() => {
    setSelectedPaths((current) => {
      const valid = new Set(systems.map((system) => String(system.path || "")));
      const next = new Set([...current].filter((path) => valid.has(path)));
      return next;
    });
  }, [systems]);

  const update = (changes) => updateSettings({ ...settings, ...changes });
  const togglePath = (path) => {
    setSelectedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };
  const selectAll = () => setSelectedPaths(new Set(systems.map((system) => String(system.path || "")).filter(Boolean)));
  const clearSelection = () => setSelectedPaths(new Set());
  const setMediaSource = (name, enabled) => {
    const current = new Set(settings.zaparooMediaSources || options.defaultZaparooMediaSources || []);
    if (enabled) current.add(name);
    else current.delete(name);
    update({ zaparooMediaSources: [...current] });
  };

  const runJobAndWait = async (method, params, { timeoutMs = 300000 } = {}) => {
    const started = await backendCall(method, params, { timeoutMs: 10000 });
    const jobId = started?.id;
    if (!jobId) return started;
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 900));
      const status = await backendCall("jobs.status", { id: jobId }, { timeoutMs: 10000 });
      if (status?.status === "completed") {
        await refreshJobs?.().catch(() => {});
        return status.result || {};
      }
      if (status?.status === "failed") throw new Error(status.error || "ZapScraper job failed.");
      if (status?.cancelRequested) setLocalStatus("Cancel requested. Waiting for the current file/request to finish...");
    }
    throw new Error("Timed out waiting for the ZapScraper job to finish.");
  };

  const openReview = async (systemPath) => {
    const path = systemPath || selectedSystems[0]?.path;
    if (!path) return;
    setReviewOpen(true);
    setReviewLoading(true);
    setReviewPayload(null);
    setReviewItemIndex(0);
    setReviewResults([]);
    setReviewResultIndex(0);
    setLocalStatus("Loading gamelist review...");
    try {
      const payload = await backendCall("zapscraper.review", { ...settings, options: settings, systemPath: path }, { timeoutMs: 120000 });
      setReviewPayload(payload);
      const first = payload?.items?.[0];
      setReviewQuery(first?.defaultSearch || first?.display_name || first?.relative_path || "");
      setLocalStatus(`Loaded ${payload?.summary?.total || 0} review item(s).`);
    } catch (error) {
      setLocalStatus(error?.message || String(error));
    } finally {
      setReviewLoading(false);
    }
  };

  const currentReviewItem = reviewPayload?.items?.[reviewItemIndex] || null;
  const currentReviewResult = reviewResults[reviewResultIndex] || null;
  const currentSystemId = reviewPayload?.system?.screenscraper_id || reviewPayload?.system?.screenscraperId || currentReviewItem?.system_id || 0;

  const selectReviewItem = (index) => {
    setReviewItemIndex(index);
    const item = reviewPayload?.items?.[index] || null;
    setReviewQuery(item?.defaultSearch || item?.display_name || item?.relative_path || "");
    setReviewResults([]);
    setReviewResultIndex(0);
  };

  const searchManualMatch = async () => {
    if (!currentReviewItem) return;
    if (!reviewQuery.trim()) { setLocalStatus("Enter search text first."); return; }
    setReviewLoading(true);
    setLocalStatus("Searching ScreenScraper...");
    try {
      const result = await runJobAndWait("zapscraper.review.search.start", {
        ...settings,
        options: settings,
        query: reviewQuery,
        systemId: currentSystemId,
      }, { timeoutMs: 180000 });
      const results = result?.zapscraperReviewSearch?.results || [];
      setReviewResults(results);
      setReviewResultIndex(0);
      setLocalStatus(results.length ? `Found ${results.length} result(s).` : "No matching ScreenScraper results found.");
    } catch (error) {
      setLocalStatus(error?.message || String(error));
    } finally {
      setReviewLoading(false);
    }
  };

  const applyManualMatch = async () => {
    if (!currentReviewItem || !currentReviewResult || !reviewPayload?.system?.path) return;
    setReviewLoading(true);
    setLocalStatus("Applying manual match...");
    try {
      const result = await runJobAndWait("zapscraper.review.apply.start", {
        ...settings,
        options: settings,
        systemPath: reviewPayload.system.path,
        item: currentReviewItem,
        selectedResult: currentReviewResult,
        systemId: currentSystemId,
      }, { timeoutMs: 300000 });
      const refreshed = result?.zapscraperReviewApply?.review;
      if (refreshed) {
        setReviewPayload(refreshed);
        setReviewItemIndex((current) => Math.min(current, Math.max(0, (refreshed.items || []).length - 1)));
      }
      setReviewResults([]);
      setReviewResultIndex(0);
      setLocalStatus("Manual match applied.");
    } catch (error) {
      setLocalStatus(error?.message || String(error));
    } finally {
      setReviewLoading(false);
    }
  };

  const clearScanCache = async () => {
    if (!(await confirmAction("Clear the current ZapScraper scan cache? This does not remove gamelist or artwork output.", { title: "Clear scan cache", confirmLabel: "Clear", tone: "danger" }))) return;
    setLocalStatus("Clearing scan cache...");
    try {
      const result = await backendCall("zapscraper.clearCache", settings, { timeoutMs: 30000 });
      updateSettings(result?.settings || settings);
      setLocalStatus("Scan cache cleared.");
    } catch (error) { setLocalStatus(error?.message || String(error)); }
  };

  const clearSelectedOutput = async () => {
    if (!selectedCount) return;
    if (!(await confirmAction("Clean gamelist/cache/media output for the selected systems? This removes generated ZapScraper output for those systems.", { title: "Clean selected output", confirmLabel: "Clean", tone: "danger" }))) return;
    setLocalStatus("Starting cleanup job...");
    try {
      await backendCall("zapscraper.clearOutput.start", { ...settings, options: settings, selectedPaths: [...selectedPaths] }, { timeoutMs: 10000 });
      await refreshJobs?.();
      setLocalStatus("Cleanup started.");
    } catch (error) { setLocalStatus(error?.message || String(error)); }
  };

  const logout = async () => {
    try {
      const result = await backendCall("zapscraper.logout", {}, { timeoutMs: 10000 });
      updateSettings(result?.settings || { loggedIn: false, accountName: "" });
      setLocalStatus("Logged out of ScreenScraper.");
    } catch (error) { setLocalStatus(error?.message || String(error)); }
  };

  const stopZapScraperJobs = async () => {
    setLocalStatus("Looking for running ZapScraper jobs...");
    try {
      const payload = await backendCall("jobs.list", {}, { timeoutMs: 10000 });
      const running = (payload?.jobs || []).filter((job) => String(job.kind || "").startsWith("zapscraper.") && ["queued", "running"].includes(job.status));
      if (!running.length) { setLocalStatus("No running ZapScraper job found."); return; }
      for (const job of running) await backendCall("jobs.cancel", { id: job.id }, { timeoutMs: 10000 });
      await refreshJobs?.();
      setLocalStatus(`Cancel requested for ${running.length} ZapScraper job(s).`);
    } catch (error) { setLocalStatus(error?.message || String(error)); }
  };

  const formatReviewStatus = (item) => {
    const status = item?.status || "";
    if (status === "complete") return "OK";
    if (status === "missing_image") return "Missing image";
    if (status === "missing_media") return "Missing media";
    if (status === "matched") return "Matched";
    if (status === "unmatched") return "Unmatched";
    return status || "Missing metadata";
  };

  return (
    <>
      <PageHeader title="ZapScraper" subtitle="Scan games, review matches, and scrape metadata/media." badge={`${summary?.systemCount || 0} systems · ${summary?.romCount || 0} ROMs`} checking={checking} checkLabel="Checking scraper status…" />
      {!hasDeveloperCredentials ? <div className="mister-warning-box">ScreenScraper developer credentials are missing. Add them in Source & Account. Scan, review, and cleanup still work.</div> : null}

      <div className="mister-zapscraper-layout full">
        <Card title="Systems" footer={
          <div className="mister-zapscraper-system-footer">
            <div className="mister-button-row">
              <button className="secondary-button" onClick={selectAll} disabled={!systems.length}>Select All</button>
              <button className="secondary-button" onClick={clearSelection} disabled={!systems.length}>Clear</button>
              <button className="secondary-button" onClick={() => openReview()} disabled={!selectedCount}>Review Gamelist</button>
            </div>
            <span>{selectedCount} selected</span>
          </div>
        }>
          <div className="mister-zapscraper-system-list tall">
            {systems.length ? systems.map((system) => {
              const path = String(system.path || "");
              const checked = selectedPaths.has(path);
              return (
                <button key={path || system.folder || system.label} className={checked ? "mister-zapscraper-system selected" : "mister-zapscraper-system"} onClick={() => togglePath(path)} aria-pressed={checked} onDoubleClick={() => openReview(path)}>
                  <span className="mister-zapscraper-check">{checked ? "✓" : ""}</span>
                  <span><strong>{system.label || system.folder || "Unknown"}</strong><em>{system.romCount || system.count || 0} ROMs · {system.folder || "folder"}</em></span>
                </button>
              );
            }) : <EmptyValue>No systems scanned yet. Choose a source folder and run Scan Source.</EmptyValue>}
          </div>
        </Card>

        <div className="mister-zapscraper-stack">
          <Card title="Source & Account">
            <div className="mister-form-grid two">
              <Field label="Source Mode"><ThemeAwareSelect value={settings.sourceMode || "Custom Games Folder"} onChange={(event) => update({ sourceMode: event.target.value })}>{(options.sourceModes || []).map((item) => <option key={item}>{item}</option>)}</ThemeAwareSelect></Field>
              <Field label="Source Folder"><div className="mister-inline-control"><input value={settings.sourcePath || ""} onChange={(event) => update({ sourcePath: event.target.value })} placeholder="Choose games folder or SD root" /><button className="secondary-button" onClick={chooseFolder}>Browse</button></div></Field>
              <Field label="ScreenScraper Username"><input value={settings.username || ""} onChange={(event) => update({ username: event.target.value, loggedIn: false })} placeholder="username" /></Field>
              <Field label="ScreenScraper Password"><input type="password" value={settings.password || ""} onChange={(event) => update({ password: event.target.value, loggedIn: false })} placeholder="password" /></Field>
              <Field label="Developer ID"><input value={settings.devId || ""} onChange={(event) => update({ devId: event.target.value, loggedIn: false })} placeholder="ScreenScraper dev ID" /></Field>
              <Field label="Developer Password"><input type="password" value={settings.devPassword || ""} onChange={(event) => update({ devPassword: event.target.value, loggedIn: false })} placeholder="ScreenScraper dev password" /></Field>
              <Field label="Softname"><input value={settings.devSoftName || "mister-companion"} onChange={(event) => update({ devSoftName: event.target.value || "mister-companion", loggedIn: false })} placeholder="mister-companion" /></Field>
            </div>
            <div className="mister-button-row wrap">
              <button className="primary-button platinum-primary-action" disabled={busy || !settings.sourcePath} onClick={() => startScan(settings)}>Scan Source</button>
              <button className="secondary-button" disabled={busy || !settings.username || !settings.password || !hasDeveloperCredentials} onClick={() => startLogin(settings)}>Test Login</button>
              <button className="secondary-button" disabled={!settings.loggedIn} onClick={logout}>Logout</button>
              <button className="secondary-button" disabled={!summary?.cacheExists} onClick={clearScanCache}>Clear Scan Cache</button>
              <span className="mister-inline-status">{settings.loggedIn ? `Logged in${settings.accountName ? ` as ${settings.accountName}` : ""}` : "ScreenScraper not logged in"}</span>
            </div>
          </Card>

          <Card title="Scraper Options">
            <div className="mister-form-grid two">
              <Field label="Output Format"><ThemeAwareSelect value={outputFormat} onChange={(event) => update({ outputFormat: event.target.value })}>{(options.outputFormats || []).map((item) => <option key={item}>{item}</option>)}</ThemeAwareSelect></Field>
              <Field label="Image Size"><ThemeAwareSelect value={settings.imageSize || "HDTV Mode"} onChange={(event) => update({ imageSize: event.target.value, crtMode: event.target.value === "CRT Mode" })}>{(options.imageSizes || []).map((item) => <option key={item}>{item}</option>)}</ThemeAwareSelect></Field>
              {isZaparooFormat ? <Field label="Region Priority"><ThemeAwareSelect value={settings.regionPriority || "USA"} onChange={(event) => update({ regionPriority: event.target.value, region: event.target.value })}>{(options.regionPriorities || []).map((item) => <option key={item}>{item}</option>)}</ThemeAwareSelect></Field> : <Field label="Region"><ThemeAwareSelect value={settings.region || "Auto"} onChange={(event) => update({ region: event.target.value })}>{(options.regions || []).map((item) => <option key={item}>{item}</option>)}</ThemeAwareSelect></Field>}
              {!isZaparooFormat ? <Field label="Image Source"><ThemeAwareSelect value={settings.imageSource || "2D Boxart"} onChange={(event) => update({ imageSource: event.target.value })}>{(options.imageSources || []).map((item) => <option key={item}>{item}</option>)}</ThemeAwareSelect></Field> : null}
            </div>
            {isZaparooFormat ? <div className="mister-zapscraper-media-grid">{(options.zaparooMediaSources || []).map((name) => <label key={name} className="mister-checkbox-row"><input type="checkbox" checked={(settings.zaparooMediaSources || []).includes(name)} onChange={(event) => setMediaSource(name, event.target.checked)} />{name}</label>)}</div> : null}
            <div className="mister-zapscraper-toggle-grid">
              <label className="mister-checkbox-row"><input type="checkbox" checked={settings.skipExistingMetadata !== false} onChange={(event) => update({ skipExistingMetadata: event.target.checked })} />Skip existing metadata</label>
              <label className="mister-checkbox-row"><input type="checkbox" checked={settings.skipExistingImages !== false} onChange={(event) => update({ skipExistingImages: event.target.checked })} />Skip existing images/media</label>
              <label className="mister-checkbox-row"><input type="checkbox" checked={Boolean(settings.skipGamesWithMetadataIgnoreIncompleteMedia)} onChange={(event) => update({ skipGamesWithMetadataIgnoreIncompleteMedia: event.target.checked })} />Skip games with metadata completely</label>
              <label className="mister-checkbox-row"><input type="checkbox" checked={Boolean(settings.rebuildFromScratch)} onChange={(event) => update({ rebuildFromScratch: event.target.checked })} />Rebuild from scratch</label>
            </div>
          </Card>

          <Card title="Plan, Scrape & Cleanup" footer={<span>{latestPlan ? `Latest plan: ${latestPlan.actionCount || 0} action(s)` : localStatus || "No plan yet"}</span>}>
            <div className="mister-button-row wrap">
              <button className="primary-button platinum-primary-action" disabled={busy || !selectedCount || !hasDeveloperCredentials || !settings.loggedIn} onClick={() => startScrapeSelected({ settings, selectedPaths: [...selectedPaths] })}>Scrape Selected</button>
              <button className="secondary-button" disabled={busy || !selectedCount} onClick={() => startPlan({ settings, selectedPaths: [...selectedPaths] })}>Plan Only</button>
              <button className="secondary-button" disabled={busy || !latestPlan?.id || !hasDeveloperCredentials || !settings.loggedIn} onClick={() => startScrape({ planId: latestPlan.id, settings })}>Scrape Latest Plan</button>
              <button className="secondary-button" disabled={!selectedCount} onClick={clearSelectedOutput}>Clean Selected Output</button>
              <button className="secondary-button" onClick={stopZapScraperJobs}>Stop</button>
            </div>
            <div className="mister-stat-strip compact">
              <span><strong>{selectedCount}</strong><em>selected systems</em></span>
              <span><strong>{summary?.romCount || 0}</strong><em>scanned ROMs</em></span>
              <span><strong>{summary?.cacheExists ? "Yes" : "No"}</strong><em>scan cache</em></span>
            </div>
          </Card>
        </div>
      </div>

      {reviewOpen ? <div className="mister-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setReviewOpen(false); }}>
        <div className="mister-zapscraper-review-modal">
          <WindowTitlebar title="Review Gamelist" onClose={() => setReviewOpen(false)} />
          <div className="mister-modal-header">
            <div><h2>Review Gamelist</h2><p>{reviewPayload?.system?.label || reviewPayload?.system?.folder || "Selected system"} · {reviewPayload?.mode === "zaparoo" ? "Zaparoo Companion" : "Recalbox Compatible"}</p></div>
            <button className="secondary-button" onClick={() => setReviewOpen(false)}>Close</button>
          </div>
          {reviewPayload?.summary ? <div className="mister-stat-strip compact">
            {Object.entries(reviewPayload.summary).map(([key, value]) => <span key={key}><strong>{value}</strong><em>{key}</em></span>)}
          </div> : null}
          <div className="mister-zapscraper-review-grid">
            <section className="mister-zapscraper-review-list">
              {reviewLoading && !reviewPayload ? <EmptyValue>Loading review items...</EmptyValue> : (reviewPayload?.items || []).map((item, index) => (
                <button key={`${item.relative_path || item.display_name || index}`} className={index === reviewItemIndex ? "mister-zapscraper-review-item selected" : "mister-zapscraper-review-item"} onClick={() => selectReviewItem(index)}>
                  <strong>{item.display_name || item.relative_path || "Unknown"}</strong>
                  <span>{formatReviewStatus(item)}</span>
                </button>
              ))}
            </section>
            <section className="mister-zapscraper-review-detail">
              {currentReviewItem ? <>
                <div className="mister-zapscraper-review-preview">
                  <h3>{currentReviewItem.display_name || currentReviewItem.relative_path}</h3>
                  <p>{currentReviewItem.relative_path}</p>
                  <dl>
                    <div><dt>Status</dt><dd>{formatReviewStatus(currentReviewItem)}</dd></div>
                    <div><dt>Current match</dt><dd>{currentReviewItem.matched_name || currentReviewItem.entry?.name || currentReviewItem.parent?.name || "None"}</dd></div>
                    <div><dt>ROM</dt><dd>{currentReviewItem.rom?.filename || "Unknown"}</dd></div>
                    <div><dt>Missing media</dt><dd>{(currentReviewItem.missing_media || []).join(", ") || "None"}</dd></div>
                  </dl>
                </div>
                <div className="mister-zapscraper-manual-search">
                  <Field label="Manual ScreenScraper Search"><div className="mister-inline-control"><input value={reviewQuery} onChange={(event) => setReviewQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") searchManualMatch(); }} /><button className="primary-button" disabled={reviewLoading || !hasDeveloperCredentials} onClick={searchManualMatch}>Search</button></div></Field>
                  <div className="mister-zapscraper-search-results">
                    {reviewResults.length ? reviewResults.map((result, index) => (
                      <button key={`${result.id || result.name || index}`} className={index === reviewResultIndex ? "selected" : ""} onClick={() => setReviewResultIndex(index)}>
                        <strong>{result.name || "Unknown Game"}</strong>
                        <span>{[result.system, result.developer || result.publisher, result.releasedate].filter(Boolean).join(" · ")}</span>
                      </button>
                    )) : <EmptyValue>No manual search results loaded.</EmptyValue>}
                  </div>
                  <div className="mister-button-row wrap">
                    <button className="secondary-button" disabled={reviewLoading || !currentReviewResult || !hasDeveloperCredentials || !settings.loggedIn} onClick={applyManualMatch}>Use Selected Match</button>
                    <button className="secondary-button" disabled={reviewLoading || !reviewPayload?.system?.path} onClick={() => openReview(reviewPayload.system.path)}>Refresh Review</button>
                    <span className="mister-inline-status">{reviewLoading ? "Working..." : localStatus}</span>
                  </div>
                </div>
              </> : <EmptyValue>No review item selected.</EmptyValue>}
            </section>
          </div>
        </div>
      </div> : null}
    </>
  );
}


function ManualsPage({ manuals, refresh, backendCall, checking, confirmAction }) {
  const systems = useMemo(() => manuals?.systems || [], [manuals?.systems]);
  const [selectedSystem, setSelectedSystem] = useState("");
  const [pdfPayload, setPdfPayload] = useState({ system: "", pdfs: [] });
  const [query, setQuery] = useState("");
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [manualStatus, setManualStatus] = useState("");
  const [keepCached, setKeepCached] = useState(true);
  const [busy, setBusy] = useState(false);
  const manualsPdfCardRef = useRef(null);
  const [systemsCardCeiling, setSystemsCardCeiling] = useState(null);

  useEffect(() => {
    if (!selectedSystem && systems.length) setSelectedSystem(systems[0].name);
  }, [systems, selectedSystem]);

  const loadSystem = useCallback(async (systemName) => {
    if (!systemName) return;
    setBusy(true);
    setManualStatus(`Loading manuals for ${systemName}...`);
    setSelectedPdf(null);
    try {
      const payload = await backendCall("manuals.system", { system: systemName }, { timeoutMs: 90000 });
      setPdfPayload(payload || { system: systemName, pdfs: [] });
      setManualStatus(payload?.remoteError ? `Remote scan warning: ${payload.remoteError}` : `Loaded ${payload?.pdfCount || 0} manual(s).`);
    } catch (error) {
      setPdfPayload({ system: systemName, pdfs: [] });
      setManualStatus(error?.message || String(error));
    } finally {
      setBusy(false);
    }
  }, [backendCall]);

  useEffect(() => {
    if (selectedSystem) loadSystem(selectedSystem);
  }, [selectedSystem, loadSystem]);

  const filteredPdfs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (pdfPayload?.pdfs || []).filter((pdf) => !needle || String(pdf.name || "").toLowerCase().includes(needle));
  }, [pdfPayload, query]);

  const openPdf = useCallback(async (pdf, forceCache = false) => {
    if (!pdf) return;
    setBusy(true);
    setManualStatus(pdf.source === "remote" ? "Downloading manual for viewer window..." : "Opening manual viewer...");
    try {
      let manual = pdf;
      if (pdf.source === "remote" || forceCache) {
        const result = await backendCall("manuals.cache", {
          system: pdf.system || selectedSystem,
          path: pdf.path,
          name: pdf.name,
          keepCached,
        }, { timeoutMs: 180000 });
        manual = result?.manual || pdf;
        if (result?.summary) await refresh().catch(() => {});
        await loadSystem(selectedSystem || manual.system).catch(() => {});
      }
      await window.vaultKit.openManualWindow(manual.path, { title: manual.name, system: manual.system || selectedSystem });
      setSelectedPdf(manual);
      setManualStatus(`${manual.name} opened in a separate viewer window.`);
    } catch (error) {
      setManualStatus(error?.message || String(error));
    } finally {
      setBusy(false);
    }
  }, [backendCall, keepCached, loadSystem, refresh, selectedSystem]);

  const removeCached = useCallback(async (pdf = null) => {
    const label = pdf?.path ? `Remove cached copy of ${pdf.name}?` : "Remove all cached manuals from this PC?";
    if (!(await confirmAction(label, { title: "Remove cached manual", confirmLabel: "Remove", tone: "danger" }))) return;
    setBusy(true);
    try {
      const result = await backendCall("manuals.removeCached", { path: pdf?.source === "cache" ? pdf.path : "" }, { timeoutMs: 45000 });
      if (result?.summary) await refresh().catch(() => {});
      if (selectedSystem) await loadSystem(selectedSystem).catch(() => {});
      if (!pdf || pdf?.path === selectedPdf?.path) {
        setSelectedPdf(null);
      }
      setManualStatus(pdf ? "Cached manual removed." : "Manual cache cleared.");
    } catch (error) {
      setManualStatus(error?.message || String(error));
    } finally {
      setBusy(false);
    }
  }, [backendCall, confirmAction, loadSystem, refresh, selectedPdf?.path, selectedSystem]);

  const openCacheFolder = useCallback(async () => {
    const path = manuals?.cacheRoot || (await backendCall("manuals.cacheRoot"))?.path;
    if (path) await window.vaultKit.openPath(path);
  }, [backendCall, manuals?.cacheRoot]);

  const selectedSource = selectedPdf?.source || "";

  useEffect(() => {
    const target = manualsPdfCardRef.current;
    if (!target) return undefined;
    const updateCeiling = () => {
      const height = Math.round(target.getBoundingClientRect().height);
      if (height > 0) setSystemsCardCeiling(height);
    };
    updateCeiling();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateCeiling) : null;
    observer?.observe(target);
    window.addEventListener("resize", updateCeiling);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateCeiling);
    };
  }, [filteredPdfs.length, manualStatus, selectedPdf?.path, busy]);

  return (
    <>
      <PageHeader title="Manuals" subtitle="Browse, cache, and view MiSTer PDF manuals in a dedicated viewer window." badge={`${systems.length} systems`} checking={checking} checkLabel="Checking manual cache…" />
      {manuals?.remoteError ? <div className="mister-warning-box">Remote manual scan warning: {manuals.remoteError}</div> : null}
      <div className="mister-manuals-layout">
        <Card title="Systems" className="mister-manual-systems-card" style={systemsCardCeiling ? { "--mister-manual-systems-card-ceiling": `${systemsCardCeiling}px` } : undefined} footer={<span>{manuals?.connected ? "MiSTer connected" : "Local cache only"}</span>}>
          <div className="mister-button-row wrap mister-manual-toolbar-row">
            <button className="secondary-button" onClick={refresh} disabled={busy}>Refresh</button>
            <button className="secondary-button" onClick={openCacheFolder} disabled={!manuals?.cacheRoot}>Open Cache</button>
            <button className="danger-button" onClick={() => removeCached()} disabled={busy || !manuals?.hasCachedManuals}>Clear Cache</button>
          </div>
          <div className="mister-manual-system-list">
            {systems.length ? systems.map((system) => (
              <button
                key={system.name}
                className={`mister-manual-system ${selectedSystem === system.name ? "selected" : ""}`}
                onClick={() => setSelectedSystem(system.name)}
              >
                <span>{system.name}</span>
                <em>{system.remote ? "MiSTer" : ""}{system.remote && system.cached ? " + " : ""}{system.cached ? "Cached" : ""}</em>
              </button>
            )) : <EmptyValue>No manuals found. Install manuals through update_all/manualsdb or add PDFs to the local cache.</EmptyValue>}
          </div>
        </Card>

        <Card title="PDF Manuals" className="mister-manual-pdfs-card" sectionRef={manualsPdfCardRef} footer={<span>{manualStatus || `${filteredPdfs.length} shown · ${pdfPayload?.pdfCount || 0} total`}</span>}>
          <div className="mister-manual-pdf-toolbar">
            <input className="mister-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search manuals..." />
            <label className="mister-checkbox-row"><input type="checkbox" checked={keepCached} onChange={(event) => setKeepCached(event.target.checked)} />Keep remote PDFs cached after viewing</label>
          </div>
          <div className="mister-manual-pdf-list">
            {filteredPdfs.length ? filteredPdfs.map((pdf) => {
              const key = `${pdf.source}:${pdf.path}:${pdf.name}`;
              const active = selectedPdf && (selectedPdf.path === pdf.path || selectedPdf.name === pdf.name);
              return (
                <button key={key} className={`mister-manual-pdf ${active ? "selected" : ""}`} onClick={() => setSelectedPdf(pdf)} onDoubleClick={() => openPdf(pdf)}>
                  <span>{pdf.name}</span>
                  <em>{pdf.source === "remote" ? "On MiSTer" : pdf.source === "temp" ? "Viewer" : "Cached"}{pdf.size ? ` · ${formatBytes(pdf.size)}` : ""}</em>
                </button>
              );
            }) : <EmptyValue>{busy ? "Loading manuals..." : "No manuals match this system/search."}</EmptyValue>}
          </div>
          <div className="mister-manual-actions-panel">
            <div className="mister-manual-selected-copy">
              <strong>{selectedPdf?.name || "No manual selected"}</strong>
              <span>{selectedPdf ? (selectedSource === "remote" ? "Ready to download and open in the PDF window." : "Ready to open in the PDF window.") : "Select a PDF manual from the list."}</span>
            </div>
            <div className="mister-button-row wrap">
              <button className="primary-button" disabled={busy || !selectedPdf} onClick={() => openPdf(selectedPdf)}>{selectedSource === "remote" ? "Download / Open" : "Open Viewer"}</button>
              <button className="secondary-button" disabled={busy || !selectedPdf || selectedSource !== "remote"} onClick={() => openPdf(selectedPdf, true)}>Cache Selected</button>
              <button className="secondary-button" disabled={!selectedPdf?.path} onClick={() => window.vaultKit.openPath(selectedPdf.path)}>Open Externally</button>
              <button className="danger-button" disabled={busy || selectedSource !== "cache"} onClick={() => removeCached(selectedPdf)}>Remove Cached</button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}


function ZapScriptsPage({ summary, refresh, loadPage, startScan, startService, launchItem, sendControl, connected, busy, checking }) {
  const PAGE_SIZE = 260;
  const [system, setSystem] = useState("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [pagedEntries, setPagedEntries] = useState([]);
  const [entryTotal, setEntryTotal] = useState(0);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const pageRequestRef = useRef(0);
  const serviceRefreshInFlightRef = useRef(false);
  const deferredQuery = useDeferredValue(query);
  const scripts = useMemo(() => summary?.scripts || [], [summary?.scripts]);
  const systems = summary?.systems || [];
  const counts = summary?.counts || {};
  const db = summary?.db || {};
  const state = summary?.state || {};
  const mediaStatus = summary?.mediaStatus || {};
  const zapItemKey = useCallback((item) => [
    item?.type || "item",
    item?.mediaId || item?.id || item?.media_dbid || "",
    item?.system_id || item?.system || "",
    item?.path || item?.zapScript || item?.name || item?.filename || "",
  ].join(":"), []);

  const scriptMatches = useMemo(() => {
    if (system !== "All" && system !== "Scripts") return [];
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return scripts;
    return scripts.filter((item) => [item.name, item.filename, item.path, item.system]
      .some((value) => String(value || "").toLowerCase().includes(q)));
  }, [deferredQuery, scripts, system]);

  const resetAndLoad = useCallback(async () => {
    const requestId = pageRequestRef.current + 1;
    pageRequestRef.current = requestId;
    setPagedEntries([]);
    setEntryTotal(0);
    setPageError("");
    setSelected(null);
    setSelectedKey("");
    if (system === "Scripts") {
      setPageLoading(false);
      return;
    }
    setPageLoading(true);
    try {
      const result = await loadPage({ system, query: deferredQuery, offset: 0, limit: PAGE_SIZE });
      if (pageRequestRef.current !== requestId) return;
      setPagedEntries(result?.entries || []);
      setEntryTotal(result?.total || 0);
      setPageError(result?.readError || "");
    } catch (error) {
      if (pageRequestRef.current !== requestId) return;
      setPagedEntries([]);
      setEntryTotal(0);
      setPageError(error?.message || String(error));
    } finally {
      if (pageRequestRef.current === requestId) setPageLoading(false);
    }
  }, [deferredQuery, loadPage, system]);

  useEffect(() => {
    const timer = window.setTimeout(() => { resetAndLoad(); }, deferredQuery ? 140 : 0);
    return () => window.clearTimeout(timer);
  }, [deferredQuery, resetAndLoad, summary?.db?.path, summary?.counts?.total]);

  const loadMoreEntries = useCallback(async () => {
    if (pageLoading || system === "Scripts" || pagedEntries.length >= entryTotal) return;
    const requestId = pageRequestRef.current + 1;
    pageRequestRef.current = requestId;
    setPageLoading(true);
    setPageError("");
    try {
      const result = await loadPage({ system, query: deferredQuery, offset: pagedEntries.length, limit: PAGE_SIZE });
      if (pageRequestRef.current !== requestId) return;
      setPagedEntries((current) => [...current, ...(result?.entries || [])]);
      setEntryTotal(result?.total ?? entryTotal);
      setPageError(result?.readError || "");
    } catch (error) {
      if (pageRequestRef.current === requestId) setPageError(error?.message || String(error));
    } finally {
      if (pageRequestRef.current === requestId) setPageLoading(false);
    }
  }, [deferredQuery, entryTotal, loadPage, pageLoading, pagedEntries.length, system]);

  const visibleItems = useMemo(() => {
    if (system === "Scripts") return scriptMatches;
    if (system === "All") return [...scriptMatches, ...pagedEntries];
    return pagedEntries;
  }, [pagedEntries, scriptMatches, system]);

  const filteredTotal = (system === "Scripts" ? scriptMatches.length : entryTotal + (system === "All" ? scriptMatches.length : 0));
  const lastScanText = db.lastScanTime ? new Date(db.lastScanTime * 1000).toLocaleString() : "Never";
  const apiAvailable = Boolean(mediaStatus.apiAvailable);
  const serviceReady = connected && Boolean(state.zaparoo_installed) && Boolean(apiAvailable || state.zaparoo_service_running || mediaStatus.serviceRunning);
  const serviceStatusText = serviceReady ? "Service Running" : "Service Not Running";
  const statusText = !connected ? "Disconnected" : !state.zaparoo_installed ? "Zaparoo not installed" : serviceStatusText;
  const statusBadge = <span className={`mister-status-pill ${serviceReady ? "connected" : "disconnected"}`}>{statusText}</span>;
  const canStartService = connected && Boolean(state.zaparoo_installed) && !serviceReady;
  const databaseText = mediaStatus.exists === true ? "Found" : mediaStatus.exists === false ? "Missing" : "Unknown";
  const launchable = serviceReady && Boolean(selected);
  const selectedLabel = selected ? (selected.name || selected.filename || selected.path || "Selected item") : "No item selected";
  const apiDetail = mediaStatus.apiError || mediaStatus.apiNote || mediaStatus.apiDetail || "";
  const chooseItem = (item) => {
    setSelected(item);
    setSelectedKey(zapItemKey(item));
  };
  useEffect(() => {
    if (!connected || serviceReady) return undefined;
    const refreshServiceState = () => {
      if (serviceRefreshInFlightRef.current) return;
      serviceRefreshInFlightRef.current = true;
      refresh().catch(() => {}).finally(() => { serviceRefreshInFlightRef.current = false; });
    };
    const timer = window.setInterval(refreshServiceState, 15000);
    const initial = window.setTimeout(refreshServiceState, 1200);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(initial);
    };
  }, [connected, refresh, serviceReady]);

  const onRefresh = async () => {
    await refresh({ force: true, forceServiceProbe: true });
    await resetAndLoad();
  };

  return (
    <>
      <PageHeader title="ZapScripts" subtitle="Launch Zaparoo games and scripts from the cached media database." badge={statusBadge} badgeBare checking={checking} checkLabel="Checking Zaparoo service…" />

      <Card title="ZapScripts Library" footer={
        <div className="mister-zap-library-footer">
          <span className="mister-zap-selected-text">{selectedLabel}</span>
          <div className="mister-button-row">
            <button className="secondary-button mister-zap-scan-button" disabled={!connected} onClick={startScan}>Scan Media DB</button>
            <button className="secondary-button mister-zap-refresh-button" onClick={onRefresh}>Refresh</button>
            <button className="primary-button mister-zap-launch-button" disabled={!launchable} onClick={() => launchItem(selected)}>Launch Selected</button>
          </div>
        </div>
      }>
        {db.readError ? <div className="mister-warning-box">Could not read cached media.db: {db.readError}</div> : null}
        {pageError ? <div className="mister-warning-box">Could not page cached media.db: {pageError}</div> : null}
        <div className="mister-zap-layout">
          <aside className="mister-zap-systems">
            <button className={system === "All" ? "active" : ""} onClick={() => setSystem("All")}>All <span>{counts.total || 0}</span></button>
            <button className={system === "Scripts" ? "active" : ""} onClick={() => setSystem("Scripts")}>Scripts <span>{counts.scripts || 0}</span></button>
            {systems.map((item) => <button key={item.name} className={system === item.name ? "active" : ""} onClick={() => setSystem(item.name)}>{item.name}<span>{item.count}</span></button>)}
          </aside>
          <section className="mister-zap-main">
            <div className="mister-zap-search-row">
              <input className="mister-zap-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search games, scripts, paths..." />
              <span>{pageLoading && !visibleItems.length ? "Loading…" : `${Math.min(visibleItems.length, filteredTotal)} / ${filteredTotal}`}</span>
            </div>
            <div className="mister-zap-list">
              {pageLoading && !visibleItems.length ? <EmptyValue>Loading library page…</EmptyValue> : visibleItems.length ? visibleItems.map((item) => {
                const key = zapItemKey(item);
                const isSelected = selectedKey === key;
                return (
                  <button key={key} className={isSelected ? "mister-zap-row selected" : "mister-zap-row"} onDoubleClick={() => serviceReady && launchItem(item)} onClick={() => chooseItem(item)} title={serviceReady ? "Double-click to launch, or select and use Launch Selected" : serviceStatusText} aria-pressed={isSelected}>
                    <span className="mister-zap-kind">{item.type === "script" ? "SH" : (item.system_id || item.system || "GAME").slice(0, 4)}</span>
                    <span className="mister-zap-meta"><strong>{item.name || item.filename || "Untitled"}</strong><em>{item.type === "script" ? "Script" : item.system || "Unknown"}{item.is_missing ? " · Missing" : ""}</em></span>
                  </button>
                );
              }) : <EmptyValue>No entries match the current filter. Run a scan if the library is empty.</EmptyValue>}
              {system !== "Scripts" && pagedEntries.length < entryTotal ? (
                <button className="mister-zap-load-more" disabled={pageLoading} onClick={loadMoreEntries}>{pageLoading ? "Loading…" : `Show more entries (${pagedEntries.length} / ${entryTotal})`}</button>
              ) : null}
            </div>
          </section>
        </div>
      </Card>

      <Card title="ZapScripts Status & Controls">
        <div className="mister-zap-status-well">
          <div className="mister-zap-status-group">
            <h4>Library</h4>
            <div><span>Games</span><strong>{counts.games || 0}</strong></div>
            <div><span>Scripts</span><strong>{counts.scripts || 0}</strong></div>
            <div><span>Missing</span><strong>{counts.missing || 0}</strong></div>
          </div>
          <div className="mister-zap-status-group wide">
            <h4>Media DB</h4>
            <div><span>Status</span><strong>{databaseText}</strong></div>
            <div><span>Last Scan</span><strong>{lastScanText}</strong></div>
            <div><span>Local Cache</span><code>{db.path || "No cache path"}</code></div>
          </div>
          <div className="mister-zap-status-group">
            <h4>Zaparoo</h4>
            <div><span>Installed</span><strong>{state.zaparoo_installed ? "Yes" : "No"}</strong></div>
            <div><span>Startup</span><strong>{state.zaparoo_service_enabled ? "Enabled" : "Disabled"}</strong></div>
            <div title={apiDetail}><span>Service</span><strong className={serviceReady ? "mister-zap-service-running" : "mister-zap-service-stopped"}>{serviceReady ? "Running" : "Not running"}</strong></div>
          </div>
          <div className="mister-zap-status-group controls">
            <h4>Controls</h4>
            {canStartService ? <button className="primary-button mister-zap-start-service" disabled={busy} onClick={startService}>Start Service</button> : null}
            <div className="mister-button-row compact">
              <button className="secondary-button" disabled={!serviceReady} onClick={() => sendControl("bluetooth")}>Bluetooth</button>
              <button className="secondary-button" disabled={!serviceReady} onClick={() => sendControl("osd")}>OSD</button>
              <button className="secondary-button" disabled={!serviceReady} onClick={() => sendControl("wallpaper")}>Wallpaper</button>
              <button className="secondary-button" disabled={!serviceReady} onClick={() => sendControl("home")}>Home / Stop</button>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}

const FALLBACK_MISTER_INI_OPTIONS = {
  hdmiMode: ["HD Output (Default)", "Direct Video (CRT / Scaler)"],
  resolutions: ["1280x720@60", "1024x768@60", "720x480@60", "720x576@50", "1280x1024@60", "800x600@60", "640x480@60", "1280x720@50", "1920x1080@60", "1920x1080@50", "1366x768@60", "1024x600@60", "1920x1440@60", "2048x1536@60", "2560x1440@60"],
  scaling: ["Disabled", "Low Latency", "Exact Refresh"],
  hdmiAudio: ["Enabled", "Disabled (DVI Mode)"],
  hdr: ["Disabled", "HLG HDR (recommended)", "DCI P3 HDR"],
  hdmiLimited: ["Full Range", "Limited Range"],
  analogue: ["RGBS (SCART)", "RGBHV (VGA 15 kHz)", "RGsB (Sync-on-Green)", "YPbPr (Component)", "S-Video", "Composite (CVBS)", "VGA Scaler (31 kHz+)", "Custom"],
  logo: ["Enabled", "Disabled"],
  amigavisionPreset: ["Disabled", "Enabled"],
  menuCrtPreset: ["Disabled", "NTSC, Large Text", "NTSC, Small Text", "PAL, Large Text", "PAL, Small Text"],
};

const DEFAULT_EASY_VALUES = {
  hdmi_mode: "HD Output (Default)",
  resolution: "1920x1080@60",
  scaling: "Low Latency",
  hdmi_audio: "Enabled",
  hdr: "Disabled",
  hdmi_limited: "Full Range",
  analogue: "RGBS (SCART)",
  logo: "Enabled",
  font: "Default",
  amigavision_preset: "Disabled",
  menu_crt_preset: "Disabled",
};

function EasySelect({ label, value, options, onChange, disabled }) {
  return (
    <Field label={label}>
      <ThemeAwareSelect value={value || ""} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {(options || []).map((option) => <option key={option} value={option}>{option}</option>)}
      </ThemeAwareSelect>
    </Field>
  );
}


function raPercent(game) {
  const total = Number(game?.total || 0);
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(game?.achieved || 0) / total) * 100)));
}

function retroAchievementsLastGameLabel(value) {
  if (!value) return "—";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "—";
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      const titleMatch = trimmed.match(/["'](?:Title|title|GameTitle|gameTitle|Name|name)["']\s*:\s*["']([^"']+)["']/);
      if (titleMatch?.[1]) return titleMatch[1];
      try { return retroAchievementsLastGameLabel(JSON.parse(trimmed)); } catch {}
      try { return retroAchievementsLastGameLabel(JSON.parse(trimmed.replace(/'/g, '"'))); } catch {}
    }
    return trimmed;
  }
  if (typeof value === "object") {
    return value.title || value.Title || value.gameTitle || value.GameTitle || value.name || value.Name || "—";
  }
  return String(value);
}

function raDate(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const date = new Date(text.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}


function sanitizeFilenamePart(value) {
  const text = String(value || "MiSTer").trim() || "MiSTer";
  return text.replace(/[<>:"/\\|?*\x00-\x1F]+/g, "_").replace(/\s+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "") || "MiSTer";
}

function localDateStamp() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function FlashJobProgress({ job }) {
  if (!job) return null;
  const progress = job.progress || {};
  const status = String(job.status || "");
  const running = status === "running" || status === "queued";
  const percent = Number.isFinite(Number(progress.percent)) ? Math.max(0, Math.min(100, Number(progress.percent))) : 0;
  const hasMeasuredProgress = Number(progress.total || 0) > 0 || percent > 0 || status === "completed";
  const label = progress.label || (String(job.kind || "").includes("backup") ? "Backing up" : String(job.kind || "").includes("write") ? "Flashing" : "Working");
  const details = Number(progress.total || 0) > 0
    ? `${formatBytes(progress.current)} / ${formatBytes(progress.total)}`
    : running ? "Preparing…" : status;
  return (
    <div className={`mister-flash-progress ${running && !hasMeasuredProgress ? "indeterminate" : ""}`}>
      <div className="mister-flash-progress-header">
        <strong>{job.label || "Flash SD job"}</strong>
        <span>{hasMeasuredProgress ? `${Math.round(percent)}%` : status}</span>
      </div>
      <div className="mister-flash-progress-track" aria-label={`${label} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(percent)}>
        <i style={{ width: `${hasMeasuredProgress ? percent : 38}%` }} />
      </div>
      <div className="mister-flash-progress-meta"><span>{label}</span><span>{details}</span></div>
    </div>
  );
}

function FlashSdPage({ summary, refresh, refreshDrives, startFlash, startBackup, jobs, refreshJobs, host, profileName, busy, checking, confirmAction, openToolsSettings }) {
  const modes = summary?.modes?.length ? summary.modes : [
    { id: "mc_fusion", label: "MC-Fusion" },
    { id: "mr_fusion", label: "Mr. Fusion" },
    { id: "superstation", label: "SuperStationOne SD Card Installer" },
  ];
  const [mode, setMode] = useState(summary?.mode || "mc_fusion");
  const [selectedDrive, setSelectedDrive] = useState("");
  const [status, setStatus] = useState("");
  const [macPassword, setMacPassword] = useState("");
  const drives = useMemo(() => summary?.drives || [], [summary?.drives]);
  const selectedMode = modes.find((item) => item.id === mode) || modes[0];
  const selectedDriveInfo = drives.find((drive) => drive.device === selectedDrive) || null;
  const imageReady = Boolean(summary?.image?.installed);
  const balenaReady = Boolean(summary?.balena?.ready || summary?.balena?.installed);
  const supported = summary?.supported !== false;
  const canFlash = supported && imageReady && balenaReady && selectedDrive && !busy;
  const canBackup = supported && balenaReady && selectedDrive && !busy;
  const isMac = String(summary?.platform || "").toLowerCase() === "darwin";
  const driveLabel = (drive) => String(drive?.display_name || drive?.displayName || drive?.device || "Unknown drive");
  const flashJobs = useMemo(() => (jobs?.jobs || []).filter((job) => String(job.kind || "").startsWith("flash.")), [jobs]);
  const activeFlashJob = flashJobs.find((job) => job.status === "running" || job.status === "queued") || flashJobs[0] || null;

  useEffect(() => { setMode(summary?.mode || "mc_fusion"); }, [summary?.mode]);
  useEffect(() => {
    if (!drives.length) { setSelectedDrive(""); return; }
    if (!selectedDrive || !drives.some((drive) => drive.device === selectedDrive)) {
      setSelectedDrive(drives[0]?.device || "");
    }
  }, [drives, selectedDrive]);

  const refreshMode = async (nextMode = mode, includeDrives = false) => {
    setStatus("Refreshing Flash SD status...");
    try {
      await refresh(nextMode, includeDrives, { force: true });
      setStatus("Flash SD status refreshed.");
    } catch (error) {
      setStatus(error.message || "Flash SD refresh failed.");
    }
  };

  const onModeChange = async (event) => {
    const nextMode = event.target.value;
    setMode(nextMode);
    await refreshMode(nextMode, false);
  };

  const runDriveRefresh = async () => {
    setStatus("Refreshing removable drives...");
    try { await refreshDrives({ mode }); setStatus("Refreshing drives."); }
    catch (error) { setStatus(error.message || "Drive refresh failed."); }
  };

  const runFlash = async () => {
    if (!selectedDrive) { setStatus("Select a target drive first."); return; }
    const driveText = selectedDriveInfo?.display_name || selectedDrive;
    const warning = `This will fully erase:\n\n${driveText}\n\nInstaller: ${selectedMode?.label || mode}\n\nContinue?`;
    if (!(await confirmAction(warning, { title: "Erase target drive", confirmLabel: "Continue", tone: "danger" }))) return;
    if (!(await confirmAction("Final confirmation: write the installer image to the selected drive?", { title: "Write installer image", confirmLabel: "Write image", tone: "danger" }))) return;
    setStatus("Starting flash job...");
    try { await startFlash({ mode, drive: selectedDrive, password: isMac ? macPassword : "" }); setStatus("Flash started."); await refreshJobs?.().catch?.(() => {}); }
    catch (error) { setStatus(error.message || "Flash job failed to start."); }
  };

  const runBackup = async () => {
    if (!selectedDrive) { setStatus("Select a source drive first."); return; }
    const driveText = selectedDriveInfo?.display_name || selectedDrive;
    const defaultName = `${sanitizeFilenamePart(profileName || "MiSTer")}_${localDateStamp()}.img`;
    const outputPath = await host?.chooseSaveFile?.({
      title: "Save SD card backup image",
      defaultPath: defaultName,
      filters: [{ name: "Raw disk image", extensions: ["img", "raw"] }],
    });
    if (!outputPath) { setStatus("Backup cancelled."); return; }
    const warning = `This will read the entire inserted SD card and save it as an image file.\n\nSource:\n${driveText}\n\nDestination:\n${outputPath}\n\nContinue?`;
    if (!(await confirmAction(warning, { title: "Back up SD card", confirmLabel: "Start backup", tone: "danger" }))) return;
    setStatus("Starting SD card backup...");
    try {
      await startBackup({ mode, drive: selectedDrive, outputPath, size: selectedDriveInfo?.size || 0 });
      setStatus("Backup started.");
      await refreshJobs?.().catch?.(() => {});
    } catch (error) {
      setStatus(error.message || "Backup job failed to start.");
    }
  };

  return (
    <>
      <PageHeader title="Flash SD" subtitle="Prepare installer cards, flash new SDs, or back up an inserted card to an image." badge={supported ? (summary?.canFlash ? "Ready" : "Setup required") : "Unsupported"} checking={checking} checkLabel="Checking flash tools…" />

      {!supported ? <div className="mister-inline-warning">Flash SD is only supported on Windows, Linux, and macOS.</div> : null}
      {summary?.privileges?.message ? <div className={`mister-inline-warning ${summary?.privileges?.status === "ready" ? "good" : ""}`}>{summary.privileges.message}</div> : null}

      <div className="mister-flash-layout">
        <Card title="Installer" className="mister-flash-installer-card">
          <Field label="Select installer">
            <ThemeAwareSelect value={mode} onChange={onModeChange} disabled={busy}>
              {modes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </ThemeAwareSelect>
          </Field>
          <p className="mister-settings-note">{summary?.info?.[mode] || "Download the installer image, prepare balena CLI, choose a drive, then flash."}</p>
          <div className="mister-stat-list compact">
            <div><span>Platform</span><strong>{summary?.platform || "Unknown"} / {summary?.archKey || "unknown"}</strong></div>
            <div><span>Tools Folder</span><code>{summary?.tools?.root || "Unknown"}</code></div>
          </div>
          <div className="mister-action-row wrap compact">
            <button className="secondary-button" type="button" onClick={openToolsSettings}>Open Flash Tools Settings</button>
          </div>
        </Card>

        <Card title="Target / Source Drive" className="mister-flash-drive-card">
          <div className="mister-flash-drive-row">
            <Field label="Drive">
              <ThemeAwareSelect value={selectedDrive} onChange={(event) => setSelectedDrive(event.target.value)} disabled={!drives.length || busy}>
                {drives.length ? drives.map((drive) => <option key={drive.device} value={drive.device}>{driveLabel(drive)}</option>) : <option value="">Refresh drives to load available targets</option>}
              </ThemeAwareSelect>
            </Field>
            <button className="secondary-button" disabled={!supported || busy || !balenaReady} onClick={runDriveRefresh}>Refresh Drives</button>
          </div>
          {selectedDriveInfo ? <div className="mister-flash-drive-details"><span>{selectedDriveInfo.description || selectedDriveInfo.device}</span><strong>{selectedDriveInfo.size ? formatBytes(selectedDriveInfo.size) : "Size unknown"}</strong></div> : null}
          {isMac ? (
            <Field label="macOS sudo password">
              <input type="password" value={macPassword} onChange={(event) => setMacPassword(event.target.value)} placeholder="Only needed on macOS" />
            </Field>
          ) : null}
          <div className="mister-action-row wrap">
            <button className="primary-button danger platinum-primary-action" disabled={!canFlash} onClick={runFlash}>Flash SD Card</button>
            <button className="secondary-button" onClick={() => refreshMode(mode, true)} disabled={!supported || busy}>Refresh Status + Drives</button>
          </div>
          <div className="mister-inline-warning danger">Flashing fully erases the selected drive.</div>
          <p className="mister-settings-note">The drive is safely ejected after flashing when supported.</p>
        </Card>

        <Card title="Back Up Inserted SD" className="mister-flash-backup-card">
          <p className="mister-settings-note">Creates a raw image from the selected SD card using the balena CLI drive list as the source picker.</p>
          <div className="mister-stat-list compact">
            <div><span>Default filename</span><strong>{sanitizeFilenamePart(profileName || "MiSTer")}_{localDateStamp()}.img</strong></div>
            <div><span>Save location</span><strong>Choose when backup starts</strong></div>
          </div>
          <div className="mister-action-row wrap">
            <button className="primary-button platinum-primary-action" disabled={!canBackup} onClick={runBackup}>Back Up SD Card</button>
          </div>
          <p className="mister-settings-note">Administrator or root privileges may be required to read a physical SD card.</p>
        </Card>
      </div>

      <Card title="Flash SD Activity" className="mister-flash-activity-card">
        <FlashJobProgress job={activeFlashJob} />
        <div className="mister-stat-list compact">
          <div><span>Installer image path</span><code>{summary?.image?.path || "Not downloaded"}</code></div>
          <div><span>Selected drive</span><strong>{selectedDrive ? (selectedDriveInfo?.display_name || selectedDrive) : "None"}</strong></div>
          <div><span>Last message</span><strong>{status || "Ready."}</strong></div>
        </div>
      </Card>
    </>
  );
}


function FlashToolsSettingsPanel({ summary, refresh, startImage, startBalena, busy, confirmAction }) {
  const modes = summary?.modes?.length ? summary.modes : [
    { id: "mc_fusion", label: "MC-Fusion" },
    { id: "mr_fusion", label: "Mr. Fusion" },
    { id: "superstation", label: "SuperStationOne SD Card Installer" },
  ];
  const [mode, setMode] = useState(summary?.mode || "mc_fusion");
  const [status, setStatus] = useState("");
  const selectedMode = modes.find((item) => item.id === mode) || modes[0];
  const supported = summary?.supported !== false;
  const imageReady = Boolean(summary?.image?.installed);
  const balenaReady = Boolean(summary?.balena?.ready || summary?.balena?.installed);
  const imageLabel = summary?.image?.update_available ? "Update Image" : imageReady ? "Re-download Image" : "Download Image";
  const balenaLabel = balenaReady ? "Re-download balena CLI" : "Download balena CLI";

  useEffect(() => { setMode(summary?.mode || "mc_fusion"); }, [summary?.mode]);

  const refreshMode = async (nextMode = mode) => {
    setStatus("Refreshing flash tool status...");
    try {
      await refresh(nextMode, false, { force: true });
      setStatus("Flash tool status refreshed.");
    } catch (error) {
      setStatus(error.message || "Flash tool refresh failed.");
    }
  };

  const onModeChange = async (event) => {
    const nextMode = event.target.value;
    setMode(nextMode);
    await refreshMode(nextMode);
  };

  const runImageAction = async (action) => {
    if (action === "remove" && !(await confirmAction(`Remove the downloaded ${selectedMode?.label || "installer"} image files?`, { title: "Remove image files", confirmLabel: "Remove", tone: "danger" }))) return;
    setStatus(`${action === "download" ? "Downloading" : "Removing"} ${selectedMode?.label || "installer"} image...`);
    try {
      await startImage({ mode, action });
      setStatus("Image job started. Check Activity for progress.");
    } catch (error) {
      setStatus(error.message || "Image action failed.");
    }
  };

  const runBalenaAction = async (action) => {
    if (action === "remove" && !(await confirmAction("Remove the downloaded balena CLI files?", { title: "Remove balena CLI", confirmLabel: "Remove", tone: "danger" }))) return;
    setStatus(`${action === "download" ? "Downloading" : "Removing"} balena CLI...`);
    try {
      await startBalena({ mode, action });
      setStatus("Tool job started. Check Activity for progress.");
    } catch (error) {
      setStatus(error.message || "balena CLI action failed.");
    }
  };

  return (
    <>
      <SettingsSectionHeading title="Flash Tools" description="Prepare the installer image and balena CLI used by the Flash SD workflow." />
      {!supported ? <div className="mister-inline-warning">Flash SD is only supported on Windows, Linux, and macOS.</div> : null}
      {summary?.privileges?.message ? <div className={`mister-inline-warning ${summary?.privileges?.status === "ready" ? "good" : ""}`}>{summary.privileges.message}</div> : null}
      <div className="settings-grid flash-tools-settings-grid">
        <section className="settings-section flash-tools-installer-section">
          <h3>Installer</h3>
          <label className="appearance-control">
            <span>Select installer</span>
            <ThemeAwareSelect value={mode} onChange={onModeChange} disabled={busy}>
              {modes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </ThemeAwareSelect>
          </label>
          <p className="settings-note">{summary?.info?.[mode] || "Download the installer image and prepare balena CLI before flashing or backing up SD cards."}</p>
          <div className="mister-stat-list compact">
            <div><span>Platform</span><strong>{summary?.platform || "Unknown"} / {summary?.archKey || "unknown"}</strong></div>
            <div><span>Tools Folder</span><code>{summary?.tools?.root || "Unknown"}</code></div>
          </div>
        </section>
        <section className="settings-section flash-tools-requirements-section">
          <h3>Requirements</h3>
          <div className="mister-flash-requirements">
            <div className={imageReady ? "ready" : "missing"}>
              <span>{selectedMode?.label || "Installer"} image</span>
              <strong>{imageReady ? (summary?.image?.local_name || summary?.image?.path || "Ready") : "Not downloaded"}</strong>
              {summary?.image?.latest_name ? <em>Latest: {summary.image.latest_name}</em> : null}
              {summary?.image?.update_available ? <em>Update available</em> : null}
            </div>
            <div className={balenaReady ? "ready" : "missing"}>
              <span>balena CLI</span>
              <strong>{balenaReady ? "Ready" : "Not downloaded"}</strong>
              {summary?.balena?.path ? <em>{summary.balena.path}</em> : null}
            </div>
          </div>
          <div className="mister-action-row wrap compact">
            <button className="secondary-button" disabled={!supported || busy} onClick={() => runImageAction("download")}>{imageLabel}</button>
            <button className="secondary-button danger" disabled={!supported || busy || !imageReady} onClick={() => runImageAction("remove")}>Remove Image</button>
            <button className="secondary-button" disabled={!supported || busy} onClick={() => runBalenaAction("download")}>{balenaLabel}</button>
            <button className="secondary-button danger" disabled={!supported || busy || !balenaReady} onClick={() => runBalenaAction("remove")}>Remove balena CLI</button>
            <button className="secondary-button" disabled={!supported || busy} onClick={() => refreshMode(mode)}>Refresh Status</button>
          </div>
          {status ? <p className="settings-note flash-tools-status-note">{status}</p> : null}
        </section>
      </div>
    </>
  );
}


function RetroAchievementsApiSettings({ settings, onSave, onRefresh }) {
  const [draft, setDraft] = useState(() => ({ username: settings?.username || "", apiKey: settings?.apiKey || "" }));
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    setDraft({ username: settings?.username || "", apiKey: settings?.apiKey || "" });
  }, [settings?.username, settings?.apiKey]);
  const save = async () => {
    setStatus("Saving RetroAchievements settings...");
    try {
      await onSave(draft);
      setStatus("RetroAchievements settings saved.");
      onRefresh?.().catch?.(() => {});
    } catch (error) {
      setStatus(error.message || "Could not save RetroAchievements settings.");
    }
  };
  return (
    <div className="mister-api-settings-panel">
      <SettingsSectionHeading title="RetroAchievements" description="Configure the username and Web API key used by the RetroAchievements sidebar page and related extras." />
      <div className="mister-settings-note">You can find your Web API key from your RetroAchievements account settings page.</div>
      <div className="mister-api-settings-grid">
        <label className="appearance-control">
          <span>Username</span>
          <input value={draft.username} onChange={(event) => setDraft((current) => ({ ...current, username: event.target.value }))} placeholder="RetroAchievements username" />
        </label>
        <label className="appearance-control">
          <span>Web API key</span>
          <div className="mister-inline-control">
            <input type={showKey ? "text" : "password"} value={draft.apiKey} onChange={(event) => setDraft((current) => ({ ...current, apiKey: event.target.value }))} placeholder="RetroAchievements Web API key" />
            <button className="secondary-button" type="button" onClick={() => setShowKey((value) => !value)}>{showKey ? "Hide" : "Show"}</button>
          </div>
        </label>
      </div>
      <div className="mister-action-row">
        <button className="primary-button" type="button" onClick={save}>Save</button>
        <button className="secondary-button" type="button" onClick={() => window.open(settings?.settingsUrl || "https://retroachievements.org/settings", "_blank")}>Get API Key</button>
        <button className="secondary-button" type="button" onClick={() => setDraft({ username: "", apiKey: "" })} disabled={!draft.username && !draft.apiKey}>Clear fields</button>
      </div>
      {status ? <p className="mister-settings-note">{status}</p> : null}
    </div>
  );
}

function RetroAchievementsPage({ data, settings, refresh, loadGame, openApiSettings, busy, checking }) {
  const [source, setSource] = useState("recent");
  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState("all");
  const [achievementFilter, setAchievementFilter] = useState("all");
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [status, setStatus] = useState("");
  const achievementsCardRef = useRef(null);
  const gamesListRef = useRef(null);
  const achievementsListRef = useRef(null);
  const [gamesCardCeiling, setGamesCardCeiling] = useState(null);
  const games = useMemo(() => source === "all" ? data?.allGames || [] : data?.recentGames || [], [data?.allGames, data?.recentGames, source]);
  const filteredGames = useMemo(() => {
    const text = search.trim().toLowerCase();
    return games.filter((game) => {
      const total = Number(game.total || 0);
      const soft = Number(game.softcoreAchieved ?? game.achieved ?? 0);
      const hard = Number(game.hardcoreAchieved || 0);
      if (gameFilter === "incomplete" && total && soft >= total) return false;
      if (gameFilter === "completed" && (!total || soft < total)) return false;
      if (gameFilter === "softcore" && soft <= 0) return false;
      if (gameFilter === "hardcore" && hard <= 0) return false;
      if (!text) return true;
      return `${game.title || ""} ${game.console || ""}`.toLowerCase().includes(text);
    });
  }, [games, search, gameFilter]);
  const achievements = useMemo(() => {
    const list = data?.achievements || [];
    return list.filter((item) => {
      if (achievementFilter === "locked") return !item.unlocked;
      if (achievementFilter === "softcore") return item.softcoreUnlocked && !item.hardcoreUnlocked;
      if (achievementFilter === "hardcore") return item.hardcoreUnlocked;
      return true;
    });
  }, [data?.achievements, achievementFilter]);
  const configured = Boolean(settings?.configured || (settings?.username && settings?.apiKey));
  const selectedGameId = data?.currentGame?.id;
  useEffect(() => {
    const target = achievementsCardRef.current;
    if (!target) return undefined;
    const updateCeiling = () => {
      const height = Math.round(target.getBoundingClientRect().height);
      if (height > 0) setGamesCardCeiling(height);
    };
    updateCeiling();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateCeiling) : null;
    observer?.observe(target);
    window.addEventListener("resize", updateCeiling);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateCeiling);
    };
  }, [data?.currentGame, achievements.length]);
  const startRefresh = async () => {
    setStatus("Loading RetroAchievements data...");
    try {
      await refresh({ force: true });
      setStatus("RetroAchievements data refreshed.");
    } catch (error) {
      setStatus(error.message || "RetroAchievements refresh failed.");
    }
  };
  const selectGame = async (game) => {
    if (!game?.id) return;
    setStatus(`Loading ${game.title || "game"} achievements...`);
    try {
      await loadGame(game.id);
      setStatus(`Loaded ${game.title || "game"}.`);
    } catch (error) {
      setStatus(error.message || "Could not load game details.");
    }
  };
  const changeSet = async (event) => {
    const value = event.target.value;
    if (value) await selectGame({ id: value, title: event.target.selectedOptions?.[0]?.textContent || "selected set" });
  };
  return (
    <>
      <PageHeader title="RetroAchievements" subtitle="Profile, completion, sets, and unlock details." badge={configured ? "Configured" : "Needs API"} checking={checking} checkLabel="Checking RetroAchievements…" />
      {!configured ? (
        <Card title="RetroAchievements API settings">
          <p>Add your username and Web API key in Settings / API.</p>
          <button className="primary-button" onClick={openApiSettings}>Open API Settings</button>
        </Card>
      ) : null}
      <div className="mister-ra-toolbar">
        <button className="primary-button" disabled={!configured || busy} onClick={startRefresh}>{busy ? "Working..." : "Refresh"}</button>
        <button className="secondary-button" onClick={openApiSettings}>API Settings</button>
        <span>{status || (data?.loadedAt ? `Loaded ${new Date(data.loadedAt * 1000).toLocaleString()}` : "Refresh to load your dashboard.")}</span>
      </div>
      <Card title="Profile" className="mister-ra-profile-card">
        {data?.profile ? (
          <div className="mister-ra-profile">
            <div className="mister-ra-avatar">{data.profile.avatarUrl ? <img src={data.profile.avatarUrl} alt="" /> : <span>RA</span>}</div>
            <div className="mister-ra-profile-details">
              <strong>{data.profile.user || settings?.username}</strong>
              <span>{data.profile.motto || "RetroAchievements profile"}</span>
              <div className="mister-stat-list compact">
                <div><span>Points</span><strong>{data.profile.points ?? "—"}</strong></div>
                <div><span>True Points</span><strong>{data.profile.truePoints ?? "—"}</strong></div>
                <div><span>Rank</span><strong>{data.profile.rank || "—"}</strong></div>
                <div><span>Status</span><strong>{data.profile.status || "—"}</strong></div>
                <div><span>Last Game</span><strong>{retroAchievementsLastGameLabel(data.profile.lastGame)}</strong></div>
              </div>
            </div>
          </div>
        ) : <EmptyValue>Profile data has not been loaded yet.</EmptyValue>}
      </Card>
      <div className="mister-ra-layout">
        <Card title="Games" className="mister-ra-games-card" style={gamesCardCeiling ? { "--mister-ra-games-card-ceiling": `${gamesCardCeiling}px` } : undefined} footer={<span>{filteredGames.length} shown · {(source === "all" ? data?.allGames : data?.recentGames)?.length || 0} total</span>}>
          <div className="mister-ra-list-controls">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search games..." />
            <ThemeAwareSelect value={gameFilter} onChange={(event) => setGameFilter(event.target.value)}>
              <option value="all">All</option>
              <option value="incomplete">Incomplete</option>
              <option value="completed">Completed</option>
              <option value="softcore">Softcore</option>
              <option value="hardcore">Hardcore</option>
            </ThemeAwareSelect>
          </div>
          <div className="mister-ra-scroll-region">
            <div ref={gamesListRef} className="mister-ra-game-list">
            {filteredGames.length ? filteredGames.slice(0, 700).map((game) => (
              <button key={`${source}-${game.id}-${game.title}`} className={`mister-ra-game-row${selectedGameId === game.id ? " selected" : ""}`} onClick={() => selectGame(game)}>
                <span className="mister-ra-game-icon">{game.image ? <img src={game.image} alt="" /> : "RA"}</span>
                <span className="mister-ra-game-main"><strong>{game.title}</strong><em>{game.console || "Unknown system"}</em></span>
                <span className="mister-ra-progress"><span>{game.achieved || 0}/{game.total || 0}</span><i><b style={{ width: `${raPercent(game)}%` }} /></i></span>
              </button>
            )) : <EmptyValue>No games found.</EmptyValue>}
            </div>
            <ThemedScrollbar scrollRef={gamesListRef} className="mister-ra-inner-scrollbar" />
          </div>
          <div className="mister-ra-source-buttons">
            <button className={`secondary-button${source === "recent" ? " active" : ""}`} aria-pressed={source === "recent"} onClick={() => setSource("recent")}>Recent</button>
            <button className={`secondary-button${source === "all" ? " active" : ""}`} aria-pressed={source === "all"} onClick={() => setSource("all")}>All Games</button>
          </div>
        </Card>
        <Card title="Achievements" className="mister-ra-achievements-card" sectionRef={achievementsCardRef} footer={<span>{achievements.length} achievement(s) shown</span>}>
          {data?.currentGame ? (
            <div className="mister-ra-game-detail">
              <header>
                <span className="mister-ra-detail-icon">{data.currentGame.image ? <img src={data.currentGame.image} alt="" /> : "RA"}</span>
                <div>
                  <strong>{data.currentGame.title}</strong>
                  <em>{data.currentGame.console || "Unknown system"} · {data.currentGame.achieved || 0}/{data.currentGame.total || 0}</em>
                  <div className="mister-ra-big-progress"><span style={{ width: `${raPercent(data.currentGame)}%` }} /></div>
                </div>
              </header>
              <div className="mister-ra-detail-controls">
                <label><span>Set</span><ThemeAwareSelect value={selectedGameId || ""} onChange={changeSet} disabled={!data?.sets?.length}>{(data?.sets?.length ? data.sets : [{ id: selectedGameId, title: "Base Set" }]).map((set) => <option key={set.id} value={set.id}>{set.title || set.type || set.id}</option>)}</ThemeAwareSelect></label>
                <label><span>Show</span><ThemeAwareSelect value={achievementFilter} onChange={(event) => setAchievementFilter(event.target.value)}><option value="all">All</option><option value="locked">Locked</option><option value="softcore">Softcore</option><option value="hardcore">Hardcore</option></ThemeAwareSelect></label>
              </div>
              <div className="mister-stat-list compact">
                <div><span>Total</span><strong>{data.stats?.total ?? 0}</strong></div>
                <div><span>Unlocked</span><strong>{data.stats?.unlocked ?? 0}</strong></div>
                <div><span>Hardcore</span><strong>{data.stats?.hardcore ?? 0}</strong></div>
                <div><span>Locked</span><strong>{data.stats?.locked ?? 0}</strong></div>
                <div><span>Points</span><strong>{data.stats?.points ?? 0}</strong></div>
              </div>
              <div className="mister-ra-scroll-region">
                <div ref={achievementsListRef} className="mister-ra-achievement-list">
                {achievements.map((achievement) => (
                  <button className={`mister-ra-achievement-row${achievement.unlocked ? " unlocked" : " locked"}${achievement.hardcoreUnlocked ? " hardcore" : ""}`} key={achievement.id} onClick={() => setSelectedAchievement(achievement)}>
                    <span className="mister-ra-achievement-badge">{achievement.badgeUrl ? <img src={achievement.badgeUrl} alt="" /> : "?"}</span>
                    <span><strong>{achievement.title}</strong><em>{achievement.description || "No description."}</em><small>{achievement.points || 0} point(s){achievement.dateAwarded ? ` · ${raDate(achievement.dateAwarded)}` : ""}</small></span>
                  </button>
                ))}
                </div>
                <ThemedScrollbar scrollRef={achievementsListRef} className="mister-ra-inner-scrollbar" />
              </div>
            </div>
          ) : <EmptyValue>Select a game to view its achievements.</EmptyValue>}
        </Card>
      </div>
      {selectedAchievement ? (
        <div className="modal-backdrop mister-ra-detail-modal" onClick={() => setSelectedAchievement(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <WindowTitlebar title={selectedAchievement.title} onClose={() => setSelectedAchievement(null)} />
            <header className="settings-page-header"><h2>{selectedAchievement.title}</h2><button className="settings-close-button" onClick={() => setSelectedAchievement(null)}><span className="window-control-glyph window-close-glyph" /></button></header>
            <div className="mister-ra-achievement-detail">
              <span className="mister-ra-achievement-badge large">{selectedAchievement.badgeUrl ? <img src={selectedAchievement.badgeUrl} alt="" /> : "?"}</span>
              <div><strong>{selectedAchievement.gameTitle}</strong><p>{selectedAchievement.description || "No description."}</p><p>{selectedAchievement.points || 0} point(s) · {selectedAchievement.hardcoreUnlocked ? "Hardcore" : selectedAchievement.softcoreUnlocked ? "Softcore" : "Locked"}</p>{selectedAchievement.dateAwarded ? <p>Unlocked: {raDate(selectedAchievement.dateAwarded)}</p> : null}</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MisterSettingsPage({
  ini,
  iniFiles,
  iniFonts,
  iniBackups,
  iniOptions,
  iniStatus,
  connected,
  sdMode,
  mode,
  setMode,
  easy,
  updateEasy,
  selectedFilename,
  setSelectedFilename,
  refreshIniList,
  readIni,
  writeIni,
  createBackup,
  restoreBackup,
  restoreDefaults,
  rebootMiSTer,
  setIniText,
  parseAdvanced,
  retention,
  setRetention,
  busy,
  checking,
}) {
  const options = iniOptions?.options || FALLBACK_MISTER_INI_OPTIONS;
  const easyValues = { ...DEFAULT_EASY_VALUES, ...(easy || {}) };
  const [selectedBackup, setSelectedBackup] = useState("");
  const directVideo = easyValues.hdmi_mode === "Direct Video (CRT / Scaler)";
  const canUseSettings = Boolean(connected || sdMode?.active);
  const modeText = storageModeLabel({ connected }, sdMode);

  useEffect(() => {
    if (!selectedBackup && iniBackups?.length) setSelectedBackup(iniBackups[0]);
    if (selectedBackup && !iniBackups?.includes(selectedBackup)) setSelectedBackup(iniBackups?.[0] || "");
  }, [iniBackups, selectedBackup]);

  const changeEasy = (key, value) => updateEasy({ [key]: value });
  const saveDisabled = !canUseSettings || busy || !(ini?.text || "").trim();

  return (
    <>
      <PageHeader
        title="MiSTer Settings"
        subtitle={`Easy and advanced MiSTer.ini editing with backups. ${modeText}`}
        badge={ini?.bytes ? `${ini.filename || selectedFilename} · ${ini.bytes} bytes` : canUseSettings ? "Ready" : "Offline"}
        checking={checking}
        checkLabel="Checking MiSTer settings…"
      />

      <Card title="INI File">
        <div className="mister-settings-toolbar">
          <Field label="File">
            <ThemeAwareSelect
              value={selectedFilename || "MiSTer.ini"}
              disabled={!canUseSettings || busy}
              onChange={(event) => { setSelectedFilename(event.target.value); readIni(event.target.value); }}
            >
              {(iniFiles?.length ? iniFiles : [selectedFilename || "MiSTer.ini"]).map((file) => <option key={file} value={file}>{file}</option>)}
            </ThemeAwareSelect>
          </Field>
          <button className="secondary-button" disabled={!canUseSettings || busy} onClick={() => refreshIniList(undefined, { force: true })}>Refresh Files</button>
          <button className="secondary-button" disabled={!canUseSettings || busy} onClick={() => readIni(selectedFilename)}>Read</button>
          <button className="secondary-button" disabled={!canUseSettings || busy} onClick={createBackup}>Backup Now</button>
          <span className="mister-inline-status">{iniStatus || "Read an INI file to edit."}</span>
        </div>
      </Card>

      <div className="mister-settings-mode-row">
        <div className="mister-segmented two">
          <button className={mode === "easy" ? "active" : ""} onClick={() => setMode("easy")}>Easy</button>
          <button className={mode === "advanced" ? "active" : ""} onClick={() => { setMode("advanced"); parseAdvanced(); }}>Advanced</button>
        </div>
        <div className="mister-action-row compact">
          <button className="secondary-button" disabled={saveDisabled} onClick={writeIni}>Save with Backup</button>
          <button className="secondary-button" disabled={!canUseSettings || busy} onClick={restoreDefaults}>Restore Defaults</button>
          <button className="primary-button" disabled={!connected || busy} onClick={rebootMiSTer}>Soft Reboot</button>
        </div>
      </div>

      {mode === "easy" ? (
        <Card title="Easy Mode">
          <div className="mister-settings-easy-grid">
            <EasySelect label="HDMI Mode" value={easyValues.hdmi_mode} options={options.hdmiMode} disabled={!canUseSettings || busy} onChange={(value) => changeEasy("hdmi_mode", value)} />
            <EasySelect label="Resolution" value={easyValues.resolution} options={options.resolutions?.includes(easyValues.resolution) ? options.resolutions : [...(options.resolutions || []), easyValues.resolution].filter(Boolean)} disabled={!canUseSettings || busy || directVideo} onChange={(value) => changeEasy("resolution", value)} />
            <EasySelect label="HDMI Scaling Mode" value={easyValues.scaling} options={options.scaling} disabled={!canUseSettings || busy || directVideo} onChange={(value) => changeEasy("scaling", value)} />
            <EasySelect label="HDMI Audio" value={easyValues.hdmi_audio} options={options.hdmiAudio} disabled={!canUseSettings || busy} onChange={(value) => changeEasy("hdmi_audio", value)} />
            <EasySelect label="HDR" value={easyValues.hdr} options={options.hdr} disabled={!canUseSettings || busy || directVideo} onChange={(value) => changeEasy("hdr", value)} />
            <EasySelect label="HDMI Range" value={easyValues.hdmi_limited} options={options.hdmiLimited} disabled={!canUseSettings || busy || directVideo} onChange={(value) => changeEasy("hdmi_limited", value)} />
            <EasySelect label="Analogue Output" value={easyValues.analogue} options={options.analogue?.includes(easyValues.analogue) ? options.analogue : [...(options.analogue || []), easyValues.analogue].filter(Boolean)} disabled={!canUseSettings || busy} onChange={(value) => changeEasy("analogue", value)} />
            <EasySelect label="MiSTer Logo" value={easyValues.logo} options={options.logo} disabled={!canUseSettings || busy || directVideo} onChange={(value) => changeEasy("logo", value)} />
            <EasySelect label="Font" value={easyValues.font || "Default"} options={["Default", ...(iniFonts || []).filter((font) => font !== "Default"), ...(iniFonts?.includes(easyValues.font) || easyValues.font === "Default" ? [] : [easyValues.font])]} disabled={!canUseSettings || busy} onChange={(value) => changeEasy("font", value)} />
            <EasySelect label="AmigaVision Preset" value={easyValues.amigavision_preset} options={options.amigavisionPreset} disabled={!canUseSettings || busy} onChange={(value) => changeEasy("amigavision_preset", value)} />
            <EasySelect label="Menu CRT Preset" value={easyValues.menu_crt_preset} options={options.menuCrtPreset} disabled={!canUseSettings || busy} onChange={(value) => changeEasy("menu_crt_preset", value)} />
          </div>
          {directVideo ? <p className="mister-settings-note">Direct Video disables HDMI resolution, scaling, HDR, range, and logo fields.</p> : null}
        </Card>
      ) : (
        <Card title="Advanced Mode">
          <div className="mister-action-row compact">
            <button className="secondary-button" disabled={!ini?.text || busy} onClick={parseAdvanced}>Parse Advanced to Easy</button>
          </div>
          <textarea
            className="mister-textarea mister-ini-editor"
            value={ini?.text || ""}
            onChange={(event) => setIniText(event.target.value)}
            placeholder="MiSTer.ini contents will appear here."
            spellCheck="false"
          />
        </Card>
      )}

      <div className="mister-card-grid two">
        <Card title="Backups" className="mister-settings-backups-card">
          <div className="mister-settings-toolbar compact">
            <Field label="Restore Backup">
              <ThemeAwareSelect value={selectedBackup} disabled={!canUseSettings || busy || !(iniBackups || []).length} onChange={(event) => setSelectedBackup(event.target.value)}>
                {(iniBackups || []).map((backup) => <option key={backup} value={backup}>{backup}</option>)}
              </ThemeAwareSelect>
            </Field>
            <button className="secondary-button" disabled={!connected || busy || !selectedBackup} onClick={() => restoreBackup(selectedBackup)}>Restore Selected</button>
          </div>
          <div className="mister-chip-row">{(iniBackups || []).length ? iniBackups.slice(0, 12).map((backup) => <span className="mister-chip" key={backup}>{backup}</span>) : <EmptyValue>No backups found for this device/file.</EmptyValue>}</div>
        </Card>
        <Card title="Retention / Apply">
          <div className="mister-settings-toolbar compact">
            <Field label="Backups to keep per device">
              <input type="number" min="1" max="100" value={retention || 10} onChange={(event) => setRetention(event.target.value)} />
            </Field>
          </div>
          <ul className="mister-check-list">
            <li>Save creates a local timestamped backup before writing.</li>
            <li>Restore Defaults also backs up the current file first.</li>
            <li>Soft reboot remains manual.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}

function BackendPage({ diagnostics, jobs, refreshDiagnostics, refreshJobs, clearJobs, embedded = false, checking }) {
  const modules = diagnostics?.modules || [];
  const paths = diagnostics?.paths || {};
  return (
    <div className={embedded ? "mister-backend-settings-panel" : ""}>
      {!embedded && <PageHeader title="Activity" subtitle="Runtime details and background jobs." badge={diagnostics?.python?.version ? "Ready" : "Diagnostics"} checking={checking} checkLabel="Checking activity…" />}
      <div className="mister-card-grid two">
        <Card title="Runtime">
          <p><strong>{diagnostics?.app?.name || "MiSTer Companion EX"}</strong></p>
          <p>{diagnostics?.python?.executable || "Python executable unknown"}</p>
          <p>{diagnostics?.python?.version || "Version not loaded"}</p>
          <div className="mister-action-row"><button className="secondary-button" onClick={refreshDiagnostics}>Refresh</button></div>
        </Card>
        <Card title="Paths">
          <LogBox value={Object.entries(paths).map(([key, value]) => `${key}: ${value}`).join("\n")} />
        </Card>
      </div>
      <Card title="Modules">
        <div className="mister-chip-row">{modules.map((item) => <span key={item.name} className={`mister-chip ${item.available ? "ok" : "warn"}`}>{item.available ? "✓" : "!"} {item.name}</span>)}</div>
      </Card>
      <Card title="Jobs" footer={<div className="mister-action-row"><button className="secondary-button" onClick={refreshJobs}>Refresh</button><button className="secondary-button danger" onClick={clearJobs}>Clear Finished</button></div>}>
        <div className="mister-job-list">
          {(jobs?.jobs || []).length ? jobs.jobs.map((job) => (
            <article className="mister-job-card" key={job.id}>
              <header><strong>{job.label || job.kind}</strong><span>{job.status}</span></header>
              <LogBox value={(job.logs || []).join("\n") || job.error || JSON.stringify(job.result || {}, null, 2)} />
            </article>
          )) : <EmptyValue>No jobs have run yet.</EmptyValue>}
        </div>
      </Card>
    </div>
  );
}

export function PlaceholderPage({ title, subtitle, notes }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} badge="Coming soon" />
      <Card title="Notes"><ul className="mister-check-list">{notes.map((note) => <li key={note}>{note}</li>)}</ul></Card>
    </>
  );
}

export function MisterCompanionApp({ appConfig = MISTER_APP_CONFIG } = {}) {
  const host = getHostBridge();
  const defaultSidebarGlyphs = useMemo(() => buildMisterDefaultSidebarGlyphs(appConfig), [appConfig]);
  const [theme, setTheme] = useState(loadMisterTheme);
  const [savedThemes, setSavedThemes] = useState(loadMisterSavedThemes);
  const [sidebarGlyphs, setSidebarGlyphs] = useState(loadMisterSidebarGlyphs);
  const [installArtwork, setInstallArtwork] = useState(loadMisterInstallArtwork);
  const [settingsNavItems, setSettingsNavItems] = useState(() => MISTER_APP_CONFIG.sidebar.flatMap((section) => section.items).map((item) => ({
    id: item.id,
    name: item.label,
    glyph: item.icon,
    iconImage: item.iconImage,
    hidden: false,
  })));
  const [page, setPage] = useState(appConfig.initialPage || "dashboard");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState("appearance");
  const [backend, setBackend] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [draft, setDraft] = useState({ name: "", ip: "", username: "root", password: "", use_ssh_agent: false, look_for_ssh_keys: false });
  const [connection, setConnection] = useState({ connected: false });
  const [sdMode, setSdMode] = useState({ enabled: false, active: false, ready: false, root: "", reason: "Choose an SD Card folder." });
  const [networkScan, setNetworkScan] = useState({ devices: [], networks: [], message: "" });
  const [networkScanning, setNetworkScanning] = useState(false);
  const [deviceSummary, setDeviceSummary] = useState(null);
  const [remoteStatus, setRemoteStatus] = useState({ connected: false });
  const [fileBrowser, setFileBrowser] = useState({ ready: false, path: "/media/fat", roots: [], entries: [] });
  const [flashSd, setFlashSd] = useState({ mode: "mc_fusion", modes: [], drives: [], balena: {}, image: {}, supported: true });
  const [retroAchievements, setRetroAchievements] = useState({ settings: {}, profile: null, recentGames: [], allGames: [], recentAchievements: [], currentGame: null, achievements: [], sets: [], stats: {}, counts: {} });
  const [catalog, setCatalog] = useState({ categories: [], items: [] });
  const [installStatuses, setInstallStatuses] = useState({});
  const [scriptsSummary, setScriptsSummary] = useState({ ready: false, items: [], statuses: {}, actions: {} });
  const [saveSummary, setSaveSummary] = useState({ devices: [], backupCount: 0 });
  const [manuals, setManuals] = useState({ systems: [] });
  const [zapScripts, setZapScripts] = useState({ entries: [], scripts: [], systems: [], counts: {}, db: {}, state: {}, mediaStatus: {} });
  const [zapScraper, setZapScraper] = useState({ settings: {}, options: {}, systems: [], plans: [], systemCount: 0, romCount: 0, cacheExists: false });
  const [diagnostics, setDiagnostics] = useState(null);
  const [jobs, setJobs] = useState({ jobs: [] });
  const [ini, setIni] = useState({ filename: "MiSTer.ini", path: "/media/fat/MiSTer.ini", text: "" });
  const [iniOptions, setIniOptions] = useState({ options: FALLBACK_MISTER_INI_OPTIONS, retention: 10 });
  const [iniFiles, setIniFiles] = useState(["MiSTer.ini"]);
  const [selectedFilename, setSelectedFilename] = useState("MiSTer.ini");
  const [iniFonts, setIniFonts] = useState([]);
  const [iniBackups, setIniBackups] = useState([]);
  const [iniMode, setIniMode] = useState("easy");
  const [iniEasy, setIniEasy] = useState(DEFAULT_EASY_VALUES);
  const [iniRetention, setIniRetention] = useState(10);
  const [iniStatus, setIniStatus] = useState("");
  const [commandOutput, setCommandOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [startupReady, setStartupReady] = useState(false);
  const [checkingSections, setCheckingSections] = useState({});
  const [confirmDialog, setConfirmDialog] = useState(null);
  const confirmResolverRef = useRef(null);
  const sectionCheckTimesRef = useRef({});
  const shellRef = useRef(null);
  const mainContentScrollRef = useRef(null);
  const { windowMaximized, windowFocused } = useWindowState(host);
  const dragHandlers = useWindowDrag(host);
  useCustomFont(theme);

  useEffect(() => {
    if (mainContentScrollRef.current) mainContentScrollRef.current.scrollTop = 0;
  }, [page]);

  const confirmAction = useCallback((message, options = {}) => new Promise((resolve) => {
    confirmResolverRef.current = resolve;
    setConfirmDialog({
      message: String(message || ""),
      title: options.title || "Confirm action",
      confirmLabel: options.confirmLabel || "Continue",
      cancelLabel: options.cancelLabel || "Cancel",
      tone: options.tone || "default",
    });
  }), []);

  const resolveConfirm = useCallback((accepted) => {
    const resolver = confirmResolverRef.current;
    confirmResolverRef.current = null;
    setConfirmDialog(null);
    if (resolver) resolver(Boolean(accepted));
  }, []);

  useEffect(() => () => {
    if (confirmResolverRef.current) {
      confirmResolverRef.current(false);
      confirmResolverRef.current = null;
    }
  }, []);

  useEffect(() => { saveMisterTheme(theme); }, [theme]);
  useEffect(() => { saveMisterSavedThemes(savedThemes); }, [savedThemes]);
  useEffect(() => { saveMisterSidebarGlyphs(sidebarGlyphs); }, [sidebarGlyphs]);
  useEffect(() => { saveMisterPortableThemeState({ theme, sidebarGlyphs }); }, [theme, sidebarGlyphs]);
  useEffect(() => { saveMisterInstallArtwork(installArtwork); }, [installArtwork]);
  const platinumSmallerWindowEnabled = String(theme?.appStyle || "").toLowerCase() === "macos9platinum"
    && themeToggleEnabled(theme.mac9SmallerWindow ?? DEFAULT_THEME.mac9SmallerWindow);
  useEffect(() => {
    if (!host?.setPlatinumSmallerWindow) return;
    host.setPlatinumSmallerWindow(platinumSmallerWindowEnabled).catch?.(() => {});
  }, [host, platinumSmallerWindowEnabled]);
  useEffect(() => {
    if (!startupReady) return undefined;
    let cancelled = false;
    const ready = async () => {
      if (document.fonts?.ready) await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 800))]);
      requestAnimationFrame(() => requestAnimationFrame(() => !cancelled && host?.rendererReady?.()));
    };
    ready();
    return () => { cancelled = true; };
  }, [host, startupReady]);

  const backendCall = useCallback(async (method, params = {}, options = {}) => {
    if (!host?.backendCall) throw new Error("App service is not available.");
    return await host.backendCall(method, params, options);
  }, [host]);

  const isSectionFresh = useCallback((section, maxAgeMs) => {
    if (!section) return false;
    const ageLimit = Number(maxAgeMs ?? SECTION_PROBE_CACHE_MS[section] ?? 60_000);
    if (ageLimit <= 0) return false;
    const lastChecked = Number(sectionCheckTimesRef.current?.[section] || 0);
    return Boolean(lastChecked && (Date.now() - lastChecked) < ageLimit);
  }, []);

  const markSectionFresh = useCallback((section) => {
    if (section) sectionCheckTimesRef.current[section] = Date.now();
  }, []);

  const invalidateSectionFreshness = useCallback((sections) => {
    const list = Array.isArray(sections) ? sections : [sections];
    for (const section of list) {
      if (section) delete sectionCheckTimesRef.current[section];
    }
  }, []);

  const withSectionCheck = useCallback(async (section, task, options = {}) => {
    if (!section || typeof task !== "function") return undefined;
    const showIndicator = options?.indicator !== false;
    const cacheKey = options?.cacheKey || section;
    if (showIndicator) {
      setCheckingSections((current) => ({ ...current, [section]: Math.max(0, Number(current?.[section] || 0)) + 1 }));
    }
    try {
      const result = await task();
      if (options?.markFresh !== false) markSectionFresh(cacheKey);
      return result;
    } finally {
      if (showIndicator) {
        setCheckingSections((current) => {
          const nextCount = Math.max(0, Number(current?.[section] || 0) - 1);
          if (nextCount) return { ...current, [section]: nextCount };
          const next = { ...current };
          delete next[section];
          return next;
        });
      }
    }
  }, [markSectionFresh]);

  const isChecking = useCallback((section) => Boolean(checkingSections?.[section]), [checkingSections]);

  const refreshConnection = useCallback(async (options = {}) => {
    const opts = coerceRefreshOptions(options);
    if (!opts.force && connection && isSectionFresh("connection", opts.cacheMs)) return connection;
    return withSectionCheck("connection", async () => {
      const status = await backendCall("connection.status");
      setConnection(status || { connected: false });
      if (status?.sdMode) setSdMode(status.sdMode);
      return status;
    }, { cacheKey: "connection" });
  }, [backendCall, connection, isSectionFresh, withSectionCheck]);

  const refreshSdMode = useCallback(async () => {
    const status = await backendCall("sdMode.status", {}, { timeoutMs: 10000 });
    setSdMode(status || { enabled: false, active: false, ready: false, root: "" });
    return status;
  }, [backendCall]);

  const chooseSdRoot = useCallback(async () => {
    const folder = await host?.chooseDirectory?.({ title: "Choose mounted MiSTer SD Card root" });
    if (!folder) return;
    const status = await backendCall("sdMode.set", { root: folder, enabled: true }, { timeoutMs: 10000 });
    setSdMode(status);
    invalidateSectionFreshness(["settings-files", "saves", "install", "files"]);
    setError("");
  }, [backendCall, host, invalidateSectionFreshness]);

  const enableSdMode = useCallback(async () => {
    const status = await backendCall("sdMode.set", { root: sdMode?.root, enabled: true }, { timeoutMs: 10000 });
    setSdMode(status);
    invalidateSectionFreshness(["settings-files", "saves", "install", "files"]);
  }, [backendCall, sdMode?.root, invalidateSectionFreshness]);

  const disableSdMode = useCallback(async () => {
    const status = await backendCall("sdMode.clear", {}, { timeoutMs: 10000 });
    setSdMode(status);
    invalidateSectionFreshness(["settings-files", "saves", "install", "files"]);
  }, [backendCall, invalidateSectionFreshness]);

  const refreshProfiles = useCallback(async (options = {}) => {
    const opts = coerceRefreshOptions(options);
    if (!opts.force && profiles.length && isSectionFresh("profiles", opts.cacheMs)) return profiles;
    return withSectionCheck("connection", async () => {
      const result = await backendCall("profiles.list");
      const devices = result?.devices || [];
      setProfiles(devices);
      if (devices.length && selectedIndex < 0) setSelectedIndex(0);
      if (devices.length && !draft.name) setDraft({ ...devices[0], password: devices[0].password || "" });
      return devices;
    }, { cacheKey: "profiles" });
  }, [backendCall, profiles, selectedIndex, draft.name, isSectionFresh, withSectionCheck]);

  const refreshDevice = useCallback(async (options = {}) => {
    const opts = coerceRefreshOptions(options);
    if (!opts.force && deviceSummary && isSectionFresh("device", opts.cacheMs)) return deviceSummary;
    return withSectionCheck("device", async () => {
      const summary = await backendCall("device.summary", {}, { timeoutMs: 45000 });
      setDeviceSummary(summary);
      return summary;
    });
  }, [backendCall, deviceSummary, isSectionFresh, withSectionCheck]);

  const refreshRemoteStatus = useCallback(async (options = {}) => {
    const opts = coerceRefreshOptions(options);
    if (!opts.force && remoteStatus && isSectionFresh("remote", opts.cacheMs)) return remoteStatus;
    return withSectionCheck("remote", async () => {
      const status = await backendCall("remote.status", { ping: true }, { timeoutMs: 45000 });
      setRemoteStatus(status || { connected: false });
      return status;
    });
  }, [backendCall, remoteStatus, isSectionFresh, withSectionCheck]);

  const refreshFileBrowser = useCallback(async (path = fileBrowser?.path || "/media/fat", options = {}) => {
    const opts = coerceRefreshOptions(options);
    const targetPath = isDomEvent(path) ? (fileBrowser?.path || "/media/fat") : (path || fileBrowser?.path || "/media/fat");
    const pathChanged = targetPath !== (fileBrowser?.path || "");
    if (!opts.force && !pathChanged && fileBrowser?.ready && isSectionFresh("files", opts.cacheMs)) return fileBrowser;
    return withSectionCheck("files", async () => {
      const result = await backendCall("fileBrowser.summary", { path: targetPath }, { timeoutMs: 45000 });
      setFileBrowser(result || { ready: false, path: targetPath, roots: [], entries: [] });
      return result;
    });
  }, [backendCall, fileBrowser, isSectionFresh, withSectionCheck]);

  const startRemoteCommand = useCallback(async (command) => {
    const result = await backendCall("remote.command.start", { command }, { timeoutMs: 10000 });
    return result;
  }, [backendCall]);

  const sendRemoteInput = useCallback(async (payload) => {
    return backendCall("remote.input", payload || {}, { timeoutMs: 10000 });
  }, [backendCall]);

  const disconnectRemote = useCallback(async () => {
    return backendCall("remote.disconnect", {}, { timeoutMs: 10000 });
  }, [backendCall]);

  const refreshFlashSd = useCallback(async (mode = flashSd?.mode || "mc_fusion", includeDrives = false, options = {}) => {
    const opts = coerceRefreshOptions(options);
    const nextMode = isDomEvent(mode) ? (flashSd?.mode || "mc_fusion") : (mode || flashSd?.mode || "mc_fusion");
    const force = Boolean(opts.force || includeDrives || isDomEvent(mode));
    if (!force && flashSd && isSectionFresh("flash", opts.cacheMs)) return flashSd;
    return withSectionCheck("flash", async () => {
      const result = await backendCall("flash.summary", { mode: nextMode, includeDrives }, { timeoutMs: includeDrives ? 90000 : 45000 });
      setFlashSd((current) => ({ ...(current || {}), ...(result || {}), drives: includeDrives ? (result?.drives || []) : (current?.drives || result?.drives || []) }));
      return result;
    });
  }, [backendCall, flashSd, isSectionFresh, withSectionCheck]);

  const refreshRetroAchievementsSettings = useCallback(async (options = {}) => {
    const opts = coerceRefreshOptions(options);
    if (!opts.force && retroAchievements?.settings && isSectionFresh("retroachievements-settings", opts.cacheMs ?? SECTION_PROBE_CACHE_MS.retroachievements)) return retroAchievements.settings;
    return withSectionCheck("retroachievements", async () => {
      const settings = await backendCall("retroAchievements.settings", {}, { timeoutMs: 10000 });
      setRetroAchievements((current) => ({ ...(current || {}), settings: settings || {} }));
      return settings;
    }, { cacheKey: "retroachievements-settings" });
  }, [backendCall, retroAchievements?.settings, isSectionFresh, withSectionCheck]);

  const saveRetroAchievementsSettings = useCallback(async (settings) => {
    const saved = await backendCall("retroAchievements.settings.save", { settings }, { timeoutMs: 10000 });
    setRetroAchievements((current) => ({ ...(current || {}), settings: saved || {} }));
    return saved;
  }, [backendCall]);

  const loadRetroAchievementsGame = useCallback(async (gameId) => withSectionCheck("retroachievements", async () => {
    const payload = await backendCall("retroAchievements.game", { gameId }, { timeoutMs: 60000 });
    setRetroAchievements((current) => ({ ...(current || {}), currentGame: payload?.game || null, achievements: payload?.achievements || [], sets: payload?.sets || [], stats: payload?.stats || {} }));
    return payload;
  }), [backendCall, withSectionCheck]);

  const refreshRetroAchievementsDashboard = useCallback(async (options = {}) => {
    const opts = coerceRefreshOptions(options);
    if (!opts.force && retroAchievements?.profile && isSectionFresh("retroachievements", opts.cacheMs)) return retroAchievements;
    return withSectionCheck("retroachievements", async () => {
      const payload = await backendCall("retroAchievements.dashboard", {}, { timeoutMs: 90000 });
      setRetroAchievements((current) => ({ ...(current || {}), ...(payload || {}), settings: { ...(current?.settings || {}), ...(payload?.settings || {}) }, currentGame: current?.currentGame || null, achievements: current?.achievements || [], sets: current?.sets || [], stats: current?.stats || {} }));
      const firstGame = payload?.recentGames?.[0] || payload?.allGames?.[0];
      if (firstGame?.id) {
        const detail = await backendCall("retroAchievements.game", { gameId: firstGame.id }, { timeoutMs: 60000 });
        setRetroAchievements((current) => ({ ...(current || {}), currentGame: detail?.game || null, achievements: detail?.achievements || [], sets: detail?.sets || [], stats: detail?.stats || {} }));
      }
      return payload;
    });
  }, [backendCall, retroAchievements, isSectionFresh, withSectionCheck]);

  const refreshCatalog = useCallback(async (options = {}) => {
    const coerced = coerceRefreshOptions(options);
    const fresh = coerced.fresh ?? true;
    const allowNetwork = coerced.allowNetwork ?? true;
    if (!coerced.force && !fresh && (catalog?.items || []).length && isSectionFresh("install", coerced.cacheMs)) return catalog;
    return withSectionCheck("install", async () => {
      const result = await backendCall("installCenter.catalog", { fresh, allowNetwork }, { timeoutMs: fresh ? 45000 : 12000 });
      setCatalog(result || { categories: [], items: [] });
      return result;
    });
  }, [backendCall, catalog, isSectionFresh, withSectionCheck]);

  const checkInstallStatus = useCallback(async (id, checkLatest = false) => withSectionCheck("install", async () => {
    const status = await backendCall("installCenter.status", { id, checkLatest }, { timeoutMs: 90000 });
    setInstallStatuses((current) => ({ ...current, [id]: status }));
    return status;
  }), [backendCall, withSectionCheck]);

  const refreshSaves = useCallback(async (options = {}) => {
    const opts = coerceRefreshOptions(options);
    if (!opts.force && saveSummary && isSectionFresh("saves", opts.cacheMs)) return saveSummary;
    return withSectionCheck("saves", async () => {
      const result = await backendCall("saveManager.summary");
      setSaveSummary(result);
      return result;
    });
  }, [backendCall, saveSummary, isSectionFresh, withSectionCheck]);
  const refreshManuals = useCallback(async (options = {}) => {
    const opts = coerceRefreshOptions(options);
    if (!opts.force && (manuals?.systems || []).length && isSectionFresh("manuals", opts.cacheMs)) return manuals;
    return withSectionCheck("manuals", async () => {
      const result = await backendCall("manuals.summary", {}, { timeoutMs: 90000 });
      setManuals(result || { systems: [] });
      return result;
    });
  }, [backendCall, manuals, isSectionFresh, withSectionCheck]);
  const refreshZapScripts = useCallback(async (options = {}) => {
    const opts = coerceRefreshOptions(options);
    const force = Boolean(opts.force || opts.forceServiceProbe);
    if (!force && zapScripts && isSectionFresh("zapscripts", opts.cacheMs)) return zapScripts;
    return withSectionCheck("zapscripts", async () => {
      const result = await backendCall("zapscripts.summary", { includeEntries: false, ...(opts || {}) }, { timeoutMs: opts?.forceServiceProbe ? 60000 : 45000 });
      setZapScripts(result || { entries: [], scripts: [], systems: [], counts: {}, db: {}, state: {}, mediaStatus: {} });
      return result;
    });
  }, [backendCall, zapScripts, isSectionFresh, withSectionCheck]);
  const loadZapScriptsPage = useCallback(async ({ system = "All", query = "", offset = 0, limit = 260 } = {}) => {
    return backendCall("zapscripts.page", { system, query, offset, limit }, { timeoutMs: 30000 });
  }, [backendCall]);
  const refreshZapScraper = useCallback(async (overrides = {}) => {
    const opts = coerceRefreshOptions(overrides);
    if (!opts.force && zapScraper && isSectionFresh("zapscraper", opts.cacheMs) && !Object.keys(overrides || {}).some((key) => !["force", "cacheMs"].includes(key))) return zapScraper;
    return withSectionCheck("zapscraper", async () => {
      const payload = { ...(opts || {}) };
      delete payload.force;
      delete payload.cacheMs;
      const result = await backendCall("zapscraper.summary", payload, { timeoutMs: 45000 });
      setZapScraper(result || { settings: {}, options: {}, systems: [] });
      return result;
    });
  }, [backendCall, zapScraper, isSectionFresh, withSectionCheck]);
  const refreshDiagnostics = useCallback(async (options = {}) => {
    const opts = coerceRefreshOptions(options);
    if (!opts.force && diagnostics && isSectionFresh("backend", opts.cacheMs)) return diagnostics;
    return withSectionCheck("backend", async () => {
      const result = await backendCall("backend.diagnostics");
      setDiagnostics(result);
      return result;
    });
  }, [backendCall, diagnostics, isSectionFresh, withSectionCheck]);

  const applyInstallJobResults = useCallback((jobsPayload) => {
    const list = jobsPayload?.jobs || [];
    const nextStatuses = {};
    let nextSaveSummary = null;
    for (const job of list) {
      if (!job || job.status !== "completed") continue;
      const result = job.result || {};
      if (String(job.kind || "").startsWith("install_center.")) {
        if (result.status && result.itemId) nextStatuses[result.itemId] = result.status;
        if (result.statuses) Object.assign(nextStatuses, result.statuses);
      }
      if (String(job.kind || "").startsWith("savemanager.") && result.summary) {
        nextSaveSummary = result.summary;
      }
      if (String(job.kind || "").startsWith("manuals.") && result.summary) {
        setManuals((current) => ({ ...(current || {}), ...result.summary }));
      }
      if (String(job.kind || "").startsWith("fileBrowser.") && result.summary) {
        setFileBrowser((current) => ({ ...(current || {}), ...(result.summary || {}) }));
      }
      if (String(job.kind || "").startsWith("remote.") && result.remoteStatus) {
        setRemoteStatus(result.remoteStatus);
      }
      if (String(job.kind || "").startsWith("flash.") && result.flash) {
        setFlashSd((current) => ({ ...(current || {}), ...(result.flash || {}), drives: result.flash.drives?.length ? result.flash.drives : (current?.drives || []) }));
      }
      if (String(job.kind || "").startsWith("zapscripts.") && result.summary) {
        setZapScripts((current) => ({
          ...(current || {}),
          ...result.summary,
          state: result.summary.state || current?.state || {},
          mediaStatus: result.summary.mediaStatus || current?.mediaStatus || {},
        }));
      }
      if (String(job.kind || "").startsWith("zapscraper.") && result.zapscraper) {
        setZapScraper((current) => ({ ...(current || {}), ...result.zapscraper }));
      }
      if (String(job.kind || "").startsWith("zapscraper.") && result.zapscraperPlan) {
        setZapScraper((current) => ({
          ...(current || {}),
          plans: [result.zapscraperPlan, ...((current?.plans || []).filter((plan) => plan.id !== result.zapscraperPlan.id))].slice(0, 10),
        }));
      }
      if (String(job.kind || "").startsWith("zapscraper.") && result.zapscraperLogin?.settings) {
        setZapScraper((current) => ({ ...(current || {}), settings: result.zapscraperLogin.settings }));
      }
    }
    if (Object.keys(nextStatuses).length) {
      setInstallStatuses((current) => ({ ...current, ...nextStatuses }));
    }
    if (nextSaveSummary) setSaveSummary(nextSaveSummary);
  }, []);

  const refreshJobs = useCallback(async () => {
    const payload = await backendCall("jobs.list");
    setJobs(payload);
    applyInstallJobResults(payload);
    return payload;
  }, [backendCall, applyInstallJobResults]);

  const refreshInstallStatuses = useCallback(async (checkLatest = false) => withSectionCheck("install", async () => {
    if (checkLatest) {
      const result = await backendCall("installCenter.checkAll.start", { freshCatalog: true }, { timeoutMs: 10000 });
      await refreshJobs().catch(() => {});
      return result;
    }
    const result = await backendCall("installCenter.statusAll", { checkLatest }, { timeoutMs: 120000 });
    setInstallStatuses(result?.statuses || {});
    return result;
  }), [backendCall, refreshJobs, withSectionCheck]);

  const refreshScripts = useCallback(async (options = {}) => {
    const opts = coerceRefreshOptions(options);
    if (!opts.force && scriptsSummary?.items?.length && isSectionFresh("scripts", opts.cacheMs)) return scriptsSummary;
    return withSectionCheck("scripts", async () => {
      const result = await backendCall("scripts.summary", {}, { timeoutMs: 45000 });
      setScriptsSummary(result || { ready: false, items: [], statuses: {}, actions: {} });
      return result;
    });
  }, [backendCall, scriptsSummary, isSectionFresh, withSectionCheck]);

  const applyIniPayload = useCallback((payload) => {
    if (!payload) return;
    if (payload.files) setIniFiles(payload.files);
    if (payload.selectedFilename || payload.filename) setSelectedFilename(payload.selectedFilename || payload.filename);
    if (payload.fonts) setIniFonts(payload.fonts);
    if (payload.backups) setIniBackups(payload.backups);
    if (payload.easy) setIniEasy({ ...DEFAULT_EASY_VALUES, ...payload.easy });
    if (payload.retention) setIniRetention(payload.retention);
    if (payload.text !== undefined) setIni((current) => ({ ...(current || {}), ...payload }));
    if (payload.notice) setIniStatus(payload.notice);
  }, []);

  const refreshIniOptions = useCallback(async (options = {}) => {
    const opts = coerceRefreshOptions(options);
    if (!opts.force && iniOptions?.options && isSectionFresh("settings-options", opts.cacheMs ?? SECTION_PROBE_CACHE_MS.settings)) return iniOptions;
    return withSectionCheck("settings", async () => {
      const result = await backendCall("misterIni.options");
      setIniOptions(result || { options: FALLBACK_MISTER_INI_OPTIONS, retention: 10 });
      if (result?.retention) setIniRetention(result.retention);
      return result;
    }, { cacheKey: "settings-options" });
  }, [backendCall, iniOptions, isSectionFresh, withSectionCheck]);

  const refreshIniList = useCallback(async (filename = selectedFilename, options = {}) => {
    const opts = coerceRefreshOptions(options);
    const targetFilename = isDomEvent(filename) ? selectedFilename : (filename || selectedFilename);
    const force = Boolean(opts.force || isDomEvent(filename));
    if (!force && iniFiles?.length && isSectionFresh("settings-files", opts.cacheMs ?? SECTION_PROBE_CACHE_MS.settings)) return { files: iniFiles, selectedFilename };
    return withSectionCheck("settings", async () => {
      const result = await backendCall("misterIni.list", { filename: targetFilename, ensure: true }, { timeoutMs: 30000 });
      applyIniPayload(result);
      setIniStatus(result?.notice || `Found ${(result?.files || []).length} MiSTer INI file(s).`);
      return result;
    }, { cacheKey: "settings-files" });
  }, [backendCall, selectedFilename, iniFiles, applyIniPayload, isSectionFresh, withSectionCheck]);

  const refreshAll = useCallback(async (options = {}) => {
    const opts = coerceRefreshOptions(options);
    setError("");
    setStartupReady(false);
    try {
      setBackend(await withSectionCheck("dashboard", async () => backendCall("ping"), { cacheKey: "dashboard" }));
      await refreshIniOptions({ force: opts.force }).catch(() => {});
      await refreshProfiles({ force: true });
      await refreshConnection({ force: true });
      await refreshSdMode().catch(() => {});
      await refreshCatalog({ fresh: false, allowNetwork: false, force: opts.force }).catch(() => {});
      await refreshRetroAchievementsSettings({ force: opts.force }).catch(() => {});
      await refreshJobs().catch(() => {});
    } catch (error) {
      setError(error.message || "Backend unavailable.");
    } finally {
      setStartupReady(true);
    }
  }, [backendCall, refreshProfiles, refreshConnection, refreshCatalog, refreshRetroAchievementsSettings, refreshJobs, refreshIniOptions, refreshSdMode, withSectionCheck]);

  const initialRefreshRef = useRef(refreshAll);
  useEffect(() => { initialRefreshRef.current(); }, []);

  const pageRefreshRef = useRef(null);
  pageRefreshRef.current = {
    catalog,
    flashSd,
    installStatuses,
    refreshCatalog,
    refreshDevice,
    refreshDiagnostics,
    refreshFileBrowser,
    refreshFlashSd,
    refreshIniList,
    refreshIniOptions,
    refreshInstallStatuses,
    refreshJobs,
    refreshManuals,
    refreshRemoteStatus,
    refreshSaves,
    refreshScripts,
    refreshZapScraper,
    refreshZapScripts,
  };
  useEffect(() => {
    const refreshers = pageRefreshRef.current;
    const run = async () => {
      try {
        if (page === "device") await refreshers.refreshDevice();
        else if (page === "remote") await refreshers.refreshRemoteStatus();
        else if (page === "install") {
          if (!(refreshers.catalog?.items || []).length || !refreshers.catalog?.meta?.live) await refreshers.refreshCatalog({ fresh: false, allowNetwork: true });
          if ((connection?.connected || sdMode?.active) && !Object.keys(refreshers.installStatuses || {}).length) await refreshers.refreshInstallStatuses(false);
        }
        else if (page === "files") await refreshers.refreshFileBrowser();
        else if (page === "scripts") await refreshers.refreshScripts();
        else if (page === "settings") {
          await refreshers.refreshIniOptions().catch(() => {});
          if (connection?.connected || sdMode?.active) await refreshers.refreshIniList().catch(() => {});
        }
        else if (page === "saves") await refreshers.refreshSaves();
        else if (page === "manuals") await refreshers.refreshManuals();
        else if (page === "flash") await refreshers.refreshFlashSd(refreshers.flashSd?.mode || "mc_fusion", false);
        else if (page === "zapscripts") await refreshers.refreshZapScripts({ forceServiceProbe: false });
        else if (page === "zapscraper") await refreshers.refreshZapScraper();
        else if (page === "backend") {
          await refreshers.refreshDiagnostics().catch(() => {});
          await refreshers.refreshJobs().catch(() => {});
        }
      } catch (error) {
        setError(error.message || "Page refresh failed.");
      }
    };
    run();
  }, [page, connection?.connected, sdMode?.active]);

  const retroAchievementsRefreshRef = useRef(refreshRetroAchievementsDashboard);
  retroAchievementsRefreshRef.current = refreshRetroAchievementsDashboard;
  useEffect(() => {
    if (page !== "retroachievements") return;
    if (!retroAchievements?.settings?.configured) return;
    if (retroAchievements?.profile) return;
    retroAchievementsRefreshRef.current().catch((error) => setError(error.message || "RetroAchievements refresh failed."));
  }, [page, retroAchievements?.profile, retroAchievements?.settings?.configured]);


  const hasRunningJobs = useMemo(() => (jobs?.jobs || []).some((job) => job.status === "running" || job.status === "queued"), [jobs]);
  const isSectionBusy = useCallback((section) => {
    if (isChecking(section)) return true;
    const prefixes = {
      install: ["install_center."],
      zapscripts: ["zapscripts."],
      zapscraper: ["zapscraper."],
      saves: ["savemanager."],
      manuals: ["manuals."],
      remote: ["remote."],
      files: ["fileBrowser."],
      flash: ["flash."],
      scripts: ["scripts."],
      retroachievements: ["retroachievements."],
      backend: ["backend."],
    }[section] || [];
    if (!prefixes.length) return false;
    return (jobs?.jobs || []).some((job) => (job.status === "running" || job.status === "queued") && prefixes.some((prefix) => String(job.kind || "").startsWith(prefix)));
  }, [isChecking, jobs]);

  useEffect(() => {
    if (!hasRunningJobs) return undefined;
    const interval = window.setInterval(() => {
      refreshJobs().catch(() => {});
    }, 1800);
    return () => window.clearInterval(interval);
  }, [hasRunningJobs, refreshJobs]);

  const scanNetwork = async () => {
    setNetworkScanning(true); setError("");
    try {
      const result = await withSectionCheck("connection", async () => backendCall("connection.scan", {}, { timeoutMs: 18000 }), { markFresh: false });
      setNetworkScan(result || { devices: [], networks: [], message: "No MiSTer devices found." });
      if (!(result?.devices || []).length) setError(result?.message || "No MiSTer devices were found on the local network.");
    } catch (error) {
      setError(error.message || "Network scan failed.");
    } finally {
      setNetworkScanning(false);
    }
  };

  const useScanResult = (device) => {
    const ip = device?.ip || device?.host || "";
    if (!ip) return;
    const label = device?.likelyMiSTer ? "MiSTer" : (device?.hostname || "MiSTer");
    setSelectedIndex(-1);
    setDraft((current) => ({
      ...current,
      name: current?.name || label,
      ip,
      username: current?.username || "root",
      password: current?.password || "",
      use_ssh_agent: Boolean(current?.use_ssh_agent),
      look_for_ssh_keys: Boolean(current?.look_for_ssh_keys),
    }));
  };

  const saveProfile = async () => {
    setBusy(true); setError("");
    try {
      const targetName = String(draft?.name || "").trim();
      await withSectionCheck("connection", async () => backendCall("profiles.save", { index: selectedIndex >= 0 ? selectedIndex : undefined, device: draft }));
      const devices = await refreshProfiles({ force: true });
      const savedIndex = devices.findIndex((device) => String(device?.name || "").trim().toLowerCase() === targetName.toLowerCase());
      if (savedIndex >= 0) {
        setSelectedIndex(savedIndex);
        setDraft({ ...devices[savedIndex], password: devices[savedIndex].password || "" });
      } else if (devices.length) {
        setSelectedIndex(Math.max(0, devices.length - 1));
      }
    }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };
  const deleteProfile = async () => {
    setBusy(true); setError("");
    try {
      await withSectionCheck("connection", async () => backendCall("profiles.delete", { index: selectedIndex }));
      const devices = await refreshProfiles({ force: true });
      const nextIndex = devices.length ? Math.min(selectedIndex, devices.length - 1) : -1;
      setSelectedIndex(nextIndex);
      setDraft(nextIndex >= 0 ? { ...devices[nextIndex], password: devices[nextIndex].password || "" } : { name: "", ip: "", username: "root", password: "", use_ssh_agent: false, look_for_ssh_keys: false });
    }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };
  const connect = async () => {
    setBusy(true); setError("");
    try {
      invalidateSectionFreshness(["connection", "device", "remote", "files", "install", "zapscripts", "saves", "manuals", "flash", "scripts", "zapscraper", "retroachievements", "settings-files"]);
      const connectStatus = await withSectionCheck("connection", async () => backendCall("connection.connect", { profile: draft }, { timeoutMs: 30000 }), { markFresh: false });
      if (connectStatus) setConnection(connectStatus || { connected: false });
      const status = await refreshConnection({ force: true });
      if (status?.connected) {
        await refreshDevice({ force: true });
        await refreshIniList(undefined, { force: true }).catch(() => {});
        await refreshInstallStatuses(false).catch(() => {});
        await refreshZapScripts({ force: true, forceServiceProbe: true }).catch(() => {});
      }
    }
    catch (error) {
      invalidateSectionFreshness(["connection"]);
      await refreshConnection({ force: true }).catch(() => {});
      setError(error.message);
    }
    finally { setBusy(false); }
  };
  const disconnect = async () => {
    setBusy(true); setError("");
    try { await withSectionCheck("connection", async () => backendCall("connection.disconnect")); invalidateSectionFreshness(["connection", "device", "remote", "files", "install", "zapscripts", "saves", "manuals", "flash", "scripts", "zapscraper", "retroachievements", "settings-files"]); await refreshConnection({ force: true }); setDeviceSummary(null); setRemoteStatus({ connected: false }); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };
  const testConnection = async () => {
    setBusy(true); setError("");
    try {
      const result = await withSectionCheck("connection", async () => backendCall("connection.test", { profile: draft }, { timeoutMs: 30000 }));
      setError(result?.connected ? `SSH test passed${result.hostname ? `: ${result.hostname}` : "."}` : (result?.message || "SSH test failed."));
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const readIni = async (filename = selectedFilename) => {
    setBusy(true); setError(""); setIniStatus(`Reading ${filename || "MiSTer.ini"}...`);
    try {
      const result = await backendCall("misterIni.read", { filename: filename || selectedFilename, ensure: true }, { timeoutMs: 30000 });
      applyIniPayload(result);
      setIniStatus(`Read ${result.bytes || 0} bytes from ${result.path}.`);
    }
    catch (error) { setError(error.message); setIniStatus(error.message); }
    finally { setBusy(false); }
  };

  const parseAdvanced = async () => {
    if (!ini?.text) return;
    try {
      const result = await backendCall("misterIni.parse", { text: ini.text }, { timeoutMs: 10000 });
      if (result?.easy) setIniEasy({ ...DEFAULT_EASY_VALUES, ...result.easy });
      setIniStatus("Advanced text parsed into Easy Mode fields.");
    } catch (error) { setIniStatus(error.message); }
  };

  const updateEasy = async (changes) => {
    const next = { ...DEFAULT_EASY_VALUES, ...iniEasy, ...changes };
    setIniEasy(next);
    if (!ini?.text) return;
    try {
      const result = await backendCall("misterIni.previewEasy", { text: ini.text, easy: next }, { timeoutMs: 10000 });
      setIni((current) => ({ ...(current || { filename: selectedFilename, path: `/media/fat/${selectedFilename}` }), text: result.text, bytes: result.bytes }));
      if (result?.easy) setIniEasy({ ...DEFAULT_EASY_VALUES, ...result.easy });
      setIniStatus("Easy Mode changes previewed in the INI text.");
    } catch (error) { setIniStatus(error.message); }
  };

  const writeIni = async () => {
    const filename = selectedFilename || ini?.filename || "MiSTer.ini";
    const target = sdMode?.active ? "the mounted SD Card" : "the connected MiSTer";
    if (!(await confirmAction(`Write ${filename} to ${target}? A timestamped local backup will be created first.`, { title: "Write MiSTer INI", confirmLabel: "Write", tone: "danger" }))) return;
    setBusy(true); setError(""); setIniStatus(`Writing ${filename}...`);
    try {
      const result = await backendCall("misterIni.write", { filename, text: ini.text, easy: iniEasy, mode: iniMode, backup: true }, { timeoutMs: 30000 });
      applyIniPayload(result);
      setIniStatus(`Wrote ${result.bytes || 0} bytes. Backup: ${result.backupPath || "created"}.`);
    }
    catch (error) { setError(error.message); setIniStatus(error.message); }
    finally { setBusy(false); }
  };

  const createBackup = async () => {
    setBusy(true); setError(""); setIniStatus("Creating backup...");
    try {
      const result = await backendCall("misterIni.backup.create", { filename: selectedFilename }, { timeoutMs: 30000 });
      if (result?.backups) setIniBackups(result.backups);
      setIniStatus(`Backup created: ${result.backupPath || "done"}`);
    } catch (error) { setError(error.message); setIniStatus(error.message); }
    finally { setBusy(false); }
  };

  const restoreBackup = async (backup) => {
    if (!backup) return;
    if (!(await confirmAction(`Restore backup ${backup} to ${selectedFilename}? The current ${sdMode?.active ? "SD Card" : "remote"} file will be overwritten.`, { title: "Restore INI backup", confirmLabel: "Restore", tone: "danger" }))) return;
    setBusy(true); setError(""); setIniStatus("Restoring backup...");
    try {
      const result = await backendCall("misterIni.backup.restore", { filename: selectedFilename, backup }, { timeoutMs: 30000 });
      applyIniPayload(result);
      setIniStatus(`Restored ${backup}.`);
    } catch (error) { setError(error.message); setIniStatus(error.message); }
    finally { setBusy(false); }
  };

  const restoreDefaults = async () => {
    if (!(await confirmAction(`Restore default settings to ${selectedFilename}? A backup will be created first.`, { title: "Restore defaults", confirmLabel: "Restore", tone: "danger" }))) return;
    setBusy(true); setError(""); setIniStatus("Restoring defaults...");
    try {
      const result = await backendCall("misterIni.defaults.restore", { filename: selectedFilename, backup: true }, { timeoutMs: 45000 });
      applyIniPayload(result);
      setIniStatus(`Defaults restored. Backup: ${result.backupPath || "created"}.`);
    } catch (error) { setError(error.message); setIniStatus(error.message); }
    finally { setBusy(false); }
  };

  const reconnectAfterReboot = useCallback(async (profile, attempts = 30) => {
    if (!profile?.ip) return;
    setIniStatus("Waiting for MiSTer to reboot…");
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, attempt === 1 ? 6000 : 5000));
      try {
        const status = await backendCall("connection.connect", { profile }, { timeoutMs: 20000 });
        if (status?.connected) {
          setConnection(status);
          if (status?.sdMode) setSdMode(status.sdMode);
          invalidateSectionFreshness(["connection", "device", "remote", "files", "install", "zapscripts", "saves", "manuals", "flash", "scripts", "zapscraper", "retroachievements", "settings-files"]);
          setIniStatus("MiSTer reconnected after reboot.");
          refreshDevice({ force: true }).catch(() => {});
          return true;
        }
      } catch {
        setIniStatus(`Waiting for MiSTer to reboot… (${attempt}/${attempts})`);
      }
    }
    setIniStatus("MiSTer reboot command was sent, but automatic reconnect timed out.");
    return false;
  }, [backendCall, invalidateSectionFreshness, refreshDevice]);

  const rebootMiSTer = async () => {
    if (!(await confirmAction("Soft reboot the connected MiSTer now?", { title: "Soft reboot MiSTer", confirmLabel: "Reboot", tone: "danger" }))) return;
    setBusy(true); setError("");
    try {
      await backendCall("connection.reboot", {}, { timeoutMs: 10000 });
      setIniStatus("Soft reboot command sent. Watching for reconnect…");
      setConnection((current) => ({ ...(current || {}), connected: false }));
      reconnectAfterReboot({ ...draft });
    }
    catch (error) { setError(error.message); setIniStatus(error.message); }
    finally { setBusy(false); }
  };

  const updateRetention = async (value) => {
    const parsed = Math.max(1, Math.min(100, Number.parseInt(value, 10) || 10));
    setIniRetention(parsed);
    try { await backendCall("misterIni.retention.set", { value: parsed }, { timeoutMs: 10000 }); }
    catch (error) { setIniStatus(error.message); }
  };


  const setSmbEnabled = async (enabled) => {
    if (!(await confirmAction(`${enabled ? "Enable" : "Disable"} SMB startup on the connected MiSTer?`, { title: "Change SMB startup", confirmLabel: enabled ? "Enable" : "Disable" }))) return;
    setBusy(true); setError("");
    try {
      const result = await backendCall("device.smb.set", { enabled }, { timeoutMs: 30000 });
      if (result?.summary) setDeviceSummary(result.summary);
      else await refreshDevice();
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const returnToMenu = async () => {
    if (!(await confirmAction("Return the connected MiSTer to the main menu?", { title: "Return to menu", confirmLabel: "Return" }))) return;
    setBusy(true); setError("");
    try {
      await backendCall("device.returnMenu", {}, { timeoutMs: 10000 });
      await refreshDevice();
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const runScriptAction = async (id, action, values = {}) => {
    if (!id || !action) return;
    setBusy(true); setError("");
    try {
      await backendCall("scripts.command.start", { id, action, values }, { timeoutMs: 10000 });
      await refreshJobs();
      openSettings("backend");
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const loadScriptConfig = async (id) => backendCall("scripts.config.load", { id }, { timeoutMs: 30000 });

  const saveScriptConfig = async (id, values) => {
    setBusy(true); setError("");
    try {
      const result = await backendCall("scripts.config.save", { id, values }, { timeoutMs: 30000 });
      setScriptsSummary(result || await backendCall("scripts.summary"));
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const removeScriptConfig = async (id) => {
    setBusy(true); setError("");
    try {
      const result = await backendCall("scripts.config.remove", { id }, { timeoutMs: 30000 });
      setScriptsSummary(result || await backendCall("scripts.summary"));
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const openScriptsFolder = async () => {
    setError("");
    try { await backendCall("scripts.openFolder", {}, { timeoutMs: 10000 }); }
    catch (error) { setError(error.message); }
  };

  const startInstallAction = async (item, action, values = {}) => {
    if (!item?.id || !action) return;
    if ((action === "remove_config" || action === "uninstall_wallpapers") && !(await confirmAction(`Run ${action.replace(/_/g, " ")} for ${item.name || item.id}?`, { title: "Run install action", confirmLabel: "Run", tone: "danger" }))) return;
    setBusy(true); setError("");
    try {
      const job = await backendCall("installCenter.action.start", { id: item.id, action, values }, { timeoutMs: 10000 });
      await refreshJobs();
      return job;
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const startInstallItem = async (item, options = {}) => {
    if (!item?.id) return;
    setBusy(true); setError("");
    try {
      const job = await backendCall("installCenter.install.start", { id: item.id, installPath: options.installPath }, { timeoutMs: 10000 });
      await refreshJobs();
      return job;
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const startUninstallItem = async (item) => {
    if (!item?.id) return;
    if (!(await confirmAction(`Uninstall ${item.name || item.id}?`, { title: "Uninstall item", confirmLabel: "Uninstall", tone: "danger" }))) return;
    setBusy(true); setError("");
    try {
      const job = await backendCall("installCenter.uninstall.start", { id: item.id }, { timeoutMs: 10000 });
      await refreshJobs();
      return job;
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const startBackup = async () => {
    setBusy(true); setError("");
    try { await backendCall("saveManager.backup.start", {}, { timeoutMs: 10000 }); await refreshJobs(); openSettings("backend"); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const startMerge = async ({ backupBeforeMerge = true } = {}) => {
    setBusy(true); setError("");
    try { await backendCall("saveManager.merge.start", { backupBeforeMerge }, { timeoutMs: 10000 }); await refreshJobs(); openSettings("backend"); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const restoreSaveBackup = async ({ deviceName, backupName, backupBeforeRestore = true }) => {
    if (!deviceName || !backupName) return;
    const target = sdMode?.active ? "the mounted SD Card" : "the connected MiSTer";
    if (!(await confirmAction(`Restore ${backupName} from ${deviceName} to ${target}?${backupBeforeRestore ? " A safety backup will be created first." : ""}`, { title: "Restore save backup", confirmLabel: "Restore", tone: "danger" }))) return;
    setBusy(true); setError("");
    try { await backendCall("saveManager.restore.start", { deviceName, backupName, backupBeforeRestore }, { timeoutMs: 10000 }); await refreshJobs(); openSettings("backend"); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const rebuildSaveMergeFolder = async () => {
    setBusy(true); setError("");
    try { await backendCall("saveManager.rebuildSync.start", {}, { timeoutMs: 10000 }); await refreshJobs(); openSettings("backend"); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const setSaveRetention = async (value) => {
    setBusy(true); setError("");
    try { const result = await backendCall("saveManager.retention.set", { value }, { timeoutMs: 10000 }); setSaveSummary(result?.summary || await backendCall("saveManager.summary")); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const startZapScriptsScan = async () => {
    setBusy(true); setError("");
    try { await backendCall("zapscripts.scan.start", {}, { timeoutMs: 10000 }); await refreshJobs(); openSettings("backend"); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const startZapScriptsService = async () => {
    setBusy(true); setError("");
    try {
      const result = await backendCall("zapscripts.service.start", {}, { timeoutMs: 20000 });
      if (result?.summary) setZapScripts(result.summary);
      else await refreshZapScripts({ force: true, forceServiceProbe: true });
      if (result && result.started === false) setError(result.error || "Zaparoo service start was requested, but the service did not answer yet.");
    }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const launchZapScriptsItem = async (item) => {
    if (!item) return;
    setBusy(true); setError("");
    try {
      const result = await backendCall("zapscripts.launch", { item }, { timeoutMs: 15000 });
      if (result && result.launched === false) setError(result.error || "ZapScripts launch was not available.");
    }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const sendZapScriptsControl = async (action) => {
    setBusy(true); setError("");
    try {
      const result = await backendCall("zapscripts.control", { action }, { timeoutMs: 15000 });
      if (result && result.sent === false) setError(result.error || "ZapScripts control was not available.");
    }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const updateZapScraperSettings = async (settings) => {
    setZapScraper((current) => ({ ...(current || {}), settings: { ...(current?.settings || {}), ...(settings || {}) } }));
    try {
      const result = await backendCall("zapscraper.settings.save", { settings }, { timeoutMs: 10000 });
      setZapScraper((current) => ({ ...(current || {}), ...(result || {}) }));
    } catch (error) { setError(error.message); }
  };

  const chooseZapScraperFolder = async () => {
    try {
      const folder = await host?.chooseDirectory?.({ title: "Choose MiSTer games folder or SD root" });
      if (folder) await updateZapScraperSettings({ sourcePath: folder, sourceMode: zapScraper?.settings?.sourceMode || "Custom Games Folder" });
    } catch (error) { setError(error.message); }
  };

  const startZapScraperScan = async (settings) => {
    setBusy(true); setError("");
    try { await backendCall("zapscraper.scan.start", settings || zapScraper.settings || {}, { timeoutMs: 10000 }); await refreshJobs(); openSettings("backend"); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const startZapScraperPlan = async ({ settings, selectedPaths }) => {
    const activeSettings = settings || zapScraper.settings || {};
    setBusy(true); setError("");
    try { await backendCall("zapscraper.plan.start", { options: activeSettings, sourceMode: activeSettings.sourceMode, sourcePath: activeSettings.sourcePath, selectedPaths }, { timeoutMs: 10000 }); await refreshJobs(); openSettings("backend"); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const startZapScraperScrape = async ({ planId, settings }) => {
    if (!(await confirmAction("Run the latest ZapScraper plan? This can download/write gamelist metadata and media files to the selected folder.", { title: "Run ZapScraper plan", confirmLabel: "Run" }))) return;
    setBusy(true); setError("");
    try { await backendCall("zapscraper.scrape.start", { planId, options: settings || zapScraper.settings || {} }, { timeoutMs: 10000 }); await refreshJobs(); openSettings("backend"); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const startZapScraperScrapeSelected = async ({ settings, selectedPaths }) => {
    const activeSettings = settings || zapScraper.settings || {};
    const rebuild = Boolean(activeSettings.rebuildFromScratch);
    const message = rebuild
      ? "Rebuild from scratch and scrape selected systems? This will clear generated gamelist/cache/media output for the selected systems before scraping."
      : "Plan and scrape selected systems now? This can download/write gamelist metadata and media files to the selected folder.";
    if (!(await confirmAction(message, { title: "Run ZapScraper", confirmLabel: "Run", tone: rebuild ? "danger" : "default" }))) return;
    setBusy(true); setError("");
    try {
      await backendCall("zapscraper.scrapeSelected.start", { options: activeSettings, sourceMode: activeSettings.sourceMode, sourcePath: activeSettings.sourcePath, selectedPaths }, { timeoutMs: 10000 });
      await refreshJobs();
      openSettings("backend");
    }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const startZapScraperLogin = async (settings) => {
    setBusy(true); setError("");
    try { await backendCall("zapscraper.login.start", settings || zapScraper.settings || {}, { timeoutMs: 10000 }); await refreshJobs(); openSettings("backend"); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const clearJobs = async () => {
    try { setJobs(await backendCall("jobs.clear", { keepRunning: true })); }
    catch (error) { setError(error.message); }
  };

  const startCommandJob = async (command) => {
    setBusy(true); setError("");
    try { await backendCall("command.start", { command }, { timeoutMs: 10000 }); await refreshJobs(); openSettings("backend"); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const runCommand = async (command) => {
    setBusy(true); setError("");
    try { const result = await backendCall("command.run", { command }, { timeoutMs: 45000 }); setCommandOutput(result?.output || ""); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };

  const openSettings = (section = "appearance") => {
    setSettingsInitialSection(section);
    setSettingsOpen(true);
  };

  const startFlashImage = async ({ mode, action }) => {
    const result = await backendCall("flash.image.start", { mode, action }, { timeoutMs: 10000 });
    await refreshJobs().catch(() => {});
    return result;
  };

  const startFlashBalena = async ({ mode, action }) => {
    const result = await backendCall("flash.balena.start", { mode, action }, { timeoutMs: 10000 });
    await refreshJobs().catch(() => {});
    return result;
  };

  const startFlashDriveRefresh = async ({ mode }) => {
    const result = await backendCall("flash.drives.start", { mode }, { timeoutMs: 10000 });
    await refreshJobs().catch(() => {});
    return result;
  };

  const startFlashWrite = async ({ mode, drive, password }) => {
    const result = await backendCall("flash.start", { mode, drive, password }, { timeoutMs: 10000 });
    await refreshJobs().catch(() => {});
    return result;
  };

  const startFlashBackup = async ({ mode, drive, outputPath, size }) => {
    const result = await backendCall("flash.backup.start", { mode, drive, outputPath, size }, { timeoutMs: 10000 });
    await refreshJobs().catch(() => {});
    return result;
  };
  const setIniText = (text) => setIni((current) => ({ ...(current || { filename: selectedFilename, path: `/media/fat/${selectedFilename}` }), filename: selectedFilename, path: current?.path || `/media/fat/${selectedFilename}`, text }));
  const updateSavedThemes = (themes) => { setSavedThemes(normalizeMisterThemeList(themes)); saveMisterSavedThemes(themes); };
  const saveCurrentTheme = async (name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return;
    const record = { name: trimmed, theme };
    const nextThemes = normalizeMisterThemeList([...savedThemes.filter((item) => item.name !== trimmed), record]);
    updateSavedThemes(nextThemes);
    try { await host?.saveThemeFile?.(record); } catch {}
    try { await host?.saveThemeState?.({ activeTheme: theme, savedThemes: nextThemes, sidebarGlyphs }); } catch {}
  };
  const openThemesFolder = async () => {
    setError("");
    try {
      if (!host?.openThemesFolder) throw new Error("The themes folder is only available in the desktop app.");
      await host.openThemesFolder();
    } catch (error) {
      setError(error.message || "Could not open the themes folder.");
    }
  };
  const reloadThemes = () => {
    setError("");
    try {
      setSavedThemes(loadMisterSavedThemes());
    } catch (error) {
      setError(error.message || "Could not reload themes from the themes folder.");
    }
  };
  const setInstallItemArtwork = (id, value) => {
    if (!id) return;
    setInstallArtwork((current) => {
      const next = { ...(current || {}) };
      const trimmed = String(value || "").trim();
      if (trimmed) next[id] = trimmed;
      else delete next[id];
      return next;
    });
  };
  const noop = () => {};
  const pageMap = {
    dashboard: <DashboardPage state={{ backend, profiles, connection, catalog }} summary={deviceSummary} commandOutput={commandOutput} runCommand={runCommand} startCommandJob={startCommandJob} refresh={refreshAll} setPage={setPage} connected={connection?.connected} busy={busy} checking={isChecking("dashboard")} />,
    connection: <ConnectionPage profiles={profiles} connection={connection} sdMode={sdMode} chooseSdRoot={chooseSdRoot} enableSdMode={enableSdMode} disableSdMode={disableSdMode} draft={draft} setDraft={setDraft} selectedIndex={selectedIndex} setSelectedIndex={setSelectedIndex} scanResults={networkScan} onScan={scanNetwork} onUseScanResult={useScanResult} onSave={saveProfile} onDelete={deleteProfile} onConnect={connect} onDisconnect={disconnect} onTest={testConnection} busy={busy} scanning={networkScanning} checking={isSectionBusy("connection")} platinumStyle={String(theme?.appStyle || "").toLowerCase() === "macos9platinum"} />,
    device: <DevicePage summary={deviceSummary} refreshDevice={refreshDevice} setSmbEnabled={setSmbEnabled} returnToMenu={returnToMenu} rebootMiSTer={rebootMiSTer} connected={connection?.connected} busy={busy} checking={isSectionBusy("device")} />,
    remote: <RemotePage confirmAction={confirmAction} status={remoteStatus} refresh={refreshRemoteStatus} startCommand={startRemoteCommand} sendInput={sendRemoteInput} disconnectRemote={disconnectRemote} connected={connection?.connected} refreshJobs={refreshJobs} checking={isSectionBusy("remote")} />,
    files: <FileBrowserPage browser={fileBrowser} connected={connection?.connected} refresh={refreshFileBrowser} backendCall={backendCall} host={host} jobs={jobs} refreshJobs={refreshJobs} confirmAction={confirmAction} setBrowser={setFileBrowser} setError={setError} checking={isSectionBusy("files")} />,
    retroachievements: <RetroAchievementsPage data={retroAchievements} settings={retroAchievements?.settings || {}} refresh={refreshRetroAchievementsDashboard} loadGame={loadRetroAchievementsGame} openApiSettings={() => openSettings("api")} busy={busy} checking={isSectionBusy("retroachievements")} />,
    flash: <FlashSdPage confirmAction={confirmAction} summary={flashSd} refresh={refreshFlashSd} refreshDrives={startFlashDriveRefresh} startFlash={startFlashWrite} startBackup={startFlashBackup} jobs={jobs} refreshJobs={refreshJobs} host={host} profileName={profiles[selectedIndex]?.name || connection?.profile?.name || draft?.name || "MiSTer"} busy={busy} checking={isSectionBusy("flash")} openToolsSettings={() => openSettings("flash-tools")} />,
    scripts: <ScriptsPage confirmAction={confirmAction} summary={scriptsSummary} refresh={refreshScripts} runAction={runScriptAction} loadConfig={loadScriptConfig} saveConfig={saveScriptConfig} removeConfig={removeScriptConfig} openFolder={openScriptsFolder} connected={connection?.connected} checking={isSectionBusy("scripts")} />,
    install: <InstallCenterPage catalog={catalog} statuses={installStatuses} artworkMap={installArtwork} onArtworkChange={setInstallItemArtwork} refreshCatalog={refreshCatalog} refreshInstallStatuses={refreshInstallStatuses} checkInstallStatus={checkInstallStatus} startInstall={startInstallItem} startUninstall={startUninstallItem} startAction={startInstallAction} openScriptsPage={() => { setPage("scripts"); }} connected={connection?.connected} sdMode={sdMode} busy={busy} jobs={jobs} refreshJobs={refreshJobs} checking={isSectionBusy("install")} />,
    settings: <MisterSettingsPage
      ini={ini}
      iniFiles={iniFiles}
      iniFonts={iniFonts}
      iniBackups={iniBackups}
      iniOptions={iniOptions}
      iniStatus={iniStatus}
      connected={connection?.connected}
      sdMode={sdMode}
      mode={iniMode}
      setMode={setIniMode}
      easy={iniEasy}
      updateEasy={updateEasy}
      selectedFilename={selectedFilename}
      setSelectedFilename={setSelectedFilename}
      refreshIniList={refreshIniList}
      readIni={readIni}
      writeIni={writeIni}
      createBackup={createBackup}
      restoreBackup={restoreBackup}
      restoreDefaults={restoreDefaults}
      rebootMiSTer={rebootMiSTer}
      setIniText={setIniText}
      parseAdvanced={parseAdvanced}
      retention={iniRetention}
      setRetention={updateRetention}
      busy={busy}
      checking={isSectionBusy("settings")}
    />,
    saves: <SavesPage summary={saveSummary} refresh={refreshSaves} startBackup={startBackup} startMerge={startMerge} restoreBackup={restoreSaveBackup} rebuildSync={rebuildSaveMergeFolder} setRetention={setSaveRetention} connected={connection?.connected} sdMode={sdMode} checking={isSectionBusy("saves")} />,
    zapscripts: <ZapScriptsPage summary={zapScripts} refresh={refreshZapScripts} loadPage={loadZapScriptsPage} startScan={startZapScriptsScan} startService={startZapScriptsService} launchItem={launchZapScriptsItem} sendControl={sendZapScriptsControl} connected={connection?.connected} busy={busy} checking={isSectionBusy("zapscripts")} />,
    zapscraper: <ZapScraperPage confirmAction={confirmAction} summary={zapScraper} updateSettings={updateZapScraperSettings} chooseFolder={chooseZapScraperFolder} startScan={startZapScraperScan} startPlan={startZapScraperPlan} startScrape={startZapScraperScrape} startScrapeSelected={startZapScraperScrapeSelected} startLogin={startZapScraperLogin} backendCall={backendCall} refreshJobs={refreshJobs} busy={busy} checking={isSectionBusy("zapscraper")} />,
    manuals: <ManualsPage confirmAction={confirmAction} manuals={manuals} refresh={refreshManuals} backendCall={backendCall} checking={isSectionBusy("manuals")} />,
    backend: <BackendPage diagnostics={diagnostics} jobs={jobs} refreshDiagnostics={refreshDiagnostics} refreshJobs={refreshJobs} clearJobs={clearJobs} checking={isSectionBusy("backend")} />,
  };

  const leftWindowControlsEnabled = themeToggleEnabled(theme.windowControlsLeft) && String(theme.appStyle || "").toLowerCase() !== "macos9platinum";
  const activeFooterCheckLabels = {
    dashboard: "Loading dashboard…",
    connection: "Checking connection…",
    device: "Checking device status…",
    remote: "Checking remote daemon…",
    files: "Reading directory…",
    install: "Checking catalog and install status…",
    scripts: "Checking scripts…",
    saves: "Checking saves…",
    manuals: "Checking manual cache…",
    flash: "Checking flash tools…",
    zapscripts: "Checking Zaparoo service…",
    zapscraper: "Checking scraper status…",
    retroachievements: "Checking RetroAchievements…",
    settings: "Checking settings…",
    backend: "Checking activity…",
  };
  const activeFooterCheckLabel = isSectionBusy(page) ? (activeFooterCheckLabels[page] || "Checking status…") : "";
  const windowControls = <WindowControls mirrored={leftWindowControlsEnabled} windowMaximized={windowMaximized} controlStyle={theme.windowControlStyle || "laservault"} onMinimize={host?.minimizeWindow} onMaximize={host?.toggleMaximizeWindow} onClose={host?.closeWindow} />;
  const sidebarSections = appConfig.sidebar.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      const override = settingsNavItems.find((navItem) => navItem.id === item.id);
      return override ? { ...item, label: override.name || item.label, icon: override.glyph || item.icon, hidden: override.hidden } : item;
    }).filter((item) => !item.hidden),
  })).filter((section) => section.items.length);

  return (
    <AppShellFrame shellRef={shellRef} theme={theme} windowFocused={windowFocused} windowMaximized={windowMaximized} leftWindowControlsEnabled={leftWindowControlsEnabled} sidebarOpen hasLibrary windowAnimation="">
      <aside className="media-sidebar mister-electron-sidebar">
        {leftWindowControlsEnabled && <div className="mister-sidebar-window-controls">{windowControls}</div>}
        <div className="media-sidebar-scroll">
          {sidebarSections.map((section) => (
            <section className="media-sidebar-section" key={section.title}>
              <h2>{section.title}</h2>
              <nav>
                {section.items.map((item) => (
                  <button key={item.id} className={page === item.id ? "active" : ""} data-sidebar-item={item.id} onClick={() => setPage(item.id)} title={item.description}>
                    <SidebarNavGlyph item={item} glyphs={sidebarGlyphs} theme={theme} />
                    <span className="media-sidebar-label">{item.label}</span>
                  </button>
                ))}
              </nav>
            </section>
          ))}
        </div>
        {String(theme?.appStyle || "").toLowerCase() === "macos9platinum" ? (
          <button className="mister-sidebar-settings-button" type="button" onClick={() => openSettings("appearance")} title="Settings">
            <span className="media-sidebar-glyph custom-sidebar-glyph" aria-hidden="true">
              <span className="media-sidebar-glyph-image" style={{ "--sidebar-glyph-image": `url("${macos9SettingsGlyphUrl}")` }} />
            </span>
            <span className="media-sidebar-label">Settings</span>
          </button>
        ) : null}
      </aside>

      <main className="mister-electron-main">
        <header className="mister-electron-header topbar" {...dragHandlers}>
          <div className="mister-header-left">
            <img className="mister-header-wordmark" src={appConfig.assets?.wordmark || misterWordmarkUrl} alt={appConfig.name} />
          </div>
          <div className="mister-header-actions topbar-actions">
            {String(theme?.appStyle || "").toLowerCase() !== "macos9platinum" ? <button className="mister-header-menu-button" onClick={() => openSettings("appearance")} aria-label="Open settings" title="Settings"><HamburgerIcon /></button> : null}
            {!leftWindowControlsEnabled && windowControls}
          </div>
        </header>

        <div ref={mainContentScrollRef} className={`mister-electron-content mister-section-${page}`}>
          {error ? <div className="error-box mister-error">{error}</div> : null}
          <div key={page} className={`mister-page mister-page-${page}`} data-page={page}>
            {pageMap[page] || pageMap.dashboard}
          </div>
        </div>
        <ThemedScrollbar scrollRef={mainContentScrollRef} className="main-content-themed-scrollbar" />

        <footer className="footer-bar mister-electron-footer">
          <span className="footer-status mister-footer-connection-status"><StatusPill connected={connection?.connected} sdMode={sdMode} /></span>
          <div className="mister-footer-checks">
            <StatusCheckBar active={Boolean(activeFooterCheckLabel)} label={activeFooterCheckLabel} />
          </div>
        </footer>
      </main>

      <ThemedConfirmModal dialog={confirmDialog} onResolve={resolveConfirm} />

      {settingsOpen && <SettingsModal
        theme={theme}
        savedThemes={savedThemes}
        sidebarGlyphs={sidebarGlyphs}
        defaultSidebarGlyphs={defaultSidebarGlyphs}
        mediaLibraries={settingsNavItems}
        onMediaLibrariesChange={setSettingsNavItems}
        onCreateLibrary={noop}
        onSidebarGlyphsChange={setSidebarGlyphs}
        apiKey=""
        archiveBusy={false}
        hasLibrary={false}
        libraryInfo={{}}
        listRoomy={false}
        onListRoomyChange={noop}
        healthItems={[]}
        metadataBusy={false}
        metadataProgress=""
        onHealthEdit={noop}
        onHealthRemove={noop}
        onFetchMissingMetadata={noop}
        onRefreshAllMetadata={noop}
        lddbFinding={false}
        lddbProgress=""
        lddbDelay={0}
        onLddbDelayChange={noop}
        onOpenLddbSession={noop}
        onOpenYoutubeLogin={noop}
        onFindLddbCovers={noop}
        onStopLddbCovers={noop}
        onClearLddbCovers={noop}
        onOpenCoverQueue={noop}
        onApiKeyChange={noop}
        onImportZip={noop}
        onExportZip={noop}
        onExportLddbLinks={noop}
        onLoadXml={noop}
        onResetLibrary={noop}
        onChange={setTheme}
        onOpenThemePreview={noop}
        onUpdateThemePreview={noop}
        onSaveCurrent={saveCurrentTheme}
        onOpenThemesFolder={openThemesFolder}
        onReloadThemes={reloadThemes}
        onReset={() => setTheme(hydrateTheme(DEFAULT_THEME))}
        onClose={() => setSettingsOpen(false)}
        appName={appConfig.name}
        appSubtitle="MiSTer Companion EX"
        appContext="mister"
        aboutLogoUrl={appConfig.assets?.aboutLogo || appConfig.assets?.wordmark || misterWordmarkUrl}
        themePreviewEnabled={false}
        initialSection={settingsInitialSection}
        apiPanel={<RetroAchievementsApiSettings settings={retroAchievements?.settings || {}} onSave={saveRetroAchievementsSettings} onRefresh={refreshRetroAchievementsDashboard} />}
        flashToolsPanel={<FlashToolsSettingsPanel summary={flashSd} refresh={refreshFlashSd} startImage={startFlashImage} startBalena={startFlashBalena} busy={busy} confirmAction={confirmAction} />}
        backendPanel={<BackendPage diagnostics={diagnostics} jobs={jobs} refreshDiagnostics={refreshDiagnostics} refreshJobs={refreshJobs} clearJobs={clearJobs} embedded />}
      />}
    </AppShellFrame>
  );
}

export default MisterCompanionApp;

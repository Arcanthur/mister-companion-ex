import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_THEME } from "../../theme/themePresets";
import { hydrateTheme, themeToggleEnabled, themeStyle, useCustomFont } from "../../theme/themeUtils";
import { getHostBridge } from "../../framework/host/hostBridge";
import { WindowControls } from "../window/WindowControls";
import { MISTER_THEME_STORAGE_KEY } from "../../apps/mister/appConfig";
import { ThemeAwareSelect } from "../common/ThemeAwareSelect";

function safeJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function decodeQueryValue(value) {
  try {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    return decodeURIComponent(escape(atob(padded)));
  } catch {
    return "";
  }
}

function loadManualWindowTheme() {
  try {
    const state = getHostBridge()?.loadThemeState?.();
    if (state?.activeTheme && typeof state.activeTheme === "object") return hydrateTheme(state.activeTheme);
  } catch {}
  const saved = safeJson(localStorage.getItem(MISTER_THEME_STORAGE_KEY), null);
  return hydrateTheme(saved?.theme || DEFAULT_THEME);
}

function formatZoomLabel(zoom) {
  if (zoom === "page-width") return "Fit Width";
  if (zoom === "page-fit") return "Fit Page";
  if (zoom === "auto") return "Auto";
  return `${zoom}%`;
}

function buildPdfSrc(baseUrl, page, zoom, rotation, nonce) {
  if (!baseUrl) return "";
  const params = new URLSearchParams();
  params.set("toolbar", "0");
  params.set("navpanes", "0");
  params.set("scrollbar", "1");
  params.set("page", String(Math.max(1, page || 1)));
  if (zoom && zoom !== "auto") params.set("zoom", String(zoom));
  // Chromium's PDF plugin does not reliably re-read fragment-only changes from an iframe.
  // Add a real query cache key as well as the PDF fragment so every toolbar action causes
  // a fresh viewer navigation instead of a decorative state update.
  const cacheKey = `${nonce || 0}-${Math.max(1, page || 1)}-${zoom || "auto"}-${rotation || 0}`;
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}viewer=${encodeURIComponent(cacheKey)}#${params.toString()}`;
}

export function ManualPdfWindow() {
  const host = getHostBridge();
  const iframeRef = useRef(null);
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const manualPath = useMemo(() => decodeQueryValue(params.get("path")), [params]);
  const manualTitle = useMemo(() => decodeQueryValue(params.get("title")) || "Manual PDF", [params]);
  const systemName = useMemo(() => decodeQueryValue(params.get("system")) || "Manuals", [params]);
  const [theme] = useState(loadManualWindowTheme);
  const [pdfUrl, setPdfUrl] = useState("");
  const [error, setError] = useState("");
  const [windowFocused, setWindowFocused] = useState(true);
  const [windowMaximized, setWindowMaximized] = useState(false);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState("page-width");
  const [rotation, setRotation] = useState(0);
  const [reloadNonce, setReloadNonce] = useState(0);

  useCustomFont(theme);

  const leftWindowControlsEnabled = themeToggleEnabled(theme.windowControlsLeft ?? DEFAULT_THEME.windowControlsLeft);
  const controlStyle = theme.windowControlStyle || DEFAULT_THEME.windowControlStyle || "laservault";

  useEffect(() => {
    let mounted = true;
    host?.manualFileUrl?.(manualPath)
      ?.then((url) => { if (mounted) setPdfUrl(url || ""); })
      ?.catch((err) => { if (mounted) setError(err?.message || String(err)); });
    return () => { mounted = false; };
  }, [host, manualPath]);

  useEffect(() => {
    host?.isWindowFocused?.()?.then?.(setWindowFocused).catch?.(() => {});
    host?.isWindowMaximized?.()?.then?.(setWindowMaximized).catch?.(() => {});
    const offFocus = host?.onWindowFocusChange?.(setWindowFocused);
    const offMax = host?.onWindowMaximizedChange?.(setWindowMaximized);
    return () => { offFocus?.(); offMax?.(); };
  }, [host]);

  const dragHandlers = {
    onPointerDown: (event) => {
      if (event.button !== 0) return;
      if (event.target.closest?.("button,input,select,iframe")) return;
      host?.startWindowMove?.({ x: event.screenX, y: event.screenY });
    },
    onPointerMove: (event) => {
      if (event.buttons !== 1) return;
      host?.updateWindowMove?.({ x: event.screenX, y: event.screenY });
    },
    onPointerUp: () => host?.endWindowMove?.(),
    onPointerCancel: () => host?.endWindowMove?.(),
  };

  const controls = (
    <WindowControls
      mirrored={leftWindowControlsEnabled}
      controlStyle={controlStyle}
      windowMaximized={windowMaximized}
      onMinimize={() => host?.minimizeWindow?.()}
      onMaximize={() => host?.toggleMaximizeWindow?.()?.then?.(setWindowMaximized)}
      onClose={() => host?.closeWindow?.()}
    />
  );

  const pdfSrc = useMemo(() => buildPdfSrc(pdfUrl, page, zoom, rotation, reloadNonce), [pdfUrl, page, zoom, rotation, reloadNonce]);

  const zoomLevels = [50, 67, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300];
  const stepZoom = useCallback((direction) => {
    const current = Number(zoom);
    const index = Number.isFinite(current) ? zoomLevels.findIndex((item) => item >= current) : zoomLevels.indexOf(100);
    const nextIndex = Math.max(0, Math.min(zoomLevels.length - 1, (index < 0 ? 4 : index) + direction));
    setZoom(zoomLevels[nextIndex]);
  }, [zoom]);

  const goToPage = useCallback((nextPage) => {
    setPage(Math.max(1, Number(nextPage) || 1));
  }, []);

  const reloadViewer = useCallback(() => {
    setReloadNonce((value) => value + 1);
  }, []);

  const printManual = useCallback(() => {
    try {
      iframeRef.current?.contentWindow?.focus?.();
      iframeRef.current?.contentWindow?.print?.();
      return;
    } catch {}
    window.print?.();
  }, []);

  return (
    <div className={`app-window-frame manual-pdf-window-frame ${windowFocused ? "window-focused" : "window-unfocused"}${windowMaximized ? " is-maximized" : ""}`} style={themeStyle(theme)}>
      <div className="app-window-shadow-layer" aria-hidden="true" />
      <div className="app-window-outer-glow-layer" aria-hidden="true" />
      <div className="app-window-border-layer" aria-hidden="true" />
      <div className="app-window-surface">
        <div className="app-window-inner-glow-layer" aria-hidden="true" />
        <div className={`app-shell manual-pdf-window app-style-${theme.appStyle || "classic"} window-controls-${controlStyle}${leftWindowControlsEnabled ? " window-controls-left" : ""}`}>
          <header className="mister-electron-header topbar manual-pdf-header" {...dragHandlers}>
            <div className="mister-header-left manual-pdf-title-block">
              {leftWindowControlsEnabled && controls}
              <div>
                <strong className="manual-pdf-title">{manualTitle}</strong>
                <span className="manual-pdf-subtitle">{systemName}</span>
              </div>
            </div>
            <div className="mister-header-actions topbar-actions">
              {!leftWindowControlsEnabled && controls}
            </div>
          </header>

          <section className="manual-pdf-toolbar" aria-label="PDF controls">
            <button className="secondary-button" onClick={() => goToPage(page - 1)} title="Previous page">‹</button>
            <label className="manual-pdf-page-field"><span>Page</span><input type="number" min="1" value={page} onChange={(event) => goToPage(event.target.value)} /></label>
            <button className="secondary-button" onClick={() => goToPage(page + 1)} title="Next page">›</button>
            <span className="manual-pdf-toolbar-divider" aria-hidden="true" />
            <button className="secondary-button" onClick={() => stepZoom(-1)} title="Zoom out">−</button>
            <ThemeAwareSelect value={String(zoom)} onChange={(event) => setZoom(event.target.value === "auto" || event.target.value.startsWith("page-") ? event.target.value : Number(event.target.value))} aria-label="Zoom level">
              <option value="auto">Auto</option>
              <option value="page-width">Fit Width</option>
              <option value="page-fit">Fit Page</option>
              {zoomLevels.map((level) => <option key={level} value={level}>{level}%</option>)}
            </ThemeAwareSelect>
            <button className="secondary-button" onClick={() => stepZoom(1)} title="Zoom in">+</button>
            <span className="manual-pdf-zoom-label">{formatZoomLabel(zoom)}</span>
            <span className="manual-pdf-toolbar-divider" aria-hidden="true" />
            <button className="secondary-button" onClick={() => setRotation((value) => (value + 90) % 360)} title="Rotate clockwise">Rotate</button>
            <button className="secondary-button" onClick={reloadViewer} title="Reload viewer">Reload</button>
            <button className="secondary-button" onClick={() => host?.openPath?.(manualPath)} title="Open in the system PDF app">Open Externally</button>
            <button className="secondary-button" onClick={printManual} title="Print manual">Print</button>
          </section>

          <main className="manual-pdf-content">
            {error ? <div className="error-box mister-error">{error}</div> : null}
            {!error && pdfSrc ? (
              <div className={`manual-pdf-viewport rotate-${rotation}`}>
                <iframe ref={iframeRef} key={pdfSrc} className="manual-pdf-iframe" title={manualTitle} src={pdfSrc} />
              </div>
            ) : <div className="manual-pdf-loading">Loading manual…</div>}
          </main>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { DEFAULT_THEME } from "../../theme/themePresets";
import { hydrateTheme, themeStyle, useCustomFont } from "../../theme/themeUtils";
import { getHostBridge } from "../../framework/host/hostBridge";
import { MISTER_THEME_STORAGE_KEY } from "../../apps/mister/appConfig";
import { ThemeAwareSelect } from "../common/ThemeAwareSelect";
import { ThemedScrollbar } from "../common/ThemedScrollbar";
import { PlatinumTitlebarLayout } from "../common/PlatinumTitlebarStripes";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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

const ZOOM_LEVELS = [50, 67, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300];

export function ManualPdfWindow() {
  const host = getHostBridge();
  const documentScrollRef = useRef(null);
  const pageElementRefs = useRef(new Map());
  const canvasRefs = useRef(new Map());
  const dragStateRef = useRef(null);
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const manualPath = useMemo(() => decodeQueryValue(params.get("path")), [params]);
  const manualTitle = useMemo(() => decodeQueryValue(params.get("title")) || "Manual PDF", [params]);
  const systemName = useMemo(() => decodeQueryValue(params.get("system")) || "Manuals", [params]);
  const [theme] = useState(loadManualWindowTheme);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState("");
  const [windowFocused, setWindowFocused] = useState(true);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState("page-width");
  const [rotation, setRotation] = useState(0);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [viewportVersion, setViewportVersion] = useState(0);
  const [canPan, setCanPan] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useCustomFont(theme);

  const updatePanAvailability = useCallback(() => {
    const scroller = documentScrollRef.current;
    if (!scroller) {
      setCanPan(false);
      return;
    }
    setCanPan(scroller.scrollWidth > scroller.clientWidth + 1 || scroller.scrollHeight > scroller.clientHeight + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    host?.manualFileUrl?.(manualPath)
      ?.then((url) => { if (mounted) setPdfUrl(url || ""); })
      ?.catch((err) => { if (mounted) setError(err?.message || String(err)); });
    return () => { mounted = false; };
  }, [host, manualPath]);

  useEffect(() => {
    if (!pdfUrl) return undefined;
    let cancelled = false;
    const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
    setPdfDocument(null);
    setPageCount(0);
    setError("");
    loadingTask.promise
      .then((document) => {
        if (cancelled) return document.destroy();
        setPdfDocument(document);
        setPageCount(document.numPages);
        setPage((current) => Math.max(1, Math.min(document.numPages, current)));
        return undefined;
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || String(err));
      });
    return () => {
      cancelled = true;
      loadingTask.destroy?.();
    };
  }, [pdfUrl, reloadNonce]);

  useEffect(() => {
    const element = documentScrollRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(() => {
      setViewportVersion((value) => value + 1);
      window.requestAnimationFrame(updatePanAvailability);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [pdfDocument, updatePanAvailability]);

  useEffect(() => {
    if (!pdfDocument || !pageCount) return undefined;
    let cancelled = false;
    const renderTasks = [];
    const renderDocument = async () => {
      const scroller = documentScrollRef.current;
      if (!scroller) return;
      const availableWidth = Math.max(160, scroller.clientWidth - 24);
      const availableHeight = Math.max(160, scroller.clientHeight - 24);
      for (let pageNumber = 1; pageNumber <= pageCount && !cancelled; pageNumber += 1) {
        const pdfPage = await pdfDocument.getPage(pageNumber);
        const baseViewport = pdfPage.getViewport({ scale: 1, rotation });
        let scale = Number(zoom) / 100;
        if (!Number.isFinite(scale)) {
          const widthScale = availableWidth / baseViewport.width;
          const heightScale = availableHeight / baseViewport.height;
          scale = zoom === "page-fit" ? Math.min(widthScale, heightScale) : zoom === "auto" ? Math.min(1, widthScale) : widthScale;
        }
        const viewport = pdfPage.getViewport({ scale: Math.max(.1, scale), rotation });
        const canvas = canvasRefs.current.get(pageNumber);
        if (!canvas) continue;
        const outputScale = Math.max(1, window.devicePixelRatio || 1);
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        const context = canvas.getContext("2d", { alpha: false });
        const renderTask = pdfPage.render({
          canvasContext: context,
          viewport,
          transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0],
        });
        renderTasks.push(renderTask);
        try { await renderTask.promise; } catch (err) {
          if (!cancelled && err?.name !== "RenderingCancelledException") setError(err?.message || String(err));
        }
      }
      if (!cancelled) window.requestAnimationFrame(updatePanAvailability);
    };
    renderDocument();
    return () => {
      cancelled = true;
      renderTasks.forEach((task) => task.cancel?.());
    };
  }, [pageCount, pdfDocument, reloadNonce, rotation, updatePanAvailability, viewportVersion, zoom]);

  useEffect(() => {
    const syncBrowserFocus = () => setWindowFocused(document.hasFocus());
    const markFocused = () => setWindowFocused(true);
    const markUnfocused = () => setWindowFocused(false);
    syncBrowserFocus();
    window.addEventListener("focus", markFocused);
    window.addEventListener("blur", markUnfocused);
    host?.isWindowFocused?.()?.then?.(setWindowFocused).catch?.(() => {});
    const offFocus = host?.onWindowFocusChange?.(setWindowFocused);
    return () => {
      window.removeEventListener("focus", markFocused);
      window.removeEventListener("blur", markUnfocused);
      offFocus?.();
    };
  }, [host]);

  const stepZoom = useCallback((direction) => {
    const current = Number(zoom);
    const index = Number.isFinite(current) ? ZOOM_LEVELS.findIndex((item) => item >= current) : ZOOM_LEVELS.indexOf(100);
    const nextIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, (index < 0 ? 4 : index) + direction));
    setZoom(ZOOM_LEVELS[nextIndex]);
  }, [zoom]);

  const goToPage = useCallback((nextPage) => {
    const targetPage = Math.max(1, Math.min(pageCount || 1, Number(nextPage) || 1));
    setPage(targetPage);
    window.requestAnimationFrame(() => {
      const scroller = documentScrollRef.current;
      const target = pageElementRefs.current.get(targetPage);
      if (scroller && target) scroller.scrollTo({ top: Math.max(0, target.offsetTop - 8), behavior: "smooth" });
    });
  }, [pageCount]);

  useEffect(() => {
    const scroller = documentScrollRef.current;
    if (!scroller || !pageCount) return undefined;
    let frame = 0;
    const updateCurrentPage = () => {
      frame = 0;
      const targetTop = scroller.scrollTop + 12;
      let nearestPage = 1;
      let nearestDistance = Number.POSITIVE_INFINITY;
      pageElementRefs.current.forEach((element, pageNumber) => {
        const distance = Math.abs(element.offsetTop - targetTop);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPage = pageNumber;
        }
      });
      setPage(nearestPage);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateCurrentPage);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pageCount]);

  const reloadViewer = useCallback(() => {
    setReloadNonce((value) => value + 1);
  }, []);

  const printManual = useCallback(() => {
    window.print?.();
  }, []);

  const rotateManual = useCallback(() => {
    setRotation((value) => (value + 90) % 360);
  }, []);

  const openExternal = useCallback(() => {
    host?.openPath?.(manualPath);
  }, [host, manualPath]);

  const closeViewer = useCallback(() => {
    host?.closeWindow?.();
  }, [host]);

  const beginViewportDrag = useCallback((event) => {
    const scroller = documentScrollRef.current;
    if (!scroller || event.button !== 0) return;
    const pannable = scroller.scrollWidth > scroller.clientWidth + 1 || scroller.scrollHeight > scroller.clientHeight + 1;
    if (!pannable) return;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: scroller.scrollLeft,
      startScrollTop: scroller.scrollTop,
    };
    scroller.setPointerCapture?.(event.pointerId);
    setIsDragging(true);
    event.preventDefault();
  }, []);

  const moveViewportDrag = useCallback((event) => {
    const scroller = documentScrollRef.current;
    const drag = dragStateRef.current;
    if (!scroller || !drag || drag.pointerId !== event.pointerId) return;
    scroller.scrollLeft = drag.startScrollLeft - (event.clientX - drag.startX);
    scroller.scrollTop = drag.startScrollTop - (event.clientY - drag.startY);
    event.preventDefault();
  }, []);

  const endViewportDrag = useCallback((event) => {
    const scroller = documentScrollRef.current;
    const drag = dragStateRef.current;
    if (!drag || (event?.pointerId != null && drag.pointerId !== event.pointerId)) return;
    try {
      if (scroller?.hasPointerCapture?.(drag.pointerId)) scroller.releasePointerCapture(drag.pointerId);
    } catch {}
    dragStateRef.current = null;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const cancelDrag = () => endViewportDrag();
    window.addEventListener("blur", cancelDrag);
    return () => window.removeEventListener("blur", cancelDrag);
  }, [endViewportDrag]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented) return;
      const target = event.target;
      const editable = target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(target.tagName));
      const modifier = event.ctrlKey || event.metaKey;
      const key = String(event.key || "");
      const lowerKey = key.toLowerCase();

      if (modifier) {
        if (["+", "=", "add"].includes(lowerKey)) {
          event.preventDefault();
          stepZoom(1);
        } else if (["-", "_", "subtract"].includes(lowerKey)) {
          event.preventDefault();
          stepZoom(-1);
        } else if (lowerKey === "0") {
          event.preventDefault();
          setZoom("page-width");
        } else if (lowerKey === "p") {
          event.preventDefault();
          printManual();
        } else if (lowerKey === "r") {
          event.preventDefault();
          reloadViewer();
        } else if (lowerKey === "o") {
          event.preventDefault();
          openExternal();
        } else if (lowerKey === "w") {
          event.preventDefault();
          closeViewer();
        }
        return;
      }

      if (editable || event.altKey) return;
      if (key === "Escape") {
        event.preventDefault();
        closeViewer();
        return;
      }
      const scroller = documentScrollRef.current;
      const scrollStep = 64;
      if (key === "PageUp") {
        event.preventDefault();
        goToPage(page - 1);
      } else if (key === "PageDown") {
        event.preventDefault();
        goToPage(page + 1);
      } else if (key === "Home") {
        event.preventDefault();
        goToPage(1);
      } else if (key === "End") {
        event.preventDefault();
        goToPage(pageCount);
      } else if (key === "ArrowLeft") {
        event.preventDefault();
        scroller?.scrollBy({ left: -scrollStep, behavior: "smooth" });
      } else if (key === "ArrowRight") {
        event.preventDefault();
        scroller?.scrollBy({ left: scrollStep, behavior: "smooth" });
      } else if (key === "ArrowUp") {
        event.preventDefault();
        scroller?.scrollBy({ top: -scrollStep, behavior: "smooth" });
      } else if (key === "ArrowDown") {
        event.preventDefault();
        scroller?.scrollBy({ top: scrollStep, behavior: "smooth" });
      } else if (key === " ") {
        event.preventDefault();
        const amount = Math.max(120, Math.floor((scroller?.clientHeight || 400) * 0.85));
        scroller?.scrollBy({ top: event.shiftKey ? -amount : amount, behavior: "smooth" });
      } else if (["+", "="].includes(key)) {
        event.preventDefault();
        stepZoom(1);
      } else if (["-", "_"].includes(key)) {
        event.preventDefault();
        stepZoom(-1);
      } else if (lowerKey === "r") {
        event.preventDefault();
        rotateManual();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeViewer, goToPage, openExternal, page, pageCount, printManual, reloadViewer, rotateManual, stepZoom]);

  return (
    <div className={`app-window-frame manual-pdf-window-frame ${windowFocused ? "window-focused" : "window-unfocused"}`} style={themeStyle(theme)}>
      <div className="app-window-shadow-layer" aria-hidden="true" />
      <div className="app-window-outer-glow-layer" aria-hidden="true" />
      <div className="app-window-border-layer" aria-hidden="true" />
      <div className="app-window-surface">
        <div className="app-window-inner-glow-layer" aria-hidden="true" />
        <div className={`app-shell manual-pdf-window app-style-${theme.appStyle || "classic"}`}>
          <header className="mister-dialog-titlebar manual-pdf-titlebar">
            <PlatinumTitlebarLayout className="platinum-pdf-titlebar-layout">
              <strong className="mister-dialog-title manual-pdf-title">{systemName}: {manualTitle}</strong>
            </PlatinumTitlebarLayout>
            <button type="button" className="mister-dialog-close" aria-label="Close" title="Close (Esc or Ctrl+W)" onClick={closeViewer}>
              <span className="window-control-glyph window-close-glyph" aria-hidden="true" />
            </button>
          </header>

          <section className="manual-pdf-inner-panel">
            <div className="manual-pdf-toolbar" aria-label="PDF controls">
              <div className="manual-pdf-control-group manual-pdf-page-controls">
                <button className="manual-pdf-tool-button manual-pdf-icon-button" onClick={() => goToPage(page - 1)} title="Previous page (Page Up)" aria-label="Previous page"><span className="manual-pdf-tool-glyph previous" aria-hidden="true" /></button>
                <label className="manual-pdf-page-field"><span>Page</span><input type="number" min="1" value={page} onChange={(event) => goToPage(event.target.value)} /></label>
                <button className="manual-pdf-tool-button manual-pdf-icon-button" onClick={() => goToPage(page + 1)} title="Next page (Page Down)" aria-label="Next page"><span className="manual-pdf-tool-glyph next" aria-hidden="true" /></button>
              </div>
              <span className="manual-pdf-toolbar-divider" aria-hidden="true" />
              <div className="manual-pdf-control-group manual-pdf-zoom-controls">
                <button className="manual-pdf-tool-button manual-pdf-icon-button" onClick={() => stepZoom(-1)} title="Zoom out (Ctrl+-)" aria-label="Zoom out"><span className="manual-pdf-tool-glyph minus" aria-hidden="true" /></button>
                <ThemeAwareSelect className="manual-pdf-zoom-select" menuClassName="manual-pdf-zoom-menu" value={String(zoom)} onChange={(event) => setZoom(event.target.value === "auto" || event.target.value.startsWith("page-") ? event.target.value : Number(event.target.value))} aria-label="Zoom level">
                  <option value="auto">Auto</option>
                  <option value="page-width">Fit Width</option>
                  <option value="page-fit">Fit Page</option>
                  {ZOOM_LEVELS.map((level) => <option key={level} value={level}>{level}%</option>)}
                </ThemeAwareSelect>
                <button className="manual-pdf-tool-button manual-pdf-icon-button" onClick={() => stepZoom(1)} title="Zoom in (Ctrl++)" aria-label="Zoom in"><span className="manual-pdf-tool-glyph plus" aria-hidden="true" /></button>
              </div>
              <span className="manual-pdf-toolbar-divider" aria-hidden="true" />
              <div className="manual-pdf-control-group manual-pdf-action-controls">
                <button className="manual-pdf-tool-button" onClick={rotateManual} title="Rotate clockwise (R)">Rotate</button>
                <button className="manual-pdf-tool-button" onClick={reloadViewer} title="Reload viewer (Ctrl+R)">Reload</button>
                <button className="manual-pdf-tool-button" onClick={openExternal} title="Open in the system PDF app (Ctrl+O)">Open Externally</button>
                <button className="manual-pdf-tool-button" onClick={printManual} title="Print manual (Ctrl+P)">Print</button>
              </div>
            </div>

            <div className="manual-pdf-subheader" aria-label="Manual status">
              <span>Page {page}, {formatZoomLabel(zoom)}</span>
            </div>

            <main className="manual-pdf-content">
              {error ? <div className="error-box mister-error">{error}</div> : null}
              {!error && pdfDocument ? (
                <div className="manual-pdf-viewport">
                  <div
                    ref={documentScrollRef}
                    className={`manual-pdf-document-scroll${canPan ? " is-pannable" : ""}${isDragging ? " is-dragging" : ""}`}
                    onPointerDown={beginViewportDrag}
                    onPointerMove={moveViewportDrag}
                    onPointerUp={endViewportDrag}
                    onPointerCancel={endViewportDrag}
                    onLostPointerCapture={endViewportDrag}
                  >
                    <div className="manual-pdf-document-pages">
                      {Array.from({ length: pageCount }, (_, index) => {
                        const pageNumber = index + 1;
                        return (
                          <section
                            key={pageNumber}
                            ref={(element) => { if (element) pageElementRefs.current.set(pageNumber, element); else pageElementRefs.current.delete(pageNumber); }}
                            className="manual-pdf-rendered-page"
                            aria-label={`Page ${pageNumber}`}
                          >
                            <canvas ref={(canvas) => { if (canvas) canvasRefs.current.set(pageNumber, canvas); else canvasRefs.current.delete(pageNumber); }} />
                          </section>
                        );
                      })}
                    </div>
                  </div>
                  {theme.appStyle === "macos9platinum" ? <ThemedScrollbar scrollRef={documentScrollRef} className="manual-pdf-themed-scrollbar" /> : null}
                </div>
              ) : <div className="manual-pdf-loading">Loading manual…</div>}
            </main>
          </section>
        </div>
      </div>
    </div>
  );
}

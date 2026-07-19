/**
 * ThemedScrollbar.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: ThemedScrollbar
 */

import React, { useState, useEffect, useCallback, useRef } from "react";

export function ThemedScrollbar({ scrollRef, className = "" }) {
  const trackRef = useRef(null);
  const [metrics, setMetrics] = useState({ visible: false, top: 0, height: 0 });

  const getTrackInsets = useCallback(() => {
    const track = trackRef.current;
    if (!track) return { top: 0, bottom: 0, minThumb: 28 };
    const styles = window.getComputedStyle(track);
    return {
      top: Number.parseFloat(styles.getPropertyValue("--themed-scrollbar-top-inset")) || 0,
      bottom: Number.parseFloat(styles.getPropertyValue("--themed-scrollbar-bottom-inset")) || 0,
      minThumb: Number.parseFloat(styles.getPropertyValue("--themed-scrollbar-min-thumb")) || 28,
    };
  }, []);

  const update = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const rawTrackHeight = trackRef.current?.clientHeight || element.clientHeight;
    const insets = getTrackInsets();
    const trackHeight = Math.max(0, rawTrackHeight - insets.top - insets.bottom);
    const maximumScroll = Math.max(0, element.scrollHeight - element.clientHeight);
    if (!maximumScroll || trackHeight <= 0) {
      setMetrics({ visible: false, top: insets.top, height: trackHeight });
      return;
    }
    const thumbHeight = Math.max(insets.minThumb, trackHeight * (element.clientHeight / element.scrollHeight));
    const travel = Math.max(0, trackHeight - thumbHeight);
    setMetrics({
      visible: true,
      height: thumbHeight,
      top: insets.top + (maximumScroll ? (element.scrollTop / maximumScroll) * travel : 0),
    });
  }, [getTrackInsets, scrollRef]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return undefined;
    const queueUpdate = () => window.requestAnimationFrame(update);
    element.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", queueUpdate);
    const resizeObserver = new ResizeObserver(queueUpdate);
    const mutationObserver = new MutationObserver(queueUpdate);
    resizeObserver.observe(element);
    if (trackRef.current) resizeObserver.observe(trackRef.current);
    mutationObserver.observe(element, { childList: true, subtree: true, characterData: true });
    queueUpdate();
    return () => {
      element.removeEventListener("scroll", update);
      window.removeEventListener("resize", queueUpdate);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [scrollRef, update]);

  const onPointerDown = (event) => {
    const element = scrollRef.current;
    const track = trackRef.current;
    if (!element || !track || !metrics.visible) return;
    event.preventDefault();
    const trackRect = track.getBoundingClientRect();
    const insets = getTrackInsets();
    const usableTrackHeight = Math.max(0, track.clientHeight - insets.top - insets.bottom);
    const thumb = event.target.closest(".themed-scrollbar-thumb");
    const thumbOffset = thumb ? event.clientY - thumb.getBoundingClientRect().top : metrics.height / 2;
    const move = (clientY) => {
      const travel = Math.max(1, usableTrackHeight - metrics.height);
      const nextTop = Math.max(0, Math.min(travel, clientY - trackRect.top - insets.top - thumbOffset));
      const maximumScroll = Math.max(0, element.scrollHeight - element.clientHeight);
      element.scrollTop = (nextTop / travel) * maximumScroll;
    };
    const onMove = (moveEvent) => move(moveEvent.clientY);
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    move(event.clientY);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp, { once: true });
  };

  const nudge = (direction, event) => {
    event.preventDefault();
    event.stopPropagation();
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop += direction * Math.max(24, Math.round(element.clientHeight * 0.1));
  };

  return (
    <div ref={trackRef} className={`themed-scrollbar ${className}${metrics.visible ? " visible" : " inactive"}`} onPointerDown={onPointerDown} aria-hidden="true">
      <span className="themed-scrollbar-thumb" style={{ top: metrics.top, height: metrics.height }}>
        <span className="themed-scrollbar-thumb-grip" />
      </span>
      <button type="button" tabIndex={-1} className="themed-scrollbar-button themed-scrollbar-up" onPointerDown={(event) => nudge(-1, event)}>
        <span />
      </button>
      <button type="button" tabIndex={-1} className="themed-scrollbar-button themed-scrollbar-down" onPointerDown={(event) => nudge(1, event)}>
        <span />
      </button>
    </div>
  );
}

/**
 * WindowResizeHandles.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: WINDOW_RESIZE_DIRECTIONS, WindowResizeHandles
 */

import { useRef } from "react";
import { getHostBridge } from "../../framework/host/hostBridge";

export const WINDOW_RESIZE_DIRECTIONS = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

export function WindowResizeHandles({ disabled }) {
  const activeDirection = useRef("");

  const finishResize = (event) => {
    if (!activeDirection.current) return;
    if (event?.currentTarget?.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activeDirection.current = "";
    getHostBridge()?.endWindowResize?.();
  };

  return (
    <div className={`window-resize-handles${disabled ? " disabled" : ""}`} aria-hidden="true">
      {WINDOW_RESIZE_DIRECTIONS.map((direction) => (
        <span
          key={direction}
          className={`window-resize-handle resize-${direction}`}
          onPointerDown={(event) => {
            if (disabled || event.button !== 0) return;
            event.preventDefault();
            activeDirection.current = direction;
            event.currentTarget.setPointerCapture(event.pointerId);
            getHostBridge()?.startWindowResize?.({
              direction,
              x: event.screenX,
              y: event.screenY,
            });
          }}
          onPointerMove={(event) => {
            if (!activeDirection.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
            getHostBridge()?.updateWindowResize?.({ x: event.screenX, y: event.screenY });
          }}
          onPointerUp={finishResize}
          onPointerCancel={finishResize}
          onLostPointerCapture={() => {
            if (!activeDirection.current) return;
            activeDirection.current = "";
            getHostBridge()?.endWindowResize?.();
          }}
        />
      ))}
    </div>
  );
}

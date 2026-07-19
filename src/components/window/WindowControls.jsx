/**
 * WindowControls.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: WindowControls
 */


export function WindowControls({ mirrored = false, controlStyle = "laservault", windowMaximized, onMinimize, onMaximize, onClose }) {
  const closeButton = <button key="close" className="window-control window-close" title="Close" aria-label="Close" onClick={onClose}><span className="window-control-glyph window-close-glyph" aria-hidden="true" /></button>;
  const maximizeButton = <button key="maximize" className="window-control window-maximize" title={windowMaximized ? "Restore" : "Maximize"} aria-label={windowMaximized ? "Restore" : "Maximize"} onClick={onMaximize}><span className="window-control-glyph window-maximize-glyph" aria-hidden="true" /></button>;
  const minimizeButton = <button key="minimize" className="window-control window-minimize" title="Minimize" aria-label="Minimize" onClick={onMinimize}><span className="window-control-glyph window-minimize-glyph" aria-hidden="true" /></button>;
  return (
    <div className="window-controls" role="group" aria-label="Window controls">
      {mirrored
        ? ((controlStyle === "macos" || controlStyle === "macos9platinum") ? [closeButton, minimizeButton, maximizeButton] : [closeButton, maximizeButton, minimizeButton])
        : [minimizeButton, maximizeButton, closeButton]}
    </div>
  );
}

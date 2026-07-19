
export function WindowTitlebar({ title, onClose, closeLabel = "Close" }) {
  return (
    <header className="mister-dialog-titlebar">
      <span className="mister-dialog-title">{title}</span>
      {onClose ? (
        <button type="button" className="mister-dialog-close" aria-label={closeLabel} title={closeLabel} onClick={onClose}>
          <span aria-hidden="true" />
        </button>
      ) : null}
    </header>
  );
}

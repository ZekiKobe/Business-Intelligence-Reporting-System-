import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

/** A consistent accessible dialog shell for dashboard forms and confirmations. */
const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeDisabled = false,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !closeDisabled) onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose, closeDisabled]);

  if (!isOpen) return null;

  return (
    <div className="ui-modal-backdrop" role="presentation" onMouseDown={() => !closeDisabled && onClose?.()}>
      <section
        ref={dialogRef}
        className={`ui-modal ui-modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ui-modal__header">
          <div className="min-w-0">
            {title && <h2 id={titleId} className="ui-modal__title">{title}</h2>}
            {description && <p id={descriptionId} className="ui-modal__description">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            className="ui-modal__close"
            aria-label="Close dialog"
          >
            <X size={19} />
          </button>
        </header>
        <div className="ui-modal__body">{children}</div>
        {footer && <footer className="ui-modal__footer">{footer}</footer>}
      </section>
    </div>
  );
};

export default Modal;

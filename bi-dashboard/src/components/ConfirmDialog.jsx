import { AlertTriangle, Trash2 } from "lucide-react";
import Modal from "./Modal";

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm action",
  description,
  confirmLabel = "Confirm",
  loading = false,
  tone = "danger",
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    description={description}
    closeDisabled={loading}
    footer={
      <>
        <button type="button" className="ui-btn-secondary" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button type="button" className={`ui-btn ui-btn--${tone}`} onClick={onConfirm} disabled={loading}>
          {tone === "danger" && <Trash2 size={16} />}
          {loading ? "Removing…" : confirmLabel}
        </button>
      </>
    }
  >
    <div className={`ui-confirm-icon ui-confirm-icon--${tone}`} aria-hidden>
      <AlertTriangle size={22} />
    </div>
    <p className="text-sm leading-6" style={{ color: "var(--surface-muted)" }}>
      This action cannot be undone for this workspace.
    </p>
  </Modal>
);

export default ConfirmDialog;

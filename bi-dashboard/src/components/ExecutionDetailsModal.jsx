import Modal from "./Modal";

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");

/** Shared execution-details presentation for report run surfaces. */
export default function ExecutionDetailsModal({ run, onClose }) {
  if (!run) return null;
  const status = String(run.status || "unknown");
  return (
    <Modal isOpen={Boolean(run)} onClose={onClose} title="Execution details" description={`Execution #${run.id}`} size="md">
      <div className="space-y-4 text-sm" style={{ color: "var(--surface-text)" }}>
        <div className="grid grid-cols-2 gap-3">
          <Detail label="Status" value={status} />
          <Detail label="Rows returned" value={run.row_count ?? "—"} />
          <Detail label="Started" value={formatDate(run.started_at)} />
          <Detail label="Finished" value={formatDate(run.finished_at)} />
          <Detail label="Duration" value={run.duration_ms == null ? "—" : `${run.duration_ms} ms`} />
          <Detail label="Execution ID" value={run.id} />
        </div>
        {run.parameters && Object.keys(run.parameters).length ? <div><p className="ui-label">Bound parameters</p><dl className="rounded-lg border p-3 space-y-1" style={{ borderColor: "var(--stroke)" }}>{Object.entries(run.parameters).map(([key, value]) => <div key={key} className="flex justify-between gap-4"><dt className="font-medium">{key}</dt><dd className="break-all text-right">{String(value)}</dd></div>)}</dl></div> : null}
        {status === "failed" && run.error ? <div className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--stroke)", background: "var(--danger-soft)", color: "#991b1b" }}>{run.error}</div> : null}
      </div>
    </Modal>
  );
}

function Detail({ label, value }) {
  return <div><p className="text-xs opacity-65">{label}</p><p className="font-medium break-words">{String(value)}</p></div>;
}

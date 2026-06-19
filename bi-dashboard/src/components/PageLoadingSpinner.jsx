import { useTrackPageLoading } from "../context/LoadingBarContext";

/** Page-level loading: drives the global top progress bar plus an accessible status line (no logo spinner). */
const PageLoadingSpinner = ({ minHeight = "min-h-[50vh]", label = "Loading…" }) => {
  useTrackPageLoading(true);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 ${minHeight} ui-shell`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      <p className="text-sm font-medium" style={{ color: "var(--surface-muted)" }}>
        {label}
      </p>
    </div>
  );
};

export default PageLoadingSpinner;

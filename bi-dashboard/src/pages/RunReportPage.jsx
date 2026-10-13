import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchReportGroups, getReportById } from "../controllers/reportController";
import ReportExecutionView from "../components/ReportExecutionView";
import PageLoadingSpinner from "../components/PageLoadingSpinner";
import BiPageHeader from "../components/BiPageHeader";

export default function RunReportPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [groupMap, setGroupMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [groups, r] = await Promise.all([fetchReportGroups(), getReportById(reportId)]);
        if (cancelled) return;
        const nextGroupMap = {};
        (groups || []).forEach((g) => {
          nextGroupMap[g.code] = g.group_name || g.name;
        });
        setGroupMap(nextGroupMap);
        setReport(r);
      } catch (e) {
        if (!cancelled) setError("Failed to load report.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  if (loading) {
    return (
      <div className="w-full" style={{ background: "var(--app-bg)" }}>
        <div className="ui-shell-page pb-10">
          <PageLoadingSpinner minHeight="min-h-[40vh]" label="Loading report…" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="w-full" style={{ background: "var(--app-bg)" }}>
        <div className="ui-shell-page pb-10 max-w-2xl">
          <div
            className="rounded-xl border px-4 py-6 text-center"
            style={{ borderColor: "var(--stroke)", background: "var(--surface-bg)" }}
          >
            <p className="font-display font-semibold" style={{ color: "var(--surface-text)" }}>
              {error || "Report not found."}
            </p>
            <button type="button" onClick={() => navigate("/reports")} className="ui-btn-primary text-sm mt-4 !py-2 !px-4">
              Back to reports
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ background: "var(--app-bg)" }}>
      <div className="ui-shell-page pb-10">
        <div className="mb-6">
          <BiPageHeader
            variant="slim"
            eyebrow="Run report"
            title={report.name}
            description="Results open on this page so the library stays focused on discovery. Use Run again after changing the row cap or edit the definition from here."
            badges={[{ label: report.report_id }, { label: groupMap[report.group] || report.group }]}
            accent="sky"
          />
        </div>
        <ReportExecutionView report={report} groupMap={groupMap} onBack={() => navigate("/reports")} />
      </div>
    </div>
  );
}

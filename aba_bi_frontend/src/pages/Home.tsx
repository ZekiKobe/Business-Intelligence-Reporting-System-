import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PortalLayout from "../layouts/PortalLayout";
import { useBranding } from "../context/BrandingContext";
import { getReportGroups } from "../services/api";
import { chartTypeLabel } from "../utils/reportChartData";

interface ReportItem {
  id: number | string;
  name: string;
  spec?: {
    chart_type?: string;
    chart_category_key?: string;
    chart_value_key?: string;
  };
}

interface ReportGroup {
  code: string;
  group_name: string;
  reports: ReportItem[];
}

const Home: React.FC = () => {
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { branding } = useBranding();
  const navigate = useNavigate();

  useEffect(() => {
    const loadGroups = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getReportGroups();
        setGroups((data || []) as ReportGroup[]);
      } catch (e: any) {
        setError(e?.detail || e?.message || "Failed to load reports.");
        setGroups([]);
      } finally {
        setLoading(false);
      }
    };
    loadGroups();
  }, []);

  return (
    <PortalLayout contentMax="max-w-6xl">
          <div className="mb-6 md:mb-10">
            <p className="portal-hero-eyebrow mb-2">{branding.companyName}</p>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-portal-text tracking-tight leading-tight">
              {branding.productName}
            </h1>
            <p className="text-portal-muted text-sm md:text-base mt-3 max-w-2xl leading-relaxed">
              {branding.tagline}
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="portal-badge">
                {groups.reduce((acc, g) => acc + (g.reports?.length || 0), 0)} reports
              </span>
              <span
                className="portal-badge"
                style={{
                  background: "color-mix(in srgb, var(--portal-accent-soft) 65%, transparent)",
                  color: "var(--portal-accent)",
                  borderColor: "color-mix(in srgb, var(--portal-accent) 25%, transparent)",
                }}
              >
                Viewer portal
              </span>
            </div>
          </div>
          <div className="portal-surface-card p-5 md:p-8 border-portal-stroke">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5 md:mb-7 pb-5 border-b border-portal-stroke">
              <div>
                <h2 className="font-display text-xl md:text-2xl font-semibold text-portal-text tracking-tight">
                  Available reports
                </h2>
                <p className="text-sm text-portal-muted mt-1 max-w-lg">
                  Run saved definitions against your data connection, then export from the execution screen.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3 animate-pulse" aria-busy="true" aria-label="Loading reports">
                <div className="h-4 bg-portal-stroke/50 rounded-lg w-1/3 max-w-xs" />
                <div className="h-24 bg-portal-stroke/40 rounded-xl" />
                <div className="h-24 bg-portal-stroke/40 rounded-xl w-5/6" />
              </div>
            ) : error ? (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : groups.length === 0 ? (
              <p className="text-sm text-portal-muted max-w-lg leading-relaxed">
                No reports found. Create and design reports in BI Dashboard first.
              </p>
            ) : (
              <div className="space-y-5">
                {groups.map((group) => (
                  <div
                    key={group.code}
                    className="rounded-2xl overflow-hidden border border-portal-stroke bg-portal-surface shadow-md hover:shadow-lg transition-shadow duration-200"
                  >
                    <div
                      className="px-4 py-3.5 md:px-5 border-b border-portal-stroke"
                      style={{
                        background:
                          "linear-gradient(105deg, color-mix(in srgb, var(--portal-primary-soft) 85%, transparent) 0%, color-mix(in srgb, var(--portal-accent-soft) 35%, var(--portal-surface)) 100%)",
                      }}
                    >
                      <h3 className="text-sm md:text-base font-semibold text-portal-text tracking-tight">
                        {group.group_name}
                      </h3>
                    </div>
                    <div className="p-3 md:p-4 space-y-2">
                      {(group.reports || []).length === 0 ? (
                        <p className="text-xs text-portal-muted">No reports in this group.</p>
                      ) : (
                        group.reports.map((report) => {
                          const viz = report.spec?.chart_type && report.spec.chart_type !== "table"
                            ? report.spec.chart_type
                            : "table";
                          return (
                          <div
                            key={report.id}
                            className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-portal-stroke/70 hover:border-primary-500/35 hover:bg-[var(--portal-primary-soft)] transition-all duration-150"
                            style={{
                              background: "color-mix(in srgb, var(--portal-bg) 38%, var(--portal-surface))",
                            }}
                          >
                            <div className="min-w-0 flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-portal-text font-medium">{report.name}</span>
                              <span
                                className={
                                  viz === "table"
                                    ? "text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-100/90 px-2 py-0.5 rounded-md"
                                    : "text-[10px] font-semibold uppercase tracking-wide text-indigo-800 bg-indigo-100/90 px-2 py-0.5 rounded-md"
                                }
                              >
                                {viz === "table" ? "Table" : chartTypeLabel(viz)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => navigate(`/report/${report.id}`, { state: { name: report.name } })}
                              className="shrink-0 px-4 py-2.5 text-xs font-semibold rounded-xl portal-btn-primary shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
                            >
                              Run report
                            </button>
                          </div>
                        );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
    </PortalLayout>
  );
};

export default Home;
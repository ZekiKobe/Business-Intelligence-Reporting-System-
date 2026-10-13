import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileBarChart } from "lucide-react";
import PortalLayout from "../layouts/PortalLayout";
import { getReportGroups } from "../services/api";
import { chartTypeLabel } from "../utils/reportChartData";
import { useCurrentUser } from "../context/CurrentUserContext";

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
  const [query, setQuery] = useState("");
  const { user } = useCurrentUser();
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

  const visibleGroups = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return groups;
    return groups
      .map((group) => {
        const groupMatches = group.group_name.toLowerCase().includes(term);
        return {
          ...group,
          reports: groupMatches
            ? group.reports || []
            : (group.reports || []).filter((report) => report.name.toLowerCase().includes(term)),
        };
      })
      .filter((group) => group.reports.length > 0);
  }, [groups, query]);

  const visibleReportCount = visibleGroups.reduce((total, group) => total + (group.reports?.length || 0), 0);

  return (
    <PortalLayout contentMax="max-w-6xl">
          <section className="rounded-2xl border border-portal-stroke bg-portal-surface shadow-[0_10px_32px_-24px_rgba(15,23,42,0.45)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4 md:px-6 border-b border-portal-stroke">
              <div>
                <div className="flex flex-wrap items-center gap-2"><h1 className="font-display text-xl font-bold text-portal-text tracking-tight">Reports</h1><span className="portal-badge">{groups.reduce((acc, group) => acc + (group.reports?.length || 0), 0)} available</span></div>
                <p className="mt-1 text-sm text-portal-muted">{user?.fullName || user?.username ? `Welcome back, ${user.fullName || user.username}. Choose a report to run.` : "Choose a report to run or export."}</p>
              </div>
              <div className="relative w-full sm:w-72 shrink-0">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-portal-muted" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search reports"
                  className="portal-input pl-10 py-2.5"
                  aria-label="Search reports"
                />
              </div>
            </div>

            <div className="p-3 md:p-4">
            {loading ? (
              <div className="space-y-3 animate-pulse p-2" aria-busy="true" aria-label="Loading reports">
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
            ) : visibleGroups.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--portal-primary-soft)] text-primary-700">
                  <Search size={20} />
                </div>
                <p className="font-semibold text-portal-text">No matching reports</p>
                <p className="mt-1 text-sm text-portal-muted">Try a different report or group name.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {query && <p className="px-1 text-xs font-semibold uppercase tracking-wider text-portal-muted">{visibleReportCount} matching report{visibleReportCount === 1 ? "" : "s"}</p>}
                {visibleGroups.map((group) => (
                  <div
                    key={group.code}
                    className="overflow-hidden rounded-xl border border-portal-stroke bg-portal-surface"
                  >
                    <div
                      className="flex items-center justify-between px-4 py-2.5 border-b border-portal-stroke"
                      style={{ background: "color-mix(in srgb, var(--portal-bg) 58%, var(--portal-surface))" }}
                    >
                      <h3 className="text-sm font-semibold text-portal-text tracking-tight">
                        {group.group_name}
                      </h3>
                    </div>
                    <div className="p-2 space-y-1.5">
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
                            className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-transparent hover:border-portal-stroke hover:bg-[var(--portal-primary-soft)] transition-all duration-150"
                            style={{
                              background: "color-mix(in srgb, var(--portal-bg) 35%, var(--portal-surface))",
                            }}
                          >
                            <div className="min-w-0 flex items-center gap-2 flex-wrap">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--portal-primary-soft)] text-primary-700">
                                <FileBarChart size={15} />
                              </span>
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
                            className="shrink-0 px-3 py-2 text-xs font-semibold rounded-lg portal-btn-primary shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
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
          </section>
    </PortalLayout>
  );
};

export default Home;

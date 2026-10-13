import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  PlayIcon,
  PencilSquareIcon,
  PlusIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { fetchReportGroups, getAllReports } from "../controllers/reportController";
import { chartTypeLabel } from "../utils/reportChartData";
import PageLoadingSpinner from "../components/PageLoadingSpinner";
import BiPageHeader from "../components/BiPageHeader";

const ViewReportPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [reports, setReports] = useState([]);
  const [groupMap, setGroupMap] = useState({});
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("search") || "");
  const [filterGroup, setFilterGroup] = useState("All");
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setPageLoading(true);
      setError("");
      try {
        const [groups, reportsRes] = await Promise.all([fetchReportGroups(), getAllReports()]);
        const nextGroupMap = {};
        (groups || []).forEach((g) => {
          nextGroupMap[g.code] = g.group_name || g.name;
        });
        setGroupMap(nextGroupMap);
        setReports(reportsRes || []);
      } catch (e) {
        setError("Failed to load reports.");
      } finally {
        setPageLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    setSearchTerm(searchParams.get("search") || "");
  }, [searchParams]);

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.criteria || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(report.report_id || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup =
      filterGroup === "All" || (groupMap[report.group] || report.group) === filterGroup;
    return matchesSearch && matchesGroup;
  });

  const reportGroups = ["All", ...new Set(reports.map((report) => groupMap[report.group] || report.group))];

  return (
    <div className="w-full" style={{ background: "var(--app-bg)" }}>
      <div className="ui-shell-page pb-10">
        <div className="mb-6">
          <BiPageHeader
            variant="slim"
            eyebrow="Analytics"
            title="Reports"
            description="Search the catalog and open the run workspace when you need tables, charts, and filters—without crowding this library view."
            badges={[
              { label: `${reports.length} saved` },
              ...(!pageLoading && filteredReports.length !== reports.length
                ? [{ label: `${filteredReports.length} matched` }]
                : []),
            ]}
            accent="sky"
            actions={
              <button type="button" onClick={() => navigate("/reports/design")} className="ui-btn-primary text-sm !py-2 !px-3.5 gap-1.5 shadow-lg">
                <PlusIcon className="h-4 w-4 shrink-0" />
                New report
              </button>
            }
          />
        </div>

        <div className="flex flex-col gap-6">
          <aside className="w-full space-y-3">
            <div
              className="rounded-xl border p-3 sm:p-4 shadow-sm"
              style={{
                borderColor: "var(--stroke)",
                background: "var(--surface-bg)",
              }}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider opacity-55 mb-3 font-display" style={{ color: "var(--surface-muted)" }}>
                Library
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 min-w-0">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-45" style={{ color: "var(--surface-muted)" }} />
                  <input
                    type="text"
                    className="ui-input w-full py-2 pl-9 text-sm"
                    placeholder="Search…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  value={filterGroup}
                  onChange={(e) => setFilterGroup(e.target.value)}
                  className="ui-select w-full sm:w-44 shrink-0 text-sm py-2"
                >
                  {reportGroups.map((group) => (
                    <option key={group} value={group}>
                      {group === "All" ? "All groups" : group}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              className="max-h-[min(65vh,48rem)] overflow-y-auto overflow-x-hidden rounded-xl border p-2 sm:p-3 shadow-sm"
              style={{
                borderColor: "var(--stroke)",
                background: "var(--surface-bg)",
              }}
            >
              {pageLoading ? (
                <PageLoadingSpinner minHeight="min-h-[14rem]" label="Loading reports…" />
              ) : null}
              {error ? (
                <div className="mb-3 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--stroke)", background: "var(--danger-soft)", color: "#991b1b" }}>
                  {error}
                </div>
              ) : null}
              {!pageLoading && filteredReports.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 px-4 text-center"
                  style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, var(--app-bg) 70%, transparent)" }}
                >
                  <DocumentTextIcon className="h-10 w-10 mb-3 opacity-40" style={{ color: "var(--surface-muted)" }} />
                  <p className="font-display text-sm font-semibold" style={{ color: "var(--surface-text)" }}>
                    No reports match your filters
                  </p>
                  <p className="mt-1 text-xs max-w-xs" style={{ color: "var(--surface-muted)" }}>
                    Try another search term or group, or design a new report.
                  </p>
                </div>
              ) : null}
              <ul className="space-y-1.5">
                {filteredReports.map((report) => {
                  const isSel = selectedReport?.id === report.id;
                  const hasChart = report.spec?.chart_type && report.spec.chart_type !== "table";
                  return (
                    <li key={report.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedReport(report)}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            setSelectedReport(report);
                          }
                        }}
                        className={`group relative min-w-0 cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 ${
                          isSel ? "shadow-md" : "hover:shadow-sm"
                        }`}
                        style={
                          isSel
                            ? {
                                borderColor: "color-mix(in srgb, var(--brand-primary) 45%, var(--stroke))",
                                background: "color-mix(in srgb, var(--brand-primary-soft) 35%, var(--surface-bg))",
                                boxShadow: "0 0 0 1px color-mix(in srgb, var(--brand-primary) 25%, transparent)",
                              }
                            : {
                                borderColor: "var(--stroke)",
                                background: "var(--surface-bg)",
                              }
                        }
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-sm leading-snug" style={{ color: "var(--surface-text)" }}>
                                {report.name}
                              </span>
                              <span
                                className="rounded px-1.5 py-0 text-[10px] font-bold uppercase tracking-wide"
                                style={
                                  hasChart
                                    ? { background: "color-mix(in srgb, #7c3aed 15%, transparent)", color: "#6d28d9" }
                                    : { background: "var(--surface-hover)", color: "var(--surface-muted)" }
                                }
                              >
                                {hasChart ? chartTypeLabel(report.spec.chart_type) : "Table"}
                              </span>
                            </div>
                            <p className="mt-0.5 line-clamp-1 text-[11px] opacity-65" style={{ color: "var(--surface-text)" }}>
                              {report.criteria || "—"}
                            </p>
                            <p className="mt-1 text-[10px] opacity-55 font-mono tabular-nums" style={{ color: "var(--surface-muted)" }}>
                              {report.report_id} · {groupMap[report.group] || report.group}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/reports/run/${report.id}`);
                              }}
                              className="ui-btn-primary !py-1.5 !px-2.5 text-xs gap-1 rounded-lg"
                              title="Run report"
                            >
                              <PlayIcon className="h-3.5 w-3.5" />
                              <span>Run</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/reports/design/${report.id}`);
                              }}
                              className="ui-btn-secondary !py-1.5 !px-2 rounded-lg"
                              title="Edit in designer"
                            >
                              <PencilSquareIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          <section className="w-full min-w-0 max-w-none">
            {!selectedReport ? (
              <div
                className="flex min-h-[260px] w-full flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center"
                style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, var(--app-bg) 65%, var(--surface-bg))" }}
              >
                <DocumentTextIcon className="h-10 w-10 mb-3 opacity-35" style={{ color: "var(--surface-muted)" }} />
                <h2 className="font-display text-lg font-semibold" style={{ color: "var(--surface-text)" }}>
                  Select a report
                </h2>
                <p className="mt-2 max-w-md text-sm opacity-75" style={{ color: "var(--surface-muted)" }}>
                  Pick one from the library for a quick summary, or use <strong style={{ color: "var(--surface-text)" }}>Run</strong> to open the full execution page with data and charts.
                </p>
                <button type="button" onClick={() => navigate("/reports/design")} className="ui-btn-primary text-sm mt-6 !py-2 !px-4 gap-1.5">
                  <PlusIcon className="h-4 w-4" /> New report
                </button>
              </div>
            ) : null}

            {selectedReport ? (
              <div
                className="surface-card overflow-hidden rounded-xl border shadow-sm"
                style={{ borderColor: "var(--stroke)" }}
              >
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight" style={{ color: "var(--surface-text)" }}>
                        {selectedReport.name}
                      </h2>
                      <p className="text-sm mt-1 opacity-80 line-clamp-3" style={{ color: "var(--surface-muted)" }}>
                        {selectedReport.criteria || "No criteria"}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[11px] sm:text-xs opacity-75" style={{ color: "var(--surface-muted)" }}>
                        <span className="font-mono tabular-nums">{selectedReport.report_id}</span>
                        <span>· {selectedReport.dataset}</span>
                        <span>· {groupMap[selectedReport.group] || selectedReport.group}</span>
                        {selectedReport.spec?.chart_type && selectedReport.spec.chart_type !== "table" ? (
                          <span>· {chartTypeLabel(selectedReport.spec.chart_type)}</span>
                        ) : (
                          <span>· Table</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/reports/run/${selectedReport.id}`)}
                        className="ui-btn-primary text-sm !py-2 !px-4 gap-1.5"
                      >
                        <PlayIcon className="h-4 w-4" />
                        Run report
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/reports/design/${selectedReport.id}`)}
                        className="ui-btn-secondary text-sm !py-2 !px-4 gap-1.5"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                        Edit
                      </button>
                    </div>
                  </div>
                  <p className="mt-5 text-xs leading-relaxed opacity-75 border-t pt-4" style={{ borderColor: "var(--stroke)", color: "var(--surface-muted)" }}>
                    The execution page loads your query, applies browser filters, and renders charts—keeping this catalog view lightweight.
                  </p>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
};

export default ViewReportPage;

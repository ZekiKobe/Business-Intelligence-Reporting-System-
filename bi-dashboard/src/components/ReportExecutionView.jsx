import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PencilSquareIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronDoubleLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleRightIcon,
  ArrowLeftIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { executeReportSql } from "../controllers/reportController";
import { distinctValues, inferFilterKind } from "../utils/reportFilters";
import {
  chartTypeLabel,
  normalizeChartViz,
  computeScalarMetric,
  formatMetricValue,
  metricOperationLabel,
} from "../utils/reportChartData";
import ReportChartPanel from "./ReportChartPanel";
import ExecutionDetailsModal from "./ExecutionDetailsModal";

const normalizeIdentifier = (value) =>
  String(value || "")
    .replace(/["`]/g, "")
    .trim()
    .toLowerCase();

export const getRowValue = (row, colName) => {
  if (!row) return undefined;
  if (Object.prototype.hasOwnProperty.call(row, colName)) return row[colName];
  const target = normalizeIdentifier(colName);
  if (!target) return undefined;
  const matchedKey = Object.keys(row).find((k) => normalizeIdentifier(k) === target);
  return matchedKey ? row[matchedKey] : undefined;
};

/**
 * Full-width report execution (table, chart, filters, pagination).
 * @param {{ report: object, groupMap?: Record<string,string>, autoRun?: boolean, onBack?: () => void }} props
 */
export default function ReportExecutionView({ report, groupMap = {}, autoRun = false, onBack }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "ascending" });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [fetchedRows, setFetchedRows] = useState([]);
  const [filterValues, setFilterValues] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [execRowLimit, setExecRowLimit] = useState(10_000);
  const [lastRowCount, setLastRowCount] = useState(null);
  const [lastRunAt, setLastRunAt] = useState(null);
  const [lastDurationMs, setLastDurationMs] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [executionDetails, setExecutionDetails] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const autoRunStartedRef = useRef(false);

  const spec = report?.spec || {};
  const headerColumns = (spec?.header_columns || []).filter(Boolean);
  const mainColumns = (spec?.main_columns || []).filter(Boolean);
  const aggregateColumns = (spec?.aggregate_columns || []).filter(Boolean);
  const filterColumns = (spec?.filter_columns || []).filter(Boolean);
  const filterConfigs = useMemo(() => Array.isArray(spec?.filter_configs) ? spec.filter_configs.filter((config) => config && filterColumns.includes(config.key)) : [], [spec?.filter_configs, filterColumns]);
  const filterTypesFromSpec = spec?.filter_column_types || {};
  const chartTypeViz = spec?.chart_type && spec.chart_type !== "" ? spec.chart_type : "table";
  const chartValueAggregate = spec?.chart_value_aggregate || "sum";
  const chartVizResolved = useMemo(() => normalizeChartViz(spec?.chart_viz), [spec?.chart_viz]);

  /** Axis picks for this run (defaults from report design; overridable via dropdowns). */
  const [chartCategoryLocal, setChartCategoryLocal] = useState("");
  const [chartValueLocal, setChartValueLocal] = useState("");

  useEffect(() => {
    setChartCategoryLocal(spec?.chart_category_key || "");
    setChartValueLocal(spec?.chart_value_key || "");
  }, [report?.id, spec?.chart_category_key, spec?.chart_value_key]);

  const aggregateMetricsSpec = useMemo(() => {
    const m = spec?.aggregate_metrics;
    if (Array.isArray(m) && m.length) return m.filter((x) => x && (x.column || x.op === "count"));
    return (aggregateColumns || []).map((c) => ({ column: c, op: "sum" }));
  }, [spec?.aggregate_metrics, aggregateColumns]);

  const filterTypes = useMemo(() => {
    const out = {};
    filterColumns.forEach((col) => {
      const t = filterTypesFromSpec[col];
      out[col] = t === "date" || t === "select" || t === "text" ? t : inferFilterKind(undefined, col);
    });
    return out;
  }, [filterColumns, filterTypesFromSpec]);

  const filteredRows = useMemo(() => {
    return fetchedRows;
  }, [fetchedRows]);

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return filteredRows;
    const key = sortConfig.key;
    const direction = sortConfig.direction;
    return [...filteredRows].sort((a, b) => {
      const av = getRowValue(a, key);
      const bv = getRowValue(b, key);
      if (av < bv) return direction === "ascending" ? -1 : 1;
      if (av > bv) return direction === "ascending" ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortConfig]);

  useEffect(() => {
    setFetchedRows([]);
    setFilterValues(Object.fromEntries(filterConfigs.filter((config) => config.default !== null && config.default !== undefined && config.default !== "").map((config) => [config.key, config.default])));
    setLastRowCount(null);
    setLastRunAt(null);
    setLastDurationMs(null);
    setSortConfig({ key: null, direction: "ascending" });
    setCurrentPage(1);
    setError("");
    setFieldErrors({});
    setExecutionDetails(null);
    setDetailsOpen(false);
    autoRunStartedRef.current = false;
  }, [report?.id]);

  const executeReport = useCallback(async () => {
    if (!report) return;
    const nextErrors = {};
    filterConfigs.forEach((config) => {
      const value = filterValues[config.key];
      if (config.required && (value === undefined || value === null || value === "")) nextErrors[config.key] = `${config.label || config.key} is required.`;
      if (value && config.type === "number" && Number.isNaN(Number(value))) nextErrors[config.key] = `${config.label || config.key} must be a number.`;
    });
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setError("Complete the required filters before running this report.");
      return;
    }
    setIsLoading(true);
    setCurrentPage(1);
    setError("");
    setFieldErrors({});
    try {
      const parameters = Object.fromEntries(Object.entries(filterValues).filter(([, value]) => value !== "" && value !== null && value !== undefined));
      const res = await executeReportSql(report.id, { limit: execRowLimit, parameters });
      setExecutionDetails(res);
      const loaded = res?.preview?.rows || [];
      setFetchedRows(loaded);
      setCurrentPage(1);
      setLastRowCount(typeof res?.row_count === "number" ? res.row_count : loaded.length);
      setLastRunAt(new Date().toLocaleString());
      setLastDurationMs(typeof res?.duration_ms === "number" ? res.duration_ms : null);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to execute report.");
    } finally {
      setIsLoading(false);
    }
  }, [report, execRowLimit, filterConfigs, filterValues]);

  useEffect(() => {
    if (!autoRun || !report?.id || autoRunStartedRef.current) return;
    autoRunStartedRef.current = true;
    void executeReport();
  }, [autoRun, report?.id, executeReport]);

  const tableColumns = useMemo(() => {
    if (mainColumns?.length) return mainColumns;
    if (sortedRows.length) return Object.keys(sortedRows[0] || {});
    const specCols = [...headerColumns, ...aggregateColumns, ...filterColumns].filter(Boolean);
    return Array.from(new Set(specCols));
  }, [aggregateColumns, filterColumns, headerColumns, mainColumns, sortedRows]);

  const chartColumnOptions = useMemo(() => {
    const fromSpec = [...headerColumns, ...mainColumns, ...aggregateColumns, ...filterColumns].filter(Boolean);
    const uniq = Array.from(new Set(fromSpec));
    if (uniq.length) return uniq;
    if (sortedRows.length) return Object.keys(sortedRows[0] || {});
    return [];
  }, [aggregateColumns, filterColumns, headerColumns, mainColumns, sortedRows]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedRows.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / itemsPerPage));

  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const toggleRowExpansion = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const goToPage = (pageNumber) => setCurrentPage(pageNumber);
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      pageNumbers.push(1);
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      if (currentPage <= 3) endPage = 4;
      if (currentPage >= totalPages - 2) startPage = totalPages - 3;
      if (startPage > 2) pageNumbers.push("...");
      for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
      if (endPage < totalPages - 1) pageNumbers.push("...");
      pageNumbers.push(totalPages);
    }
    return pageNumbers;
  };

  return (
    <div className="surface-card overflow-hidden rounded-xl border shadow-sm" style={{ borderColor: "var(--stroke)" }}>
      {onBack ? (
        <div
          className="flex items-center gap-2 px-4 py-2.5 border-b"
          style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, var(--app-bg) 80%, var(--surface-bg))" }}
        >
          <button
            type="button"
            onClick={onBack}
            className="ui-btn-secondary text-xs sm:text-sm !py-1.5 !px-2.5 gap-1"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to library
          </button>
        </div>
      ) : null}

      <div className="p-4 sm:p-5 border-b" style={{ borderColor: "var(--stroke)" }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight" style={{ color: "var(--surface-text)" }}>
              {report.name}
            </h2>
            <p className="text-sm mt-1 opacity-80 line-clamp-2" style={{ color: "var(--surface-muted)" }}>
              {report.criteria || "No criteria"}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] sm:text-xs opacity-75" style={{ color: "var(--surface-muted)" }}>
              <span className="font-mono tabular-nums">{report.report_id}</span>
              <span>· {report.dataset}</span>
              <span>· {groupMap[report.group] || report.group}</span>
              {lastRunAt ? <span>· Last run {lastRunAt}</span> : null}
              {lastDurationMs != null ? <span>· Completed in {(lastDurationMs / 1000).toFixed(2)}s</span> : null}
              {lastRowCount != null ? (
                <span>
                  · {lastRowCount.toLocaleString()} loaded
                  {lastRowCount >= execRowLimit ? " (cap)" : ""}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 lg:shrink-0">
            <label className="flex items-center gap-2 text-xs whitespace-nowrap">
              <span className="opacity-70" style={{ color: "var(--surface-muted)" }}>
                Rows
              </span>
              <select
                value={execRowLimit}
                onChange={(e) => setExecRowLimit(Number(e.target.value))}
                className="ui-select w-auto py-1.5 text-xs min-w-[5.5rem]"
              >
                {[1000, 5000, 10000, 25000, 50000, 100000, 200000].map((n) => (
                  <option key={n} value={n}>
                    {n >= 1000 ? `${n / 1000}k` : n}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/reports/design/${report.id}`)}
                className="ui-btn-secondary text-sm !py-2 !px-3 gap-1.5"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => void executeReport()}
                disabled={isLoading}
                className="ui-btn-primary text-sm !py-2 !px-3 gap-1.5"
              >
                <ArrowPathIcon className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                {isLoading ? "Run…" : "Run"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mx-4 my-3 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--stroke)", background: "var(--danger-soft)", color: "#991b1b" }}>
          {error}
        </div>
      ) : null}

      {filterConfigs.length > 0 ? (
        <div className="p-4 sm:p-5 border-b" style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, var(--app-bg) 75%, var(--surface-bg))" }}>
          <div className="flex items-center gap-2 mb-3">
            <AdjustmentsHorizontalIcon className="h-4 w-4 opacity-55" style={{ color: "var(--surface-muted)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--surface-text)" }}>Report filters</span>
            <button type="button" onClick={() => { setFilterValues({}); setFieldErrors({}); }} className="ui-btn-ghost text-xs ml-auto !py-1 !px-2" style={{ color: "var(--brand-primary)" }}>Reset</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filterConfigs.map((config) => {
              const value = filterValues[config.key] ?? "";
              const invalid = fieldErrors[config.key];
              const update = (next) => { setFilterValues((previous) => ({ ...previous, [config.key]: next })); setFieldErrors((previous) => ({ ...previous, [config.key]: undefined })); };
              const label = <span className="ui-label !mb-0">{config.label || config.key}{config.required ? <><span className="text-red-600"> *</span><span className="sr-only"> required</span></> : <span className="opacity-55"> (optional)</span>}</span>;
              return <label key={config.key} className="flex flex-col gap-1">{label}
                {config.type === "select" ? <select required={Boolean(config.required)} aria-invalid={Boolean(invalid)} value={value} onChange={(e) => update(e.target.value)} className="ui-select text-sm py-2"><option value="">{config.required ? "Select…" : "All"}</option>{(config.options || []).map((option) => <option key={String(option)} value={option}>{String(option)}</option>)}</select> : <input required={Boolean(config.required)} aria-invalid={Boolean(invalid)} type={config.type === "date" ? "date" : config.type === "number" ? "number" : "text"} value={value} onChange={(e) => update(e.target.value)} className="ui-input text-sm py-2" placeholder={config.type === "text" ? "Enter value…" : ""} />}
                {invalid ? <span className="text-xs text-red-700" role="alert">{invalid}</span> : null}
              </label>;
            })}
          </div>
        </div>
      ) : null}

      {filterColumns.length > 0 && filterConfigs.length === 0 && !!fetchedRows.length && (
        <div className="p-3 sm:p-4 border-b" style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, var(--app-bg) 75%, var(--surface-bg))" }}>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <AdjustmentsHorizontalIcon className="h-4 w-4 shrink-0 opacity-55" style={{ color: "var(--surface-muted)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--surface-text)" }}>
              Filters
            </span>
            <button type="button" onClick={() => setFilterValues({})} className="ui-btn-ghost text-xs ml-auto !py-1 !px-2" style={{ color: "var(--brand-primary)" }}>
              Clear
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filterColumns.map((col) => {
              const kind = filterTypes[col] || "select";
              const v = filterValues[col] ?? "";
              if (kind === "date") {
                return (
                  <label key={col} className="flex flex-col gap-1">
                    <span className="ui-label !mb-0">{col}</span>
                    <input
                      type="date"
                      value={v}
                      onChange={(e) => {
                        const next = e.target.value;
                        setFilterValues((prev) => {
                          const n = { ...prev };
                          if (!next) delete n[col];
                          else n[col] = next;
                          return n;
                        });
                        setCurrentPage(1);
                      }}
                      className="ui-input text-sm py-1.5"
                    />
                  </label>
                );
              }
              if (kind === "text") {
                return (
                  <label key={col} className="flex flex-col gap-1">
                    <span className="ui-label !mb-0">{col}</span>
                    <input
                      type="text"
                      placeholder="Contains…"
                      value={v}
                      onChange={(e) => {
                        const next = e.target.value;
                        setFilterValues((prev) => {
                          const n = { ...prev };
                          if (!next) delete n[col];
                          else n[col] = next;
                          return n;
                        });
                        setCurrentPage(1);
                      }}
                      className="ui-input text-sm py-1.5"
                    />
                  </label>
                );
              }
              const opts = distinctValues(fetchedRows, col, getRowValue);
              return (
                <label key={col} className="flex flex-col gap-1">
                  <span className="ui-label !mb-0">{col}</span>
                  <select
                    value={v}
                    onChange={(e) => {
                      const next = e.target.value;
                      setFilterValues((prev) => {
                        const n = { ...prev };
                        if (!next) delete n[col];
                        else n[col] = next;
                        return n;
                      });
                      setCurrentPage(1);
                    }}
                    className="ui-select text-sm py-1.5"
                  >
                    <option value="">All</option>
                    {opts.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
          {fetchedRows.length !== sortedRows.length ? (
            <p className="mt-2 text-xs opacity-70" style={{ color: "var(--surface-muted)" }}>
              {sortedRows.length.toLocaleString()} of {fetchedRows.length.toLocaleString()} rows after filters.
            </p>
          ) : null}
        </div>
      )}

      {chartTypeViz !== "table" && (
        <div className="p-4 sm:p-5 border-b" style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, var(--app-bg) 45%, var(--surface-bg))" }}>
          <div className="mb-3">
            <p className="text-sm font-semibold" style={{ color: "var(--surface-text)" }}>
              Chart axes
            </p>
            <p className="text-xs mt-0.5 opacity-75" style={{ color: "var(--surface-muted)" }}>
              Pick columns for this chart. Saved report defaults are pre-filled; change them here for ad-hoc exploration.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <label className="flex flex-col gap-1">
              <span className="ui-label !mb-0">Category (dimension)</span>
              <select
                value={chartCategoryLocal}
                onChange={(e) => setChartCategoryLocal(e.target.value)}
                className="ui-select text-sm py-2"
              >
                <option value="">Select column…</option>
                {chartColumnOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            {chartValueAggregate === "count" ? (
              <div className="flex flex-col justify-end pb-1">
                <p className="text-xs opacity-75" style={{ color: "var(--surface-muted)" }}>
                  Metric uses <strong className="font-semibold">row count</strong> per category (no value column).
                </p>
              </div>
            ) : (
              <label className="flex flex-col gap-1">
                <span className="ui-label !mb-0">Value (metric)</span>
                <select
                  value={chartValueLocal}
                  onChange={(e) => setChartValueLocal(e.target.value)}
                  className="ui-select text-sm py-2"
                >
                  <option value="">Select column…</option>
                  {chartColumnOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <ReportChartPanel
            chartType={chartTypeViz}
            categoryKey={chartCategoryLocal}
            valueKey={chartValueLocal}
            rows={sortedRows}
            getRowValue={getRowValue}
            title={`${chartTypeLabel(chartTypeViz)} — ${report.name || "Report"}`}
            height={360}
            viz={chartVizResolved}
            valueAggregate={chartValueAggregate}
          />
        </div>
      )}

      {(headerColumns.length > 0 || aggregateMetricsSpec.length > 0) && !!fetchedRows.length && (
        <div className="p-3 sm:p-4 border-b" style={{ borderColor: "var(--stroke)", background: "var(--surface-bg)" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {headerColumns.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">Header</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-blue-900">
                  {headerColumns.map((col) => (
                    <div key={col} className="break-words">
                      <span className="font-medium">{col}:</span>{" "}
                      <span>{String(getRowValue(filteredRows[0], col) ?? "N/A")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aggregateMetricsSpec.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <h3 className="text-sm font-semibold text-amber-800 mb-2">Aggregate metrics</h3>
                <p className="text-xs text-amber-900/80 mb-2">
                  Rolled up over {filteredRows.length.toLocaleString()} row{filteredRows.length === 1 ? "" : "s"} (after filters).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-amber-900">
                  {aggregateMetricsSpec.map(({ column: col, op }, midx) => {
                    const raw = computeScalarMetric(filteredRows, col, op, getRowValue);
                    const label =
                      op === "count" && !col ? "Count rows" : `${metricOperationLabel(op)} (${col})`;
                    return (
                      <div key={`agg-${midx}-${col}-${op}`} className="break-words">
                        <span className="font-medium">{label}:</span>{" "}
                        <span className="tabular-nums">{formatMetricValue(raw)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className="p-3 sm:px-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
        style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, var(--app-bg) 70%, var(--surface-bg))" }}
      >
        <div className="flex items-center gap-2 text-sm">
          <span className="opacity-70" style={{ color: "var(--surface-muted)" }}>
            Page size
          </span>
          <select value={itemsPerPage} onChange={handleItemsPerPageChange} className="ui-select w-auto py-1 text-sm min-w-[4.5rem]">
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
        <p className="text-xs sm:text-sm tabular-nums opacity-80" style={{ color: "var(--surface-muted)" }}>
          {sortedRows.length ? indexOfFirstItem + 1 : 0}–{Math.min(indexOfLastItem, sortedRows.length)} of {sortedRows.length.toLocaleString()}
        </p>
      </div>
      {executionDetails ? <div className="px-4 py-3 border-b" style={{ borderColor: "var(--stroke)", background: "var(--surface-bg)" }}><button type="button" onClick={() => setDetailsOpen(true)} className="ui-btn-secondary text-sm !py-2 !px-3 gap-1.5"><InformationCircleIcon className="h-4 w-4" /> View execution details</button></div> : null}

      <div className="overflow-x-auto">
        <table className="ui-pro-table min-w-full">
          <thead>
            <tr>
              <th scope="col" className="w-10 !px-3">
                <span className="sr-only">Expand</span>
              </th>
              {tableColumns.map((column) => (
                <th key={column} scope="col" className="cursor-pointer select-none" onClick={() => handleSort(column)}>
                  <span className="inline-flex items-center gap-1">
                    {column}
                    {sortConfig.key === column ? (
                      sortConfig.direction === "ascending" ? (
                        <ChevronUpIcon className="h-3.5 w-3.5 opacity-70" />
                      ) : (
                        <ChevronDownIcon className="h-3.5 w-3.5 opacity-70" />
                      )
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentItems.map((row, rowIdx) => (
              <React.Fragment key={rowIdx}>
                <tr className="cursor-pointer" onClick={() => toggleRowExpansion(rowIdx)}>
                  <td className="whitespace-nowrap !px-3 w-10">
                    {expandedRows.has(rowIdx) ? (
                      <ChevronUpIcon className="h-4 w-4 opacity-50" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4 opacity-50" />
                    )}
                  </td>
                  {tableColumns.map((key) => (
                    <td key={key} className="whitespace-nowrap text-sm">
                      {String(getRowValue(row, key) ?? "")}
                    </td>
                  ))}
                </tr>
                {expandedRows.has(rowIdx) ? (
                  <tr style={{ background: "color-mix(in srgb, var(--brand-primary-soft) 40%, var(--surface-bg))" }}>
                    <td colSpan={tableColumns.length + 1} className="px-4 py-3 text-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(row).map(([key, value]) => (
                          <div key={key} className="break-words">
                            <span className="font-medium opacity-80 capitalize">{key}:</span> {String(value ?? "")}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="px-3 sm:px-4 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
        style={{ borderColor: "var(--stroke)", background: "var(--surface-bg)" }}
      >
        <p className="text-xs tabular-nums order-2 sm:order-1" style={{ color: "var(--surface-muted)" }}>
          {sortedRows.length.toLocaleString()} row{sortedRows.length === 1 ? "" : "s"} · Page {currentPage}/{totalPages}
        </p>
        <div className="flex items-center gap-1 order-1 sm:order-2">
          <button
            type="button"
            onClick={goToFirstPage}
            disabled={currentPage === 1}
            className="ui-btn-ghost !p-2 rounded-lg disabled:opacity-40"
            style={{ border: "1px solid var(--stroke)" }}
          >
            <ChevronDoubleLeftIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className="ui-btn-ghost !p-2 rounded-lg disabled:opacity-40"
            style={{ border: "1px solid var(--stroke)" }}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          {getPageNumbers().map((pageNumber, index) => (
            <button
              key={index}
              type="button"
              onClick={() => (typeof pageNumber === "number" ? goToPage(pageNumber) : null)}
              className={`min-w-[2rem] h-8 px-2 rounded-lg text-xs font-semibold ${
                currentPage === pageNumber ? "text-white" : "opacity-80 hover:opacity-100"
              } ${typeof pageNumber !== "number" ? "cursor-default opacity-50" : ""}`}
              style={
                currentPage === pageNumber
                  ? { background: "var(--brand-primary)" }
                  : { border: "1px solid var(--stroke)", background: "var(--surface-bg)", color: "var(--surface-text)" }
              }
              disabled={typeof pageNumber !== "number"}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="ui-btn-ghost !p-2 rounded-lg disabled:opacity-40"
            style={{ border: "1px solid var(--stroke)" }}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToLastPage}
            disabled={currentPage === totalPages}
            className="ui-btn-ghost !p-2 rounded-lg disabled:opacity-40"
            style={{ border: "1px solid var(--stroke)" }}
          >
            <ChevronDoubleRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <ExecutionDetailsModal run={detailsOpen ? executionDetails : null} onClose={() => setDetailsOpen(false)} />
    </div>
  );
}

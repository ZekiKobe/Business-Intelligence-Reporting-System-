import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { FileDown, FileText, Play } from "lucide-react";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import Papa from "papaparse";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";

import PortalLayout from "../layouts/PortalLayout";
import ReportChart from "../components/ReportChart";
import { executeSql, getReportById } from "../services/api";
import {
  distinctValues,
  inferFilterKind,
  rowMatchesFilters,
  type FilterControlKind,
} from "../utils/reportFilters";

const normalizeId = (value: string) =>
  String(value || "")
    .replace(/["`]/g, "")
    .trim()
    .toLowerCase();

const getRowValue = (row: Record<string, unknown> | null | undefined, colName: string): unknown => {
  if (!row) return undefined;
  if (Object.prototype.hasOwnProperty.call(row, colName)) return row[colName];
  const target = normalizeId(colName);
  if (!target) return undefined;
  const matchedKey = Object.keys(row).find((k) => normalizeId(k) === target);
  return matchedKey ? row[matchedKey] : undefined;
};

const ReportExecutionPage = () => {
  const { id } = useParams();
  const location = useLocation();

  const [report, setReport] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  /** Simulated 0–100% while the execute request is in flight (API has no streaming progress). */
  const [executed, setExecuted] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [execRowLimit, setExecRowLimit] = useState(10_000);
  const [lastRowCount, setLastRowCount] = useState<number | null>(null);

  const spec = report?.spec || {};
  const headerColumns: string[] = (spec?.header_columns || []).filter(Boolean);
  const mainColumns: string[] = (spec?.main_columns || []).filter(Boolean);
  const aggregateColumns: string[] = (spec?.aggregate_columns || []).filter(Boolean);
  const filterColumns: string[] = (spec?.filter_columns || []).filter(Boolean);
  const filterColumnTypesMap = spec?.filter_column_types as Record<string, string> | undefined;
  const chartTypeViz =
    spec?.chart_type && String(spec.chart_type) !== "" ? String(spec.chart_type) : "table";
  const chartValueAggregate = (spec?.chart_value_aggregate as string) || "sum";
  const [chartCategoryLocal, setChartCategoryLocal] = useState("");
  const [chartValueLocal, setChartValueLocal] = useState("");

  useEffect(() => {
    setChartCategoryLocal((spec?.chart_category_key as string) || "");
    setChartValueLocal((spec?.chart_value_key as string) || "");
  }, [id, spec?.chart_category_key, spec?.chart_value_key]);

  const filterTypes = useMemo(() => {
    const out: Record<string, FilterControlKind> = {};
    filterColumns.forEach((col) => {
      const t = filterColumnTypesMap?.[col];
      out[col] = t === "date" || t === "select" || t === "text" ? (t as FilterControlKind) : inferFilterKind(undefined, col);
    });
    return out;
  }, [filterColumns, filterColumnTypesMap]);

  const filteredRows = useMemo(() => {
    if (!filterColumns.length) return rows;
    return rows.filter((row) =>
      rowMatchesFilters(row as Record<string, unknown>, filterColumns, filterValues, filterTypes, getRowValue)
    );
  }, [rows, filterColumns, filterValues, filterTypes]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const data = await getReportById(id);
        setReport(data);
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Failed to load report.");
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    setRows([]);
    setFilterValues({});
    setExecuted(false);
    setCurrentPage(1);
    setLastRowCount(null);
  }, [id]);

  const tableColumns = useMemo(() => {
    // BI Dashboard uses `main_columns` as the primary table view.
    if (mainColumns?.length) return mainColumns;
    if (!rows.length) return [];
    // Fallback: when spec doesn't define main columns, show all returned columns.
    return Object.keys(rows[0] || {});
  }, [mainColumns, rows]);

  const exportColumns = useMemo(() => {
    const union = [...headerColumns, ...mainColumns, ...aggregateColumns, ...filterColumns];
    return Array.from(new Set(union)).filter(Boolean);
  }, [aggregateColumns, filterColumns, headerColumns, mainColumns]);

  const chartColumnOptions = useMemo(() => {
    const fromSpec = [...headerColumns, ...mainColumns, ...aggregateColumns, ...filterColumns].filter(Boolean);
    const uniq = Array.from(new Set(fromSpec));
    if (uniq.length) return uniq;
    if (rows.length) return Object.keys(rows[0] || {});
    return [];
  }, [aggregateColumns, filterColumns, headerColumns, mainColumns, rows]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredRows.length / rowsPerPage)),
    [filteredRows.length, rowsPerPage]
  );
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage, rowsPerPage]);
  const pageStart = filteredRows.length ? (currentPage - 1) * rowsPerPage + 1 : 0;
  const pageEnd = Math.min(currentPage * rowsPerPage, filteredRows.length);

  const buildSqlFromSpec = (rep: any) => {
    const spec = rep?.spec || {};
    const connectionId = spec.connection_public_id;
    const tableName = spec.table || rep?.dataset;
    const selectedColumns = [
      ...(spec.header_columns || []),
      ...(spec.main_columns || []),
      ...(spec.aggregate_columns || []),
      ...(spec.filter_columns || []),
    ].filter(Boolean);
    const uniqueColumns = Array.from(new Set(selectedColumns));
    const selectExpr = uniqueColumns.length ? uniqueColumns.join(", ") : "*";
    const sql = `SELECT ${selectExpr} FROM ${tableName}`;
    return { connectionId, sql };
  };

  const onExecute = async () => {
    if (!report) return;
    setLoading(true);
    setError("");

    try {
      const { connectionId, sql } = buildSqlFromSpec(report);
      if (!connectionId) {
        throw new Error("Report does not have a connection configured.");
      }
      if (!sql.includes("FROM")) {
        throw new Error("Report is missing table metadata.");
      }

      const res = await executeSql({
        connection_id: connectionId,
        sql,
        limit: execRowLimit,
      });
      const loaded = res?.preview?.rows || [];
      // Keep showing previous rows until this succeeds; then replace in one shot.
      setRows(loaded);
      // Do not clear filters on re-run — previous result and filters stay until new data arrives.
      setLastRowCount(typeof res?.row_count === "number" ? res.row_count : loaded.length);
      setCurrentPage(1);
      setExecuted(true);
      console.log("[report execute]", { rowCount: res?.row_count, limit: execRowLimit });
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Execution failed.");
      console.log("[report execute] error", e);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!filteredRows.length) return;
    const rowsForExport =
      exportColumns.length > 0
        ? filteredRows.map((row) => {
            const obj: Record<string, any> = {};
            exportColumns.forEach((col) => {
              obj[col] = getRowValue(row as Record<string, unknown>, col);
            });
            return obj;
          })
        : filteredRows;

    const csv = Papa.unparse(rowsForExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `${report?.name || "report"}_result.csv`);
  };

  const exportPDF = () => {
    if (!filteredRows.length) return;
    const doc = new jsPDF();
    const body = filteredRows.map((row) =>
      tableColumns.map((c) => getRowValue(row as Record<string, unknown>, c))
    );
    doc.autoTable({ head: [tableColumns], body });
    doc.save(`${report?.name || "report"}_result.pdf`);
  };

  const goToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setCurrentPage(nextPage);
  };

  return (
    <PortalLayout contentMax="max-w-[88rem]">
        <div className="pb-12">
        <div className="mb-8">
          <p className="portal-hero-eyebrow mb-2">Report execution</p>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-portal-text tracking-tight">
            {location.state?.name || report?.name || "Report"}
          </h1>
          <p className="text-sm text-portal-muted mt-2 max-w-2xl leading-relaxed">
            Run the saved query against your connection, refine with filters, and export results.
          </p>
        </div>

        <div className="portal-surface-card p-5 md:p-6 mb-6 border-portal-stroke">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex flex-col gap-1">
              <span className="portal-label !mb-0">Row limit</span>
              <select
                value={execRowLimit}
                onChange={(e) => setExecRowLimit(Number(e.target.value))}
                className="portal-select-compact min-w-[7rem]"
              >
                {[1000, 5000, 10000, 25000, 50000, 100000, 200000].map((n) => (
                  <option key={n} value={n}>
                    {n.toLocaleString()}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={onExecute}
              disabled={loading || !report}
              className="portal-btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <Play size={16} className="inline mr-2 align-text-bottom" strokeWidth={2.25} />
              {loading ? "Running…" : "Run report"}
            </button>
            <button
              type="button"
              onClick={exportCSV}
              disabled={!filteredRows.length}
              className="portal-btn-emerald-soft text-sm disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <FileDown size={16} />
              CSV
            </button>
            <button
              type="button"
              onClick={exportPDF}
              disabled={!filteredRows.length}
              className="portal-btn-danger-soft text-sm disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <FileText size={16} />
              PDF
            </button>
          </div>
          {!!error && (
            <p className="text-sm mt-4 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800/50">
              {error}
            </p>
          )}

          {loading && (
            <div className="mt-5 space-y-2" aria-live="polite">
              <div className="flex justify-between text-xs text-portal-muted">
                <span>{loading ? "Running report…" : "Complete"}</span>
              </div>
            </div>
          )}
          {loading && executed && rows.length > 0 && (
            <p className="text-xs text-portal-muted mt-3">
              Showing the previous run below until the new results load.
            </p>
          )}
        </div>

        {executed && (
          <div id="report-table" className="portal-surface-card overflow-hidden border-portal-stroke p-0">
            <div className="p-5 border-b border-portal-stroke flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2 text-portal-text">
                <FileText size={18} className="opacity-80" />
                Results
              </h2>
              <span className="text-xs text-portal-muted tabular-nums">
                {filteredRows.length}
                {filteredRows.length !== rows.length ? ` of ${rows.length}` : ""} rows
                {lastRowCount != null && lastRowCount >= execRowLimit
                  ? " (may be capped; raise max rows for more)"
                  : ""}
              </span>
            </div>

            {!!rows.length && (headerColumns.length > 0 || aggregateColumns.length > 0) && (
              <div
                className="p-4 sm:p-5 border-b border-portal-stroke"
                style={{ background: "color-mix(in srgb, var(--portal-bg) 70%, var(--portal-surface))" }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {headerColumns.length > 0 && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                      <h3 className="text-sm font-semibold text-blue-800 mb-2">Header</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-blue-900">
                        {headerColumns.map((col) => (
                          <div key={col} className="break-words">
                            <span className="font-medium">{col}:</span>{" "}
                            <span>
                              {String(getRowValue(filteredRows[0] as Record<string, unknown>, col) ?? "N/A")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {aggregateColumns.length > 0 && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <h3 className="text-sm font-semibold text-amber-800 mb-2">Aggregation</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-amber-900">
                        {aggregateColumns.map((col) => (
                          <div key={col} className="break-words">
                            <span className="font-medium">{col}:</span>{" "}
                            <span>
                              {String(getRowValue(filteredRows[0] as Record<string, unknown>, col) ?? "N/A")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {filterColumns.length > 0 && !!rows.length && (
              <div
                className="p-3 sm:p-4 border-b border-portal-stroke"
                style={{ background: "color-mix(in srgb, var(--portal-primary-soft) 25%, var(--portal-surface))" }}
              >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <AdjustmentsHorizontalIcon className="h-4 w-4 text-portal-muted" />
                  <span className="text-sm font-semibold text-portal-text">Filter results</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterValues({});
                      setCurrentPage(1);
                    }}
                    className="text-xs font-semibold text-primary-600 hover:underline ml-auto"
                  >
                    Clear filters
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filterColumns.map((col) => {
                    const kind = filterTypes[col] || "select";
                    const v = filterValues[col] ?? "";
                    if (kind === "date") {
                      return (
                        <label key={col} className="flex flex-col gap-1">
                          <span className="portal-label !mb-0">{col}</span>
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
                            className="portal-input py-2 text-sm"
                          />
                        </label>
                      );
                    }
                    if (kind === "text") {
                      return (
                        <label key={col} className="flex flex-col gap-1">
                          <span className="portal-label !mb-0">{col}</span>
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
                            className="portal-input py-2 text-sm"
                          />
                        </label>
                      );
                    }
                    const opts = distinctValues(
                      rows as Record<string, unknown>[],
                      col,
                      getRowValue as (row: Record<string, unknown>, c: string) => unknown
                    );
                    return (
                      <label key={col} className="flex flex-col gap-1">
                        <span className="portal-label !mb-0">{col}</span>
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
                          className="portal-select-compact text-sm"
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
              </div>
            )}

            {chartTypeViz !== "table" && (
              <div className="p-4 sm:p-5 border-b border-portal-stroke" style={{ background: "var(--portal-surface)" }}>
                <p className="text-sm font-semibold text-portal-text mb-1">Chart axes</p>
                <p className="text-xs text-portal-muted mb-3 max-w-2xl">
                  Choose columns for this chart. Report defaults load automatically; adjust here if needed.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <label className="flex flex-col gap-1">
                    <span className="portal-label !mb-0">Category (dimension)</span>
                    <select
                      value={chartCategoryLocal}
                      onChange={(e) => setChartCategoryLocal(e.target.value)}
                      className="portal-select-compact text-sm w-full max-w-md"
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
                      <p className="text-xs text-portal-muted">
                        Value metric: <strong className="text-portal-text">row count</strong> per category.
                      </p>
                    </div>
                  ) : (
                    <label className="flex flex-col gap-1">
                      <span className="portal-label !mb-0">Value (metric)</span>
                      <select
                        value={chartValueLocal}
                        onChange={(e) => setChartValueLocal(e.target.value)}
                        className="portal-select-compact text-sm w-full max-w-md"
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
                <ReportChart
                  chartType={chartTypeViz}
                  categoryKey={chartCategoryLocal}
                  valueKey={chartValueLocal}
                  rows={filteredRows as Record<string, unknown>[]}
                  getRowValue={getRowValue as (row: Record<string, unknown>, col: string) => unknown}
                  title="Visualization"
                  height={340}
                  valueAggregate={chartValueAggregate}
                />
              </div>
            )}

            {!rows.length ? (
              <div className="p-8 text-sm text-portal-muted text-center">No rows returned.</div>
            ) : !filteredRows.length ? (
              <div className="p-6 text-sm text-amber-900 bg-amber-50 border-t border-amber-100/80 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-900/40">
                No rows match the current filters. Clear filters or adjust values.
              </div>
            ) : (
              <>
              <div className="overflow-auto">
              <table className="portal-pro-table">
                <thead>
                  <tr>
                    {tableColumns.map((col) => (
                      <th key={col}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row, idx) => (
                    <tr key={idx}>
                      {tableColumns.map((col) => (
                        <td key={`${idx}-${col}`} className="whitespace-nowrap">
                          {String(getRowValue(row as Record<string, unknown>, col) ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              <div
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 border-t border-portal-stroke"
                style={{ background: "color-mix(in srgb, var(--portal-bg) 50%, var(--portal-surface))" }}
              >
                <div className="flex flex-wrap items-center gap-2 text-sm text-portal-muted">
                  <span>Rows per page</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="portal-select-compact"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="tabular-nums">
                    Showing {pageStart}–{pageEnd} of {filteredRows.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="portal-btn-secondary !py-2 !px-3 text-sm disabled:opacity-45"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-portal-muted tabular-nums px-1">
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="portal-btn-secondary !py-2 !px-3 text-sm disabled:opacity-45"
                  >
                    Next
                  </button>
                </div>
              </div>
              </>
            )}
          </div>
        )}
        </div>
    </PortalLayout>
  );
};

export default ReportExecutionPage;

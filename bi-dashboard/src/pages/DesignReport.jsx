import React, { useState, useEffect, useRef, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { EyeIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useNavigate, useParams } from "react-router-dom";
import {
  executeConnectionSql,
  fetchConnections,
  fetchConnectionSchema,
} from "../controllers/connectionController";
import {
  createReport,
  fetchReportGroups,
  getReportById,
  updateReport,
} from "../controllers/reportController";
import { inferFilterKind } from "../utils/reportFilters";
import { CHART_TYPES, normalizeChartViz, METRIC_OPERATIONS } from "../utils/reportChartData";
import ReportChartPanel from "../components/ReportChartPanel";
import ChartVizSettings from "../components/ChartVizSettings";
import BiPageHeader from "../components/BiPageHeader";
import PageLoadingSpinner from "../components/PageLoadingSpinner";
import { toast } from "react-toastify";

// Database DATE values often arrive as midnight timestamps. Display them as a
// date in the designer preview while preserving the original value for queries.
const formatPreviewValue = (value, columnName) => {
  if (value == null) return "";
  const text = String(value);
  if (/(^|_)(date|at)$|^date/i.test(String(columnName || "")) && /^\d{4}-\d{2}-\d{2}[T\s]/.test(text)) {
    return text.slice(0, 10);
  }
  return text;
};

const DesignReport = () => {
  const navigate = useNavigate();
  const { reportId: editReportPk } = useParams();
  const isEditMode = Boolean(editReportPk);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadAttempt, setReloadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [connections, setConnections] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [columnLists, setColumnLists] = useState({
    available: [],
    header: [],
    main: [],
    filter: [],
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportId, setReportId] = useState("");
  const [selectedReportGroup, setSelectedReportGroup] = useState("");
  const [reportGroups, setReportGroups] = useState([]);
  const [criteria, setCriteria] = useState("");
  const [quickAddTarget, setQuickAddTarget] = useState("header");
  const [previewRows, setPreviewRows] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [pendingSpec, setPendingSpec] = useState(null);
  const [desiredTableForHydration, setDesiredTableForHydration] = useState("");
  const [hydratingEdit, setHydratingEdit] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState("");
  const [chartType, setChartType] = useState("table");
  const [chartCategoryKey, setChartCategoryKey] = useState("");
  const [chartValueKey, setChartValueKey] = useState("");
  const [chartValueAggregate, setChartValueAggregate] = useState("sum");
  const [aggregateMetrics, setAggregateMetrics] = useState([]);
  const [filterConfigs, setFilterConfigs] = useState([]);
  const [chartViz, setChartViz] = useState(() => normalizeChartViz());
  const prevConnectionRef = useRef(null);
  const dragIdCounter = useRef(0);
  const loadedSpecRef = useRef({});

  const normalizeIdentifier = (value) =>
    String(value || "")
      .replace(/["`]/g, "")
      .trim()
      .toLowerCase();

  const getTableNameFromSchemaRow = (row) => {
    if (!row) return "";
    if (typeof row === "string") return row;
    return row.name || row.table_name || row.table || "";
  };

  const resolveSchemaTableName = (schemaRows = [], desiredName = "") => {
    const target = normalizeIdentifier(desiredName);
    if (!target) return "";
    for (const row of schemaRows) {
      const rawName = getTableNameFromSchemaRow(row);
      const normalizedRaw = normalizeIdentifier(rawName);
      if (!normalizedRaw) continue;
      if (
        normalizedRaw === target ||
        normalizedRaw.endsWith(`.${target}`) ||
        target.endsWith(`.${normalizedRaw}`)
      ) {
        return rawName;
      }
    }
    return "";
  };

  const tableSchemaColumns = useMemo(() => {
    if (!selectedTable) return [];
    const table = tables.find((t) => {
      const tName = getTableNameFromSchemaRow(t);
      return normalizeIdentifier(tName) === normalizeIdentifier(selectedTable);
    });
    const raw = table?.columns || table?.fields || [];
    return raw.map((c) => (typeof c === "string" ? c : c?.name)).filter(Boolean);
  }, [selectedTable, tables]);

  /** Chart reports: SQL main columns come from dimension ± metric, not from drag-and-drop zones. */
  const chartSqlMainColumns = useMemo(() => {
    if (chartType === "table") return null;
    const cols = [];
    if (chartCategoryKey) cols.push(chartCategoryKey);
    if (chartValueAggregate !== "count" && chartValueKey) cols.push(chartValueKey);
    return Array.from(new Set(cols.filter(Boolean)));
  }, [chartType, chartCategoryKey, chartValueKey, chartValueAggregate]);

  const columnMapperReady =
    Boolean(selectedConnection) && Boolean(selectedTable) && !schemaLoading && !schemaError;

  const showColumnDragDrop = columnMapperReady && chartType === "table";

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      setLoadError("");
      if (!isEditMode) {
        loadedSpecRef.current = {};
        setPendingSpec(null);
        setHydratingEdit(false);
      }
      try {
        const [groups, conns] = await Promise.all([fetchReportGroups(), fetchConnections()]);
        setReportGroups(groups || []);
        setConnections(conns || []);
        if (isEditMode) {
          const existing = await getReportById(editReportPk);
          if (!existing) throw new Error("Report was not found.");
          const existingSpec = existing?.spec || {};
          // Keep unedited/unknown definition fields intact on update. The
          // designer only replaces the properties it actively manages.
          loadedSpecRef.current = existingSpec;
          setReportTitle(existing?.name || "");
          setReportId(existing?.report_id || "");
          setSelectedReportGroup(existing?.group || "");
          setCriteria(existing?.criteria || "");
          setPendingSpec(existingSpec);
          setDesiredTableForHydration(existingSpec.table || existing?.dataset || "");
          setHydratingEdit(true);
          setSelectedConnection(
            existingSpec.connection_public_id || existingSpec.connection_id || ""
          );
          setChartType(existingSpec.chart_type && existingSpec.chart_type !== "" ? existingSpec.chart_type : "table");
          setChartCategoryKey(existingSpec.chart_category_key || "");
          setChartValueKey(existingSpec.chart_value_key || "");
          setChartValueAggregate(existingSpec.chart_value_aggregate || "sum");
          setChartViz(normalizeChartViz(existingSpec.chart_viz));
          setFilterConfigs(Array.isArray(existingSpec.filter_configs) ? existingSpec.filter_configs : []);
        }
      } catch (error) {
        setLoadError(
          error?.response?.data?.detail || error?.message || "The report design could not be loaded."
        );
        toast.error(
          isEditMode ? "Failed to load report for editing." : "Failed to load report groups or connections."
        );
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, [isEditMode, editReportPk, reloadAttempt]);

  useEffect(() => {
    const loadSchema = async () => {
      if (!selectedConnection) {
        prevConnectionRef.current = null;
        setTables([]);
        setSelectedTable("");
        setSchemaLoading(false);
        setSchemaError("");
        setColumnLists({ available: [], header: [], main: [], filter: [] });
        return;
      }

      const prev = prevConnectionRef.current;
      const switchedConnection = prev !== null && prev !== selectedConnection;
      prevConnectionRef.current = selectedConnection;

      setSchemaLoading(true);
      setSchemaError("");
      try {
        const rows = await fetchConnectionSchema(selectedConnection);
        setTables(rows || []);
        if (hydratingEdit && desiredTableForHydration) {
          const resolved = resolveSchemaTableName(rows || [], desiredTableForHydration);
          setSelectedTable(resolved || "");
          setDesiredTableForHydration("");
        } else if (!hydratingEdit && switchedConnection) {
          setSelectedTable("");
          setColumnLists({ available: [], header: [], main: [], filter: [] });
        }
      } catch (error) {
        setTables([]);
        setColumnLists({ available: [], header: [], main: [], filter: [] });
        const detail =
          error?.response?.data?.detail ||
          error?.message ||
          "Failed to load schema from selected connection.";
        setSchemaError(detail);
        console.log("[design report] schema load failed", { detail, error });
      } finally {
        setSchemaLoading(false);
      }
    };
    loadSchema();
  // Hydration state is intentionally not a dependency. Including it caused a
  // second schema request after the saved zones were restored; that request
  // changed `tables` and reset the designer to blank.
  }, [selectedConnection]);

  useEffect(() => {
    if (!selectedTable) {
      setColumnLists({ available: [], header: [], main: [], filter: [] });
      return;
    }
    const table = tables.find((t) => {
      const tName = getTableNameFromSchemaRow(t);
      return normalizeIdentifier(tName) === normalizeIdentifier(selectedTable);
    });
    const tKey = getTableNameFromSchemaRow(table) || selectedTable;
    const cols = ((table?.columns || table?.fields || []))
      .map((c) => {
        const colName = typeof c === "string" ? c : c?.name;
        if (!colName) return null;
        return {
          id: `avail-${tKey}-${colName}`,
          name: colName,
        };
      })
      .filter(Boolean);
    if (pendingSpec) {
      const validNames = new Set(cols.map((c) => c.name));
      const zoneItems = (names = [], zoneKey) =>
        (names || [])
          .map((name) => {
            if (!validNames.has(name)) return null;
            dragIdCounter.current += 1;
            return { name, id: `${zoneKey}-${name}-${dragIdCounter.current}` };
          })
          .filter(Boolean);
      const header = zoneItems(pendingSpec.header_columns || [], "header");
      const main = zoneItems(pendingSpec.main_columns || [], "main");
      const filter = zoneItems(pendingSpec.filter_columns || [], "filter");
      const metricsRaw = pendingSpec.aggregate_metrics;
      let nextMetrics;
      if (Array.isArray(metricsRaw) && metricsRaw.length) {
        nextMetrics = metricsRaw
          .filter((m) => m && validNames.has(String(m.column)))
          .map((m) => ({ column: m.column, op: m.op || "sum" }));
      } else {
        nextMetrics = (pendingSpec.aggregate_columns || [])
          .filter((c) => validNames.has(String(c)))
          .map((c) => ({ column: c, op: "sum" }));
      }
      setAggregateMetrics(nextMetrics);
      setColumnLists({ available: cols, header, main, filter });
      setPendingSpec(null);
      setHydratingEdit(false);
      return;
    }
    setAggregateMetrics([]);
    setColumnLists({ available: cols, header: [], main: [], filter: [] });
  }, [selectedTable, tables]);

  // Filter columns are the source list; keep their saved configuration when
  // designers rearrange columns and give newly-added filters safe defaults.
  useEffect(() => {
    const keys = columnLists.filter.map((column) => column.name);
    const kinds = buildFilterColumnTypes();
    setFilterConfigs((previous) =>
      keys.map((key) => {
        const saved = previous.find((config) => config?.key === key);
        return {
          key,
          label: saved?.label || key,
          type: saved?.type || kinds[key] || "select",
          required: Boolean(saved?.required),
          default: saved?.default ?? "",
          options: Array.isArray(saved?.options) ? saved.options : [],
        };
      })
    );
  }, [columnLists.filter, selectedTable, tables]);

  const handleDragEnd = ({ source, destination }) => {
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    if (destination.droppableId === "available") {
      if (source.droppableId === "available") {
        setColumnLists((prev) => {
          const list = [...prev.available];
          const [moved] = list.splice(source.index, 1);
          list.splice(destination.index, 0, moved);
          return { ...prev, available: list };
        });
        return;
      }
      setColumnLists((prev) => {
        const sourceList = [...(prev[source.droppableId] || [])];
        sourceList.splice(source.index, 1);
        return { ...prev, [source.droppableId]: sourceList };
      });
      return;
    }

    if (source.droppableId === "available") {
      setColumnLists((prev) => {
        const col = prev.available[source.index];
        if (!col) return prev;
        const destKey = destination.droppableId;
        const destList = [...(prev[destKey] || [])];
        if (destList.some((c) => c.name === col.name)) return prev;
        dragIdCounter.current += 1;
        const copy = { name: col.name, id: `${destKey}-${col.name}-${dragIdCounter.current}` };
        destList.splice(destination.index, 0, copy);
        return { ...prev, [destKey]: destList };
      });
      return;
    }

    setColumnLists((prev) => {
      const sourceList = [...(prev[source.droppableId] || [])];
      const destList =
        source.droppableId === destination.droppableId
          ? sourceList
          : [...(prev[destination.droppableId] || [])];
      const [moved] = sourceList.splice(source.index, 1);
      if (!moved) return prev;
      destList.splice(destination.index, 0, moved);
      return {
        ...prev,
        [source.droppableId]: sourceList,
        [destination.droppableId]: destList,
      };
    });
  };

  const handleQuickAdd = (col) => {
    if (!quickAddTarget || quickAddTarget === "available") return;
    setColumnLists((prev) => {
      const targetList = [...(prev[quickAddTarget] || [])];
      if (targetList.some((c) => c.name === col.name)) return prev;
      dragIdCounter.current += 1;
      const copy = { name: col.name, id: `${quickAddTarget}-${col.name}-${dragIdCounter.current}` };
      return { ...prev, [quickAddTarget]: [...targetList, copy] };
    });
  };

  const handleQuickRemove = (fromZoneId, col) => {
    if (!fromZoneId || fromZoneId === "available") return;
    setColumnLists((prev) => {
      const fromList = [...(prev[fromZoneId] || [])];
      const idx = fromList.findIndex((c) => c.id === col.id);
      if (idx === -1) return prev;
      fromList.splice(idx, 1);
      return { ...prev, [fromZoneId]: fromList };
    });
  };

  const buildFilterColumnTypes = () => {
    const table = tables.find(
      (t) => normalizeIdentifier(getTableNameFromSchemaRow(t)) === normalizeIdentifier(selectedTable)
    );
    const typeByName = {};
    (table?.columns || table?.fields || []).forEach((c) => {
      const colName = typeof c === "string" ? c : c?.name;
      const typ = typeof c === "string" ? "" : String(c?.type || "");
      if (colName) typeByName[colName] = typ;
    });
    const out = {};
    columnLists.filter.forEach((c) => {
      const sqlType = typeByName[c.name];
      out[c.name] = inferFilterKind(sqlType || "", c.name);
    });
    return out;
  };

  const handleSaveReport = async () => {
    if (!reportId || !selectedReportGroup || !selectedConnection || !selectedTable) {
      toast.warning("Please select report group, connection and table, then fill report ID.");
      return;
    }
    if (chartType !== "table") {
      if (!chartCategoryKey) {
        toast.warning("Select a dimension (category) column for the chart.");
        return;
      }
      if (chartValueAggregate !== "count" && !chartValueKey) {
        toast.warning("Select a value column for the chart metric, or choose “Count rows”.");
        return;
      }
      if (chartValueAggregate === "count_distinct" && !chartValueKey) {
        toast.warning("Count distinct needs both a category column and a value column.");
        return;
      }
    }
    setSaving(true);
    try {
      const isTableViz = chartType === "table";
      const headerCols = isTableViz ? columnLists.header.map((c) => c.name) : [];
      const mainCols = isTableViz
        ? columnLists.main.map((c) => c.name)
        : chartSqlMainColumns || [];
      const filterCols = isTableViz ? columnLists.filter.map((c) => c.name) : [];
      const payload = {
        report_id: reportId,
        name: reportTitle || reportId,
        group: selectedReportGroup,
        dataset: selectedTable,
        criteria,
        spec: {
          ...loadedSpecRef.current,
          connection_public_id: selectedConnection,
          table: selectedTable,
          header_columns: headerCols,
          main_columns: mainCols,
          aggregate_columns: aggregateMetrics.map((m) => m.column).filter(Boolean),
          aggregate_metrics: aggregateMetrics.filter((m) => m.op === "count" || m.column),
          filter_columns: filterCols,
          filter_column_types: isTableViz ? buildFilterColumnTypes() : {},
          filter_configs: isTableViz
            ? filterConfigs
                .filter((config) => filterCols.includes(config.key))
                .map((config) => ({
                  ...config,
                  label: String(config.label || config.key).trim() || config.key,
                  default: config.default === "" ? null : config.default,
                  options: (config.options || []).filter((option) => option !== ""),
                }))
            : [],
          chart_type: chartType || "table",
          chart_category_key: chartType === "table" ? "" : chartCategoryKey,
          chart_value_key:
            chartType === "table" ? "" : chartValueAggregate === "count" ? "" : chartValueKey,
          chart_value_aggregate: chartType === "table" ? "sum" : chartValueAggregate,
          chart_viz: normalizeChartViz(chartViz),
        },
      };
      if (isEditMode) {
        await updateReport(editReportPk, payload);
        toast.success("Report updated successfully.");
      } else {
        await createReport(payload);
        toast.success("Report design saved successfully.");
      }
      navigate("/reports");
    } catch (error) {
      toast.error(isEditMode ? "Failed to update report design." : "Failed to save report design.");
    } finally {
      setSaving(false);
    }
  };

  const buildPreviewSql = () => {
    let selected;
    if (chartType !== "table") {
      selected = [
        ...(chartSqlMainColumns || []),
        ...aggregateMetrics.map((m) => m.column).filter(Boolean),
      ].filter(Boolean);
    } else {
      selected = [
        ...columnLists.header.map((c) => c.name),
        ...columnLists.main.map((c) => c.name),
        ...aggregateMetrics.map((m) => m.column),
        ...columnLists.filter.map((c) => c.name),
      ].filter(Boolean);
    }
    const uniqueCols = Array.from(new Set(selected));
    const colExpr = uniqueCols.length ? uniqueCols.join(", ") : "*";
    return `SELECT ${colExpr} FROM ${selectedTable}`;
  };

  const getPreviewRowValue = (row, colName) => {
    if (!row) return undefined;
    if (Object.prototype.hasOwnProperty.call(row, colName)) return row[colName];
    const target = normalizeIdentifier(colName);
    if (!target) return undefined;
    const matchedKey = Object.keys(row).find((k) => normalizeIdentifier(k) === target);
    return matchedKey ? row[matchedKey] : undefined;
  };

  const openPreview = async () => {
    setPreviewOpen(true);
    setPreviewRows([]);
    setPreviewError("");
    if (!selectedConnection || !selectedTable) return;
    setPreviewLoading(true);
    try {
      const sql = buildPreviewSql();
      const res = await executeConnectionSql({
        connection_id: selectedConnection,
        sql,
        limit: 25,
      });
      setPreviewRows(res?.preview?.rows || []);
    } catch (error) {
      setPreviewError(
        error?.response?.data?.detail || error?.message || "Failed to load preview data."
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading) {
    return <PageLoadingSpinner minHeight="min-h-screen" label="Loading report designer…" />;
  }

  if (loadError) {
    return (
      <div className="ui-shell max-w-2xl mx-auto py-12">
        <div className="surface-card p-7 border" style={{ borderColor: "var(--stroke)" }}>
          <p className="text-sm font-semibold text-red-700">Unable to load this report design</p>
          <p className="text-sm mt-2" style={{ color: "var(--surface-muted)" }}>{loadError}</p>
          <div className="flex gap-3 mt-6">
            <button type="button" className="ui-btn-primary" onClick={() => setReloadAttempt((value) => value + 1)}>Try again</button>
            <button type="button" className="ui-btn-secondary" onClick={() => navigate("/reports")}>Back to reports</button>
          </div>
        </div>
      </div>
    );
  }

  const zoneStyles = {
    available: { head: "var(--app-bg)", border: "var(--stroke)", accent: "var(--surface-muted)" },
    header: { head: "color-mix(in srgb, var(--brand-primary) 12%, var(--surface-bg))", border: "color-mix(in srgb, var(--brand-primary) 35%, var(--stroke))", accent: "var(--brand-primary)" },
    main: { head: "color-mix(in srgb, #059669 12%, var(--surface-bg))", border: "color-mix(in srgb, #059669 30%, var(--stroke))", accent: "#059669" },
    filter: { head: "color-mix(in srgb, #dc2626 10%, var(--surface-bg))", border: "color-mix(in srgb, #dc2626 28%, var(--stroke))", accent: "#dc2626" },
  };

  const previewTableColumnNames =
    chartType !== "table"
      ? chartSqlMainColumns?.length
        ? chartSqlMainColumns
        : []
      : columnLists.main.map((c) => c.name);

  return (
    <div className="ui-shell max-w-[1600px] mx-auto pb-12">
      <div className="mb-8">
        <BiPageHeader
          variant="slim"
          eyebrow="Report designer"
          title={isEditMode ? "Edit report" : "Design new report"}
          description={
            isEditMode
              ? "Update metadata, data source, column layout, and chart styling. Schema columns stay in the pool—each zone holds its own copy."
              : "Connect a table, map columns, configure visuals, then save to the catalog."
          }
          accent="sky"
        />
      </div>

      {isEditMode ? (
        <div
          className="mb-6 rounded-xl border p-4 text-sm flex items-start gap-3"
          style={{ borderColor: "var(--stroke)", background: "var(--brand-primary-soft)", color: "var(--surface-text)" }}
        >
          <span className="font-semibold shrink-0">Loaded draft.</span>
          <span className="opacity-90">Review zones and visualization, then save to publish changes.</span>
        </div>
      ) : null}

      <div className="surface-card p-5 sm:p-7 md:p-9">
        <div className="ui-section-card">
          <h2 className="ui-section-card__title">Data source and report details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Report title"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            className="ui-input w-full"
          />
          <input
            type="text"
            placeholder="Report ID"
            value={reportId}
            onChange={(e) => setReportId(e.target.value)}
            className="ui-input w-full disabled:opacity-60"
            disabled={isEditMode}
          />
          <select
            value={selectedReportGroup}
            onChange={(e) => setSelectedReportGroup(e.target.value)}
            className="ui-select w-full md:col-span-2"
          >
            <option value="">Select report group</option>
            {reportGroups.map((g) => (
              <option key={g.code} value={g.code}>
                {g.group_name || g.name}
              </option>
            ))}
          </select>
          <select
            value={selectedConnection}
            onChange={(e) => setSelectedConnection(e.target.value)}
            className="ui-select w-full"
          >
            <option value="">Select connection</option>
            {connections.map((c) => (
              <option key={c.public_id} value={c.public_id}>
                {c.name} ({c.kind})
              </option>
            ))}
          </select>
          {schemaError ? (
            <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              Could not load tables:{" "}
              <span className="font-mono text-xs whitespace-pre-wrap break-words">{schemaError}</span>
            </div>
          ) : null}
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="ui-select w-full disabled:opacity-60"
            disabled={!selectedConnection || schemaLoading || Boolean(schemaError)}
          >
            <option value="">
              {schemaLoading
                ? "Loading tables…"
                : !selectedConnection
                  ? "Select a connection first"
                  : "Select table"}
            </option>
            {tables.map((t, idx) => {
              const tableName = getTableNameFromSchemaRow(t);
              return (
              <option key={tableName || idx} value={tableName}>
                {tableName}
              </option>
            )})}
          </select>
          <input
            type="text"
            placeholder="Criteria (optional)"
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            className="ui-input w-full md:col-span-2"
          />
          <div
            className="md:col-span-2 rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, var(--app-bg) 45%, var(--surface-bg))" }}
          >
            <div
              className="px-4 py-3 sm:px-5 border-b flex flex-wrap items-center gap-2"
              style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, var(--brand-primary) 8%, transparent)" }}
            >
              <h3 className="text-sm font-semibold font-display" style={{ color: "var(--surface-text)" }}>
                Visualization
              </h3>
              <span className="text-[11px] font-medium uppercase tracking-wide opacity-55">Chart type & formatting</span>
            </div>
            <div className="p-4 sm:p-5 space-y-5">
              <p className="text-xs opacity-80 max-w-3xl leading-relaxed">
                Choose how the chart maps data: <strong>dimension</strong> on the X-axis (or pie slices) and{" "}
                <strong>metric</strong> with a <strong>roll-up</strong> (sum, average, …). For non-table charts, the query loads
                these columns only — the drag-and-drop column zones are shown when you select <strong>Table only</strong>.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <label className="block">
                  <span className="ui-label">Chart type</span>
                  <select
                    value={chartType}
                    onChange={(e) => {
                      const next = e.target.value;
                      setChartType(next);
                      if (next === "table") {
                        setChartCategoryKey("");
                        setChartValueKey("");
                        setChartValueAggregate("sum");
                      }
                    }}
                    className="ui-select w-full"
                  >
                    {CHART_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {chartType !== "table" ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border p-3 space-y-1" style={{ borderColor: "var(--stroke)", background: "var(--surface-bg)" }}>
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Dimension</span>
                      <p className="text-xs opacity-70 mb-2">X-axis on bar / line / area · slice names on pie / doughnut</p>
                      <label className="block">
                        <span className="ui-label">Column</span>
                        <select
                          value={chartCategoryKey}
                          onChange={(e) => setChartCategoryKey(e.target.value)}
                          className="ui-select w-full disabled:opacity-60"
                          disabled={!selectedTable || schemaLoading || !tableSchemaColumns.length}
                        >
                          <option value="">Select column</option>
                          {tableSchemaColumns.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="rounded-xl border p-3 space-y-1" style={{ borderColor: "var(--stroke)", background: "var(--surface-bg)" }}>
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Metric</span>
                      <p className="text-xs opacity-70 mb-2">Y-axis value · rolled up per dimension</p>
                      <label className="block">
                        <span className="ui-label">Roll-up</span>
                        <select
                          value={chartValueAggregate}
                          onChange={(e) => {
                            const v = e.target.value;
                            setChartValueAggregate(v);
                            if (v === "count") setChartValueKey("");
                          }}
                          className="ui-select w-full disabled:opacity-60"
                          disabled={!selectedTable || schemaLoading}
                        >
                          {METRIC_OPERATIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block mt-2">
                        <span className="ui-label">
                          {chartValueAggregate === "count" ? "Value column (optional)" : "Column"}
                        </span>
                        <select
                          value={chartValueKey}
                          onChange={(e) => setChartValueKey(e.target.value)}
                          className="ui-select w-full disabled:opacity-60"
                          disabled={
                            !selectedTable || schemaLoading || !tableSchemaColumns.length || chartValueAggregate === "count"
                          }
                        >
                          <option value="">{chartValueAggregate === "count" ? "Not used for row count" : "Select column"}</option>
                          {tableSchemaColumns.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {chartValueAggregate === "count" ? (
                        <p className="text-[11px] opacity-60 mt-1">Counts rows per dimension; metric column is ignored.</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] font-medium px-2 py-1.5 rounded-lg" style={{ background: "var(--app-bg)", color: "var(--surface-muted)" }}>
                    <span>
                      X / categories: <span style={{ color: "var(--brand-primary)" }}>{chartCategoryKey || "—"}</span>
                    </span>
                    <span className="opacity-40">|</span>
                    <span>
                      Y:{" "}
                      <span style={{ color: "var(--brand-primary)" }}>
                        {METRIC_OPERATIONS.find((o) => o.value === chartValueAggregate)?.label || chartValueAggregate}
                        {chartValueAggregate !== "count" && chartValueKey ? `(${chartValueKey})` : ""}
                      </span>
                    </span>
                  </div>
                </>
              ) : null}

              <ChartVizSettings chartType={chartType} value={chartViz} onChange={setChartViz} />
            </div>
          </div>

          {selectedTable && !schemaLoading && !schemaError ? (
            <div
              className="md:col-span-2 rounded-xl border overflow-hidden"
              style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, #d97706 8%, var(--surface-bg))" }}
            >
              <div className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2" style={{ borderColor: "var(--stroke)" }}>
                <div>
                  <h3 className="text-sm font-semibold font-display" style={{ color: "var(--surface-text)" }}>
                    Aggregate metrics
                  </h3>
                  <p className="text-xs opacity-70 mt-0.5 max-w-2xl">
                    KPIs for the report header: pick a column and how to roll it up over <strong>all loaded rows</strong> after run
                    (client-side). Add multiple rows for several summaries.
                  </p>
                </div>
                <button
                  type="button"
                  className="ui-btn-secondary text-sm py-2"
                  onClick={() =>
                    setAggregateMetrics((prev) => [
                      ...prev,
                      tableSchemaColumns[0]
                        ? { column: tableSchemaColumns[0], op: "sum" }
                        : { column: "", op: "count" },
                    ])
                  }
                  disabled={!selectedTable || schemaLoading}
                >
                  <PlusIcon className="h-4 w-4" /> Add metric
                </button>
              </div>
              <div className="p-4 space-y-3">
                {aggregateMetrics.length === 0 ? (
                  <p className="text-sm opacity-60">No metrics yet. Add one to show totals in the report header.</p>
                ) : (
                  aggregateMetrics.map((m, idx) => (
                    <div key={`metric-${idx}`} className="flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-end">
                      <label className="block flex-1 min-w-[10rem]">
                        <span className="ui-label">Column</span>
                        <select
                          className="ui-select w-full disabled:opacity-60"
                          value={m.column}
                          disabled={m.op === "count"}
                          onChange={(e) => {
                            const col = e.target.value;
                            setAggregateMetrics((prev) => prev.map((row, i) => (i === idx ? { ...row, column: col } : row)));
                          }}
                        >
                          <option value="">{m.op === "count" ? "— (row count)" : "Select…"}</option>
                          {tableSchemaColumns.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block w-full sm:w-44">
                        <span className="ui-label">Roll-up</span>
                        <select
                          className="ui-select w-full"
                          value={m.op}
                          onChange={(e) => {
                            const op = e.target.value;
                            setAggregateMetrics((prev) =>
                              prev.map((row, i) =>
                                i === idx ? { ...row, op, column: op === "count" ? "" : row.column || tableSchemaColumns[0] || "" } : row
                              )
                            );
                          }}
                        >
                          {METRIC_OPERATIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="ui-btn-ghost text-red-600 py-2 px-3 rounded-lg mb-0 sm:mb-px"
                        onClick={() => setAggregateMetrics((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label="Remove metric"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {columnLists.filter.length > 0 && chartType === "table" ? (
            <div className="md:col-span-2 rounded-xl border overflow-hidden" style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, var(--brand-primary-soft) 35%, var(--surface-bg))" }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: "var(--stroke)" }}>
                <h3 className="text-sm font-semibold font-display" style={{ color: "var(--surface-text)" }}>Execution filters</h3>
                <p className="text-xs opacity-70 mt-0.5">These controls appear before a user runs the report. Required filters are also enforced by the server.</p>
              </div>
              <div className="p-4 space-y-3">
                {filterConfigs.map((config, index) => (
                  <div key={config.key} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 rounded-lg border p-3" style={{ borderColor: "var(--stroke)", background: "var(--surface-bg)" }}>
                    <label className="block"><span className="ui-label">Parameter key</span><input className="ui-input w-full text-sm" value={config.key} disabled /></label>
                    <label className="block"><span className="ui-label">Display label</span><input className="ui-input w-full text-sm" value={config.label} onChange={(e) => setFilterConfigs((all) => all.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} /></label>
                    <label className="block"><span className="ui-label">Type</span><select className="ui-select w-full text-sm" value={config.type} onChange={(e) => setFilterConfigs((all) => all.map((item, i) => i === index ? { ...item, type: e.target.value } : item))}><option value="select">Selection</option><option value="text">Text</option><option value="date">Date</option><option value="number">Number</option></select></label>
                    <label className="block"><span className="ui-label">Default value</span><input type={config.type === "date" ? "date" : config.type === "number" ? "number" : "text"} className="ui-input w-full text-sm" value={config.default ?? ""} onChange={(e) => setFilterConfigs((all) => all.map((item, i) => i === index ? { ...item, default: e.target.value } : item))} /></label>
                    <label className="flex items-end gap-2 pb-2 text-sm font-medium" style={{ color: "var(--surface-text)" }}><input type="checkbox" checked={Boolean(config.required)} onChange={(e) => setFilterConfigs((all) => all.map((item, i) => i === index ? { ...item, required: e.target.checked } : item))} /> Required</label>
                    {config.type === "select" ? <label className="block sm:col-span-2 lg:col-span-5"><span className="ui-label">Allowed options <span className="opacity-60">(one per line; leave blank to use a free selection)</span></span><textarea className="ui-input w-full text-sm min-h-16" value={(config.options || []).join("\n")} onChange={(e) => setFilterConfigs((all) => all.map((item, i) => i === index ? { ...item, options: e.target.value.split("\n").map((v) => v.trim()).filter(Boolean) } : item))} /></label> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {showColumnDragDrop ? (
            <div
              className="md:col-span-2 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-3"
              style={{ borderColor: "var(--stroke)", background: "var(--brand-primary-soft)" }}
            >
              <span className="text-sm font-semibold shrink-0" style={{ color: "var(--surface-text)" }}>
                Quick-add target:
              </span>
              <select
                value={quickAddTarget}
                onChange={(e) => setQuickAddTarget(e.target.value)}
                className="ui-select w-full sm:w-64"
              >
                <option value="header">Header Columns</option>
                <option value="main">Main Table Columns</option>
                <option value="filter">Filter Columns</option>
              </select>
              <span className="text-xs opacity-80 md:ml-auto max-w-md leading-snug">
                Use + or drag from Available — columns stay listed; each zone gets its own copy.
              </span>
            </div>
          ) : null}
          </div>
        </div>

        {!columnMapperReady ? (
          <div
            className="rounded-2xl border border-dashed py-16 px-6 text-center mb-6"
            style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, var(--app-bg) 80%, transparent)" }}
          >
            <p className="font-display font-semibold" style={{ color: "var(--surface-text)" }}>
              {schemaLoading ? "Loading table schema…" : "Select a data source and table"}
            </p>
            <p className="text-sm opacity-65 mt-2 max-w-md mx-auto">
              Column mapping (drag-and-drop) appears for <strong>Table only</strong> reports after you choose a connection and table.
              Chart reports use dimension and metric fields above instead.
            </p>
          </div>
        ) : chartType !== "table" ? (
          <div
            className="rounded-2xl border py-8 px-6 mb-6 max-w-3xl"
            style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, var(--brand-accent) 6%, var(--surface-bg))" }}
          >
            <p className="font-display font-semibold text-sm" style={{ color: "var(--surface-text)" }}>
              Table column zones are hidden for chart reports
            </p>
            <p className="text-sm opacity-80 mt-2 leading-relaxed">
              The query will select your <strong>dimension</strong> and <strong>metric</strong> columns (plus any aggregate metrics
              you configured). To use header, main, and filter zones with drag-and-drop, set <strong>Chart type</strong> to{" "}
              <strong>Table only</strong>.
            </p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { id: "available", title: "Available" },
              { id: "header", title: "Header" },
              { id: "main", title: "Main" },
              { id: "filter", title: "Filter" },
            ].map((zone) => (
              <div
                key={zone.id}
                className="p-3 sm:p-4 rounded-xl border transition-all duration-200 hover:shadow-md"
                style={{
                  borderColor: zoneStyles[zone.id]?.border || "var(--stroke)",
                  background: zoneStyles[zone.id]?.head || "var(--surface-bg)",
                }}
              >
                <h4
                  className="font-display font-semibold mb-3 text-xs uppercase tracking-wide"
                  style={{ color: zoneStyles[zone.id]?.accent || "var(--surface-text)" }}
                >
                  {zone.title}
                </h4>
                <Droppable droppableId={zone.id}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[180px]">
                      {(columnLists[zone.id] || []).map((col, index) => (
                        <Draggable key={col.id} draggableId={col.id} index={index}>
                          {(dragProvided) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className="p-2 mb-2 rounded-lg cursor-pointer text-sm flex items-center justify-between gap-2 border"
                              style={{
                                background: "var(--surface-bg)",
                                borderColor: "var(--stroke)",
                                boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
                              }}
                            >
                              <span className="truncate">{col.name}</span>
                              {zone.id === "available" ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickAdd(col);
                                  }}
                                  className="ui-btn-primary !p-0 w-7 h-7 min-w-[1.75rem] rounded-lg"
                                  title={`Add to ${quickAddTarget}`}
                                >
                                  +
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickRemove(zone.id, col);
                                  }}
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-white font-bold shrink-0"
                                  style={{ background: "#dc2626" }}
                                  title="Remove from this zone"
                                >
                                  -
                                </button>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
        )}

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button type="button" onClick={openPreview} className="ui-btn-secondary">
            <EyeIcon className="h-4 w-4" /> Preview
          </button>
          <button type="button" onClick={handleSaveReport} disabled={saving} className="ui-btn-primary">
            <PlusIcon className="h-4 w-4" /> {saving ? (isEditMode ? "Updating…" : "Saving…") : isEditMode ? "Update report" : "Save report"}
          </button>
        </div>
      </div>

      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-center items-start pt-8 overflow-auto p-4"
          style={{ background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-5xl p-4 sm:p-7 relative mt-2 sm:mt-6 rounded-2xl border shadow-2xl"
            style={{ background: "var(--surface-bg)", borderColor: "var(--stroke)" }}
          >
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="absolute top-4 right-4 ui-btn-ghost p-2 rounded-xl"
              aria-label="Close preview"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <h2 className="font-display text-xl sm:text-2xl font-bold mb-1 pr-10" style={{ color: "var(--surface-text)" }}>
              {reportTitle || "Preview"}
            </h2>
            <p className="text-xs opacity-60 mb-5">Sample rows (max 25). Saved formatting applies when you run the report.</p>
            {chartType !== "table" ? (
              <div className="mb-5">
                <ReportChartPanel
                  chartType={chartType}
                  categoryKey={chartCategoryKey}
                  valueKey={chartValueKey}
                  rows={previewRows}
                  getRowValue={getPreviewRowValue}
                  title="Chart preview"
                  viz={normalizeChartViz(chartViz)}
                  valueAggregate={chartValueAggregate}
                />
              </div>
            ) : null}
            {chartType === "table" ? (
              <div
                className="mb-5 p-4 rounded-xl border text-sm"
                style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, var(--brand-primary) 10%, var(--surface-bg))" }}
              >
                {columnLists.header.length ? (
                  columnLists.header.map((col) => (
                    <div key={col.id} className="font-medium" style={{ color: "var(--surface-text)" }}>
                      <span className="opacity-70">{col.name}:</span> {formatPreviewValue(previewRows[0]?.[col.name] ?? "N/A", col.name)}
                    </div>
                  ))
                ) : (
                  <div style={{ color: "var(--surface-muted)" }}>No header columns selected</div>
                )}
              </div>
            ) : null}
            {previewError ? (
              <div className="mb-4 text-sm text-red-600">{previewError}</div>
            ) : null}
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--stroke)" }}>
              <table className="ui-pro-table min-w-full">
                <thead>
                  <tr>
                    {(previewTableColumnNames.length
                      ? previewTableColumnNames
                      : previewRows[0]
                        ? Object.keys(previewRows[0])
                        : []
                    ).map((name) => (
                      <th key={name}>{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewLoading ? (
                    <tr>
                      <td
                        className="px-4 py-4 text-sm"
                        style={{ color: "var(--surface-muted)" }}
                        colSpan={Math.max(previewTableColumnNames.length || (previewRows[0] ? Object.keys(previewRows[0]).length : 0), 1)}
                      >
                        Loading preview…
                      </td>
                    </tr>
                  ) : previewRows.length ? (
                    previewRows.map((row, idx) => {
                      const names =
                        previewTableColumnNames.length > 0
                          ? previewTableColumnNames
                          : Object.keys(row);
                      return (
                        <tr key={idx}>
                          {names.map((name) => (
                            <td key={`${idx}-${name}`}>{formatPreviewValue(row[name], name)}</td>
                          ))}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        className="px-4 py-4 text-sm"
                        style={{ color: "var(--surface-muted)" }}
                        colSpan={Math.max(previewTableColumnNames.length, 1)}
                      >
                        No preview rows.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignReport;

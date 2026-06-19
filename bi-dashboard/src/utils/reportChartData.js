/** SQL / chart roll-ups (dimension vs metric), similar to Superset metrics. */
export const METRIC_OPERATIONS = [
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
  { value: "count", label: "Count rows" },
  { value: "count_distinct", label: "Count distinct" },
];

export function metricOperationLabel(op) {
  const row = METRIC_OPERATIONS.find((m) => m.value === op);
  return row ? row.label : op;
}

function parseNumeric(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw == null || raw === "") return NaN;
  const parsed = parseFloat(String(raw).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : NaN;
}

/**
 * Roll up rows for charting: group by category (dimension / X-axis) and reduce metric (Y-axis) with `aggregateOp`.
 */
export function aggregateChartRows(rows, categoryKey, valueKey, getRowValue, aggregateOp = "sum") {
  if (!rows?.length || !categoryKey || typeof getRowValue !== "function") {
    return [];
  }
  const op = aggregateOp || "sum";
  if (op !== "count" && !valueKey) {
    return [];
  }

  if (op === "count") {
    const map = new Map();
    for (const row of rows) {
      const label = String(getRowValue(row, categoryKey) ?? "");
      map.set(label, (map.get(label) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }

  if (op === "count_distinct") {
    const map = new Map();
    for (const row of rows) {
      const label = String(getRowValue(row, categoryKey) ?? "");
      const v = getRowValue(row, valueKey);
      const part = v == null || v === "" ? "__empty__" : String(v);
      if (!map.has(label)) map.set(label, new Set());
      map.get(label).add(part);
    }
    return Array.from(map.entries()).map(([name, set]) => ({ name, value: set.size }));
  }

  if (op === "avg") {
    const map = new Map();
    for (const row of rows) {
      const label = String(getRowValue(row, categoryKey) ?? "");
      const n = parseNumeric(getRowValue(row, valueKey));
      if (!map.has(label)) map.set(label, { sum: 0, count: 0 });
      const acc = map.get(label);
      if (Number.isFinite(n)) {
        acc.sum += n;
        acc.count += 1;
      }
    }
    return Array.from(map.entries()).map(([name, { sum, count }]) => ({
      name,
      value: count > 0 ? sum / count : 0,
    }));
  }

  if (op === "min") {
    const map = new Map();
    for (const row of rows) {
      const label = String(getRowValue(row, categoryKey) ?? "");
      const n = parseNumeric(getRowValue(row, valueKey));
      if (!Number.isFinite(n)) continue;
      if (!map.has(label)) map.set(label, n);
      else map.set(label, Math.min(map.get(label), n));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }

  if (op === "max") {
    const map = new Map();
    for (const row of rows) {
      const label = String(getRowValue(row, categoryKey) ?? "");
      const n = parseNumeric(getRowValue(row, valueKey));
      if (!Number.isFinite(n)) continue;
      if (!map.has(label)) map.set(label, n);
      else map.set(label, Math.max(map.get(label), n));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }

  const map = new Map();
  for (const row of rows) {
    const label = String(getRowValue(row, categoryKey) ?? "");
    const n = parseNumeric(getRowValue(row, valueKey));
    const add = Number.isFinite(n) ? n : 0;
    map.set(label, (map.get(label) || 0) + add);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

/**
 * Single scalar KPI over all rows (e.g. report header aggregate strip), client-side from loaded data.
 */
export function computeScalarMetric(rows, column, op, getRowValue) {
  if (!rows?.length || typeof getRowValue !== "function") return null;
  const aggregateOp = op || "sum";
  if (aggregateOp === "count") return rows.length;
  if (!column) return null;
  if (aggregateOp === "count_distinct") {
    const s = new Set();
    for (const r of rows) {
      const v = getRowValue(r, column);
      s.add(v == null || v === "" ? "" : String(v));
    }
    return s.size;
  }
  const nums = [];
  for (const r of rows) {
    const n = parseNumeric(getRowValue(r, column));
    if (Number.isFinite(n)) nums.push(n);
  }
  if (!nums.length) return null;
  switch (aggregateOp) {
    case "sum":
      return nums.reduce((a, b) => a + b, 0);
    case "avg":
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    case "min":
      return Math.min(...nums);
    case "max":
      return Math.max(...nums);
    default:
      return nums.reduce((a, b) => a + b, 0);
  }
}

export function formatMetricValue(v) {
  if (v == null) return "—";
  if (!Number.isFinite(Number(v))) return "—";
  if (Math.abs(v - Math.round(v)) < 1e-9) return Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 });
  return Number(v).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export const CHART_TYPES = [
  { value: "table", label: "Table only" },
  { value: "bar", label: "Bar chart" },
  { value: "line", label: "Line chart" },
  { value: "area", label: "Area chart" },
  { value: "pie", label: "Pie chart" },
  { value: "doughnut", label: "Doughnut chart" },
];

export function chartTypeLabel(type) {
  const row = CHART_TYPES.find((t) => t.value === type);
  return row ? row.label.replace(" chart", "") : "Table";
}

/** Default visualization options (Superset / Power BI–style toggles). Persisted as `spec.chart_viz`. */
export const DEFAULT_CHART_VIZ = {
  colorScheme: "brand",
  chartTitle: "",
  showLegend: true,
  legendPosition: "bottom",
  showGrid: true,
  xAxisLabel: "",
  yAxisLabel: "",
  /** -28 = tilted labels for long categories; 0 = horizontal */
  xAxisTickAngle: -28,
  barCornerRadius: 4,
  lineStrokeWidth: 2,
  lineShowDots: true,
  areaFillOpacity: 0.35,
  pieShowLabels: true,
  /** percent | name | both | none */
  pieLabelFormat: "percent",
  /** Inner radius as fraction of outer radius (doughnut). */
  doughnutInnerRatio: 0.52,
  pieOuterRadius: 96,
  piePaddingAngle: 2,
};

export const CHART_COLOR_SCHEMES = {
  brand: ["#2563eb", "#14b8a6", "#d97706", "#7c3aed", "#dc2626", "#0d9488", "#4f46e5", "#ea580c"],
  ocean: ["#0ea5e9", "#0369a1", "#06b6d4", "#155e75", "#164e63", "#67e8f9", "#7dd3fc", "#38bdf8"],
  sunset: ["#f97316", "#ea580c", "#f43f5e", "#db2777", "#eab308", "#f59e0b", "#fb7185", "#fecdd3"],
  forest: ["#16a34a", "#15803d", "#4ade80", "#14532d", "#22c55e", "#166534", "#86efac", "#365314"],
  violet: ["#7c3aed", "#6d28d9", "#a78bfa", "#5b21b6", "#8b5cf6", "#4c1d95", "#c4b5fd", "#ddd6fe"],
  mono: ["#334155", "#475569", "#64748b", "#0f172a", "#1e293b", "#94a3b8", "#cbd5e1", "#78716c"],
};

export function normalizeChartViz(raw) {
  const base = { ...DEFAULT_CHART_VIZ };
  if (!raw || typeof raw !== "object") return base;
  const merged = { ...base, ...raw };
  merged.barCornerRadius = clampNumber(merged.barCornerRadius, 0, 16, DEFAULT_CHART_VIZ.barCornerRadius);
  merged.lineStrokeWidth = clampNumber(merged.lineStrokeWidth, 1, 6, DEFAULT_CHART_VIZ.lineStrokeWidth);
  merged.areaFillOpacity = clampNumber(merged.areaFillOpacity, 0.05, 1, DEFAULT_CHART_VIZ.areaFillOpacity);
  merged.doughnutInnerRatio = clampNumber(merged.doughnutInnerRatio, 0.15, 0.85, DEFAULT_CHART_VIZ.doughnutInnerRatio);
  merged.pieOuterRadius = clampNumber(merged.pieOuterRadius, 48, 140, DEFAULT_CHART_VIZ.pieOuterRadius);
  merged.piePaddingAngle = clampNumber(merged.piePaddingAngle, 0, 8, DEFAULT_CHART_VIZ.piePaddingAngle);
  merged.xAxisTickAngle = clampNumber(merged.xAxisTickAngle, -45, 45, DEFAULT_CHART_VIZ.xAxisTickAngle);
  if (!CHART_COLOR_SCHEMES[merged.colorScheme]) merged.colorScheme = "brand";
  const allowedPie = ["percent", "name", "both", "none"];
  if (!allowedPie.includes(merged.pieLabelFormat)) merged.pieLabelFormat = "percent";
  const allowedLeg = ["top", "bottom", "left", "right"];
  if (!allowedLeg.includes(merged.legendPosition)) merged.legendPosition = "bottom";
  return merged;
}

function clampNumber(n, min, max, fallback) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.min(max, Math.max(min, x));
}

export function getChartPalette(viz) {
  const v = normalizeChartViz(viz);
  return CHART_COLOR_SCHEMES[v.colorScheme] || CHART_COLOR_SCHEMES.brand;
}

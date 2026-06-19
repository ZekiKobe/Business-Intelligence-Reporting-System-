function parseNumeric(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw == null || raw === "") return NaN;
  const parsed = parseFloat(String(raw).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : NaN;
}

/**
 * Roll up rows for charting: group by category and apply aggregate (sum, count per category, etc.).
 */
export function aggregateChartRows(
  rows: Record<string, unknown>[],
  categoryKey: string,
  valueKey: string,
  getRowValue: (row: Record<string, unknown>, col: string) => unknown,
  aggregateOp: string = "sum"
): { name: string; value: number }[] {
  if (!rows?.length || !categoryKey || typeof getRowValue !== "function") {
    return [];
  }
  const op = aggregateOp || "sum";
  if (op !== "count" && !valueKey) {
    return [];
  }

  if (op === "count") {
    const map = new Map<string, number>();
    for (const row of rows) {
      const label = String(getRowValue(row, categoryKey) ?? "");
      map.set(label, (map.get(label) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }

  if (op === "count_distinct") {
    const map = new Map<string, Set<string>>();
    for (const row of rows) {
      const label = String(getRowValue(row, categoryKey) ?? "");
      const v = getRowValue(row, valueKey);
      const part = v == null || v === "" ? "__empty__" : String(v);
      if (!map.has(label)) map.set(label, new Set());
      map.get(label)!.add(part);
    }
    return Array.from(map.entries()).map(([name, set]) => ({ name, value: set.size }));
  }

  if (op === "avg") {
    const map = new Map<string, { sum: number; count: number }>();
    for (const row of rows) {
      const label = String(getRowValue(row, categoryKey) ?? "");
      const n = parseNumeric(getRowValue(row, valueKey));
      if (!map.has(label)) map.set(label, { sum: 0, count: 0 });
      const acc = map.get(label)!;
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
    const map = new Map<string, number>();
    for (const row of rows) {
      const label = String(getRowValue(row, categoryKey) ?? "");
      const n = parseNumeric(getRowValue(row, valueKey));
      if (!Number.isFinite(n)) continue;
      if (!map.has(label)) map.set(label, n);
      else map.set(label, Math.min(map.get(label)!, n));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }

  if (op === "max") {
    const map = new Map<string, number>();
    for (const row of rows) {
      const label = String(getRowValue(row, categoryKey) ?? "");
      const n = parseNumeric(getRowValue(row, valueKey));
      if (!Number.isFinite(n)) continue;
      if (!map.has(label)) map.set(label, n);
      else map.set(label, Math.max(map.get(label)!, n));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }

  const map = new Map<string, number>();
  for (const row of rows) {
    const label = String(getRowValue(row, categoryKey) ?? "");
    const n = parseNumeric(getRowValue(row, valueKey));
    const add = Number.isFinite(n) ? n : 0;
    map.set(label, (map.get(label) || 0) + add);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

export const CHART_TYPES = [
  { value: "table", label: "Table only" },
  { value: "bar", label: "Bar chart" },
  { value: "line", label: "Line chart" },
  { value: "area", label: "Area chart" },
  { value: "pie", label: "Pie chart" },
  { value: "doughnut", label: "Doughnut chart" },
] as const;

export function chartTypeLabel(type: string | undefined): string {
  const row = CHART_TYPES.find((t) => t.value === type);
  if (!row) return "Table";
  return row.label.replace(" chart", "").replace(" only", "");
}

export function metricOperationLabel(op: string | undefined): string {
  const map: Record<string, string> = {
    sum: "Sum",
    avg: "Average",
    min: "Minimum",
    max: "Maximum",
    count: "Count rows",
    count_distinct: "Count distinct",
  };
  return (op && map[op]) || op || "Sum";
}

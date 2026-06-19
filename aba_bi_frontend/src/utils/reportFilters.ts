/** Client-side report filter helpers (used with spec.filter_columns + spec.filter_column_types). */

export type FilterControlKind = "date" | "select" | "text";

const DATE_TYPE_RE = /DATE|TIME|TIMESTAMP|INTERVAL/i;
const NUMERIC_TYPE_RE = /INT|DECIMAL|FLOAT|DOUBLE|NUMBER|NUMERIC|REAL|BOOL|BIT/i;

export function inferFilterKind(sqlType: string | undefined, columnName: string): FilterControlKind {
  const t = sqlType || "";
  const n = columnName.toUpperCase();
  if (DATE_TYPE_RE.test(t) || /_DATE$|_AT$|^DATE|^CREATED|^UPDATED/i.test(n)) {
    return "date";
  }
  if (/CHAR|CLOB|TEXT|STRING|VARCHAR/i.test(t) && /DESC|COMMENT|NOTE|ADDRESS|NAME$/i.test(n)) {
    return "text";
  }
  if (NUMERIC_TYPE_RE.test(t)) {
    return "select";
  }
  return "select";
}

export function toDateInputValue(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "string") {
    const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  return "";
}

export function rowMatchesFilters(
  row: Record<string, unknown>,
  filterColumns: string[],
  filterValues: Record<string, string>,
  filterTypes: Record<string, FilterControlKind>,
  getCell: (row: Record<string, unknown>, col: string) => unknown
): boolean {
  for (const col of filterColumns) {
    const selected = filterValues[col];
    if (selected == null || selected === "") continue;
    const cell = getCell(row, col);
    const kind = filterTypes[col] || "select";
    if (kind === "date") {
      const a = toDateInputValue(cell);
      if (a !== selected) return false;
      continue;
    }
    if (kind === "text") {
      if (!String(cell ?? "").toLowerCase().includes(selected.toLowerCase())) return false;
      continue;
    }
    if (String(cell ?? "") !== selected) return false;
  }
  return true;
}

export function distinctValues(
  rows: Record<string, unknown>[],
  column: string,
  getCell: (row: Record<string, unknown>, col: string) => unknown,
  max = 300
): string[] {
  const s = new Set<string>();
  for (const r of rows) {
    const v = getCell(r, column);
    if (v == null || v === "") continue;
    s.add(String(v));
    if (s.size >= max) break;
  }
  return Array.from(s).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

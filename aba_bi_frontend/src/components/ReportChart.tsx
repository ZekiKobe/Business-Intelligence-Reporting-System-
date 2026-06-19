import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { aggregateChartRows, metricOperationLabel } from "../utils/reportChartData";

const COLORS = [
  "#2563eb",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0d9488",
  "#ea580c",
  "#4f46e5",
];

export type ReportChartProps = {
  chartType?: string;
  categoryKey: string;
  valueKey: string;
  rows: Record<string, unknown>[];
  getRowValue: (row: Record<string, unknown>, col: string) => unknown;
  height?: number;
  title?: string;
  /** From report spec; `count` does not require `valueKey`. */
  valueAggregate?: string;
};

const ReportChart: React.FC<ReportChartProps> = ({
  chartType = "table",
  categoryKey,
  valueKey,
  rows,
  getRowValue,
  height = 320,
  title = "Chart",
  valueAggregate = "sum",
}) => {
  const data = useMemo(
    () => aggregateChartRows(rows, categoryKey, valueKey, getRowValue, valueAggregate),
    [rows, categoryKey, valueKey, getRowValue, valueAggregate]
  );

  const needsValueKey = valueAggregate !== "count";
  const metricHint =
    valueAggregate === "count"
      ? "Row count per category"
      : `${metricOperationLabel(valueAggregate)} of ${valueKey || "metric"}`;

  if (!chartType || chartType === "table") return null;
  if (!categoryKey || (needsValueKey && !valueKey)) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/35 dark:text-amber-100 dark:border-amber-800/50">
        {needsValueKey
          ? "Select category and value columns using the dropdowns above, then run the report."
          : "Select a category column using the dropdown above, then run the report (chart uses row counts)."}
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-300">
        Run the report to load rows and plot the chart.
      </div>
    );
  }
  if (!data.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        No numeric data to plot for the selected columns.
      </div>
    );
  }

  const grid = <CartesianGrid strokeDasharray="3 3" className="opacity-40" />;
  const axes = (
    <>
      {grid}
      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-28} textAnchor="end" height={72} />
      <YAxis tick={{ fontSize: 11 }} />
      <Tooltip formatter={(value) => [Number(value ?? 0).toLocaleString(), metricHint]} />
      <Legend />
    </>
  );

  const cartesianMargin = { top: 8, right: 16, left: 0, bottom: 8 };
  const isDoughnut = chartType === "doughnut";

  const mainChart: React.ReactElement =
    chartType === "line" ? (
      <LineChart data={data} margin={cartesianMargin}>
        {axes}
        <Line type="monotone" dataKey="value" name={valueKey} stroke="#2563eb" strokeWidth={2} dot />
      </LineChart>
    ) : chartType === "area" ? (
      <AreaChart data={data} margin={cartesianMargin}>
        {axes}
        <Area type="monotone" dataKey="value" name={valueKey} stroke="#2563eb" fill="#93c5fd" fillOpacity={0.35} />
      </AreaChart>
    ) : chartType === "pie" || isDoughnut ? (
      <PieChart>
        <Tooltip formatter={(value) => [Number(value ?? 0).toLocaleString(), metricHint]} />
        <Legend />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={isDoughnut ? 52 : 0}
          outerRadius={96}
          paddingAngle={2}
          label={(props: { name?: string; percent?: number }) =>
            `${props.name ?? ""} (${((props.percent ?? 0) * 100).toFixed(0)}%)`}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    ) : (
      <BarChart data={data} margin={cartesianMargin}>
        {axes}
        <Bar dataKey="value" name={valueKey} fill="#2563eb" radius={[4, 4, 0, 0]} />
      </BarChart>
    );

  return (
    <div className="w-full rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">{title}</h3>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          {mainChart}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ReportChart;

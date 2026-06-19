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
import {
  aggregateChartRows,
  normalizeChartViz,
  getChartPalette,
  metricOperationLabel,
} from "../utils/reportChartData";

function legendLayoutProps(position) {
  switch (position) {
    case "top":
      return { verticalAlign: "top", align: "center", layout: "horizontal" };
    case "left":
      return { verticalAlign: "middle", align: "left", layout: "vertical" };
    case "right":
      return { verticalAlign: "middle", align: "right", layout: "vertical" };
    case "bottom":
    default:
      return { verticalAlign: "bottom", align: "center", layout: "horizontal" };
  }
}

function pieLabelRenderer(format) {
  if (format === "none") return false;
  if (format === "name") return ({ name }) => String(name ?? "");
  if (format === "both") return ({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`;
  return ({ name, percent }) => `${(percent * 100).toFixed(0)}%`;
}

export default function ReportChartPanel({
  chartType = "table",
  categoryKey,
  valueKey,
  rows = [],
  getRowValue,
  height = 320,
  title = "Chart",
  viz: vizProp,
  valueAggregate = "sum",
}) {
  const viz = normalizeChartViz(vizProp);
  const colors = getChartPalette(viz);
  const primary = colors[0] || "#2563eb";
  const secondaryFill = colors[1] || "#93c5fd";

  const data = useMemo(
    () => aggregateChartRows(rows, categoryKey, valueKey, getRowValue, valueAggregate),
    [rows, categoryKey, valueKey, getRowValue, valueAggregate]
  );

  const metricHint =
    valueAggregate === "count"
      ? "Row count per category"
      : `${metricOperationLabel(valueAggregate)} of ${valueKey || "metric"}`;

  const displayTitle = viz.chartTitle?.trim() || title;
  const legendProps = legendLayoutProps(viz.legendPosition);
  const xAngle = Number(viz.xAxisTickAngle) || 0;
  const xHeight = xAngle === 0 ? 40 : 72;

  if (!chartType || chartType === "table") return null;

  const needsValueKey = valueAggregate !== "count";
  if (!categoryKey || (needsValueKey && !valueKey)) {
    return (
      <div
        className="rounded-xl border px-4 py-3 text-sm"
        style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, var(--brand-primary-soft) 40%, var(--surface-bg))", color: "var(--surface-text)" }}
      >
        {needsValueKey
          ? "Select a category column and a value column in the chart section above, then run the report."
          : "Select a category column in the chart section above, then run the report (value is row count per category)."}
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div
        className="rounded-xl border px-4 py-3 text-sm"
        style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, var(--app-bg) 55%, var(--surface-bg))", color: "var(--surface-muted)" }}
      >
        Run the report to load rows and plot the chart.
      </div>
    );
  }
  if (!data.length) {
    return (
      <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--stroke)", background: "var(--app-bg)", color: "var(--surface-muted)" }}>
        No numeric data to plot for the selected columns.
      </div>
    );
  }

  const gridEl = viz.showGrid ? <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke)" opacity={0.65} /> : null;

  const axisTick = { fill: "var(--surface-muted)", fontSize: 11 };

  const xAxis = (
    <XAxis
      dataKey="name"
      tick={axisTick}
      interval={0}
      angle={xAngle}
      textAnchor={xAngle ? "end" : "middle"}
      height={xHeight}
      tickLine={{ stroke: "var(--stroke)" }}
      axisLine={{ stroke: "var(--stroke)" }}
      label={
        viz.xAxisLabel
          ? { value: viz.xAxisLabel, position: "insideBottom", offset: xAngle ? -36 : -8, style: { fill: "var(--surface-muted)", fontSize: 11 } }
          : undefined
      }
    />
  );

  const yAxis = (
    <YAxis
      tick={axisTick}
      tickLine={{ stroke: "var(--stroke)" }}
      axisLine={{ stroke: "var(--stroke)" }}
      label={
        viz.yAxisLabel
          ? { value: viz.yAxisLabel, angle: -90, position: "insideLeft", style: { fill: "var(--surface-muted)", fontSize: 11 } }
          : undefined
      }
    />
  );

  const tooltipEl = (
    <Tooltip
      contentStyle={{
        background: "var(--surface-bg)",
        border: `1px solid var(--stroke)`,
        borderRadius: "0.75rem",
        fontSize: "12px",
        color: "var(--surface-text)",
      }}
      formatter={(v) => [Number(v).toLocaleString(), metricHint]}
    />
  );

  const legendEl = viz.showLegend ? (
    <Legend
      {...legendProps}
      wrapperStyle={{ fontSize: "12px", color: "var(--surface-muted)" }}
    />
  ) : null;

  const barR = Math.max(0, Math.min(16, viz.barCornerRadius || 0));

  const outerR = viz.pieOuterRadius;
  const innerR = chartType === "doughnut" ? Math.round(outerR * viz.doughnutInnerRatio) : 0;
  const pieLabel = viz.pieShowLabels ? pieLabelRenderer(viz.pieLabelFormat) : false;

  return (
    <div
      className="w-full rounded-xl border p-4 md:p-5"
      style={{
        borderColor: "var(--stroke)",
        background: "linear-gradient(165deg, var(--surface-bg) 0%, color-mix(in srgb, var(--app-bg) 25%, var(--surface-bg)) 100%)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <h3 className="font-display text-sm font-semibold mb-3" style={{ color: "var(--surface-text)" }}>
        {displayTitle}
      </h3>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: xAngle ? 16 : 8 }}>
              {gridEl}
              {xAxis}
              {yAxis}
              {tooltipEl}
              {legendEl}
              <Bar dataKey="value" name={valueKey} fill={primary} radius={[barR, barR, 0, 0]} maxBarSize={56} />
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: xAngle ? 16 : 8 }}>
              {gridEl}
              {xAxis}
              {yAxis}
              {tooltipEl}
              {legendEl}
              <Line
                type="monotone"
                dataKey="value"
                name={valueKey}
                stroke={primary}
                strokeWidth={viz.lineStrokeWidth}
                dot={viz.lineShowDots ? { r: 3, fill: primary } : false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          ) : chartType === "area" ? (
            <AreaChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: xAngle ? 16 : 8 }}>
              {gridEl}
              {xAxis}
              {yAxis}
              {tooltipEl}
              {legendEl}
              <Area
                type="monotone"
                dataKey="value"
                name={valueKey}
                stroke={primary}
                fill={secondaryFill}
                fillOpacity={viz.areaFillOpacity}
                strokeWidth={2}
              />
            </AreaChart>
          ) : chartType === "pie" || chartType === "doughnut" ? (
            <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              {tooltipEl}
              {legendEl}
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={innerR}
                outerRadius={outerR}
                paddingAngle={viz.piePaddingAngle}
                label={pieLabel}
                labelLine={viz.pieShowLabels && viz.pieLabelFormat !== "none"}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} stroke="var(--surface-bg)" strokeWidth={1} />
                ))}
              </Pie>
            </PieChart>
          ) : null}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

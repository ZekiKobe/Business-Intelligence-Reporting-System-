import { Palette, LayoutGrid, Axis3d, PieChart as PieIcon } from "lucide-react";
import { CHART_COLOR_SCHEMES, DEFAULT_CHART_VIZ } from "../utils/reportChartData";

const schemeLabels = {
  brand: "Brand (default)",
  ocean: "Ocean",
  sunset: "Sunset",
  forest: "Forest",
  violet: "Violet",
  mono: "Slate mono",
};

function patch(v, partial) {
  return { ...v, ...partial };
}

export default function ChartVizSettings({ chartType, value, onChange }) {
  if (chartType === "table") {
    return (
      <p className="text-xs opacity-70 leading-relaxed" style={{ color: "var(--surface-text)" }}>
        Switch visualization to a chart type below to unlock color palettes, legends, axes, and slice labels—similar to Superset or Power BI.
      </p>
    );
  }

  const v = { ...DEFAULT_CHART_VIZ, ...value };
  const set = (partial) => onChange(patch(v, partial));

  const isPie = chartType === "pie" || chartType === "doughnut";
  const isCartesian = chartType === "bar" || chartType === "line" || chartType === "area";

  return (
    <div className="space-y-5">
      <section className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--stroke)", background: "var(--surface-bg)" }}>
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-70">
          <Palette size={14} className="opacity-80" /> Appearance
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="ui-label">Color palette</span>
            <select className="ui-select w-full" value={v.colorScheme} onChange={(e) => set({ colorScheme: e.target.value })}>
              {Object.keys(CHART_COLOR_SCHEMES).map((key) => (
                <option key={key} value={key}>
                  {schemeLabels[key] || key}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="ui-label">Chart title override (optional)</span>
            <input
              type="text"
              className="ui-input w-full"
              placeholder="Leave empty to use default title"
              value={v.chartTitle}
              onChange={(e) => set({ chartTitle: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--stroke)", background: "var(--surface-bg)" }}>
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-70">
          <LayoutGrid size={14} className="opacity-80" /> Legend & grid
        </h4>
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: "var(--surface-text)" }}>
            <input type="checkbox" className="rounded border-gray-300" checked={v.showLegend} onChange={(e) => set({ showLegend: e.target.checked })} />
            Show legend
          </label>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: "var(--surface-text)" }}>
            <input type="checkbox" className="rounded border-gray-300" checked={v.showGrid} onChange={(e) => set({ showGrid: e.target.checked })} disabled={!isCartesian} />
            Show grid
          </label>
        </div>
        <label className="block max-w-xs">
          <span className="ui-label">Legend position</span>
          <select
            className="ui-select w-full disabled:opacity-50"
            value={v.legendPosition}
            onChange={(e) => set({ legendPosition: e.target.value })}
            disabled={!v.showLegend}
          >
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </label>
      </section>

      {isCartesian ? (
        <section className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--stroke)", background: "var(--surface-bg)" }}>
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-70">
            <Axis3d size={14} className="opacity-80" /> Axes
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="ui-label">X-axis label</span>
              <input type="text" className="ui-input w-full" value={v.xAxisLabel} onChange={(e) => set({ xAxisLabel: e.target.value })} placeholder="e.g. Category" />
            </label>
            <label className="block">
              <span className="ui-label">Y-axis label</span>
              <input type="text" className="ui-input w-full" value={v.yAxisLabel} onChange={(e) => set({ yAxisLabel: e.target.value })} placeholder="e.g. Revenue" />
            </label>
            <label className="block sm:col-span-2">
              <span className="ui-label">Category label angle</span>
              <select
                className="ui-select w-full max-w-md"
                value={String(v.xAxisTickAngle)}
                onChange={(e) => set({ xAxisTickAngle: Number(e.target.value) })}
              >
                <option value="-28">Tilted (−28°) — fits long names</option>
                <option value="0">Horizontal (0°)</option>
                <option value="-45">Steep (−45°)</option>
              </select>
            </label>
          </div>

          {chartType === "bar" ? (
            <label className="block max-w-md">
              <span className="ui-label">Bar corner radius ({v.barCornerRadius}px)</span>
              <input
                type="range"
                min={0}
                max={16}
                value={v.barCornerRadius}
                onChange={(e) => set({ barCornerRadius: Number(e.target.value) })}
                className="w-full accent-[var(--brand-primary)]"
              />
            </label>
          ) : null}

          {chartType === "line" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="ui-label">Line width ({v.lineStrokeWidth}px)</span>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={v.lineStrokeWidth}
                  onChange={(e) => set({ lineStrokeWidth: Number(e.target.value) })}
                  className="w-full accent-[var(--brand-primary)]"
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm mt-6 sm:mt-8 cursor-pointer select-none" style={{ color: "var(--surface-text)" }}>
                <input type="checkbox" checked={v.lineShowDots} onChange={(e) => set({ lineShowDots: e.target.checked })} />
                Show point markers
              </label>
            </div>
          ) : null}

          {chartType === "area" ? (
            <label className="block max-w-md">
              <span className="ui-label">Fill opacity ({Math.round(v.areaFillOpacity * 100)}%)</span>
              <input
                type="range"
                min={5}
                max={100}
                value={Math.round(v.areaFillOpacity * 100)}
                onChange={(e) => set({ areaFillOpacity: Number(e.target.value) / 100 })}
                className="w-full accent-[var(--brand-primary)]"
              />
            </label>
          ) : null}
        </section>
      ) : null}

      {isPie ? (
        <section className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--stroke)", background: "var(--surface-bg)" }}>
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-70">
            <PieIcon size={14} className="opacity-80" /> Slice layout
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: "var(--surface-text)" }}>
              <input type="checkbox" checked={v.pieShowLabels} onChange={(e) => set({ pieShowLabels: e.target.checked })} />
              Show slice labels
            </label>
            <label className="block">
              <span className="ui-label">Label format</span>
              <select
                className="ui-select w-full"
                value={v.pieLabelFormat}
                onChange={(e) => set({ pieLabelFormat: e.target.value })}
                disabled={!v.pieShowLabels}
              >
                <option value="percent">Percent only</option>
                <option value="name">Name only</option>
                <option value="both">Name + percent</option>
                <option value="none">Hidden (legend only)</option>
              </select>
            </label>
            <label className="block">
              <span className="ui-label">Outer radius ({v.pieOuterRadius}px)</span>
              <input
                type="range"
                min={48}
                max={140}
                value={v.pieOuterRadius}
                onChange={(e) => set({ pieOuterRadius: Number(e.target.value) })}
                className="w-full accent-[var(--brand-primary)]"
              />
            </label>
            <label className="block">
              <span className="ui-label">Slice gap ({v.piePaddingAngle}°)</span>
              <input
                type="range"
                min={0}
                max={8}
                value={v.piePaddingAngle}
                onChange={(e) => set({ piePaddingAngle: Number(e.target.value) })}
                className="w-full accent-[var(--brand-primary)]"
              />
            </label>
            {chartType === "doughnut" ? (
              <label className="block sm:col-span-2">
                <span className="ui-label">Hole size ({Math.round(v.doughnutInnerRatio * 100)}% of radius)</span>
                <input
                  type="range"
                  min={15}
                  max={85}
                  value={Math.round(v.doughnutInnerRatio * 100)}
                  onChange={(e) => set({ doughnutInnerRatio: Number(e.target.value) / 100 })}
                  className="w-full accent-[var(--brand-primary)]"
                />
              </label>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

import {
  ChevronRight,
  FileText,
  Users as UsersIcon,
  BarChart3,
  Shield,
  ArrowUpRight,
  Play,
  Database,
  Layers,
  Box,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { fetchReportGroups, getAllReports } from "../controllers/reportController";
import { getUsers } from "../controllers/userController";
import BiPageHeader from "../components/BiPageHeader";
import PageLoadingSpinner from "../components/PageLoadingSpinner";

const KpiSparkline = ({ stroke }) => {
  const c = stroke || "var(--brand-primary)";
  return (
    <svg className="bi-sparkline mt-2" viewBox="0 0 80 28" aria-hidden>
      <path
        d="M2 22 L14 14 L26 18 L40 6 L52 12 L66 8 L78 16"
        fill="none"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
};

const Dashboard = () => {
  const [allReports, setAllReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [reports, userRows, groupRows] = await Promise.all([
          getAllReports(),
          getUsers(),
          fetchReportGroups(),
        ]);
        setAllReports(reports || []);
        setUsers(userRows || []);
        setGroups(groupRows || []);
      } catch (error) {
        toast.error("Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const activeUsers = useMemo(() => users.filter((u) => u.status === "Active").length, [users]);
  const viewerCount = useMemo(() => users.filter((u) => u.role === "Viewer").length, [users]);

  const recentReports = useMemo(() => (allReports || []).slice(0, 6), [allReports]);

  if (loading) {
    return <PageLoadingSpinner minHeight="min-h-[60vh]" label="Loading dashboard…" />;
  }

  return (
    <div className="ui-shell max-w-[1600px] mx-auto pb-10">
      <div className="mb-8">
        <BiPageHeader
          eyebrow="Command center"
          title="Operations overview"
          description="Monitor catalog health, govern viewer access, and jump into the workflows your analysts use every day."
          badges={[
            { label: `${allReports.length} report${allReports.length === 1 ? "" : "s"} in catalog` },
            { label: `${activeUsers} active user${activeUsers === 1 ? "" : "s"}` },
          ]}
          variant="default"
          accent="sky"
        />
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 mb-8">
        <div className="ui-kpi relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.07] pointer-events-none" style={{ background: "var(--brand-primary)" }} />
          <div className="flex items-start justify-between gap-3 relative">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-55">Total reports</p>
              <p className="font-display text-2xl md:text-3xl font-bold mt-1 tabular-nums" style={{ color: "var(--surface-text)" }}>
                {allReports.length}
              </p>
              <KpiSparkline stroke="var(--brand-primary)" />
            </div>
            <div className="ui-kpi-icon shrink-0" style={{ background: "var(--brand-primary-soft)", color: "var(--brand-primary)" }}>
              <FileText size={22} strokeWidth={2} />
            </div>
          </div>
          <p className="text-xs mt-1 opacity-55 relative">Published definitions & saved queries</p>
        </div>

        <div className="ui-kpi relative overflow-hidden">
          <div className="flex items-start justify-between gap-3 relative">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-55">Active users</p>
              <p className="font-display text-2xl md:text-3xl font-bold mt-1 tabular-nums" style={{ color: "var(--surface-text)" }}>
                {activeUsers}
              </p>
              <KpiSparkline stroke="#059669" />
            </div>
            <div className="ui-kpi-icon shrink-0 bg-emerald-500/15 text-emerald-700">
              <UsersIcon size={22} strokeWidth={2} />
            </div>
          </div>
          <p className="text-xs mt-1 opacity-55">Enabled accounts in this workspace</p>
        </div>

        <div className="ui-kpi relative overflow-hidden">
          <div className="flex items-start justify-between gap-3 relative">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-55">Report groups</p>
              <p className="font-display text-2xl md:text-3xl font-bold mt-1 tabular-nums" style={{ color: "var(--surface-text)" }}>
                {groups.length}
              </p>
              <KpiSparkline stroke="#7c3aed" />
            </div>
            <div className="ui-kpi-icon shrink-0 bg-violet-500/15 text-violet-700">
              <BarChart3 size={22} strokeWidth={2} />
            </div>
          </div>
          <p className="text-xs mt-1 opacity-55">Folders exposed in navigation</p>
        </div>

        <div className="ui-kpi relative overflow-hidden">
          <div className="flex items-start justify-between gap-3 relative">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-55">Viewer seats</p>
              <p className="font-display text-2xl md:text-3xl font-bold mt-1 tabular-nums" style={{ color: "var(--surface-text)" }}>
                {viewerCount}
              </p>
              <KpiSparkline stroke="#d97706" />
            </div>
            <div className="ui-kpi-icon shrink-0 bg-amber-500/15 text-amber-800">
              <Shield size={22} strokeWidth={2} />
            </div>
          </div>
          <p className="text-xs mt-1 opacity-55">
            Govern group access under{" "}
            <Link to="/user/access" className="font-semibold underline-offset-2 hover:underline" style={{ color: "var(--brand-primary)" }}>
              Access
            </Link>
          </p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.12em] opacity-55 mb-3">Shortcuts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Link to="/reports" className="bi-action-tile group">
            <span className="bi-action-tile__icon group-hover:scale-[1.03] transition-transform">
              <Play size={18} strokeWidth={2.25} />
            </span>
            <span className="min-w-0">
              <span className="font-display font-semibold text-sm block" style={{ color: "var(--surface-text)" }}>
                Run reports
              </span>
              <span className="text-xs opacity-60 leading-snug block mt-0.5">Execute saved definitions against live data</span>
            </span>
            <ArrowUpRight size={16} className="shrink-0 opacity-35 group-hover:opacity-70 ml-auto" />
          </Link>
          <Link to="/reports/design" className="bi-action-tile group">
            <span className="bi-action-tile__icon group-hover:scale-[1.03] transition-transform">
              <Box size={18} strokeWidth={2.25} />
            </span>
            <span className="min-w-0">
              <span className="font-display font-semibold text-sm block" style={{ color: "var(--surface-text)" }}>
                Design report
              </span>
              <span className="text-xs opacity-60 leading-snug block mt-0.5">Visual builder, charts, and SQL preview</span>
            </span>
            <ArrowUpRight size={16} className="shrink-0 opacity-35 group-hover:opacity-70 ml-auto" />
          </Link>
          <Link to="/data-sources" className="bi-action-tile group">
            <span className="bi-action-tile__icon group-hover:scale-[1.03] transition-transform">
              <Database size={18} strokeWidth={2.25} />
            </span>
            <span className="min-w-0">
              <span className="font-display font-semibold text-sm block" style={{ color: "var(--surface-text)" }}>
                Data sources
              </span>
              <span className="text-xs opacity-60 leading-snug block mt-0.5">Connections, credentials, test health</span>
            </span>
            <ArrowUpRight size={16} className="shrink-0 opacity-35 group-hover:opacity-70 ml-auto" />
          </Link>
          <Link to="/report-groups" className="bi-action-tile group">
            <span className="bi-action-tile__icon group-hover:scale-[1.03] transition-transform">
              <Layers size={18} strokeWidth={2.25} />
            </span>
            <span className="min-w-0">
              <span className="font-display font-semibold text-sm block" style={{ color: "var(--surface-text)" }}>
                Report groups
              </span>
              <span className="text-xs opacity-60 leading-snug block mt-0.5">Curate how content is organized</span>
            </span>
            <ArrowUpRight size={16} className="shrink-0 opacity-35 group-hover:opacity-70 ml-auto" />
          </Link>
        </div>
      </div>

      <div className="surface-card p-5 md:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-display text-lg font-semibold" style={{ color: "var(--surface-text)" }}>
              Recent catalog entries
            </h3>
            <p className="text-sm mt-0.5 opacity-60">Latest reports by save order — open designer or run from Reports.</p>
          </div>
          <Link
            to="/reports"
            className="ui-btn-ghost text-sm font-semibold inline-flex items-center gap-1 px-3"
            style={{ color: "var(--brand-primary)" }}
          >
            View all <ChevronRight size={16} />
          </Link>
        </div>

        {recentReports.length === 0 ? (
          <div
            className="rounded-xl border border-dashed px-6 py-14 text-center"
            style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, var(--app-bg) 70%, transparent)" }}
          >
            <FileText className="mx-auto opacity-25 mb-3" size={40} strokeWidth={1.25} />
            <p className="font-display font-semibold" style={{ color: "var(--surface-text)" }}>
              No reports yet
            </p>
            <p className="text-sm opacity-60 max-w-md mx-auto mt-2">
              Connect a data source, then use the report designer to publish your first dataset and visual.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link to="/data-sources" className="ui-btn-secondary text-sm">
                Add data source
              </Link>
              <Link to="/reports/design" className="ui-btn-primary text-sm">
                Open designer
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {recentReports.map((report) => (
              <div
                key={report.id}
                className="group rounded-xl border p-4 md:p-5 transition-all duration-200 hover:shadow-lg relative overflow-hidden"
                style={{
                  borderColor: "var(--stroke)",
                  background: "linear-gradient(165deg, var(--surface-bg) 0%, color-mix(in srgb, var(--app-bg) 35%, var(--surface-bg)) 100%)",
                }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "linear-gradient(90deg, var(--brand-primary), var(--brand-accent))" }}
                />
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h4 className="font-display font-semibold text-sm md:text-base leading-snug pr-2" style={{ color: "var(--surface-text)" }}>
                    {report.name}
                  </h4>
                  <span className="ui-badge ui-badge--muted shrink-0 tabular-nums">#{report.report_id}</span>
                </div>
                <p className="text-xs md:text-sm opacity-65 mb-4 line-clamp-2">{report.dataset || "No dataset linked"}</p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium opacity-70 mb-4">
                  <span
                    className="rounded-md px-2 py-0.5"
                    style={{ background: "var(--brand-primary-soft)", color: "var(--brand-primary)" }}
                  >
                    {report.group || "Ungrouped"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1 border-t" style={{ borderColor: "var(--stroke)" }}>
                  <Link
                    to={report.id != null ? `/reports/run/${report.id}` : "/reports"}
                    className="ui-btn-secondary text-xs py-1.5 px-3 gap-1"
                  >
                    <Play size={14} /> Run
                  </Link>
                  {report.id != null ? (
                    <Link
                      to={`/reports/design/${report.id}`}
                      className="ui-btn-ghost text-xs py-1.5 px-3 gap-1"
                      style={{ color: "var(--brand-primary)" }}
                    >
                      <Box size={14} /> Edit
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

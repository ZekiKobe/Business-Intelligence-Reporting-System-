import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  DocumentTextIcon,
  Bars3Icon,
  XMarkIcon,
  UserIcon,
  ArrowLeftOnRectangleIcon,
  Cog6ToothIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";
import { useBranding } from "../context/BrandingContext";
import BrandingLogoImg from "./BrandingLogoImg";
import { getReportGroups, logoutRequest } from "../services/api";

interface Report {
  id: number | string;
  name: string;
  params?: Record<string, any>;
}

interface ReportGroup {
  group: string;
  reports: Report[];
}

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { branding } = useBranding();

  const [reportGroups, setReportGroups] = useState<ReportGroup[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const groups = await getReportGroups();
        const mapped: ReportGroup[] = (groups || []).map((g: any) => ({
          group: g.group_name,
          reports: (g.reports || []).map((r: any) => ({
            id: r.id,
            name: r.name,
          })),
        }));
        setReportGroups(mapped);
      } catch (e) {
        setReportGroups([]);
      }
    };
    load();
  }, []);

  const handleReportClick = (report: Report) => {
    if (window.innerWidth < 1024) {
      const event = new CustomEvent("close-sidebar");
      window.dispatchEvent(event);
    }
    navigate(`/report/${report.id}`, { state: { name: report.name } });
  };

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {
      /* still clear client state */
    }
    localStorage.removeItem("bi_token");
    localStorage.removeItem("bi_refresh");
    localStorage.removeItem("bi_tenant_slug");
    window.dispatchEvent(new Event("bi-branding-refresh"));
    navigate("/");
  };

  return (
    <aside
      className={`font-sans transition-all duration-300 ease-out flex flex-col shadow-[8px_0_48px_rgba(0,0,0,0.22)] ${
        sidebarOpen ? "w-64" : "w-[4.5rem]"
      } h-screen sticky top-0 z-40 border-r`}
      style={{
        background: "linear-gradient(180deg, var(--portal-sidebar) 0%, #080c16 100%)",
        borderColor: "var(--portal-sidebar-border)",
        color: "#e2e8f0",
      }}
    >
      <div className="p-4 border-b flex items-center justify-between gap-2" style={{ borderColor: "var(--portal-sidebar-border)" }}>
        {sidebarOpen ? (
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-white/15"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <BrandingLogoImg logoUrl={branding.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-white truncate tracking-tight">{branding.companyName}</p>
              <p className="text-[11px] text-slate-400 truncate">{branding.productName}</p>
            </div>
          </div>
        ) : (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto overflow-hidden ring-1 ring-white/15"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <BrandingLogoImg logoUrl={branding.logoUrl} alt="" className="w-7 h-7 rounded-lg object-cover" />
          </div>
        )}
        <button
          type="button"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-4">
        <button
          type="button"
          className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left font-medium transition-colors mb-3 ${
            location.pathname === "/home"
              ? "text-white shadow-lg"
              : "text-slate-200 hover:bg-white/5"
          }`}
          style={
            location.pathname === "/home"
              ? {
                  background: "linear-gradient(135deg, var(--portal-primary), var(--portal-accent))",
                  boxShadow: "0 8px 24px rgba(37, 99, 235, 0.32)",
                }
              : undefined
          }
          title="Report catalog"
          onClick={() => {
            navigate("/home");
            if (window.innerWidth < 1024) {
              window.dispatchEvent(new CustomEvent("close-sidebar"));
            }
          }}
        >
          <div
            className={`p-1.5 rounded-lg shrink-0 ${
              location.pathname === "/home" ? "bg-white/20" : "bg-sky-500/15 text-sky-300"
            }`}
          >
            <HomeIcon className="h-4 w-4" />
          </div>
          {sidebarOpen && <span className="text-sm truncate">Home & catalog</span>}
        </button>
        <p
          className={`px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 ${sidebarOpen ? "" : "sr-only"}`}
        >
          Reports
        </p>
        <ul className="space-y-1">
          {reportGroups.map((group) => (
            <li key={group.group} className="rounded-xl overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between p-2.5 rounded-xl text-left font-medium text-slate-200 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 transition-colors"
                onClick={() => setOpenGroup(openGroup === group.group ? null : group.group)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0">
                    <FolderIcon className="h-4 w-4" />
                  </div>
                  {sidebarOpen && <span className="text-sm truncate">{group.group}</span>}
                </div>
                {sidebarOpen &&
                  (openGroup === group.group ? (
                    <ChevronDownIcon className="h-4 w-4 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4 text-slate-500 shrink-0" />
                  ))}
              </button>

              {openGroup === group.group && sidebarOpen && (
                <ul className="pl-2 pr-1 pb-2 pt-1 space-y-0.5 border-l border-white/10 ml-4">
                  {group.reports.map((report) => {
                    const active = location.pathname === `/report/${report.id}`;
                    return (
                      <li
                        key={report.id}
                        className={`flex items-center gap-2 px-2 py-2 cursor-pointer rounded-lg transition-all text-xs ${
                          active ? "text-white shadow-lg" : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                        }`}
                        style={
                          active
                            ? {
                                background: "linear-gradient(135deg, var(--portal-primary), var(--portal-accent))",
                                boxShadow: "0 6px 20px rgba(37, 99, 235, 0.35)",
                              }
                            : undefined
                        }
                        onClick={() => handleReportClick(report)}
                      >
                        <DocumentTextIcon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-slate-500"}`} />
                        <span className="font-medium truncate">{report.name}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-3 border-t space-y-2" style={{ borderColor: "var(--portal-sidebar-border)", background: "rgba(0,0,0,0.25)" }}>
        <button
          type="button"
          className={`flex items-center w-full p-2 rounded-xl transition-colors ${
            location.pathname.startsWith("/settings")
              ? "text-white shadow-lg"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
          style={
            location.pathname.startsWith("/settings")
              ? {
                  background: "linear-gradient(135deg, var(--portal-primary), var(--portal-accent))",
                  boxShadow: "0 8px 24px rgba(37, 99, 235, 0.32)",
                }
              : undefined
          }
          onClick={() => {
            navigate("/settings/profile");
            if (window.innerWidth < 1024) {
              window.dispatchEvent(new CustomEvent("close-sidebar"));
            }
          }}
        >
          <div
            className={`p-2 rounded-lg shrink-0 ${
              location.pathname.startsWith("/settings") ? "bg-white/20" : "bg-white/5"
            }`}
          >
            <Cog6ToothIcon className="h-4 w-4" />
          </div>
          {sidebarOpen && <span className="ml-3 text-sm font-medium">Settings</span>}
        </button>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-lg bg-white/5 shrink-0">
              <UserIcon className="h-4 w-4 text-slate-400" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">Signed in</p>
                <p className="text-[11px] text-slate-500 truncate">Portal user</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors shrink-0"
            title="Logout"
          >
            <ArrowLeftOnRectangleIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

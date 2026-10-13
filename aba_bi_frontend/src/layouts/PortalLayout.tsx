import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useBranding } from "../context/BrandingContext";
import { useCurrentUser } from "../context/CurrentUserContext";

export interface PortalLayoutProps {
  children: React.ReactNode;
  /** Tailwind max-width classes for inner content, e.g. "max-w-6xl", "max-w-[88rem]" */
  contentMax?: string;
}

const PortalLayout: React.FC<PortalLayoutProps> = ({ children, contentMax = "max-w-6xl" }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { branding } = useBranding();
  const { user } = useCurrentUser();
  const location = useLocation();
  const pageTitle = location.pathname.startsWith("/report/") ? "Report workspace" : location.pathname.startsWith("/settings") ? "Account settings" : "Report catalog";
  const name = user?.fullName || user?.username || "Account";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";

  useEffect(() => {
    const onClose = () => setSidebarOpen(false);
    window.addEventListener("close-sidebar", onClose as EventListener);
    return () => window.removeEventListener("close-sidebar", onClose as EventListener);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px] lg:hidden transition-opacity"
            role="presentation"
            aria-hidden
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div
          className={`fixed lg:static inset-y-0 left-0 z-50 transform ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:z-auto`}
        >
          <Sidebar />
        </div>

        <main className="flex-1 overflow-auto" style={{ background: "var(--portal-bg)" }}>
          <header className="hidden lg:flex sticky top-0 z-30 h-[4.5rem] items-center justify-between border-b border-portal-stroke px-8" style={{ background: "color-mix(in srgb, var(--portal-bg) 92%, transparent)", backdropFilter: "blur(14px)" }}>
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-portal-muted">{branding.productName}</p><p className="mt-0.5 text-sm font-semibold text-portal-text">{pageTitle}</p></div>
            <Link to="/settings/profile" className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-[var(--portal-primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600" aria-label="Open your profile">
              <div className="hidden text-right xl:block"><p className="text-sm font-semibold text-portal-text">{name}</p><p className="text-[11px] text-portal-muted">{user?.role || "Portal user"}</p></div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white" style={{ background: "var(--portal-primary)" }}>{initials}</span>
            </Link>
          </header>
          <div
            className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-portal-stroke/80 backdrop-blur-md shadow-sm"
            style={{ background: "color-mix(in srgb, var(--portal-bg) 92%, transparent)" }}
          >
            <button
              type="button"
              className="shrink-0 p-2.5 rounded-xl border border-portal-stroke bg-portal-surface text-portal-text shadow-sm hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 focus-visible:ring-offset-portal-bg"
              aria-label={sidebarOpen ? "Close menu" : "Open menu"}
              onClick={() => setSidebarOpen((v) => !v)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-portal-muted">Portal</p>
              <p className="text-sm font-semibold text-portal-text truncate">{branding.productName}</p>
            </div>
          </div>

          <div className={`portal-page ${contentMax}`.trim()}>{children}</div>
        </main>
      </div>
    </div>
  );
};

export default PortalLayout;

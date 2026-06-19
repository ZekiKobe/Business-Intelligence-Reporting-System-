import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useBranding } from "../context/BrandingContext";

export interface PortalLayoutProps {
  children: React.ReactNode;
  /** Tailwind max-width classes for inner content, e.g. "max-w-6xl", "max-w-[88rem]" */
  contentMax?: string;
}

const PortalLayout: React.FC<PortalLayoutProps> = ({ children, contentMax = "max-w-6xl" }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { branding } = useBranding();

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

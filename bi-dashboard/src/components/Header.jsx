import { Menu, Search, ChevronDown, UserPlus, LogOut, Lock } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useBranding } from "../context/BrandingContext";
import { logoutApi } from "../services/authApi";

const Header = ({ sidebarOpen, setSidebarOpen, mobileSidebarOpen, setMobileSidebarOpen }) => {
  const [userDropdown, setUserDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { branding } = useBranding();

  const pageNames = {
    "/dashboard": "Operations overview",
    "/reports": "Reports",
    "/report-groups": "Report groups",
    "/data-sources": "Data sources",
    "/reports/design": "Report designer",
    "/users": "Workspace users",
    "/user/access": "Report access",
  };
  const pageName = Object.entries(pageNames).find(([path]) => location.pathname === path || location.pathname.startsWith(`${path}/`))?.[1] || "Workspace";
  const submitSearch = (event) => {
    event.preventDefault();
    const term = search.trim();
    navigate(term ? `/reports?search=${encodeURIComponent(term)}` : "/reports");
  };

  return (
    <header
      className="surface-card py-3 px-4 sm:px-6 mx-2 sm:mx-4 mt-2 sm:mt-3 mb-1 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md"
      style={{
        borderRadius: "1rem",
        background: "color-mix(in srgb, var(--surface-bg) 92%, transparent)",
        boxShadow: "0 8px 30px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div className="flex items-center min-w-0 flex-1">
        <button
          type="button"
          onClick={() => {
            if (window.innerWidth < 1024) {
              setMobileSidebarOpen(!mobileSidebarOpen);
            } else {
              setSidebarOpen(!sidebarOpen);
            }
          }}
          className="ui-btn-ghost p-2 mr-2 lg:hidden shrink-0"
        >
          <Menu size={22} />
        </button>
        <div className="hidden md:block mr-6 min-w-0">
          <p className="font-display text-sm font-semibold truncate" style={{ color: "var(--surface-text)" }}>
            {pageName}
          </p>
          <p className="text-xs truncate opacity-70 max-w-md">{branding.productName}</p>
        </div>
        <form onSubmit={submitSearch} className="relative hidden md:block w-56 lg:w-80 max-w-full">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
            size={18}
            style={{ color: "var(--surface-muted)", opacity: 0.55 }}
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search report catalog"
            placeholder="Search reports, groups…"
            className="ui-input pl-10 py-2.5 text-sm"
            style={{
              background: "color-mix(in srgb, var(--app-bg) 75%, var(--surface-bg))",
              borderColor: "var(--stroke)",
            }}
          />
        </form>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative">
          <button
            type="button"
            className="header-user-trigger flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-bg)]"
            onClick={() => setUserDropdown(!userDropdown)}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md"
              style={{ background: "linear-gradient(135deg, var(--brand-primary), var(--brand-accent))" }}
            >
              KA
            </div>
            <ChevronDown size={16} className="opacity-50 hidden sm:block" />
          </button>

          {userDropdown && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-xl shadow-xl py-1 z-50 border ui-dropdown-pop"
              style={{ background: "var(--surface-bg)", borderColor: "var(--stroke)" }}
            >
              <button
                type="button"
                className="ui-dropdown-item"
                onClick={() => {
                  navigate("/profile");
                  setUserDropdown(false);
                }}
              >
                <UserPlus size={16} className="mr-2 shrink-0 opacity-70" /> Profile
              </button>
              <button
                type="button"
                className="ui-dropdown-item"
                onClick={() => {
                  navigate("/change-password");
                  setUserDropdown(false);
                }}
              >
                <Lock size={16} className="mr-2 shrink-0 opacity-70" /> Change password
              </button>
              <div className="my-1 border-t" style={{ borderColor: "var(--stroke)" }} />
              <button
                type="button"
                className="ui-dropdown-item ui-dropdown-item--danger"
                onClick={async () => {
                  setUserDropdown(false);
                  try {
                    await logoutApi();
                  } catch {
                    /* still clear client state */
                  }
                  localStorage.removeItem("bi_token");
                  localStorage.removeItem("bi_refresh");
                  localStorage.removeItem("bi_tenant_slug");
                  window.dispatchEvent(new Event("bi-branding-refresh"));
                  navigate("/");
                }}
              >
                <LogOut size={16} className="mr-2" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

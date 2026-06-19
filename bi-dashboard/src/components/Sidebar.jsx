import { useLocation, useNavigate } from 'react-router-dom';
import { Home, BarChart3, PieChart, Users, Settings, Key, Box, ChevronLeft, ChevronRight, Database } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import BrandingLogoImg from './BrandingLogoImg';

const Sidebar = ({ sidebarOpen, setSidebarOpen, mobileSidebarOpen, setMobileSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { branding } = useBranding();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
    { path: '/report-groups', label: 'Report Groups', icon: PieChart },
    { path: '/data-sources', label: 'Data Sources', icon: Database },
    { path: '/reports/design', label: 'Design report', icon: Box },
    { path: '/users', label: 'Users', icon: Users },
    { path: '/settings', label: 'Settings', icon: Settings },
    { path: '/user/access', label: 'Access', icon: Key },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (window.innerWidth < 1024) {
      setMobileSidebarOpen(false);
    }
  };

  const pathMatches = (menuPath, pathname) => {
    if (menuPath === '/reports/design') {
      return pathname.startsWith('/reports/design');
    }
    if (menuPath === '/reports') {
      return pathname === '/reports' || pathname.startsWith('/reports/run/');
    }
    return pathname === menuPath || pathname.startsWith(`${menuPath}/`);
  };

  const NavContent = ({ compact = false }) => (
    <>
      <div
        className={`flex items-center border-b gap-2 ${
          compact ? 'p-4 justify-between' : sidebarOpen ? 'p-4 justify-between' : 'p-3 flex-col gap-3'
        }`}
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        {sidebarOpen || compact ? (
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-white/15"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <BrandingLogoImg logoUrl={branding.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
            </div>
            <div className="min-w-0 text-left">
              <p className="font-display text-sm font-semibold truncate text-white tracking-tight">
                {branding.companyName}
              </p>
              <p className="text-[11px] truncate text-slate-400">{branding.productName}</p>
            </div>
          </div>
        ) : (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto overflow-hidden ring-1 ring-white/15"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <BrandingLogoImg logoUrl={branding.logoUrl} alt="" className="w-7 h-7 rounded-lg object-cover" />
          </div>
        )}
        {!compact && (
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg shrink-0 text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        )}
        {compact && (
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
            aria-label="Close menu"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathMatches(item.path, location.pathname);
          const Icon = item.icon;
          const showLabel = sidebarOpen || compact;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNavigation(item.path)}
              className={`flex items-center w-full rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1222] ${
                showLabel ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5'
              } ${!isActive ? 'hover:bg-white/[0.07]' : ''}`}
              style={
                isActive
                  ? {
                      background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-accent))',
                      color: '#fff',
                      boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
                    }
                  : {
                      color: '#cbd5e1',
                    }
              }
              title={!showLabel ? item.label : undefined}
            >
              <span
                className="flex-shrink-0 flex items-center justify-center rounded-lg"
                style={{
                  width: 36,
                  height: 36,
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.25 : 2} />
              </span>
              {showLabel && <span className="text-sm font-semibold truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {sidebarOpen || compact ? (
        <div
          className="p-3 mx-2 mb-3 rounded-xl text-xs border border-white/10"
          style={{ background: 'rgba(37, 99, 235, 0.18)', color: '#e2e8f0' }}
        >
          <p className="font-semibold text-slate-100">Need help?</p>
          <p className="text-slate-400 mt-0.5 leading-snug">Configure data sources before designing reports.</p>
        </div>
      ) : null}
    </>
  );

  return (
    <>
      <aside
        className={`
          h-screen flex flex-col z-30 shrink-0
          transition-all duration-300 ease-out
          fixed lg:relative
          border-r
          ${sidebarOpen ? 'w-64' : 'w-[4.5rem]'}
          ${!sidebarOpen && typeof window !== 'undefined' && window.innerWidth < 1024 ? 'hidden' : 'flex'}
        `}
        style={{
          background: 'linear-gradient(180deg, #0c1222 0%, #080c16 100%)',
          color: '#e2e8f0',
          borderColor: 'rgba(255,255,255,0.08)',
          boxShadow: '8px 0 40px rgba(0,0,0,0.2)',
        }}
      >
        <NavContent />
      </aside>

      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/55"
            style={{ backdropFilter: "blur(3px)" }}
            aria-label="Close menu backdrop"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div
            className="relative h-full flex flex-col shadow-2xl ui-animate-sidebar"
            style={{
              width: "min(18rem, 88vw)",
              background: "linear-gradient(180deg, #0c1222 0%, #080c16 100%)",
              color: "#e2e8f0",
              borderRight: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "12px 0 40px rgba(0,0,0,0.35)",
            }}
          >
            <NavContent compact />
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;

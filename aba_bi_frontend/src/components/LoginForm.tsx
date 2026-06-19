import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Lock, User, Eye, EyeOff, HelpCircle, BarChart3, Shield } from "lucide-react";
import { login } from "../services/api";
import { useBranding } from "../context/BrandingContext";
import BrandingLogoImg from "./BrandingLogoImg";

const LoginForm: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { branding } = useBranding();

  useEffect(() => {
    const notice = sessionStorage.getItem("bi_auth_notice");
    if (notice === "session_expired") {
      sessionStorage.removeItem("bi_auth_notice");
      toast.warning("Your session has ended. Please sign in again.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await login(username, password);
      const access = data.sessionId || data.access;

      if (access) {
        localStorage.setItem("bi_token", access);
        if (data.refresh) {
          localStorage.setItem("bi_refresh", data.refresh);
        }
        const slug = data?.tenant?.slug;
        if (slug) {
          localStorage.setItem("bi_tenant_slug", slug);
        } else {
          localStorage.removeItem("bi_tenant_slug");
        }
        window.dispatchEvent(new Event("bi-branding-refresh"));
        navigate("/home");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err: any) {
      const detail =
        err?.detail ||
        err?.message ||
        err?.non_field_errors?.[0] ||
        (Array.isArray(err) ? err[0] : "") ||
        "Something went wrong";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row w-full max-w-6xl mx-auto min-h-[85vh] lg:min-h-[90vh] font-sans shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden ring-1 ring-white/20">
      <div
        className="hidden lg:flex lg:w-1/2 text-white p-10 lg:p-14 flex-col relative overflow-hidden"
        style={{
          background:
            "linear-gradient(155deg, #1e3a8a 0%, var(--portal-primary) 42%, var(--portal-accent) 110%)",
        }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32 opacity-10" style={{ background: "rgba(255,255,255,0.25)" }}></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full -ml-24 -mb-24 opacity-10" style={{ background: "rgba(255,255,255,0.25)" }}></div>
        
        <div className="flex-1 flex flex-col justify-center relative z-10">
          <div className="flex items-center mb-8">
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/20 mr-4">
              <BrandingLogoImg
                logoUrl={branding.logoUrl}
                alt={`${branding.companyName} logo`}
                className="w-32 h-16 object-contain"
              />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white tracking-tight">{branding.companyName}</h1>
              <p className="text-blue-100/90 mt-1 text-sm font-medium">{branding.productName}</p>
            </div>
          </div>

          <div className="my-6 h-1 w-16 bg-gradient-to-r from-blue-400 to-blue-300 rounded-full" />

          <div className="mb-10 max-w-md">
            <h2 className="font-display text-4xl lg:text-5xl font-bold mb-4 leading-tight tracking-tight text-white">
              Insights without friction
            </h2>
            <p className="text-blue-50/95 text-lg leading-relaxed">
              {branding.tagline || "Access curated reports and explore trusted data in one place."}
            </p>
          </div>

          <div className="space-y-3 mb-12">
            <div className="flex items-center p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <div className="bg-emerald-400/25 p-2 rounded-lg mr-3 text-emerald-200">
                <BarChart3 size={16} />
              </div>
              <span className="text-sm font-medium">Live report execution & exports</span>
            </div>
            <div className="flex items-center p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <div className="bg-white/15 p-2 rounded-lg mr-3 text-white">
                <Shield size={16} />
              </div>
              <span className="text-sm font-medium">Secure sign-in & session handling</span>
            </div>
          </div>
        </div>

        <div className="mt-auto relative z-10">
          <nav className="mb-6">
            <a 
              href="/help" 
              className="flex items-center text-blue-200 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5 w-fit"
            >
              <HelpCircle className="mr-2" size={18} />
              <span>Help & Support</span>
            </a>
          </nav>
          
          <div className="pt-4 border-t border-white/15">
            <p className="text-blue-100/70 text-xs">
              © {new Date().getFullYear()} {branding.companyName}
            </p>
          </div>
        </div>
      </div>

      <div
        className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-10"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--portal-surface) 97%, transparent) 0%, var(--portal-bg) 100%)",
        }}
      >
        <div className="w-full max-w-md">
          <form onSubmit={handleSubmit} className="portal-surface-card p-8 md:p-10 ring-1 ring-portal-stroke">
            <div className="text-center mb-8">
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 border border-portal-stroke shadow-inner"
                style={{ background: "var(--portal-primary-soft)" }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ background: "linear-gradient(135deg, var(--portal-primary), var(--portal-accent))" }}
                >
                  <User className="text-white" size={20} />
                </div>
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-portal-text mb-2 tracking-tight">
                Sign in to the portal
              </h2>
              <p className="text-portal-muted text-sm">Run reports and download results with one click.</p>
              <p className="text-portal-muted/90 text-xs mt-3 leading-relaxed">
                Accounts are created by an administrator. Contact your admin if you need access.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-portal-text font-medium mb-2 text-sm">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="text-portal-muted" size={20} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="portal-input pl-11"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-portal-text font-medium mb-2 text-sm">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-portal-muted" size={20} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="portal-input pl-11 pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-portal-muted hover:text-portal-text transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm mb-6">
              <label className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300" 
                />
                <span className="text-portal-muted">Remember me</span>
              </label>
              <a href="/forgot-password" className="text-primary-600 hover:text-primary-700 transition-colors font-medium">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className={`w-full portal-btn-primary py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Logging in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
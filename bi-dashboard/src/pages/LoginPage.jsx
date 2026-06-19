import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";
import { adminLogin } from '../controllers/authController';
import { useBranding } from "../context/BrandingContext";
import BrandingLogoImg from "../components/BrandingLogoImg";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { branding } = useBranding();

  useEffect(() => {
    const notice = sessionStorage.getItem("bi_auth_notice");
    if (notice === "session_expired") {
      sessionStorage.removeItem("bi_auth_notice");
      toast.warning("Your session has ended. Please sign in again.");
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await adminLogin({ username, password });
      const access = data?.sessionId || data?.access;
      if (access) {
        localStorage.setItem("bi_token", access);
      }
      if (data?.refresh) {
        localStorage.setItem("bi_refresh", data.refresh);
      }
      if (data?.tenant?.slug) {
        localStorage.setItem("bi_tenant_slug", data.tenant.slug);
      } else {
        localStorage.removeItem("bi_tenant_slug");
      }
      window.dispatchEvent(new Event("bi-branding-refresh"));
      navigate("/dashboard");
    } catch (err) {
      setError(err?.detail || err?.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen grid lg:grid-cols-2"
      style={{
        background:
          "radial-gradient(circle at 20% 20%, var(--brand-primary-soft), transparent 35%), radial-gradient(circle at 80% 80%, var(--brand-accent-soft), transparent 40%), var(--app-bg)",
      }}
    >
      <div
        className="hidden lg:flex flex-col justify-between p-12 lg:p-16 relative overflow-hidden"
        style={{
          background: "linear-gradient(155deg, #1e3a8a 0%, var(--brand-primary) 42%, var(--brand-accent) 110%)",
          color: "#fff",
        }}
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }}
        />
        <div className="relative z-10 flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/20 shadow-lg"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            <BrandingLogoImg logoUrl={branding.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
          </div>
          <div>
            <p className="font-display font-semibold text-lg tracking-tight">{branding.companyName}</p>
            <p className="text-sm text-blue-100/90">{branding.productName}</p>
          </div>
        </div>
        <div className="relative z-10 max-w-lg">
          <h1 className="font-display text-4xl lg:text-5xl font-bold leading-[1.1] mb-5 tracking-tight">
            Build insights.
            <br />
            Decide with confidence.
          </h1>
          <p className="text-lg text-blue-50/95 leading-relaxed">{branding.tagline}</p>
        </div>
        <p className="relative z-10 text-sm text-blue-100/70">Secure admin console · Multi-tenant analytics</p>
      </div>

      <div className="flex items-center justify-center p-4 md:p-8 lg:p-12">
        <div className="surface-card p-8 md:p-10 w-full max-w-md">
          <div className="flex justify-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center border shadow-md"
              style={{
                background: "var(--brand-primary-soft)",
                borderColor: "var(--stroke)",
              }}
            >
              <BrandingLogoImg logoUrl={branding.logoUrl} alt="" className="rounded-xl object-cover w-11 h-11" />
            </div>
          </div>

          <h2 className="font-display text-2xl md:text-[1.65rem] font-bold text-center mb-1" style={{ color: "var(--surface-text)" }}>
            Welcome to {branding.productName}
          </h2>
          <p className="text-center text-sm opacity-70 mb-2">{branding.companyName}</p>
          <p className="text-center text-xs opacity-60 mb-8 max-w-sm mx-auto leading-relaxed">
            User accounts are managed in <strong>Users</strong>. Sign in with credentials provided by your administrator.
          </p>

          {error ? (
            <div className="mb-5 rounded-xl px-3 py-2.5 text-sm bg-red-50 text-red-700 border border-red-100">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="ui-label">Email / username</label>
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="ui-input"
                required
              />
            </div>
            <div>
              <label className="ui-label">Password</label>
              <div className="relative isolate">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ui-input pr-11"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-px right-px z-10 flex w-10 items-center justify-center rounded-r-[0.65rem] border border-transparent transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-inset"
                  style={{ color: "var(--surface-muted)" }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff size={18} strokeWidth={2} className="shrink-0 block" aria-hidden />
                  ) : (
                    <Eye size={18} strokeWidth={2} className="shrink-0 block" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="ui-btn-primary w-full py-3 text-base" disabled={isLoading}>
              {isLoading ? "Please wait…" : "Sign in"}
            </button>
          </form>
          <p className="text-center text-xs mt-8 opacity-50">
            © {new Date().getFullYear()} {branding.companyName}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
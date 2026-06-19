import React, { useState } from "react";
import { Phone, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useBranding } from "../context/BrandingContext";

const ForgotPassword: React.FC = () => {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { branding } = useBranding();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
  };

  return (
    <div className="portal-auth-page min-h-screen flex flex-col items-center justify-center px-4 py-10 font-sans">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-200 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to sign in
        </Link>

        <div className="portal-surface-card p-8 md:p-10 border-portal-stroke shadow-2xl">
          <div className="text-center mb-8">
            <p className="portal-hero-eyebrow mb-3" style={{ color: "var(--portal-muted)" }}>
              {branding.productName}
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-portal-text tracking-tight">
              Reset access
            </h2>
            <p className="text-portal-muted text-sm mt-2 leading-relaxed">
              Enter your username or phone number. Your administrator may send instructions by SMS or email.
            </p>
          </div>

          {message && (
            <div className="text-sm mb-4 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-center">
              {message}
            </div>
          )}
          {error && (
            <div className="text-sm mb-4 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-800 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="portal-label">Username or phone</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-portal-muted">
                  <Phone size={18} />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="portal-input pl-11"
                  placeholder="e.g. user id or +251…"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className={`w-full portal-btn-primary py-3.5 rounded-xl font-semibold text-sm ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={loading}
            >
              {loading ? "Sending…" : "Request reset"}
            </button>
          </form>

          <p className="text-center text-portal-muted text-sm mt-6">
            Remembered your password?{" "}
            <button type="button" onClick={() => navigate("/")} className="text-primary-600 font-semibold hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

import React, { useState } from "react";
import { Lock, Eye, EyeOff, Save, CheckCircle } from "lucide-react";

const ChangePasswordPage: React.FC = () => {
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters long";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      newErrors.newPassword =
        "Password must contain at least one uppercase letter, one lowercase letter, and one number";
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setIsSuccess(true);

      setTimeout(() => setIsSuccess(false), 3000);
    } catch {
      setErrors({ general: "Failed to change password. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-portal-stroke">
        <div
          className="mx-auto sm:mx-0 w-14 h-14 rounded-2xl flex items-center justify-center border border-portal-stroke shrink-0"
          style={{ background: "var(--portal-primary-soft)" }}
        >
          <Lock className="w-7 h-7 text-primary-600" strokeWidth={2} />
        </div>
        <div className="text-center sm:text-left min-w-0">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-portal-text tracking-tight">Change password</h2>
          <p className="text-sm text-portal-muted mt-1 max-w-lg">
            Use a strong password you do not reuse on other sites.
          </p>
        </div>
      </div>

      {isSuccess && (
        <div className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/90 dark:bg-emerald-950/40 dark:border-emerald-800/50 flex items-center gap-3 text-emerald-900 dark:text-emerald-100">
          <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium">Password changed successfully.</span>
        </div>
      )}

      {errors.general && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50">
          <p className="text-sm text-red-800 dark:text-red-200">{errors.general}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-portal-muted mb-1.5">Current password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handleChange}
                className={`portal-input pr-11 w-full ${errors.currentPassword ? "!border-red-400" : ""}`}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-portal-muted hover:text-portal-text"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.currentPassword && <p className="mt-1.5 text-sm text-red-600">{errors.currentPassword}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-portal-muted mb-1.5">New password</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handleChange}
                className={`portal-input pr-11 w-full ${errors.newPassword ? "!border-red-400" : ""}`}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-portal-muted hover:text-portal-text"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.newPassword && <p className="mt-1.5 text-sm text-red-600">{errors.newPassword}</p>}
            <p className="mt-2 text-xs text-portal-muted leading-relaxed">
              At least 8 characters with uppercase, lowercase, and a number.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-portal-muted mb-1.5">Confirm new password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handleChange}
                className={`portal-input pr-11 w-full ${errors.confirmPassword ? "!border-red-400" : ""}`}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-portal-muted hover:text-portal-text"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1.5 text-sm text-red-600">{errors.confirmPassword}</p>}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl portal-btn-primary font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Updating…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Update password
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChangePasswordPage;

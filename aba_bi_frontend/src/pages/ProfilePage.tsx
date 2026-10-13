import React from "react";
import { CalendarDays, Mail, ShieldCheck, UserRound, AlertCircle, RefreshCw, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../context/CurrentUserContext";

const missing = "Not provided";
const formatDate = (value?: string) => {
  if (!value) return missing;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? missing : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading, error, refreshUser } = useCurrentUser();
  const name = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Your account";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";

  if (loading) return <div className="space-y-6 animate-pulse" aria-busy="true"><div className="h-24 rounded-2xl bg-portal-stroke/40" /><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="h-28 rounded-xl bg-portal-stroke/30" /><div className="h-28 rounded-xl bg-portal-stroke/30" /></div></div>;

  if (error || !user) return <div className="py-10 text-center max-w-md mx-auto"><span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600"><AlertCircle className="h-6 w-6" /></span><h2 className="mt-4 font-display text-lg font-bold text-portal-text">We couldn’t load your profile</h2><p className="mt-2 text-sm leading-relaxed text-portal-muted">{error || "Your account information is unavailable right now."}</p><button type="button" onClick={refreshUser} className="portal-btn-secondary mt-5"><RefreshCw className="h-4 w-4" /> Try again</button></div>;

  const details = [
    { label: "Username", value: user.username || missing, icon: UserRound },
    { label: "Email address", value: user.email || missing, icon: Mail },
    { label: "Access level", value: user.role || missing, icon: ShieldCheck },
    { label: "Member since", value: formatDate(user.joinDate), icon: CalendarDays },
  ];

  return <div className="space-y-7"><section className="rounded-2xl border border-portal-stroke p-5 sm:p-6" style={{ background: "color-mix(in srgb, var(--portal-primary-soft) 34%, var(--portal-surface))" }}><div className="flex flex-col sm:flex-row sm:items-center gap-5"><div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-lg" style={{ background: "linear-gradient(135deg, var(--portal-primary), var(--portal-accent))" }}>{initials}</div><div className="min-w-0 flex-1"><p className="portal-hero-eyebrow">Personal profile</p><h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-portal-text truncate">{name}</h2><div className="mt-2 flex flex-wrap items-center gap-2"><span className="portal-badge">{user.role || "Portal user"}</span><span className="text-xs font-semibold text-portal-muted">Status: {user.status || missing}</span></div></div><button type="button" onClick={() => navigate("/settings/change-password")} className="portal-btn-secondary shrink-0"><KeyRound className="h-4 w-4" /> Change password</button></div></section><section><div className="mb-4"><h3 className="font-display text-lg font-bold text-portal-text">Account details</h3><p className="mt-1 text-sm text-portal-muted">Information associated with your signed-in account.</p></div><dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">{details.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-portal-stroke bg-portal-surface p-4"><dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-portal-muted"><Icon className="h-4 w-4" />{label}</dt><dd className="mt-2 break-words text-sm font-semibold text-portal-text">{value}</dd></div>)}</dl></section></div>;
};

export default ProfilePage;

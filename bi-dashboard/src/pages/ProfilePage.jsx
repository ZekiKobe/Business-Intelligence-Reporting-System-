import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Phone,
  MapPin,
  Save,
  Pencil,
  Shield,
  Calendar,
  KeyRound,
  Building2,
  Briefcase,
} from "lucide-react";
import { getMe } from "../controllers/userController";
import BiPageHeader from "../components/BiPageHeader";
import { useTrackPageLoading } from "../context/LoadingBarContext";

const formatJoinDate = (raw) => {
  if (raw == null || raw === "") return "—";
  const t = new Date(raw);
  return Number.isNaN(t.getTime()) ? String(raw) : t.toLocaleDateString(undefined, { dateStyle: "medium" });
};

const ProfilePage = () => {
  const emptyProfile = useMemo(
    () => ({
      id: null,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      department: "",
      position: "",
      joinDate: "",
      status: "",
      role: "",
    }),
    []
  );

  const [profile, setProfile] = useState(emptyProfile);
  const [tempProfile, setTempProfile] = useState(emptyProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const me = await getMe();
        const mapped = {
          id: me?.id ?? null,
          firstName: me?.firstName ?? "",
          lastName: me?.lastName ?? "",
          email: me?.email ?? "",
          phone: me?.phone ?? "",
          address: me?.address ?? "",
          department: me?.department ?? "",
          position: me?.position ?? "",
          joinDate: me?.joinDate ?? "",
          status: me?.status ?? "",
          role: me?.role ?? "",
        };
        setProfile(mapped);
        setTempProfile(mapped);
      } catch (e) {
        setError("Failed to load user profile.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [emptyProfile]);

  const avatarInitials = useMemo(() => {
    const first = (profile.firstName || "").trim();
    const last = (profile.lastName || "").trim();
    const initials = `${first ? first[0] : ""}${last ? last[0] : ""}`.toUpperCase();
    return initials || "U";
  }, [profile.firstName, profile.lastName]);

  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Workspace member";

  const handleEdit = () => {
    setIsEditing(true);
    setTempProfile(profile);
  };

  const handleSave = () => {
    setProfile(tempProfile);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTempProfile(profile);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTempProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const FieldShell = ({ label, children, icon: Icon }) => (
    <div
      className="rounded-xl border p-4 transition-colors"
      style={{
        borderColor: "var(--stroke)",
        background: "color-mix(in srgb, var(--app-bg) 55%, var(--surface-bg))",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        {Icon ? <Icon size={14} className="opacity-50 shrink-0" style={{ color: "var(--surface-muted)" }} /> : null}
        <span className="ui-label !mb-0 !text-[11px] !uppercase !tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  );

  return (
    <div className="ui-shell-page pb-12">
      <div className="mb-8">
        <BiPageHeader
          variant="slim"
          eyebrow="Account"
          title="Your profile"
          description="Identity and contact details for this BI workspace. Edits stay in this session until your API supports saving."
          accent="sky"
          actions={
            <Link to="/change-password" className="ui-btn-secondary text-sm gap-2 no-underline">
              <KeyRound size={16} /> Change password
            </Link>
          }
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[280px] gap-2" role="status" aria-live="polite" aria-busy="true">
          <span className="sr-only">Loading profile…</span>
          <p className="text-sm font-medium" style={{ color: "var(--surface-muted)" }}>
            Loading profile…
          </p>
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-xl border px-4 py-3 text-sm mb-6 flex items-start gap-3"
          style={{
            borderColor: "var(--stroke)",
            background: "var(--danger-soft)",
            color: "var(--surface-text)",
          }}
        >
          <Shield size={18} className="shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-semibold">Could not load profile</p>
            <p className="opacity-90 mt-0.5">{error}</p>
          </div>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-6">
          <div className="surface-card overflow-hidden">
            <div
              className="relative px-6 py-8 sm:px-10 sm:py-10 text-white overflow-hidden"
              style={{
                background: "linear-gradient(130deg, #0c1222 0%, #1e3a5f 42%, color-mix(in srgb, var(--brand-primary) 75%, #0f172a) 100%)",
              }}
            >
              <div
                className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full opacity-35 blur-3xl"
                style={{ background: "var(--brand-accent)" }}
              />
              <div
                className="pointer-events-none absolute -left-8 bottom-0 h-40 w-40 rounded-full opacity-25 blur-3xl"
                style={{ background: "var(--brand-primary)" }}
              />
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
                <div
                  className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-2xl flex items-center justify-center shrink-0 ring-4 ring-white/20 shadow-2xl"
                  style={{ background: "linear-gradient(145deg, var(--brand-primary), var(--brand-accent))" }}
                >
                  <span className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{avatarInitials}</span>
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    {displayName}
                  </h2>
                  {profile.position ? (
                    <p className="mt-1 text-slate-200/95 font-medium">{profile.position}</p>
                  ) : (
                    <p className="mt-1 text-slate-300/90 text-sm">No title on file</p>
                  )}
                  <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
                    {profile.role ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                        <Shield size={13} /> {profile.role}
                      </span>
                    ) : null}
                    {profile.status ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100">
                        {profile.status}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs text-slate-200">
                      <Calendar size={13} /> Joined {formatJoinDate(profile.joinDate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-8" style={{ background: "var(--surface-bg)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-6 border-b" style={{ borderColor: "var(--stroke)" }}>
                <div>
                  <h3 className="font-display text-lg font-semibold" style={{ color: "var(--surface-text)" }}>
                    Profile details
                  </h3>
                  <p className="text-sm mt-0.5 opacity-70" style={{ color: "var(--surface-muted)" }}>
                    Personal and work fields shown in directory-style layout.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  {isEditing ? (
                    <>
                      <button type="button" onClick={handleCancel} className="ui-btn-secondary text-sm">
                        Cancel
                      </button>
                      <button type="button" onClick={handleSave} className="ui-btn-primary text-sm">
                        <Save size={16} /> Save
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={handleEdit} className="ui-btn-primary text-sm">
                      <Pencil size={16} /> Edit profile
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider opacity-55" style={{ color: "var(--surface-muted)" }}>
                    Personal
                  </h4>
                  <div className="space-y-3">
                    <FieldShell label="First name">
                      {isEditing ? (
                        <input type="text" name="firstName" value={tempProfile.firstName} onChange={handleChange} className="ui-input" />
                      ) : (
                        <p className="text-sm font-medium" style={{ color: "var(--surface-text)" }}>
                          {profile.firstName || "—"}
                        </p>
                      )}
                    </FieldShell>
                    <FieldShell label="Last name">
                      {isEditing ? (
                        <input type="text" name="lastName" value={tempProfile.lastName} onChange={handleChange} className="ui-input" />
                      ) : (
                        <p className="text-sm font-medium" style={{ color: "var(--surface-text)" }}>
                          {profile.lastName || "—"}
                        </p>
                      )}
                    </FieldShell>
                    <FieldShell label="Email" icon={Mail}>
                      {isEditing ? (
                        <input type="email" name="email" value={tempProfile.email} onChange={handleChange} className="ui-input" />
                      ) : (
                        <p className="text-sm font-medium break-all" style={{ color: "var(--surface-text)" }}>
                          {profile.email || "—"}
                        </p>
                      )}
                    </FieldShell>
                    <FieldShell label="Phone" icon={Phone}>
                      {isEditing ? (
                        <input type="tel" name="phone" value={tempProfile.phone} onChange={handleChange} className="ui-input" />
                      ) : (
                        <p className="text-sm font-medium" style={{ color: "var(--surface-text)" }}>
                          {profile.phone || "—"}
                        </p>
                      )}
                    </FieldShell>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider opacity-55" style={{ color: "var(--surface-muted)" }}>
                    Work
                  </h4>
                  <div className="space-y-3">
                    <FieldShell label="Department" icon={Building2}>
                      {isEditing ? (
                        <input type="text" name="department" value={tempProfile.department} onChange={handleChange} className="ui-input" />
                      ) : (
                        <p className="text-sm font-medium" style={{ color: "var(--surface-text)" }}>
                          {profile.department || "—"}
                        </p>
                      )}
                    </FieldShell>
                    <FieldShell label="Position" icon={Briefcase}>
                      {isEditing ? (
                        <input type="text" name="position" value={tempProfile.position} onChange={handleChange} className="ui-input" />
                      ) : (
                        <p className="text-sm font-medium" style={{ color: "var(--surface-text)" }}>
                          {profile.position || "—"}
                        </p>
                      )}
                    </FieldShell>
                    <FieldShell label="Address" icon={MapPin}>
                      {isEditing ? (
                        <textarea name="address" value={tempProfile.address} onChange={handleChange} rows={3} className="ui-textarea" />
                      ) : (
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap" style={{ color: "var(--surface-text)" }}>
                          {profile.address || "—"}
                        </p>
                      )}
                    </FieldShell>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t" style={{ borderColor: "var(--stroke)" }}>
                <h4 className="font-display text-sm font-semibold mb-4" style={{ color: "var(--surface-text)" }}>
                  Workspace snapshot
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="ui-kpi !shadow-none">
                    <p className="text-[11px] font-bold uppercase tracking-wide opacity-55">Member since</p>
                    <p className="font-display text-xl font-bold mt-1" style={{ color: "var(--surface-text)" }}>
                      {formatJoinDate(profile.joinDate)}
                    </p>
                    <p className="text-xs mt-2 opacity-60">From HR / account record</p>
                  </div>
                  <div className="ui-kpi !shadow-none">
                    <p className="text-[11px] font-bold uppercase tracking-wide opacity-55">Access role</p>
                    <p className="font-display text-xl font-bold mt-1" style={{ color: "var(--surface-text)" }}>
                      {profile.role || "—"}
                    </p>
                    <p className="text-xs mt-2 opacity-60">Controls designer & reports</p>
                  </div>
                  <div className="ui-kpi !shadow-none">
                    <p className="text-[11px] font-bold uppercase tracking-wide opacity-55">Account status</p>
                    <p className="font-display text-xl font-bold mt-1" style={{ color: "var(--surface-text)" }}>
                      {profile.status || "Active"}
                    </p>
                    <p className="text-xs mt-2 opacity-60">Sign-in eligibility</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ProfilePage;
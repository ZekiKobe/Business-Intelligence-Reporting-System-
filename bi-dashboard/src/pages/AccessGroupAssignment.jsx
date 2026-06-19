import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import PageLoadingSpinner from "../components/PageLoadingSpinner";
import BiPageHeader from "../components/BiPageHeader";
import { fetchReportGroups } from "../controllers/reportController";
import { fetchReportGroupAccess, saveUserReportGroupAccess } from "../controllers/reportGroupAccessController";

const isRestrictedRole = (role) => role === "Viewer";

const AccessGroupAssignment = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [accessRes, groupRows] = await Promise.all([
        fetchReportGroupAccess(),
        fetchReportGroups(),
      ]);
      setUsers(accessRes.users || []);
      setGroups(groupRows || []);
    } catch (e) {
      const detail = e?.response?.data?.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : e?.response?.status === 403
            ? "Only workspace admins can manage report group access."
            : "Failed to load access data.";
      setLoadError(msg);
      setUsers([]);
      setGroups([]);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q)
    );
  }, [users, searchTerm]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSelectedCodes([...(user.report_group_codes || [])]);
  };

  const toggleCode = (code) => {
    if (!selectedUser || !isRestrictedRole(selectedUser.role)) return;
    const c = String(code);
    setSelectedCodes((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    if (!isRestrictedRole(selectedUser.role)) {
      toast.info("Admin and Editor accounts already have access to all report groups.");
      return;
    }
    setSaving(true);
    try {
      await saveUserReportGroupAccess(selectedUser.id, selectedCodes);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id ? { ...u, report_group_codes: [...selectedCodes] } : u
        )
      );
      setSelectedUser((u) => (u ? { ...u, report_group_codes: [...selectedCodes] } : null));
      toast.success(`Report group access updated for ${selectedUser.name}.`);
    } catch (e) {
      const detail = e?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to save access.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedUser(null);
    setSelectedCodes([]);
    setSearchTerm("");
  };

  if (loading) {
    return <PageLoadingSpinner minHeight="min-h-[50vh]" label="Loading access data…" />;
  }

  return (
    <div className="ui-shell min-h-screen pb-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <BiPageHeader
            variant="slim"
            eyebrow="Access control"
            title="Report group access"
            description={
              <>
                Choose which report groups each <strong>Viewer</strong> can see in the portal. Admins and Editors always
                have full access.
              </>
            }
            accent="violet"
            actions={
              <div className="relative w-full sm:w-64">
                <MagnifyingGlassIcon
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 opacity-50"
                  style={{ color: "var(--surface-muted)" }}
                />
                <input
                  type="text"
                  className="ui-input pl-10 w-full"
                  placeholder="Search users…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={!!selectedUser}
                />
              </div>
            }
          />
        </div>

        <div className="surface-card overflow-hidden">
          <div className="p-4 sm:p-6 md:p-8">

            {loadError ? (
              <div
                className="rounded-xl border p-4 flex gap-3 items-start"
                style={{ borderColor: "var(--stroke)", background: "var(--danger-soft)" }}
              >
                <ExclamationTriangleIcon className="h-6 w-6 shrink-0 text-amber-700" />
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--surface-text)" }}>
                    {loadError}
                  </p>
                  <button type="button" className="ui-btn-ghost text-sm mt-2 px-0" onClick={load}>
                    Retry
                  </button>
                </div>
              </div>
            ) : !selectedUser ? (
              <div className="space-y-4">
                <h2 className="font-display text-base font-semibold" style={{ color: "var(--surface-text)" }}>
                  Select a user
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {filteredUsers.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--surface-muted)" }}>
                      No users match your search.
                    </p>
                  ) : (
                    filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border text-left transition-colors hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
                        style={{ borderColor: "var(--stroke)", background: "var(--surface-bg)" }}
                      >
                        <div className="flex items-center min-w-0">
                          <UserCircleIcon className="h-10 w-10 shrink-0 opacity-60" />
                          <div className="ml-3 min-w-0">
                            <div className="text-sm font-semibold truncate" style={{ color: "var(--surface-text)" }}>
                              {user.name}
                            </div>
                            <div className="text-sm truncate" style={{ color: "var(--surface-muted)" }}>
                              {user.email || user.username}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 sm:mt-0 flex items-center gap-2 shrink-0">
                          <span
                            className="text-xs font-semibold uppercase px-2 py-1 rounded-lg"
                            style={{
                              background: "var(--brand-primary-soft)",
                              color: "var(--brand-primary)",
                            }}
                          >
                            {user.role}
                          </span>
                          {isRestrictedRole(user.role) ? (
                            <span className="text-xs" style={{ color: "var(--surface-muted)" }}>
                              {(user.report_group_codes || []).length} group
                              {(user.report_group_codes || []).length === 1 ? "" : "s"}
                            </span>
                          ) : (
                            <ShieldCheckIcon className="h-5 w-5 text-emerald-600" title="Full access" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="font-display text-base font-semibold" style={{ color: "var(--surface-text)" }}>
                    Assign groups for <span className="text-brand" style={{ color: "var(--brand-primary)" }}>{selectedUser.name}</span>
                  </h2>
                  <button type="button" onClick={handleCancel} className="ui-btn-ghost text-sm gap-1">
                    <XMarkIcon className="h-4 w-4" /> Change user
                  </button>
                </div>

                {!isRestrictedRole(selectedUser.role) ? (
                  <div
                    className="rounded-xl border p-4 flex gap-3"
                    style={{ borderColor: "var(--stroke)", background: "var(--brand-primary-soft)" }}
                  >
                    <ShieldCheckIcon className="h-6 w-6 shrink-0" style={{ color: "var(--brand-primary)" }} />
                    <p className="text-sm" style={{ color: "var(--surface-text)" }}>
                      <strong>{selectedUser.role}</strong> users already have access to every report group in this
                      workspace. No per-group assignment is stored.
                    </p>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 ui-section-card !mb-0">
                    <h3 className="ui-section-card__title">Report groups</h3>
                    {groups.length === 0 ? (
                      <p className="text-sm" style={{ color: "var(--surface-muted)" }}>
                        No report groups yet. Create groups under <strong>Report groups</strong> first.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {groups.map((group) => {
                          const code = String(group.code);
                          const on = selectedCodes.includes(code);
                          const disabled = !isRestrictedRole(selectedUser.role);
                          return (
                            <button
                              key={code}
                              type="button"
                              disabled={disabled}
                              onClick={() => toggleCode(code)}
                              className={`p-4 rounded-xl border text-left transition-all w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] ${
                                disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:shadow-sm"
                              }`}
                              style={{
                                borderColor: on ? "var(--brand-primary)" : "var(--stroke)",
                                background: on ? "var(--brand-primary-soft)" : "var(--surface-bg)",
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className="flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center mt-0.5"
                                  style={{
                                    borderColor: on ? "var(--brand-primary)" : "var(--stroke)",
                                    background: on ? "var(--brand-primary)" : "transparent",
                                  }}
                                >
                                  {on ? <CheckIcon className="h-3 w-3 text-white" /> : null}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold" style={{ color: "var(--surface-text)" }}>
                                    {group.group_name || group.name}
                                  </div>
                                  {group.description && group.description !== "No description" ? (
                                    <div className="text-xs mt-1 leading-snug" style={{ color: "var(--surface-muted)" }}>
                                      {group.description}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="ui-section-card !mb-0">
                      <h3 className="ui-section-card__title">Summary</h3>
                      <dl className="text-sm space-y-2" style={{ color: "var(--surface-text)" }}>
                        <div>
                          <dt className="text-xs font-semibold uppercase opacity-60">User</dt>
                          <dd>{selectedUser.name}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase opacity-60">Role</dt>
                          <dd>{selectedUser.role}</dd>
                        </div>
                        {isRestrictedRole(selectedUser.role) ? (
                          <div>
                            <dt className="text-xs font-semibold uppercase opacity-60">Selected groups</dt>
                            <dd>{selectedCodes.length}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                      <button type="button" onClick={handleCancel} className="ui-btn-secondary w-full sm:w-auto justify-center">
                        <XMarkIcon className="h-4 w-4" /> Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !isRestrictedRole(selectedUser.role)}
                        className="ui-btn-primary w-full sm:w-auto justify-center disabled:opacity-50"
                      >
                        <CheckIcon className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessGroupAssignment;

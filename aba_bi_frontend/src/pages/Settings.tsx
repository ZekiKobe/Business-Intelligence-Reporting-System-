import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { UserCircleIcon, KeyIcon } from "@heroicons/react/24/outline";
import PortalLayout from "../layouts/PortalLayout";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
    isActive
      ? "text-primary-700 bg-portal-surface shadow-sm border border-portal-stroke"
      : "text-portal-muted border border-transparent hover:text-portal-text hover:bg-[var(--portal-primary-soft)]/40",
  ].join(" ");

const Settings: React.FC = () => {
  const location = useLocation();
  const sub =
    location.pathname.includes("change-password") ? "Update your sign-in password securely." : "Your display information for this portal.";

  return (
    <PortalLayout contentMax="max-w-5xl">
      <div className="pb-14">
        <div
          className="relative overflow-hidden rounded-2xl border border-portal-stroke mb-8"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--portal-primary) 14%, var(--portal-surface)) 0%, color-mix(in srgb, var(--portal-accent) 10%, var(--portal-surface)) 55%, var(--portal-surface) 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-24 h-48 w-48 rounded-full opacity-[0.35] blur-3xl"
            style={{ background: "var(--portal-primary)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full opacity-25 blur-3xl"
            style={{ background: "var(--portal-accent)" }}
          />
          <div className="relative px-5 py-8 md:px-8 md:py-10">
            <p className="portal-hero-eyebrow mb-2">Account</p>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-portal-text tracking-tight">Settings</h1>
            <p className="text-portal-muted text-sm mt-2 max-w-xl leading-relaxed">{sub}</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,220px)_1fr] lg:items-start">
          <nav
            className="flex flex-row lg:flex-col gap-2 p-1 rounded-2xl border border-portal-stroke/80 overflow-x-auto lg:overflow-visible"
            style={{ background: "color-mix(in srgb, var(--portal-bg) 55%, var(--portal-surface))" }}
            aria-label="Settings sections"
          >
            <NavLink to="/settings/profile" className={navLinkClass} end>
              <UserCircleIcon className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
              <span className="whitespace-nowrap">Profile</span>
            </NavLink>
            <NavLink to="/settings/change-password" className={navLinkClass}>
              <KeyIcon className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
              <span className="whitespace-nowrap">Password</span>
            </NavLink>
          </nav>

          <section
            className="min-w-0 rounded-2xl border border-portal-stroke p-6 md:p-8 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.35)]"
            style={{ background: "var(--portal-surface)" }}
          >
            <Outlet />
          </section>
        </div>
      </div>
    </PortalLayout>
  );
};

export default Settings;

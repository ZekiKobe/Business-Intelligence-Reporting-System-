import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import portalLogoFallback from "../assets/portal-logo-fallback.svg";
import { fetchPublicBranding, type PortalBrandingApi } from "../services/api";

type Branding = {
  companyName: string;
  productName: string;
  tagline: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  darkMode: boolean;
};

type BrandingContextValue = {
  branding: Branding;
  updateBranding: (patch: Partial<Branding>) => void;
  resetBranding: () => void;
};

const STORAGE_KEY = "bi_portal_branding_v1";

const defaultBranding: Branding = {
  companyName: "Your Company",
  productName: "BI Reports Portal",
  tagline: "Beautiful self-service reporting for everyone",
  /** Bundled SVG — use `public/images/logo1.ico` (or any path) for a custom static logo via API branding. */
  logoUrl: portalLogoFallback,
  primaryColor: "#2563eb",
  accentColor: "#22c55e",
  darkMode: false,
};

const BrandingContext = createContext<BrandingContextValue>({
  branding: defaultBranding,
  updateBranding: () => {},
  resetBranding: () => {},
});

const readStoredBranding = (): Branding => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultBranding;
    return { ...defaultBranding, ...(JSON.parse(raw) as Partial<Branding>) };
  } catch {
    return defaultBranding;
  }
};

const mergeFromApi = (data: PortalBrandingApi): Branding => ({
  ...defaultBranding,
  companyName: data.companyName ?? defaultBranding.companyName,
  productName: data.productName ?? defaultBranding.productName,
  tagline: data.tagline ?? defaultBranding.tagline,
  logoUrl:
    data.logoUrl != null && String(data.logoUrl).trim() !== ""
      ? String(data.logoUrl).trim()
      : defaultBranding.logoUrl,
  primaryColor: data.primaryColor ?? defaultBranding.primaryColor,
  accentColor: data.accentColor ?? defaultBranding.accentColor,
  darkMode: Boolean(data.darkMode),
});

const toRgba = (hex: string, alpha: number) => {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const int = parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<Branding>(() => readStoredBranding());

  useEffect(() => {
    let generation = 0;
    const load = async () => {
      const g = ++generation;
      try {
        const data = await fetchPublicBranding();
        if (g !== generation) return;
        const merged = mergeFromApi(data);
        setBranding(merged);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        if (g !== generation) return;
        setBranding(readStoredBranding());
      }
    };
    load();
    const onRefresh = () => load();
    window.addEventListener("bi-branding-refresh", onRefresh);
    return () => {
      generation += 1;
      window.removeEventListener("bi-branding-refresh", onRefresh);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
    } catch {
      /* ignore */
    }

    const root = document.documentElement;
    root.style.setProperty("--portal-primary", branding.primaryColor);
    root.style.setProperty("--portal-accent", branding.accentColor);
    root.style.setProperty("--portal-primary-soft", toRgba(branding.primaryColor, 0.16));
    root.style.setProperty("--portal-accent-soft", toRgba(branding.accentColor, 0.18));

    if (branding.darkMode) {
      root.classList.add("portal-theme-dark");
    } else {
      root.classList.remove("portal-theme-dark");
    }
  }, [branding]);

  const value = useMemo<BrandingContextValue>(
    () => ({
      branding,
      updateBranding: (patch) => setBranding((prev) => ({ ...prev, ...patch })),
      resetBranding: () => setBranding(defaultBranding),
    }),
    [branding]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};

export const useBranding = () => useContext(BrandingContext);

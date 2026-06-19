import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import apiClient from "../services/apiClient";

const STORAGE_KEY = "bi_branding_settings_v1";

/** Empty logoUrl = UI uses bundled fallback; put files under `public/images/` and set e.g. `/images/logo1.png`. */
const defaultBranding = {
  companyName: "Your Company",
  productName: "BI Studio",
  tagline: "Modern analytics workspace",
  logoUrl: "",
  primaryColor: "#2563eb",
  accentColor: "#14b8a6",
  surfaceStyle: "glass",
  darkMode: false,
};

const BrandingContext = createContext({
  branding: defaultBranding,
  updateBranding: () => {},
  resetBranding: () => {},
});

const readStoredBranding = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultBranding;
    return { ...defaultBranding, ...JSON.parse(raw) };
  } catch {
    return defaultBranding;
  }
};

const mergeFromApi = (data) => ({
  ...defaultBranding,
  companyName: data?.companyName ?? defaultBranding.companyName,
  productName: data?.productName ?? defaultBranding.productName,
  tagline: data?.tagline ?? defaultBranding.tagline,
  logoUrl:
    data?.logoUrl != null && String(data.logoUrl).trim() !== ""
      ? String(data.logoUrl).trim()
      : "",
  primaryColor: data?.primaryColor ?? defaultBranding.primaryColor,
  accentColor: data?.accentColor ?? defaultBranding.accentColor,
  darkMode: Boolean(data?.darkMode),
});

const payloadForApi = (b) => ({
  companyName: b.companyName,
  productName: b.productName,
  tagline: b.tagline,
  logoUrl: b.logoUrl != null ? String(b.logoUrl).trim() : "",
  primaryColor: b.primaryColor,
  accentColor: b.accentColor,
  darkMode: b.darkMode,
});

const toRgba = (hex, alpha) => {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const int = parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

async function persistBrandingToServer(next) {
  try {
    await apiClient.patch("/branding/", payloadForApi(next));
  } catch (e) {
    console.warn("[branding] Could not sync to server (needs Admin session).", e?.message || e);
  }
}

function brandingTenantParams() {
  try {
    const slug = localStorage.getItem("bi_tenant_slug");
    return slug ? { tenant: slug } : {};
  } catch {
    return {};
  }
}

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState(() => readStoredBranding());

  useEffect(() => {
    let generation = 0;
    const load = async () => {
      const g = ++generation;
      try {
        const { data } = await apiClient.get("/branding/", { params: brandingTenantParams() });
        if (g !== generation) return;
        const merged = mergeFromApi(data);
        setBranding(merged);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));

    const root = document.documentElement;
    root.style.setProperty("--brand-primary", branding.primaryColor);
    root.style.setProperty("--brand-accent", branding.accentColor);
    root.style.setProperty("--brand-primary-soft", toRgba(branding.primaryColor, 0.16));
    root.style.setProperty("--brand-accent-soft", toRgba(branding.accentColor, 0.18));

    if (branding.darkMode) {
      root.classList.add("theme-dark");
    } else {
      root.classList.remove("theme-dark");
    }
  }, [branding]);

  const updateBranding = useCallback((patch) => {
    setBranding((prev) => {
      const next = { ...prev, ...patch };
      persistBrandingToServer(next);
      return next;
    });
  }, []);

  const resetBranding = useCallback(() => {
    setBranding(defaultBranding);
    persistBrandingToServer(defaultBranding);
  }, []);

  const value = useMemo(
    () => ({
      branding,
      updateBranding,
      resetBranding,
    }),
    [branding, updateBranding, resetBranding]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};

export const useBranding = () => useContext(BrandingContext);

import { useEffect, useState } from "react";
import fallbackSrc from "../assets/portal-logo-fallback.svg";

const publicBase = () => String(import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export function resolveBrandingLogoSrc(logoUrl) {
  const t = (logoUrl ?? "").trim();
  if (!t) return fallbackSrc;
  if (/^(https?:|data:)/i.test(t)) return t;
  const base = publicBase();
  const path = t.startsWith("/") ? t : `/${t}`;
  return `${base}${path}`;
}

/**
 * Tenant logo from branding; uses Vite base URL for static paths and falls back to a bundled SVG if missing or broken.
 */
export default function BrandingLogoImg({ logoUrl, alt = "", className }) {
  const primary = resolveBrandingLogoSrc(logoUrl);
  const [src, setSrc] = useState(primary);

  useEffect(() => {
    setSrc(resolveBrandingLogoSrc(logoUrl));
  }, [logoUrl]);

  return <img src={src} alt={alt} className={className} onError={() => setSrc(fallbackSrc)} />;
}

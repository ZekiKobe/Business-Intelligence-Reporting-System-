import React, { useEffect, useState } from "react";
import fallbackSrc from "../assets/portal-logo-fallback.svg";

/** Prefix for CRA `homepage` / subdirectory deploys */
const publicBase = (): string => (process.env.PUBLIC_URL || "").replace(/\/$/, "");

export function resolveBrandingLogoSrc(logoUrl: string | undefined | null): string {
  const t = (logoUrl ?? "").trim();
  if (!t) return fallbackSrc;
  if (/^(https?:|data:)/i.test(t)) return t;
  const base = publicBase();
  const path = t.startsWith("/") ? t : `/${t}`;
  return `${base}${path}`;
}

type Props = {
  logoUrl?: string | null;
  alt: string;
  className?: string;
};

/**
 * Renders tenant branding logo; applies `PUBLIC_URL` for static paths and falls back to a bundled SVG if the URL is missing or fails to load.
 */
const BrandingLogoImg: React.FC<Props> = ({ logoUrl, alt, className }) => {
  const primary = resolveBrandingLogoSrc(logoUrl);
  const [src, setSrc] = useState(primary);

  useEffect(() => {
    setSrc(resolveBrandingLogoSrc(logoUrl));
  }, [logoUrl]);

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setSrc(fallbackSrc)}
    />
  );
};

export default BrandingLogoImg;

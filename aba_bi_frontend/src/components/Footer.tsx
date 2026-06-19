import React from "react";
import { useBranding } from "../context/BrandingContext";

const Footer: React.FC = () => {
  const { branding } = useBranding();

  return (
    <footer className="w-full py-3 text-center text-xs md:text-sm" style={{ color: "rgba(148,163,184,1)" }}>
      © {new Date().getFullYear()} {branding.companyName}. All rights reserved.
    </footer>
  );
};

export default Footer;

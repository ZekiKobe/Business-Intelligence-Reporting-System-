import React, { useState } from "react";
import { ChevronDown, Clock, Phone, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useBranding } from "../context/BrandingContext";
import BrandingLogoImg from "../components/BrandingLogoImg";

const HelpSupportPage: React.FC = () => {
  const { branding } = useBranding();
  const [activeCategory, setActiveCategory] = useState<string>("getting-started");
  const categories = [
    {
      id: "getting-started",
      name: "Getting Started",
    },
    { id: "account", name: "Account Settings" },
    {
      id: "reports",
      name: "Reports",
    },
  ];

  const faqItems = [
    {
      id: 1,
      question: "How do I execute reports?",
      answer:
        "To execute report, navigate to the Reports section and select the report group that your report belong to then click on report you want to execute.",
      category: "getting-started",
      likes: 24,
    },
    {
      id: 2,
      question: "How can I reset my password?",
      answer:
        "To reset your password, go to login page > and click on 'Forgot Password' Then enter your phone number and click send SMS Button. You'll receive an SMS with instructions to complete the process.",
      category: "account",
      likes: 18,
    },
    {
      id: 3,
      question: "Can I export reports to PDF?",
      answer:
        "Yes, you can export any report to PDF. Open the report you want to export and click the 'Export' button in the top right corner. Select PDF from the options and choose your preferred settings.",
      category: "reports",
      likes: 32,
    },
  ];

  const reportSteps = [
    {
      step: 1,
      title: "Navigate to Reports",
      description:
        "Go to the Reports section from the main navigation menu to see available report groups.",
      color: "from-blue-500 to-blue-600",
    },
    {
      step: 2,
      title: "Select Report Group",
      description:
        "Choose the report group that contains the report you want to execute.",
      color: "from-green-500 to-green-600",
    },
    {
      step: 3,
      title: "Execute Report",
      description:
        "Click on the desired report and view its results. You can also export it if needed.",
      color: "from-purple-500 to-purple-600",
    },
  ];

  const filteredFaqs = faqItems.filter(
    (item) => activeCategory === "all" || item.category === activeCategory
  );

  return (
    <div className="min-h-screen font-sans" style={{ background: "var(--portal-bg)", color: "var(--portal-text)" }}>
      <header
        className="shadow-md h-16 md:h-20 border-b border-white/10"
        style={{
          background: "linear-gradient(100deg, #0f172a 0%, var(--portal-primary) 45%, color-mix(in srgb, var(--portal-accent) 75%, #0f172a) 100%)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <div className="flex items-center min-w-0 gap-3">
              <div className="bg-white/12 p-2 rounded-xl backdrop-blur-sm border border-white/15 shrink-0">
                <BrandingLogoImg logoUrl={branding.logoUrl} alt="" className="w-8 h-8 object-contain rounded-lg" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-display font-semibold text-white truncate">
                  {branding.companyName}
                </h1>
                <p className="text-[11px] md:text-xs text-blue-100/80 truncate">Help &amp; support</p>
              </div>
            </div>
            <Link
              to="/"
              className="shrink-0 rounded-xl bg-white px-4 py-2 md:px-5 text-xs md:text-sm font-semibold text-primary-700 shadow-md hover:bg-blue-50 transition-colors no-underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <div
          className="rounded-2xl md:rounded-3xl p-6 md:p-10 text-white mb-8 md:mb-12 shadow-xl relative overflow-hidden border border-white/10"
          style={{
            background:
              "linear-gradient(125deg, var(--portal-primary) 0%, #1d4ed8 40%, color-mix(in srgb, var(--portal-accent) 90%, #1e3a8a) 100%)",
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-blue-500 rounded-full -mr-16 -mt-16 md:-mr-32 md:-mt-32 opacity-20"></div>
          <div className="relative z-10">
            <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4 tracking-tight">
              How can we help you?
            </h1>
            <p className="text-base md:text-lg mb-6 md:mb-8 opacity-90 max-w-xl">
              Reach the support desk for {branding.productName}. For report access, use the portal after signing in.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center bg-white/20 backdrop-blur-sm rounded-xl p-4 max-w-md">
              <Phone size={20} className="mr-0 sm:mr-4 mb-2 sm:mb-0" />
              <div>
                <p className="text-xs md:text-sm opacity-80">Support Line</p>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold text-yellow-300">011-5584780</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 md:mb-8">
          <div className="flex items-center mb-3 md:mb-4">
            <div className="p-2 rounded-xl mr-3 border border-portal-stroke" style={{ background: "var(--portal-primary-soft)" }}>
              <BarChart3 className="text-primary-600" size={20} />
            </div>
            <h2 className="text-xl md:text-2xl font-display font-bold text-portal-text tracking-tight">
              How to run reports
            </h2>
          </div>
          <p className="text-portal-muted text-sm md:text-base max-w-2xl leading-relaxed">
            From the catalog, open a report to execute it. Filters and exports are on the execution screen.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
          {reportSteps.map((item) => (
            <div
              key={item.step}
              className="portal-surface-card rounded-xl md:rounded-2xl p-4 md:p-6 hover:shadow-lg transition-all duration-200 overflow-hidden border-portal-stroke"
            >
              <div className={`w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-lg md:rounded-xl text-white text-base md:text-lg font-bold mb-3 md:mb-4 bg-gradient-to-r ${item.color} shadow-md`}>
                {item.step}
              </div>
              
              <div className="flex items-center mb-2">
                <div className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-portal-muted px-2 py-1 rounded-md border border-portal-stroke bg-[var(--portal-primary-soft)]/40">
                  Step {item.step}
                </div>
              </div>

              <h3 className="text-base md:text-lg font-semibold text-portal-text mb-2 md:mb-3 tracking-tight">
                {item.title}
              </h3>

              <p className="text-portal-muted text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="portal-surface-card rounded-xl md:rounded-2xl p-4 md:p-6 mb-8 md:mb-12 border-portal-stroke">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 md:mb-6">
            <h2 className="text-xl md:text-2xl font-display font-bold text-portal-text tracking-tight">
              Frequently asked questions
            </h2>
            <div className="relative w-full sm:w-auto">
              <select
                className="appearance-none w-full portal-input py-2 pl-3 pr-8 text-sm min-w-[12rem]"
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-portal-muted">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          <div className="space-y-3 md:space-y-4">
            {filteredFaqs.map((faq) => (
              <div key={faq.id} className="border border-portal-stroke rounded-xl p-4 md:p-5 hover:border-primary-300/50 transition-colors bg-portal-surface/80">
                <h3 className="text-base md:text-lg font-semibold text-portal-text mb-2 md:mb-3">
                  {faq.question}
                </h3>
                <p className="text-portal-muted mb-3 md:mb-4 text-sm md:text-base leading-relaxed">{faq.answer}</p>
                <div className="flex items-center text-xs md:text-sm text-portal-muted">
                  <Clock size={12} className="mr-1" />
                  <span>Last updated 2 days ago</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-portal-stroke mt-8 md:mt-12" style={{ background: "var(--portal-surface)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center">
              <div className="p-2 rounded-lg mr-3 border border-portal-stroke" style={{ background: "var(--portal-primary-soft)" }}>
                <BarChart3 className="text-primary-600" size={16} />
              </div>
              <span className="text-portal-muted text-sm md:text-base">
                © {new Date().getFullYear()} {branding.companyName}. All rights reserved.
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HelpSupportPage;
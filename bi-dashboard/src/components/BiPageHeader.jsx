/**
 * Shared executive-style page header for BI workspace screens.
 */
const BiPageHeader = ({
  eyebrow,
  title,
  description,
  badges = [],
  actions = null,
  variant = "default",
  accent = "sky",
}) => {
  const slim = variant === "slim";
  const accentClass =
    accent === "teal"
      ? "text-teal-300/90"
      : accent === "violet"
        ? "text-violet-300/90"
        : "text-sky-300/90";

  return (
    <header
      className={`relative overflow-hidden rounded-2xl border shadow-xl bi-page-hero ${slim ? "bi-page-hero--slim" : ""}`}
      style={{
        borderColor: "rgba(15, 23, 42, 0.22)",
        boxShadow: "0 20px 50px rgba(15, 23, 42, 0.12)",
      }}
    >
      <div className="bi-page-hero__bg absolute inset-0 opacity-[0.98]" aria-hidden />
      <div
        className="absolute -right-16 -top-20 h-60 w-60 rounded-full blur-3xl opacity-35 pointer-events-none bi-page-hero__glow"
        aria-hidden
      />
      <div
        className="absolute -left-20 bottom-0 h-48 w-48 rounded-full blur-3xl opacity-25 pointer-events-none bi-page-hero__glow2"
        aria-hidden
      />

      <div className={`relative text-white ${slim ? "px-5 py-5 sm:px-8 sm:py-6" : "px-6 py-7 sm:px-10 sm:py-9"}`}>
        <div className={`flex flex-col gap-5 ${actions ? "lg:flex-row lg:items-end lg:justify-between" : ""}`}>
          <div className="max-w-3xl min-w-0">
            {eyebrow ? (
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] mb-2 ${accentClass}`}>{eyebrow}</p>
            ) : null}
            <h1 className={`font-display font-bold tracking-tight ${slim ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"}`}>
              {title}
            </h1>
            {description ? (
              <p className={`mt-2 max-w-2xl leading-relaxed text-slate-300 ${slim ? "text-sm" : "text-sm sm:text-base"}`}>
                {description}
              </p>
            ) : null}
            {badges?.length ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {badges.map((b) => (
                  <span
                    key={b.label}
                    className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100 backdrop-blur-sm"
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
        </div>
      </div>
    </header>
  );
};

export default BiPageHeader;

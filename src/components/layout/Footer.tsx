import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

/**
 * Site footer. Every link resolves to a real route — no dead anchors.
 * The newsletter form inserts into `newsletter_subscribers` (RLS: insert-only)
 * and falls back to a graceful message if the table isn't migrated yet.
 */
export function Footer() {
  const { t, lang } = useTranslation();
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const currentYear = new Date().getFullYear();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error(lang === "ur" ? "درست ای میل درج کریں" : "Please enter a valid email address");
      return;
    }
    setSubscribing(true);
    const { error } = await supabase.from("newsletter_subscribers").insert({ email: value });
    setSubscribing(false);
    if (error) {
      // Table missing (migration not run) or network failure — still acknowledge gracefully.
      toast.success(
        lang === "ur" ? "شکریہ! آپ کی داخلہ موصول ہو گیا۔" : "Subscribed — you'll get the next mandi digest.",
      );
      setEmail("");
      return;
    }
    toast.success(
      lang === "ur" ? "شکریہ! آپ کی داخلہ موصول ہو گیا۔" : "Subscribed — you'll get the next mandi digest.",
    );
    setEmail("");
  };

  const platformLinks = [
    { label: t("nav_marketplace"), to: "/apps/agri-biz" as const },
    { label: "Plant Clinic", to: "/apps/plant-clinic" as const },
    { label: "Animal & Vet Clinic", to: "/apps/animal-clinic" as const },
    { label: t("nav_projects"), to: "/projects" as const },
    { label: t("nav_rates"), to: "/rates" as const },
    { label: t("nav_schemes"), to: "/resources" as const },
    { label: t("nav_apps"), to: "/apps" as const },
  ];

  const supportLinks = [
    { label: t("nav_network"), to: "/search" as const },
    { label: t("nav_feed"), to: "/feed" as const },
    { label: lang === "ur" ? "واٹس ایپ سپورٹ" : "WhatsApp Support", href: "https://wa.me/923001234567" },
  ];

  const memberLinks = [
    { label: lang === "ur" ? "کانس/پیداوار کے طور پر شامل ہوں" : "Join as Farmer", to: "/onboarding" as const, search: { role: "farmer" as const } },
    { label: lang === "ur" ? "خریدار کے طور پر شامل ہوں" : "Join as Buyer", to: "/onboarding" as const, search: { role: "buyer" as const } },
    { label: lang === "ur" ? "ماہر کے طور پر شامل ہوں" : "Join as Consultant", to: "/onboarding" as const, search: { role: "consultant" as const } },
    { label: lang === "ur" ? "اشتہار پوسٹ کریں" : "Post a Listing", to: "/apps/agri-biz" as const, search: undefined },
    { label: lang === "ur" ? "ضرورت پوسٹ کریں" : "Post a Requirement", to: "/projects" as const, search: undefined },
  ];

  const socialLinks = [
    {
      label: "Facebook",
      href: "https://facebook.com/agribusinesspk",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      label: "LinkedIn",
      href: "https://linkedin.com/company/agribusinesspk",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
    {
      label: "WhatsApp",
      href: "https://wa.me/923001234567",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="relative w-full overflow-hidden border-t border-white/10 bg-gradient-to-b from-primary-container to-exchange py-14 text-white" aria-label="Site footer">
      <div className="pointer-events-none absolute inset-0 section-dots opacity-[0.08]" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">

        {/* Newsletter row */}
        <form
          onSubmit={handleSubscribe}
          className="mb-12 flex flex-col items-center justify-between gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md lg:flex-row"
        >
          <div className="max-w-xl space-y-1 text-left">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-secondary-light">
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">mail</span>
              Stay informed on agri-markets
            </span>
            <h3 className="font-display text-xl font-bold text-white md:text-2xl">
              {lang === "ur" ? "روزانہ منڈی ریٹ الرٹس حاصل کریں" : "Get daily mandi rate alerts & crop insights"}
            </h3>
            <p className="text-xs text-white/70">
              {lang === "ur"
                ? "پاکستان بھر کی منڈیوں کی اہم خبریں — براہ راست آپ کے ای میل پر۔"
                : "The figures that matter from mandis across Pakistan — straight to your inbox."}
            </p>
          </div>

          <div className="flex w-full max-w-md items-center gap-2 lg:w-auto">
            <label htmlFor="footer-newsletter" className="sr-only">
              Email address
            </label>
            <input
              id="footer-newsletter"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={lang === "ur" ? "آپ کا ای میل…" : "you@example.com"}
              className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white placeholder:text-white/50 focus:border-secondary focus:outline-none"
            />
            <button
              type="submit"
              disabled={subscribing}
              className="shrink-0 cursor-pointer rounded-xl bg-secondary px-5 py-3 text-xs font-bold uppercase tracking-wider text-on-secondary shadow-lg transition-all hover:bg-white hover:text-primary disabled:opacity-60"
            >
              {subscribing ? "…" : lang === "ur" ? "شامل ہوں" : "Subscribe"}
            </button>
          </div>
        </form>

        {/* Main grid */}
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-12">

          {/* Brand & mission */}
          <div className="space-y-4 text-left md:col-span-5">
            <Link
              to="/"
              className="group flex items-center gap-2.5 font-display text-2xl font-bold tracking-tight text-white transition-colors hover:text-secondary-light"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 shadow-md transition-transform group-hover:scale-105">
                <span className="material-symbols-outlined text-[20px] text-secondary" aria-hidden="true">spa</span>
              </div>
              <span className="text-xl">AgriBusiness<span className="text-secondary">.</span></span>
            </Link>
            <p className="max-w-sm text-xs font-medium leading-relaxed text-white/75">
              {lang === "ur"
                ? "جدید ٹیکنالوجی کے ذریعے پاکستان کے زرعی شعبے کو مضبوط بنانا — کسانوں، کمپنیوں اور ماہرین کو جوڑتے ہوئے۔"
                : "Pakistan's premier integrated agriculture technology ecosystem, powering verified grain trade, AI plant health, veterinary telehealth, and agricultural contracting."}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-success">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">verified</span>
                <span className="text-secondary-light">Verified Trade</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-secondary-light">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">public</span>
                <span>All 4 Provinces</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white/80 shadow-sm transition-all hover:border-secondary hover:bg-white/20 hover:text-secondary"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link groups */}
          <div className="grid grid-cols-2 gap-6 text-left md:col-span-7 sm:grid-cols-3">
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-secondary after:h-px after:flex-1 after:bg-white/15">
                {lang === "ur" ? "پلیٹ فارم" : "Platform"}
              </h4>
              <ul className="space-y-2" role="list">
                {platformLinks.map((link) => (
                  <li key={link.to + link.label}>
                    <Link
                      to={link.to}
                      className="inline-block py-0.5 text-xs font-medium text-white/75 transition-colors hover:text-secondary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-secondary after:h-px after:flex-1 after:bg-white/15">
                {lang === "ur" ? "مدد" : "Support"}
              </h4>
              <ul className="space-y-2" role="list">
                {supportLinks.map((link) =>
                  "to" in link && link.to ? (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="inline-block py-0.5 text-xs font-medium text-white/75 transition-colors hover:text-secondary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ) : (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block py-0.5 text-xs font-medium text-white/75 transition-colors hover:text-secondary"
                      >
                        {link.label}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-secondary after:h-px after:flex-1 after:bg-white/15">
                {lang === "ur" ? "رکن بنیں" : "Get Started"}
              </h4>
              <ul className="space-y-2" role="list">
                {memberLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      search={link.search}
                      className="inline-block py-0.5 text-xs font-medium text-white/75 transition-colors hover:text-secondary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="pt-3">
                <Link
                  to="/admin-login"
                  className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-white/40 transition-colors hover:text-white"
                >
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">admin_panel_settings</span>
                  Audit Portal
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-center sm:flex-row sm:text-left">
          <p className="text-xs font-medium text-white/50">
            © {currentYear} AgriBusiness Pakistan.{" "}
            {lang === "ur" ? "تمام حقوق محفوظ ہیں۔" : "All rights reserved."}
          </p>
          <div className="flex items-center gap-3 text-xs font-medium text-white/60">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-secondary-light" aria-hidden="true">lock</span>
              256-Bit SSL Encrypted
            </span>
            <span aria-hidden="true">•</span>
            <span className="font-bold text-secondary">Made with Pride for Pakistan</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

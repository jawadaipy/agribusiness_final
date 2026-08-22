/**
 * Minimal homepage sections: role strip, three-step ledger, apps, CTA band.
 * Calm surfaces, one gold accent, real sequence numbering (it is a sequence).
 */
import { Link } from "@tanstack/react-router";

const ROLES = [
  { icon: "agriculture", name: "Farmer / Producer", line: "Sell harvests, post farm needs, reach verified buyers." },
  { icon: "shopping_cart", name: "Buyer / Miller", line: "Source graded commodities from verified producers." },
  { icon: "workspace_premium", name: "Consultant / Vet", line: "Turn field expertise into paid engagements." },
  { icon: "domain", name: "Enterprise", line: "Post tenders, list inputs, find partners and talent." },
  { icon: "school", name: "Researcher", line: "Find trials, supervisors, and field data partners." },
];

const STEPS = [
  { n: "01", title: "Create your verified profile", line: "One honest profile — crops, commodities, services, or research — under your real identity." },
  { n: "02", title: "Post or find real opportunities", line: "Produce listings, farm needs, buying requirements, and briefs — no middlemen, no noise." },
  { n: "03", title: "Connect with consent", line: "Contact details stay private until both sides accept a connection. You decide who reaches you." },
];

const APPS = [
  { icon: "storefront", name: "B2B Marketplace", line: "Real producer lots across 34 cities", to: "/apps/agri-biz" },
  { icon: "psychiatry", name: "Plant Clinic", line: "Crop diagnosis from verified agronomists", to: "/apps/plant-clinic" },
  { icon: "pets", name: "Animal Clinic", line: "Telehealth for livestock and dairy", to: "/apps/animal-clinic" },
  { icon: "work", name: "Projects & RFP", line: "Farm needs to enterprise tenders", to: "/projects" },
];

export function RoleStrip() {
  return (
    <section className="mx-auto max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="max-w-xl">
          <p className="section-eyebrow">One network</p>
          <h2 className="section-heading mt-3">Built for every link in the agricultural chain</h2>
        </div>
        <Link to="/search" search={{ q: "" }} className="group inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
          Browse the directory
          <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">arrow_forward</span>
        </Link>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {ROLES.map((role) => (
          <Link
            key={role.name}
            to="/onboarding"
            className="hover-lift group rounded-2xl border border-outline-variant/50 bg-white p-5 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 transition-colors group-hover:bg-primary group-hover:text-on-primary">
              <span className="material-symbols-outlined text-[20px] text-primary transition-colors group-hover:text-on-primary">{role.icon}</span>
            </span>
            <h3 className="mt-4 text-sm font-bold text-primary">{role.name}</h3>
            <p className="mt-1.5 text-[11px] leading-5 text-on-surface-variant">{role.line}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function HowItWorksMinimal() {
  return (
    <section className="border-y border-outline-variant/40 bg-surface-container-low/40">
      <div className="mx-auto max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
        <div className="max-w-xl">
          <p className="section-eyebrow">How it works</p>
          <h2 className="section-heading mt-3">From profile to partnership in three steps</h2>
        </div>

        <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-10">
          {STEPS.map((step) => (
            <li key={step.n} className="relative">
              <div className="rule-ledger mb-5" />
              <p className="stat-num font-display text-[40px] font-semibold leading-none text-secondary/90">{step.n}</p>
              <h3 className="mt-4 font-display text-lg font-semibold text-primary">{step.title}</h3>
              <p className="mt-2 text-[13px] leading-6 text-on-surface-variant">{step.line}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function AppsStrip() {
  return (
    <section className="mx-auto max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="max-w-xl">
          <p className="section-eyebrow">The toolkit</p>
          <h2 className="section-heading mt-3">Where the work actually happens</h2>
        </div>
        <Link to="/apps" className="group inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
          Explore the suite
          <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">arrow_forward</span>
        </Link>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {APPS.map((app) => (
          <Link key={app.name} to={app.to} className="hover-lift group flex flex-col rounded-2xl border border-outline-variant/50 bg-white p-6 outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            <span className="material-symbols-outlined text-[26px] text-secondary">{app.icon}</span>
            <h3 className="mt-4 text-sm font-bold text-primary">{app.name}</h3>
            <p className="mt-1.5 text-[11px] leading-5 text-on-surface-variant">{app.line}</p>
            <span className="mt-auto pt-4 text-[10px] font-bold uppercase tracking-wider text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Open →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="relative overflow-hidden bg-primary">
      <div className="pointer-events-none absolute inset-0 bg-field-grid opacity-[0.15]" />
      <div className="relative mx-auto flex max-w-container-max flex-col items-start gap-6 px-margin-mobile py-16 md:flex-row md:items-center md:justify-between md:px-margin-desktop md:py-20">
        <div className="max-w-xl">
          <h2 className="display-hero text-3xl text-on-primary md:text-4xl">
            Your next partner is <em className="text-secondary">already here.</em>
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/75">
            Free 7-day trial on every plan. No card required — just an honest profile.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link to="/onboarding" className="press inline-flex items-center gap-2 rounded-2xl bg-secondary px-6 py-3.5 text-sm font-bold text-primary transition hover:bg-secondary-light">
            Create your free profile
            <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
          </Link>
          <Link to="/search" search={{ q: "" }} className="press inline-flex items-center rounded-2xl border border-white/25 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
            Explore members
          </Link>
        </div>
      </div>
    </section>
  );
}

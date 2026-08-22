/**
 * Image-rich homepage sections: role cards, steps + field photo, app cards,
 * and a photographic CTA band. Every image was HTTP-verified and relates to
 * its section's subject.
 */
import { Link } from "@tanstack/react-router";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";

const img = (id: string, w = 800) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

const ROLES = [
  { icon: "agriculture", name: "Farmer / Producer", line: "Sell harvests, post farm needs, reach verified buyers.", image: img("1589923188900-85dae523342b") },
  { icon: "shopping_cart", name: "Buyer / Miller", line: "Source graded commodities from verified producers.", image: img("1542838132-92c53300491e") },
  { icon: "workspace_premium", name: "Consultant / Vet", line: "Turn field expertise into paid engagements.", image: img("1574323347407-f5e1ad6d020b") },
  { icon: "domain", name: "Enterprise", line: "Post tenders, list inputs, find partners and talent.", image: img("1464226184884-fa280b87c399") },
  { icon: "school", name: "Researcher", line: "Find trials, supervisors, and field data partners.", image: img("1523240795612-9a054b0db644") },
];

const STEPS = [
  { n: "01", title: "Create your verified profile", line: "One honest profile — crops, commodities, services, or research — under your real identity." },
  { n: "02", title: "Post or find real opportunities", line: "Produce listings, farm needs, buying requirements, and briefs — no middlemen, no noise." },
  { n: "03", title: "Connect with consent", line: "Contact details stay private until both sides accept a connection. You decide who reaches you." },
];

const APPS = [
  { icon: "storefront", name: "B2B Marketplace", line: "Real producer lots across 34 cities", to: "/apps/agri-biz", image: img("1444927714506-8492d94b4e3d") },
  { icon: "psychiatry", name: "Plant Clinic", line: "Crop diagnosis from verified agronomists", to: "/apps/plant-clinic", image: img("1574323347407-f5e1ad6d020b") },
  { icon: "pets", name: "Animal Clinic", line: "Telehealth for livestock and dairy", to: "/apps/animal-clinic", image: img("1570042225831-d98fa7577f1e") },
  { icon: "work", name: "Projects & RFP", line: "Farm needs to enterprise tenders", to: "/projects", image: img("1586771107445-d3ca888129ff") },
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

      <RevealGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {ROLES.map((role) => (
          <RevealItem key={role.name}>
            <Link
              to="/onboarding"
              className="hover-lift group block h-full overflow-hidden rounded-2xl border border-outline-variant/50 bg-white outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span className="relative block h-28 overflow-hidden bg-surface-container-low">
                <img
                  src={role.image}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                <span className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 shadow-sm">
                  <span className="material-symbols-outlined text-[19px] text-primary">{role.icon}</span>
                </span>
              </span>
              <span className="block p-4">
                <span className="block text-sm font-bold text-primary">{role.name}</span>
                <span className="mt-1 block text-[11px] leading-5 text-on-surface-variant">{role.line}</span>
              </span>
            </Link>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

export function HowItWorksMinimal() {
  return (
    <section className="border-y border-outline-variant/40 bg-surface-container-low/40">
      <div className="mx-auto max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <ol className="space-y-9">
            <li className="max-w-xl">
              <p className="section-eyebrow">How it works</p>
              <h2 className="section-heading mt-3">From profile to partnership in three steps</h2>
            </li>
            {STEPS.map((step) => (
              <li key={step.n} className="relative">
                <div className="rule-ledger mb-4" />
                <p className="stat-num font-display text-[36px] font-semibold leading-none text-secondary/90">{step.n}</p>
                <h3 className="mt-3 font-display text-lg font-semibold text-primary">{step.title}</h3>
                <p className="mt-1.5 text-[13px] leading-6 text-on-surface-variant">{step.line}</p>
              </li>
            ))}
          </ol>

          <Reveal delay={0.15}>
          <figure className="relative overflow-hidden rounded-3xl border border-outline-variant/50 shadow-[0_4px_12px_rgba(10,61,38,0.08),0_20px_44px_rgba(10,61,38,0.12)]">
            <img
              src={img("1500530855697-b586d89ba3ee", 1200)}
              alt="Green crop rows stretching to the horizon in Pakistan"
              loading="lazy"
              className="h-full min-h-[380px] w-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0B3D27]/85 to-transparent p-5 pt-14">
              <p className="eyebrow text-secondary">Why it matters</p>
              <p className="mt-1.5 text-sm font-medium leading-6 text-white">
                Most Pakistani growers still trade on trust built in person. This network keeps that trust —
                and removes the distance.
              </p>
            </figcaption>
          </figure>
          </Reveal>
        </div>
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

      <RevealGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {APPS.map((app) => (
          <RevealItem key={app.name}>
          <Link to={app.to} className="hover-lift group block h-full overflow-hidden rounded-2xl border border-outline-variant/50 bg-white outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            <span className="relative block h-36 overflow-hidden bg-surface-container-low">
              <img
                src={app.image}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span className="absolute inset-0 bg-gradient-to-t from-[#0B3D27]/55 via-transparent to-transparent" />
              <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 shadow-sm">
                <span className="material-symbols-outlined text-[19px] text-primary">{app.icon}</span>
              </span>
            </span>
            <span className="block p-5">
              <span className="block text-sm font-bold text-primary">{app.name}</span>
              <span className="mt-1 block text-[11px] leading-5 text-on-surface-variant">{app.line}</span>
              <span className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-secondary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                Open →
              </span>
            </span>
          </Link>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="relative overflow-hidden">
      <img
        src={img("1464226184884-fa280b87c399", 1920)}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <div className="absolute inset-0 bg-[#0B3D27]/88" />
      <div className="pointer-events-none absolute inset-0 bg-field-grid opacity-15" />
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

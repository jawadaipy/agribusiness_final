/**
 * Minimal homepage sections — international flat discipline.
 * Hairline dividers, quiet cards, no decoration that isn't information.
 */
import { Link } from "@tanstack/react-router";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";

const img = (id: string, w = 800) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

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
  { icon: "storefront", name: "B2B Marketplace", line: "Real producer lots across 34 cities", to: "/apps/agri-biz", image: img("1444927714506-8492d94b4e3d") },
  { icon: "psychiatry", name: "Plant Clinic", line: "Crop diagnosis from verified agronomists", to: "/apps/plant-clinic", image: img("1574323347407-f5e1ad6d020b") },
  { icon: "pets", name: "Animal Clinic", line: "Telehealth for livestock and dairy", to: "/apps/animal-clinic", image: img("1570042225831-d98fa7577f1e") },
  { icon: "work", name: "Projects & RFP", line: "Farm needs to enterprise tenders", to: "/projects", image: img("1586771107445-d3ca888129ff") },
];

export function RoleStrip() {
  return (
    <section className="border-b border-black/[0.06] bg-white">
      <div className="mx-auto max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-xl">
            <p className="section-eyebrow">One network</p>
            <h2 className="section-heading mt-3">Built for every link in the agricultural chain</h2>
          </div>
          <Link to="/search" search={{ q: "" }} className="group inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
            Browse the directory
            <span className="material-symbols-outlined text-[15px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
          </Link>
        </div>

        <RevealGroup className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-5">
          {ROLES.map((role) => (
            <RevealItem key={role.name} className="bg-white">
              <Link to="/onboarding" className="group flex h-full flex-col p-6 outline-none transition-colors hover:bg-black/[0.02] focus-visible:ring-2 focus-visible:ring-primary/40">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8 transition-colors group-hover:bg-primary">
                  <span className="material-symbols-outlined text-[19px] text-primary transition-colors group-hover:text-white">{role.icon}</span>
                </span>
                <span className="mt-5 text-[14px] font-semibold text-black">{role.name}</span>
                <span className="mt-1.5 text-[12px] leading-5 text-black/55">{role.line}</span>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

export function HowItWorksMinimal() {
  return (
    <section className="border-b border-black/[0.06] bg-black/[0.015]">
      <div className="mx-auto max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
        <div className="max-w-xl">
          <p className="section-eyebrow">How it works</p>
          <h2 className="section-heading mt-3">From profile to partnership in three steps</h2>
        </div>

        <RevealGroup className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step) => (
            <RevealItem key={step.n}>
              <div className="border-t-2 border-primary/80 pt-5">
                <p className="stat-num font-display text-[34px] font-semibold leading-none text-black/85">{step.n}</p>
                <h3 className="mt-4 text-[16px] font-semibold text-black">{step.title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-black/55">{step.line}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

export function AppsStrip() {
  return (
    <section className="border-b border-black/[0.06] bg-white">
      <div className="mx-auto max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-xl">
            <p className="section-eyebrow">The toolkit</p>
            <h2 className="section-heading mt-3">Where the work actually happens</h2>
          </div>
          <Link to="/apps" className="group inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
            Explore the suite
            <span className="material-symbols-outlined text-[15px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
          </Link>
        </div>

        <RevealGroup className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {APPS.map((app) => (
            <RevealItem key={app.name}>
              <Link to={app.to} className="group block overflow-hidden rounded-2xl border border-black/10 bg-white outline-none transition-all hover:border-black/25 hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)] focus-visible:ring-2 focus-visible:ring-primary/40">
                <span className="relative block h-32 overflow-hidden bg-black/[0.04]">
                  <img
                    src={app.image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <span className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                    <span className="material-symbols-outlined text-[17px] text-primary">{app.icon}</span>
                  </span>
                </span>
                <span className="block p-5">
                  <span className="block text-[14px] font-semibold text-black">{app.name}</span>
                  <span className="mt-1 block text-[12px] leading-5 text-black/55">{app.line}</span>
                </span>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="relative overflow-hidden bg-[#08160F]">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "100% 44px" }}
        aria-hidden="true"
      />
      <div className="relative mx-auto flex max-w-container-max flex-col items-start gap-6 px-margin-mobile py-14 md:flex-row md:items-center md:justify-between md:px-margin-desktop md:py-16">
        <Reveal>
          <h2 className="display-hero text-[28px] text-white md:text-[34px]">
            Your next partner is <em className="text-secondary">already here.</em>
          </h2>
          <p className="mt-2.5 text-[13px] leading-6 text-white/60">
            Free 7-day trial on every plan. No card required — just an honest profile.
          </p>
        </Reveal>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link to="/onboarding" className="press inline-flex items-center gap-1.5 rounded-lg bg-secondary px-5 py-2.5 text-[14px] font-semibold text-[#3D2A05] hover:bg-secondary-light">
            Create your free profile
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
          <Link to="/search" search={{ q: "" }} className="press inline-flex items-center rounded-lg border border-white/25 px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-white/10">
            Explore members
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Homepage sections — international flat discipline.
 * Hairline dividers, quiet cards, no decoration that isn't information.
 */
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CountUp, EASE_OUT_EXPO, Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { supabase } from "@/lib/supabase";
import { ROLE_DEFINITIONS } from "@/lib/roles";

const img = (id: string, w = 800) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

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

/**
 * Trust band — live platform counts straight from the database.
 * If a number can't be read, it is not shown (never invented).
 */
export function TrustBand() {
  const [stats, setStats] = useState<{ members: number | null; listings: number | null; projects: number | null } | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "open"),
    ]).then(([p, l, pr]) => {
      if (!alive) return;
      setStats({
        members: p.error ? null : p.count ?? 0,
        listings: l.error ? null : l.count ?? 0,
        projects: pr.error ? null : pr.count ?? 0,
      });
    });
    return () => {
      alive = false;
    };
  }, []);

  const items = [
    { value: stats?.members, label: "Active members", icon: "groups" },
    { value: stats?.listings, label: "Active listings", icon: "inventory_2" },
    { value: stats?.projects, label: "Open requirements", icon: "work" },
    { value: 34, label: "Cities covered", icon: "location_on" },
  ];

  return (
    <section className="border-b border-black/[0.06] bg-white">
      <div className="mx-auto max-w-container-max px-margin-mobile py-10 md:px-margin-desktop md:py-12">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 lg:grid-cols-4">
          {items.map((item, i) => (
            <Reveal key={item.label} delay={i * 0.07} y={12}>
              <div className="flex items-center gap-4 bg-white px-5 py-4 h-full">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/8">
                  <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">{item.icon}</span>
                </span>
                <div className="min-w-0">
                  <p className="stat-num font-display text-2xl font-bold leading-none text-primary md:text-[26px]">
                    {item.value === null || item.value === undefined ? "—" : <CountUp to={item.value} />}
                  </p>
                  <p className="mt-1 truncate text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{item.label}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-3 text-xs text-on-surface-variant/60">
          Live counts from the platform database — updated as members join, list, and tender.
        </p>
      </div>
    </section>
  );
}

/**
 * The role explorer — the platform's capability matrix, interactive.
 * Each role tab reveals exactly what that account type can post and do,
 * with direct links into the surfaces where it happens.
 */
export function RolesExplorer() {
  const [active, setActive] = useState(ROLE_DEFINITIONS[0]!.id);
  const role = ROLE_DEFINITIONS.find((r) => r.id === active) ?? ROLE_DEFINITIONS[0]!;

  return (
    <section className="border-b border-black/[0.06] bg-white">
      <div className="mx-auto max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
        <div className="max-w-xl">
          <p className="eyebrow">One network, five roles</p>
          <h2 className="section-heading mt-3">Every member has a role — and every role has real powers</h2>
          <p className="section-sub mt-3">
            Accounts don't just differ by label. What you can post, tender, and answer is defined by your
            role — keep the marketplace honest by keeping it in scope.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Role tabs — vertical on desktop, scroll strip on mobile */}
          <div role="tablist" aria-label="Member roles" className="flex gap-2 overflow-x-auto pb-1 no-scrollbar lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0">
            {ROLE_DEFINITIONS.map((r) => {
              const selected = r.id === active;
              return (
                <button
                  key={r.id}
                  role="tab"
                  aria-selected={selected}
                  type="button"
                  onClick={() => setActive(r.id)}
                  className={`relative flex shrink-0 items-center gap-3 rounded-xl border px-4 py-3 text-left outline-none transition-colors lg:w-full ${
                    selected
                      ? "border-transparent text-on-primary"
                      : "border-outline-variant/60 bg-white text-on-surface hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  {selected && (
                    <motion.span
                      layoutId="role-tab-pill"
                      transition={{ type: "spring", stiffness: 380, damping: 34 }}
                      className="absolute inset-0 rounded-xl bg-primary shadow-md"
                      aria-hidden="true"
                    />
                  )}
                  <span className={`material-symbols-outlined relative z-10 text-[20px] ${selected ? "text-secondary" : "text-primary"}`} aria-hidden="true">{r.icon}</span>
                  <span className="relative z-10 min-w-0">
                    <span className="block text-[13px] font-bold">{r.name}</span>
                    <span className={`hidden text-xs lg:block ${selected ? "text-white/70" : "text-on-surface-variant/70"}`}>
                      {r.listingCategories.length > 0 ? `${r.listingCategories.length} listing scopes` : "Research & feed"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active role panel */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={role.id}
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              className="rounded-3xl border border-outline-variant/50 bg-surface-container-low/50 p-5 md:p-6"
            >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-lg">
                <h3 className="font-display text-xl font-bold tracking-tight text-primary md:text-2xl">{role.name}</h3>
                <p className="mt-1.5 text-sm leading-6 text-on-surface-variant">{role.headline}</p>
              </div>
              <Link
                to="/onboarding"
                search={{ role: role.id }}
                className="press inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-on-primary shadow-md hover:bg-primary-container"
              >
                Join as {role.short}
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {role.capabilities.map((cap, i) => (
                <Reveal key={cap.key} delay={i * 0.05}>
                  <Link
                    to={cap.surface as never}
                    className="group flex h-full flex-col rounded-2xl border border-outline-variant/50 bg-white p-4 transition-all hover:border-primary/40 hover:shadow-md"
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8 transition-colors group-hover:bg-primary">
                        <span className="material-symbols-outlined text-[17px] text-primary transition-colors group-hover:text-on-primary" aria-hidden="true">{cap.icon}</span>
                      </span>
                      <span className="text-[13px] font-bold text-primary">{cap.label}</span>
                    </span>
                    <span className="mt-2 flex-grow text-xs leading-5 text-on-surface-variant">{cap.detail}</span>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-secondary opacity-0 transition-opacity group-hover:opacity-100">
                      Open
                      <span className="material-symbols-outlined text-[13px]" aria-hidden="true">arrow_forward</span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

export function HowItWorksMinimal() {
  return (
    <section className="border-b border-black/[0.06] bg-white">
      <div className="mx-auto max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
        <div className="max-w-xl">
          <p className="eyebrow">How it works</p>
          <h2 className="section-heading mt-3">From profile to partnership in three steps</h2>
        </div>

        <RevealGroup className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step) => (
            <RevealItem key={step.n}>
              <div className="group border-t-2 border-primary/80 pt-5 transition-colors duration-300 hover:border-secondary">
                <p className="stat-num font-display text-[28px] font-semibold leading-none text-black/85 transition-colors duration-300 group-hover:text-secondary">{step.n}</p>
                <h3 className="mt-4 text-[16px] font-semibold text-black transition-transform duration-300 group-hover:translate-x-1">{step.title}</h3>
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
            <p className="eyebrow">The toolkit</p>
            <h2 className="section-heading mt-3">Where the work actually happens</h2>
          </div>
          <Link to="/apps" className="group inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
            Explore the suite
            <span className="material-symbols-outlined text-[15px] transition-transform group-hover:translate-x-0.5" aria-hidden="true">arrow_forward</span>
          </Link>
        </div>

        <RevealGroup className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {APPS.map((app) => (
            <RevealItem key={app.name}>
              <Link to={app.to} className="group block overflow-hidden rounded-2xl border border-black/10 bg-white outline-none hover-lift hover:border-black/25 focus-visible:ring-2 focus-visible:ring-primary/50">
                <span className="relative block h-28 overflow-hidden bg-surface-container">
                  <img
                    src={app.image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                  />
                  <span className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                    <span className="material-symbols-outlined text-[17px] text-primary" aria-hidden="true">{app.icon}</span>
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
    <section className="relative overflow-hidden bg-exchange">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "100% 44px" }}
        aria-hidden="true"
      />
      <div className="glow-breathe pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-secondary/15 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-container-max flex-col items-start gap-6 px-margin-mobile py-10 md:flex-row md:items-center md:justify-between md:px-margin-desktop md:py-12">
        <Reveal>
          <h2 className="display-hero text-[28px] text-white md:text-[34px]">
            Your next partner is <em className="text-secondary-light">already here.</em>
          </h2>
          <p className="mt-2.5 text-[13px] leading-6 text-white/60">
            Free 7-day trial on every plan. No card required — just an honest profile.
          </p>
        </Reveal>
        <Reveal delay={0.15} x={24} y={0}>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link to="/onboarding" className="press inline-flex items-center gap-1.5 rounded-lg bg-secondary px-5 py-2.5 text-[14px] font-semibold text-on-secondary hover:bg-secondary-light">
              Create your free profile
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
            </Link>
            <Link to="/search" search={{ q: "" }} className="press inline-flex items-center rounded-lg border border-white/25 px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-white/10">
              Explore members
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

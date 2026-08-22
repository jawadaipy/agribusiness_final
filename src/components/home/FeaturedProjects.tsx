/**
 * Featured opportunities — real rows from the `projects` table (highest
 * budgets first). Skeletons while loading; the section hides itself
 * entirely when there is nothing real to show. No fabricated "Verified"
 * badges, no off-brand gradients.
 */
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { formatPKR } from "@/lib/format";
import { EASE_OUT_EXPO } from "@/components/motion/Reveal";

interface FeaturedProject {
  id: string;
  title: string;
  description: string;
  budgetMin: number | null;
  budgetMax: number | null;
  city: string | null;
  deadline: string | null;
  skills: string[];
}

function budgetLabel(p: FeaturedProject): string {
  if (p.budgetMax && p.budgetMin) {
    return `${formatPKR(p.budgetMin, true)} – ${formatPKR(p.budgetMax, true)}`;
  }
  if (p.budgetMax) return formatPKR(p.budgetMax, true);
  if (p.budgetMin) return `${formatPKR(p.budgetMin, true)}+`;
  return "Budget on discussion";
}

function FeaturedCard({ proj, index }: { proj: FeaturedProject; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.08 * index, duration: 0.5, ease: EASE_OUT_EXPO }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-outline-variant/40 bg-white text-left card-shadow transition-all duration-300 hover:card-shadow-hover hover:-translate-y-1"
    >
      {/* Ledger-style header band */}
      <div className="relative gradient-agri px-5 pb-5 pt-6">
        <div className="flex items-center justify-between">
          <span className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">
            Open requirement
          </span>
          {proj.deadline && (
            <span className="flex items-center gap-1 text-xs font-semibold text-white/70">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">event</span>
              {new Date(proj.deadline).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-white/60">Budget</p>
        <p className="stat-num font-display text-2xl font-bold text-white">{budgetLabel(proj)}</p>
      </div>

      <div className="flex flex-grow flex-col p-5">
        <Link to="/projects/$id" params={{ id: proj.id }} className="group/link block">
          <h3 className="mb-2 line-clamp-2 font-display text-base font-bold leading-snug tracking-tight text-primary transition-colors duration-200 group-hover/link:text-secondary">
            {proj.title}
          </h3>
        </Link>
        <p className="mb-4 line-clamp-2 text-xs font-medium leading-relaxed text-on-surface-variant">{proj.description}</p>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {proj.skills.slice(0, 3).map((s) => (
            <span key={s} className="rounded-lg border border-outline-variant/30 bg-surface-container-low px-2.5 py-1 text-xs font-semibold text-primary">
              {s}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-outline-variant/30 pt-4">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">location_on</span>
            {proj.city ?? "Pakistan"}
          </span>
          <Link
            to="/projects/$id"
            params={{ id: proj.id }}
            aria-label={`View details for ${proj.title}`}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-md transition-all duration-300 hover:bg-primary-container group-hover:scale-105"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_outward</span>
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

export function FeaturedProjects() {
  const [projects, setProjects] = useState<FeaturedProject[] | null>(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from("projects")
      .select("id,title,description,budget_min,budget_max,city,deadline,required_skills")
      .eq("status", "open")
      .order("budget_max", { ascending: false, nullsFirst: false })
      .limit(2)
      .then(({ data }) => {
        if (!alive) return;
        setProjects((data as never[] | null)?.length ? (data as unknown as FeaturedProject[]).map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          budgetMin: p.budget_min === null ? null : Number(p.budget_min),
          budgetMax: p.budget_max === null ? null : Number(p.budget_max),
          city: p.city,
          deadline: p.deadline,
          skills: (p.required_skills as string[]) ?? [],
        })) : []);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Nothing real to show yet → hide the whole section rather than fake it.
  if (projects !== null && projects.length === 0) return null;

  return (
    <section
      className="mx-auto max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-20"
      aria-labelledby="featured-projects-heading"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
        className="mb-10 flex flex-col items-start justify-between gap-4 text-left md:flex-row md:items-end"
      >
        <div>
          <span className="eyebrow mb-2 block">Open board</span>
          <h2 id="featured-projects-heading" className="section-heading">
            Featured <span className="text-secondary">agri-opportunities</span>
          </h2>
        </div>
        <Link
          to="/projects"
          className="group flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:text-secondary"
        >
          Browse all projects{" "}
          <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1" aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 gap-5 text-left md:grid-cols-2 lg:grid-cols-3">
        {projects === null
          ? Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-3xl border border-outline-variant/40 bg-white">
                <div className="h-36 rounded-t-3xl skeleton" />
                <div className="space-y-3 p-5">
                  <div className="h-4 w-4/5 rounded skeleton" />
                  <div className="h-3 w-full rounded skeleton" />
                  <div className="h-3 w-2/3 rounded skeleton" />
                </div>
              </div>
            ))
          : projects.map((proj, i) => <FeaturedCard key={proj.id} proj={proj} index={i} />)}

        {/* CTA card — quiet, token-consistent */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.16, duration: 0.5, ease: EASE_OUT_EXPO }}
          className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-exchange p-7 text-white shadow-xl"
        >
          <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "100% 44px" }} aria-hidden="true" />

          <div className="relative z-10">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-secondary/30 bg-secondary/15">
              <span className="material-symbols-outlined text-[24px] text-secondary-light" aria-hidden="true">satellite_alt</span>
            </div>
            <h3 className="mb-2 font-display text-xl font-bold leading-snug tracking-tight">
              Satellite Farm View — <span className="text-secondary-light">Pro</span>
            </h3>
            <p className="mb-6 text-xs font-medium leading-relaxed text-white/70">
              Real-time satellite imagery, moisture indices, NDVI crop health mapping, and yield predictions for your acres.
            </p>
          </div>

          <Link
            to="/onboarding"
            className="relative z-10 inline-flex self-start items-center gap-2 rounded-xl bg-secondary px-5 py-3 text-xs font-bold uppercase tracking-wider text-on-secondary shadow-lg transition-all hover:bg-white hover:text-primary"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">lock_open</span>
            Unlock Satellite View
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

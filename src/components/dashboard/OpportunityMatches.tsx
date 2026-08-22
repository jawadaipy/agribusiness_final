/**
 * Opportunity radar for consultants (leads matching their services) and
 * students/researchers (projects matching their research interests).
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { MemberProfile } from "@/lib/member";
import { supabase } from "@/lib/supabase";
import { fetchMyKeywords } from "@/lib/profile-enrichment";
import { textKeywordMatches } from "@/lib/matching";

type ProjectMatch = {
  id: string;
  title: string;
  description: string;
  city: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  hits: string[];
};

export function OpportunityMatches({ profile }: { profile: MemberProfile }) {
  const isConsultant = profile.user_type === "consultant";
  const [matches, setMatches] = useState<ProjectMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [noKeywords, setNoKeywords] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [keywords, { data: projects }] = await Promise.all([
        fetchMyKeywords(profile.id, profile.user_type),
        supabase
          .from("projects")
          .select("id,title,description,city,budget_min,budget_max,required_skills")
          .eq("status", "open")
          .neq("profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(60),
      ]);
      if (cancelled) return;
      if (keywords.length === 0) {
        setNoKeywords(true);
        setLoading(false);
        return;
      }
      const scored: ProjectMatch[] = [];
      for (const project of (projects ?? []) as Array<{
        id: string; title: string; description: string; city: string | null;
        budget_min: number | null; budget_max: number | null; required_skills: string[] | null;
      }>) {
        const hits = textKeywordMatches(keywords, [project.title, project.description, project.city, ...(project.required_skills ?? [])]);
        if (hits.length === 0) continue;
        scored.push({
          id: project.id,
          title: project.title,
          description: project.description,
          city: project.city,
          budgetMin: project.budget_min,
          budgetMax: project.budget_max,
          hits,
        });
      }
      scored.sort((a, b) => b.hits.length - a.hits.length);
      setMatches(scored.slice(0, 4));
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [profile.id, profile.user_type]);

  const budget = (match: ProjectMatch) =>
    match.budgetMin !== null || match.budgetMax !== null
      ? `₨ ${new Intl.NumberFormat("en-PK").format(Number(match.budgetMin ?? 0))} – ${new Intl.NumberFormat("en-PK").format(Number(match.budgetMax ?? 0))}`
      : "Budget on request";

  return (
    <section className="rounded-2xl border border-outline-variant/60 bg-white p-5 shadow-[0_10px_28px_rgba(15,81,50,0.06)] md:p-7">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[.14em] text-on-surface-variant/65">{isConsultant ? "Lead radar" : "Opportunity radar"}</p>
          <h2 className="mt-1 font-display text-2xl text-primary">
            {isConsultant ? "Open needs that fit your services" : "Opportunities that fit your research"}
          </h2>
          <p className="mt-2 max-w-2xl text-[11px] leading-5 text-on-surface-variant">
            {isConsultant
              ? "Open farm needs and enterprise briefs matched against the services and technologies on your professional profile."
              : "Open projects and placements matched against the research interests on your academic profile."}
          </p>
        </div>
        <Link to="/projects" className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-outline-variant/70 px-3.5 py-2.5 text-[11px] font-bold text-primary transition hover:bg-surface-container-low">
          <span className="material-symbols-outlined text-[15px]">work</span>
          Browse all projects
        </Link>
      </div>

      {loading ? (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-container-low" />)}
        </div>
      ) : noKeywords ? (
        <p className="mt-5 rounded-xl border border-dashed border-outline bg-surface-container-low p-4 text-xs leading-5 text-on-surface-variant">
          {isConsultant
            ? "Add your services and technologies under My profile — this radar then finds open needs you can genuinely deliver."
            : "Add your research interests under My profile — this radar then finds projects aligned to your field."}
        </p>
      ) : matches.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-outline bg-surface-container-low p-4 text-xs leading-5 text-on-surface-variant">
          Nothing open matches your profile yet. New needs are published daily — keep your keywords current and check back.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {matches.map((match) => (
            <Link key={match.id} to="/projects/$id" params={{ id: match.id }} className="group block rounded-xl border border-outline-variant/50 bg-surface-container-low/60 p-4 transition hover:border-primary/40 hover:bg-white">
              <div className="flex flex-col justify-between gap-2 sm:flex-row">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-primary group-hover:underline">{match.title}</h3>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-on-surface-variant">{match.description}</p>
                </div>
                <span className="h-fit shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">{budget(match)}</span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {match.hits.slice(0, 4).map((hit) => (
                  <span key={hit} className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">matched: {hit}</span>
                ))}
                {match.city ? <span className="rounded-full bg-surface-container px-2 py-0.5 text-[9px] font-bold text-on-surface-variant">{match.city}</span> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

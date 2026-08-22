/**
 * Homepage hero — minimal editorial composition.
 * One thesis, one gold accent, live network pulse on the right.
 * All telemetry is real: role/city/discipline counts from platform constants,
 * mandi rates, latest network post, and newest member from the live database.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

type PulseRate = { commodity: string; city: string; modal_price: number; trend: string };
type PulsePost = { title: string; kind: string };
type PulseMember = { display_name: string | null; user_type: string; city: string | null };

const quickTags = ["Wheat", "Basmati", "Cotton", "Drip irrigation", "Soil testing", "Dairy"];

const FACTS = ["5 member roles", "34 cities", "24 disciplines", "Live mandi rates"];

function NetworkPulse() {
  const [rate, setRate] = useState<PulseRate | null>(null);
  const [post, setPost] = useState<PulsePost | null>(null);
  const [member, setMember] = useState<PulseMember | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [rates, posts, members] = await Promise.all([
        supabase.from("market_rates").select("commodity,city,modal_price,trend").limit(1),
        supabase.from("problem_posts").select("title,tags").contains("tags", ["network"]).order("created_at", { ascending: false }).limit(1),
        supabase.from("directory_profiles").select("display_name,user_type,city").order("created_at", { ascending: false }).limit(1),
      ]);
      if (!mounted) return;
      setRate((rates.data?.[0] as PulseRate) ?? null);
      const rawPost = posts.data?.[0] as (PulsePost & { tags: string[] | null }) | undefined;
      setPost(rawPost ? { title: rawPost.title, kind: rawPost.tags?.find((t) => t.startsWith("kind:"))?.slice(5) ?? "update" } : null);
      setMember((members.data?.[0] as PulseMember) ?? null);
      setLoaded(true);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const kindLabel = post?.kind === "question" ? "Question" : post?.kind === "offer" ? "Offer" : post?.kind === "achievement" ? "Milestone" : "Field update";

  return (
    <aside className="relative lg:col-span-5" aria-label="Live network activity">
      <div className="overflow-hidden rounded-3xl border border-outline-variant/50 bg-white shadow-[0_2px_6px_rgba(10,61,38,0.05),0_18px_44px_rgba(10,61,38,0.09)]">
        <header className="flex items-center justify-between border-b border-outline-variant/40 px-6 py-4">
          <p className="eyebrow">Network pulse</p>
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            <span className="relative flex h-2 w-2">
              <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        </header>

        <div className="divide-y divide-outline-variant/40">
          {/* Mandi rate */}
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">Mandi today</p>
              <p className="mt-1 truncate text-sm font-bold text-primary">{loaded && rate ? `${rate.commodity} · ${rate.city}` : "Market rates"}</p>
            </div>
            {loaded && rate ? (
              <p className="stat-num shrink-0 text-right text-sm font-bold text-primary">
                ₨ {new Intl.NumberFormat("en-PK").format(rate.modal_price)}
                <span className={`ml-1.5 text-[11px] ${rate.trend === "up" ? "text-emerald-600" : rate.trend === "down" ? "text-red-500" : "text-on-surface-variant"}`}>
                  {rate.trend === "up" ? "↑" : rate.trend === "down" ? "↓" : "→"}
                </span>
              </p>
            ) : (
              <div className="h-5 w-20 animate-pulse rounded bg-surface-container" />
            )}
          </div>

          {/* Latest network post */}
          <div className="px-6 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">From the feed · {loaded && post ? kindLabel.toLowerCase() : "field update"}</p>
            {loaded && post ? (
              <Link to="/feed" className="mt-1.5 line-clamp-2 text-sm font-medium leading-6 text-on-surface-variant hover:text-primary hover:underline">
                {post.title}
              </Link>
            ) : (
              <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-surface-container" />
            )}
          </div>

          {/* Newest member */}
          <div className="flex items-center gap-3 px-6 py-4">
            {loaded && member ? (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-[11px] font-black text-on-primary">
                  {(member.display_name || "Member").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-primary">{member.display_name || "New member"}</p>
                  <p className="mt-0.5 text-[11px] capitalize text-on-surface-variant">{member.user_type}{member.city ? ` · ${member.city}` : ""}</p>
                </div>
                <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wider text-secondary">Joined</span>
              </>
            ) : (
              <>
                <div className="h-10 w-10 animate-pulse rounded-xl bg-surface-container" />
                <div className="h-4 w-32 animate-pulse rounded bg-surface-container" />
              </>
            )}
          </div>
        </div>

        <footer className="bg-surface-container-low/60 px-6 py-3.5">
          <Link to="/feed" className="flex items-center justify-between text-[11px] font-bold text-primary transition hover:underline">
            Open the network feed
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </Link>
        </footer>
      </div>
    </aside>
  );
}

export function Hero() {
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/search", search: { q: searchQuery.trim() } });
  };

  return (
    <section className="relative overflow-hidden bg-background pt-24 md:pt-28">
      {/* Signature field grid, fading out before the fold */}
      <div className="pointer-events-none absolute inset-0 bg-field-grid opacity-60" style={{ maskImage: "linear-gradient(to bottom, black, transparent 82%)" }} />

      <div className="relative mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="grid items-center gap-12 pb-14 pt-8 lg:grid-cols-12 lg:gap-10 lg:pb-20 lg:pt-12">
          {/* Copy */}
          <div className="lg:col-span-7">
            <p className="eyebrow">Pakistan's agri professional network</p>

            <h1 className="display-hero mt-5 text-[42px] text-primary sm:text-[52px] lg:text-[64px]">
              {t("hero_headline_1")} <em className="gradient-text-gold">{t("hero_headline_2")}</em>
            </h1>

            <p className="mt-5 max-w-xl text-[15px] leading-7 text-on-surface-variant">
              Verified growers, buyers, consultants, enterprises, and researchers —
              posting real opportunities and doing real business, with consent at the centre.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-outline-variant/60 bg-white p-2 shadow-[0_2px_6px_rgba(10,61,38,0.05)] transition focus-within:border-primary/50 focus-within:shadow-[0_6px_20px_rgba(10,61,38,0.10)]">
              <span className="material-symbols-outlined pl-2.5 text-[20px] text-on-surface-variant/60" aria-hidden="true">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people, produce, or expertise…"
                aria-label="Search the network"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm font-medium text-primary outline-none placeholder:text-on-surface-variant/50"
              />
              <button type="submit" className="press shrink-0 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-on-primary transition hover:bg-primary-container">
                Search
              </button>
            </form>

            {/* Quick tags */}
            <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant/60">Try</span>
              {quickTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => navigate({ to: "/search", search: { q: tag } })}
                  className="rounded-full border border-outline-variant/60 bg-white px-3 py-1.5 text-[11px] font-semibold text-on-surface-variant transition hover:border-primary/40 hover:text-primary"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/onboarding" className="press inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-on-primary shadow-[0_10px_26px_rgba(15,81,50,0.22)] transition hover:bg-primary-container">
                Join the network — free
                <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
              </Link>
              <Link to="/apps/agri-biz" className="group inline-flex items-center gap-1.5 text-sm font-bold text-primary">
                Browse the marketplace
                <span className="material-symbols-outlined text-[17px] transition-transform group-hover:translate-x-1">arrow_forward</span>
              </Link>
            </div>

            {/* Facts — always one line */}
            <p className="mt-10 flex items-center gap-2.5 overflow-x-auto whitespace-nowrap border-t border-outline-variant/50 pt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface-variant no-scrollbar">
              {FACTS.map((fact, index) => (
                <span key={fact} className="flex items-center gap-2.5">
                  {index > 0 ? <span className="h-1 w-1 rounded-full bg-secondary" aria-hidden="true" /> : null}
                  <span className="stat-num">{fact}</span>
                </span>
              ))}
            </p>
          </div>

          <NetworkPulse />
        </div>
      </div>
    </section>
  );
}

/**
 * Homepage hero — a field photograph carries the page; the text stays minimal.
 * One headline, one line of support, one search, one CTA, one facts strip.
 * Network pulse on the right is live database data.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

const HERO_IMAGE = "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&q=80&auto=format&fit=crop";
const HERO_FALLBACK = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1920&q=80&auto=format&fit=crop";

type PulseRate = { commodity: string; city: string; modal_price: number; trend: string };
type PulsePost = { title: string; kind: string };
type PulseMember = { display_name: string | null; user_type: string; city: string | null };

const FACTS = ["5 member roles", "34 cities", "24 disciplines", "Live mandi rates"];

const enterStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};
const enterItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

/** Counts up when scrolled into view; static under reduced motion. */
function Counter({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -5% 0px" });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? to : 0);

  useEffect(() => {
    if (!inView || reduced) return;
    let raf = 0;
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, to]);

  return <span ref={ref}>{value}</span>;
}

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
    <section className="relative overflow-hidden pt-16 md:pt-20">
      {/* Field photograph — tinted just enough for text contrast, bright enough to enjoy */}
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src={HERO_IMAGE}
          alt=""
          className="h-full w-full object-cover"
          loading="eager"
          onError={(e) => { (e.target as HTMLImageElement).src = HERO_FALLBACK; }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B3D27]/92 via-[#0F5132]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B3D27]/45 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="relative mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="grid items-center gap-12 pb-20 pt-10 lg:grid-cols-12 lg:gap-10 lg:pb-24 lg:pt-14">
          {/* Copy — minimal, staged entrance */}
          <motion.div variants={enterStagger} initial="hidden" animate="show" className="lg:col-span-7">
            <motion.p variants={enterItem} className="eyebrow text-secondary">Pakistan's agri professional network</motion.p>

            <motion.h1 variants={enterItem} className="display-hero mt-5 text-[42px] text-white sm:text-[52px] lg:text-[64px]">
              {t("hero_headline_1")} <em className="text-secondary">{t("hero_headline_2")}</em>
            </motion.h1>

            <motion.p variants={enterItem} className="mt-4 max-w-lg text-sm leading-6 text-white/80">
              Verified growers, buyers, consultants, enterprises, and researchers — doing real business.
            </motion.p>

            {/* Search */}
            <motion.form variants={enterItem} onSubmit={handleSearch} className="mt-7 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-2 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
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
            </motion.form>

            {/* CTA */}
            <motion.div variants={enterItem} className="mt-7">
              <Link to="/onboarding" className="press inline-flex items-center gap-2 rounded-2xl bg-secondary px-6 py-3.5 text-sm font-bold text-primary shadow-[0_10px_28px_rgba(0,0,0,0.25)] transition hover:bg-secondary-light">
                Join the network — free
                <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
              </Link>
            </motion.div>

            {/* Facts — one line, counting up */}
            <motion.p variants={enterItem} className="mt-9 flex items-center gap-2.5 overflow-x-auto whitespace-nowrap border-t border-white/20 pt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/70 no-scrollbar">
              {FACTS.map((fact, index) => {
                const match = fact.match(/^(\d+)\s+(.*)$/);
                return (
                  <span key={fact} className="flex items-center gap-2.5">
                    {index > 0 ? <span className="h-1 w-1 rounded-full bg-secondary" aria-hidden="true" /> : null}
                    <span className="stat-num">
                      {match ? (
                        <>
                          <Counter to={Number(match[1])} /> {match[2]}
                        </>
                      ) : (
                        fact
                      )}
                    </span>
                  </span>
                );
              })}
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5"
          >
            <NetworkPulse />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

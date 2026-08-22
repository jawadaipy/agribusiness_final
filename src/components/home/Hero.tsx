/**
 * Homepage hero — international minimal, made for Pakistan.
 * White canvas, hairline discipline, Space Grotesk display type.
 * The live Network Pulse card on the right is the product visual.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

type PulseRate = { commodity: string; city: string; modal_price: number; trend: string };
type PulsePost = { title: string; kind: string };
type PulseMember = { display_name: string | null; user_type: string; city: string | null };

const FACTS = ["5 member roles", "34 cities", "24 disciplines", "Live mandi rates"];

const enterStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const enterItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
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

  const kindLabel = post?.kind === "question" ? "question" : post?.kind === "offer" ? "offer" : post?.kind === "achievement" ? "milestone" : "field update";

  return (
    <aside aria-label="Live network activity">
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <header className="flex items-center justify-between border-b border-black/[0.07] px-5 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/50">Network pulse</p>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        </header>

        <div className="divide-y divide-black/[0.06]">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40">Mandi today</p>
              <p className="mt-1 truncate text-[13px] font-semibold text-black">{loaded && rate ? `${rate.commodity} · ${rate.city}` : "Market rates"}</p>
            </div>
            {loaded && rate ? (
              <p className="stat-num shrink-0 text-right text-[13px] font-semibold text-black">
                ₨ {new Intl.NumberFormat("en-PK").format(rate.modal_price)}
                <span className={`ml-1 text-[11px] ${rate.trend === "up" ? "text-emerald-600" : rate.trend === "down" ? "text-red-500" : "text-black/40"}`}>
                  {rate.trend === "up" ? "↑" : rate.trend === "down" ? "↓" : "→"}
                </span>
              </p>
            ) : (
              <div className="h-4 w-16 animate-pulse rounded bg-black/[0.06]" />
            )}
          </div>

          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40">From the feed · {loaded && post ? kindLabel : "field update"}</p>
            {loaded && post ? (
              <Link to="/feed" className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-5 text-black/70 hover:text-primary hover:underline">
                {post.title}
              </Link>
            ) : (
              <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-black/[0.06]" />
            )}
          </div>

          <div className="flex items-center gap-3 px-5 py-4">
            {loaded && member ? (
              <>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-[10px] font-bold text-white">
                  {(member.display_name || "Member").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-black">{member.display_name || "New member"}</p>
                  <p className="mt-px text-[11px] capitalize text-black/50">{member.user_type}{member.city ? ` · ${member.city}` : ""}</p>
                </div>
                <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wider text-primary">Joined</span>
              </>
            ) : (
              <>
                <div className="h-8 w-8 animate-pulse rounded-lg bg-black/[0.06]" />
                <div className="h-3.5 w-28 animate-pulse rounded bg-black/[0.06]" />
              </>
            )}
          </div>
        </div>

        <footer className="border-t border-black/[0.07] bg-black/[0.015] px-5 py-3">
          <Link to="/feed" className="flex items-center justify-between text-[12px] font-semibold text-primary hover:underline">
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
    <section className="border-b border-black/[0.06] bg-white">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="grid items-center gap-14 pb-16 pt-14 md:pt-20 lg:grid-cols-12 lg:gap-16 lg:pb-24 lg:pt-24">
          {/* Copy — international minimal */}
          <motion.div variants={enterStagger} initial="hidden" animate="show" className="lg:col-span-7">
            <motion.p variants={enterItem} className="section-eyebrow">Pakistan's agri professional network</motion.p>

            <motion.h1 variants={enterItem} className="display-hero mt-6 text-[44px] text-black sm:text-[56px] lg:text-[64px]">
              {t("hero_headline_1")}
              <br />
              <em className="text-primary">{t("hero_headline_2")}</em>
            </motion.h1>

            <motion.p variants={enterItem} className="mt-5 max-w-md text-[15px] leading-7 text-black/60">
              Verified growers, buyers, consultants, enterprises, and researchers — doing real business.
            </motion.p>

            <motion.form variants={enterItem} onSubmit={handleSearch} className="mt-8 flex max-w-lg items-center gap-2 rounded-xl border border-black/15 bg-white p-1.5 transition focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10">
              <span className="material-symbols-outlined pl-2 text-[20px] text-black/40" aria-hidden="true">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people, produce, or expertise…"
                aria-label="Search the network"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm font-medium text-black outline-none placeholder:text-black/40"
              />
              <button type="submit" className="press shrink-0 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0B3D27]">
                Search
              </button>
            </motion.form>

            <motion.div variants={enterItem} className="mt-6 flex flex-wrap items-center gap-5">
              <Link to="/onboarding" className="press inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0B3D27]">
                Join free
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
              <Link to="/apps/agri-biz" className="group inline-flex items-center gap-1 text-[14px] font-semibold text-black/70 hover:text-black">
                Browse the marketplace
                <span className="material-symbols-outlined text-[16px] text-black/40 transition-transform group-hover:translate-x-0.5">arrow_forward</span>
              </Link>
            </motion.div>

            {/* Facts — one line, counting up */}
            <motion.p variants={enterItem} className="mt-12 flex items-center gap-3 overflow-x-auto whitespace-nowrap border-t border-black/[0.08] pt-6 text-[11px] font-semibold uppercase tracking-[0.13em] text-black/50 no-scrollbar">
              {FACTS.map((fact, index) => {
                const match = fact.match(/^(\d+)\s+(.*)$/);
                return (
                  <span key={fact} className="flex items-center gap-3">
                    {index > 0 ? <span className="h-0.5 w-0.5 rounded-full bg-black/30" aria-hidden="true" /> : null}
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5"
          >
            <NetworkPulse />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

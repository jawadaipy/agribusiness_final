/**
 * THE EXCHANGE BOARD HERO.
 * The page opens like a commodity exchange, not a marketing template:
 * a deep green-black board of live mandi rates from the database — the
 * platform's real differentiator, front and centre. Rates fall back to
 * indicative defaults only if the table is unreachable.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

type BoardRate = { commodity: string; city: string; modal_price: number; unit: string | null; trend: string };

const FALLBACK_RATES: BoardRate[] = [
  { commodity: "Wheat", city: "Multan", modal_price: 4200, unit: "40kg", trend: "up" },
  { commodity: "Super Basmati", city: "Faisalabad", modal_price: 9800, unit: "40kg", trend: "up" },
  { commodity: "Cotton Phutti", city: "R.Y. Khan", modal_price: 8650, unit: "40kg", trend: "down" },
  { commodity: "Maize", city: "Sahiwal", modal_price: 3150, unit: "40kg", trend: "up" },
  { commodity: "Sugarcane", city: "Sargodha", modal_price: 450, unit: "40kg", trend: "stable" },
  { commodity: "Urea", city: "Lahore", modal_price: 4850, unit: "bag", trend: "stable" },
];

const FACTS = ["5 member roles", "34 cities", "24 disciplines"];

const enterStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const enterItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

/** Counts up when in view; static under reduced motion. */
function Counter({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? to : 0);

  useEffect(() => {
    if (!inView || reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, to]);

  return <span ref={ref}>{value}</span>;
}

function ExchangeBoard() {
  const [rates, setRates] = useState<BoardRate[]>([]);
  const [indicative, setIndicative] = useState(false);
  const [updated, setUpdated] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase.from("market_rates").select("commodity,city,modal_price,unit,trend").limit(8);
      if (!mounted) return;
      if (!error && data && data.length > 0) {
        setRates(data as BoardRate[]);
        setIndicative(false);
      } else {
        setRates(FALLBACK_RATES);
        setIndicative(true);
      }
      setUpdated(new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }));
      setLoaded(true);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#0D2A1D] shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
      {/* Board header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
          <span className="relative flex h-2 w-2">
            <span className="absolute h-full w-full animate-ping rounded-full bg-secondary opacity-70" />
            <span className="relative h-2 w-2 rounded-full bg-secondary" />
          </span>
          Mandi exchange · live board
        </p>
        <p className="stat-num text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
          {updated ? `PKT ${updated}` : "…"}
        </p>
      </div>

      {/* Column headers */}
      <div className="hidden grid-cols-[1.4fr_1fr_0.9fr_0.5fr] gap-3 border-b border-white/[0.07] px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35 sm:grid">
        <span>Commodity</span>
        <span>Mandi</span>
        <span className="text-right">Rate</span>
        <span className="text-right">Δ</span>
      </div>

      {/* Rows */}
      <motion.div variants={enterStagger} initial="hidden" animate="show" className="divide-y divide-white/[0.06]">
        {loaded ? rates.map((rate) => (
          <motion.div
            key={`${rate.commodity}-${rate.city}`}
            variants={enterItem}
            className="grid grid-cols-[1.4fr_1fr_0.9fr_0.5fr] items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.04]"
          >
            <span className="truncate text-[13px] font-semibold text-white/90">{rate.commodity}</span>
            <span className="truncate text-[12px] text-white/55">{rate.city}</span>
            <span className="stat-num text-right text-[13px] font-semibold text-white">
              ₨ {new Intl.NumberFormat("en-PK").format(rate.modal_price)}
              {rate.unit ? <span className="ml-1 text-[10px] font-normal text-white/40">/{rate.unit.replace("40 kg (Maund)", "40kg")}</span> : null}
            </span>
            <span className={`stat-num text-right text-[12px] font-bold ${rate.trend === "up" ? "text-emerald-400" : rate.trend === "down" ? "text-red-400" : "text-white/35"}`}>
              {rate.trend === "up" ? "▲" : rate.trend === "down" ? "▼" : "—"}
            </span>
          </motion.div>
        )) : (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-5 py-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-white/[0.07]" />
            </div>
          ))
        )}
      </motion.div>

      {/* Board footer */}
      <div className="flex items-center justify-between border-t border-white/10 bg-black/20 px-5 py-3">
        <p className="text-[10px] text-white/40">{indicative ? "Indicative rates — verify at your mandi" : "Live database rates — verify locally before transacting"}</p>
        <Link to="/apps/agri-biz" className="flex items-center gap-1 text-[11px] font-semibold text-secondary hover:underline">
          Full market
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </Link>
      </div>
    </div>
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
    <section className="relative overflow-hidden bg-[#08160F]">
      {/* Ruled board texture — faint horizontal rules like a rate register */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "100% 44px" }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="grid items-center gap-12 pb-16 pt-12 md:pt-16 lg:grid-cols-12 lg:gap-14 lg:pb-20 lg:pt-20">
          {/* Left: thesis + actions */}
          <motion.div variants={enterStagger} initial="hidden" animate="show" className="lg:col-span-5">
            <motion.p variants={enterItem} className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
              <span className="h-px w-5 bg-secondary" aria-hidden="true" />
              Pakistan's agri professional network
            </motion.p>

            <motion.h1 variants={enterItem} className="display-hero mt-5 text-[40px] text-white sm:text-[48px] lg:text-[54px]">
              {t("hero_headline_1")}
              <br />
              <em className="text-secondary">{t("hero_headline_2")}</em>
            </motion.h1>

            <motion.p variants={enterItem} className="mt-4 max-w-sm text-[14px] leading-6 text-white/60">
              Verified growers, buyers, consultants, enterprises, and researchers — doing real business.
            </motion.p>

            <motion.form variants={enterItem} onSubmit={handleSearch} className="mt-7 flex max-w-md items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] p-1.5 backdrop-blur transition focus-within:border-secondary/50 focus-within:ring-4 focus-within:ring-secondary/10">
              <span className="material-symbols-outlined pl-2 text-[20px] text-white/40" aria-hidden="true">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people, produce, or expertise…"
                aria-label="Search the network"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm font-medium text-white outline-none placeholder:text-white/40"
              />
              <button type="submit" className="press shrink-0 rounded-lg bg-secondary px-4 py-2 text-[13px] font-semibold text-[#3D2A05] hover:bg-secondary-light">
                Search
              </button>
            </motion.form>

            <motion.div variants={enterItem} className="mt-6 flex flex-wrap items-center gap-5">
              <Link to="/onboarding" className="press inline-flex items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-[14px] font-semibold text-[#08160F] hover:bg-white/90">
                Join free
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
              <Link to="/apps/agri-biz" className="group inline-flex items-center gap-1 text-[14px] font-semibold text-white/75 hover:text-white">
                Browse the marketplace
                <span className="material-symbols-outlined text-[16px] text-white/40 transition-transform group-hover:translate-x-0.5">arrow_forward</span>
              </Link>
            </motion.div>

            {/* Facts — one line, counting up */}
            <motion.p variants={enterItem} className="mt-10 flex items-center gap-3 overflow-x-auto whitespace-nowrap border-t border-white/12 pt-5 text-[11px] font-semibold uppercase tracking-[0.13em] text-white/45 no-scrollbar">
              {FACTS.map((fact, index) => {
                const match = fact.match(/^(\d+)\s+(.*)$/);
                return (
                  <span key={fact} className="flex items-center gap-3">
                    {index > 0 ? <span className="h-0.5 w-0.5 rounded-full bg-white/30" aria-hidden="true" /> : null}
                    <span className="stat-num">
                      {match ? (<><Counter to={Number(match[1])} /> {match[2]}</>) : fact}
                    </span>
                  </span>
                );
              })}
            </motion.p>
          </motion.div>

          {/* Right: the board IS the product */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7"
          >
            <ExchangeBoard />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

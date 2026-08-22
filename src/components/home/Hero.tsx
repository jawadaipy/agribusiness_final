/**
 * THE EXCHANGE BOARD HERO.
 * The page opens like a commodity exchange, not a marketing template:
 * a deep green-black board of live mandi rates from the database — the
 * platform's real differentiator, front and centre. Rates are polled
 * (useMarketRates) so the live cue is honest; fallback rows are labelled
 * "indicative" when the table is unreachable.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import { useTranslation } from "@/lib/i18n";
import { normalizeUnit, useMarketRates } from "@/hooks/useMarketRates";
import { EASE_OUT_EXPO } from "@/components/motion/Reveal";

/** Facts as data, not copy to be re-parsed. */
const FACTS: { n: number; labelKey: "hero_fact_roles" | "hero_fact_cities" | "hero_fact_disciplines" }[] = [
  { n: 5, labelKey: "hero_fact_roles" },
  { n: 34, labelKey: "hero_fact_cities" },
  { n: 24, labelKey: "hero_fact_disciplines" },
];

const enterStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const enterItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT_EXPO } },
};

/** Counts up when in view; static under reduced motion. `fast` ticks like a rate board. */
function Counter({ to, fast = false }: { to: number; fast?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? to : 0);

  useEffect(() => {
    if (!inView || reduced) return;
    let raf = 0;
    const start = performance.now();
    const duration = fast ? 700 : 900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, to, fast]);

  return <span ref={ref}>{value.toLocaleString()}</span>;
}

function trendClasses(trend: string) {
  if (trend === "up") return { glyph: "▲", color: "text-emerald-400", label: "up" };
  if (trend === "down") return { glyph: "▼", color: "text-red-400", label: "down" };
  return { glyph: "—", color: "text-white/35", label: "stable" };
}

function ExchangeBoard() {
  const { t } = useTranslation();
  const { rates, loading, indicative, lastUpdated } = useMarketRates(8);
  // the "board is alive" cue: one row at a time receives an attention pulse
  const [flashRow, setFlashRow] = useState(-1);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (loading || reduced || rates.length === 0) return;
    let timer: ReturnType<typeof setTimeout>;
    const cycle = (index: number) => {
      setFlashRow(index);
      timer = setTimeout(() => {
        setFlashRow(-1);
        timer = setTimeout(() => cycle((index + 1) % rates.length), 2400);
      }, 1700);
    };
    timer = setTimeout(() => cycle(0), 1800);
    return () => clearTimeout(timer);
  }, [loading, reduced, rates.length]);

  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="overflow-hidden rounded-2xl border border-white/12 bg-exchange-raised shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
      {/* Board header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute h-full w-full animate-ping rounded-full bg-secondary opacity-70" />
            <span className="relative h-2 w-2 rounded-full bg-secondary" />
          </span>
          {t("board_title")}
        </p>
        <p className="stat-num text-xs font-semibold uppercase tracking-[0.12em] text-white/40">
          {updatedLabel ? `${t("board_updated")} ${updatedLabel} PKT` : "…"}
        </p>
      </div>

      {/* Column headers */}
      <div
        role="row"
        className="hidden grid-cols-[1.4fr_1fr_0.9fr_0.5fr] gap-3 border-b border-white/[0.07] px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/35 sm:grid"
      >
        <span role="columnheader">{t("board_col_commodity")}</span>
        <span role="columnheader">{t("board_col_mandi")}</span>
        <span role="columnheader" className="text-right">{t("board_col_rate")}</span>
        <span role="columnheader" className="text-right">Δ</span>
      </div>

      {/* Rows */}
      <motion.div variants={enterStagger} initial="hidden" animate="show" role="rowgroup" className="divide-y divide-white/[0.06]">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-5 py-3" aria-hidden="true">
              <div className="h-4 w-3/4 animate-pulse rounded bg-white/[0.07]" />
            </div>
          ))
        ) : (
          rates.map((rate, index) => {
            const trend = trendClasses(rate.trend);
            return (
              <motion.div
                key={`${rate.commodity}-${rate.city}`}
                variants={enterItem}
                role="row"
                className={`grid grid-cols-[1fr_auto] items-center gap-x-4 px-5 py-3 sm:grid-cols-[1.4fr_1fr_0.9fr_0.5fr] sm:gap-3 ${index === flashRow ? "row-flash" : ""}`}
              >
                <span role="cell" className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-white/90">{rate.commodity}</span>
                  <span className="block truncate text-xs text-white/55 sm:hidden">{rate.city}</span>
                </span>
                <span role="cell" className="hidden truncate text-xs text-white/55 sm:block">{rate.city}</span>
                <span role="cell" className="stat-num text-right text-[13px] font-semibold text-white">
                  ₨ <Counter to={rate.modalPrice} fast />
                  {rate.unit ? <span className="ml-1 text-xs font-normal text-white/40">/{normalizeUnit(rate.unit)}</span> : null}
                </span>
                <span
                  role="cell"
                  className={`stat-num text-right text-xs font-bold ${trend.color} ${index === flashRow ? "delta-pulse" : ""}`}
                >
                  <span aria-hidden="true">{trend.glyph}</span>
                  <span className="sr-only">{trend.label}</span>
                </span>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Board footer */}
      <div className="flex items-center justify-between border-t border-white/10 bg-black/20 px-5 py-3">
        <p className="text-xs text-white/40">
          {indicative ? t("board_footer_indicative") : t("board_footer_live")}
        </p>
        <Link to="/rates" className="flex items-center gap-1 text-xs font-semibold text-secondary hover:underline">
          {t("board_full_market")}
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
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
    <section className="relative overflow-hidden bg-exchange">
      {/* Ruled board texture — faint horizontal rules like a rate register */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "100% 44px" }}
        aria-hidden="true"
      />
      {/* Terminal scan line drifting down the board */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden" aria-hidden="true">
        <div className="scanline h-px w-full bg-gradient-to-r from-transparent via-secondary/50 to-transparent" />
      </div>
      {/* Ambient gold depth behind the board position */}
      <div className="pointer-events-none absolute right-[8%] top-[30%] h-[380px] w-[380px] rounded-full bg-secondary/10 blur-[110px] glow-breathe" aria-hidden="true" />

      <div className="relative mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="grid items-center gap-12 pb-16 pt-12 md:pt-16 lg:grid-cols-12 lg:gap-14 lg:pb-20 lg:pt-20">
          {/* Left: thesis + actions */}
          <motion.div variants={enterStagger} initial="hidden" animate="show" className="lg:col-span-5">
            <motion.p variants={enterItem} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
              <span className="h-px w-5 bg-secondary" aria-hidden="true" />
              {t("hero_badge")}
            </motion.p>

            <motion.h1 variants={enterItem} className="display-hero mt-5 text-[40px] text-white sm:text-[48px] lg:text-[54px]">
              {t("hero_headline_1")}{" "}
              <em className="text-secondary-light">{t("hero_headline_2")}</em>
            </motion.h1>

            <motion.p variants={enterItem} className="mt-4 max-w-sm text-sm leading-6 text-white/60">
              {t("hero_sub_short")}
            </motion.p>

            <motion.form variants={enterItem} onSubmit={handleSearch} className="mt-7 flex max-w-md items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] p-1.5 backdrop-blur transition focus-within:border-secondary/50 focus-within:ring-4 focus-within:ring-secondary/10">
              <span className="material-symbols-outlined pl-2 text-[20px] text-white/40" aria-hidden="true">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("hero_search_placeholder")}
                aria-label={t("hero_search_placeholder")}
                className="min-w-0 flex-1 bg-transparent py-2 text-sm font-medium text-white outline-none placeholder:text-white/40"
              />
              <button type="submit" className="press shrink-0 rounded-lg bg-secondary px-4 py-2 text-[13px] font-semibold text-on-secondary hover:bg-secondary-light">
                {t("hero_search_cta")}
              </button>
            </motion.form>

            <motion.div variants={enterItem} className="mt-6 flex flex-wrap items-center gap-5">
              <Link to="/onboarding" className="press inline-flex items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-exchange hover:bg-white/90">
                {t("hero_join_free")}
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
              </Link>
              <Link to="/apps/agri-biz" className="group inline-flex items-center gap-1 text-sm font-semibold text-white/75 hover:text-white">
                {t("hero_cta_primary")}
                <span className="material-symbols-outlined text-[16px] text-white/40 transition-transform group-hover:translate-x-0.5" aria-hidden="true">arrow_forward</span>
              </Link>
            </motion.div>

            {/* Facts — one line, counting up */}
            <motion.p variants={enterItem} className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/12 pt-5 text-xs font-semibold uppercase tracking-[0.13em] text-white/45">
              {FACTS.map((fact, index) => (
                <span key={fact.labelKey} className="flex items-center gap-4">
                  {index > 0 ? <span className="h-0.5 w-0.5 rounded-full bg-white/30" aria-hidden="true" /> : null}
                  <span className="stat-num">
                    <Counter to={fact.n} /> {t(fact.labelKey)}
                  </span>
                </span>
              ))}
            </motion.p>
          </motion.div>

          {/* Right: the board IS the product */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.25, ease: EASE_OUT_EXPO }}
            className="lg:col-span-7"
          >
            <ExchangeBoard />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

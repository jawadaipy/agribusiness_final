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
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type Variants } from "framer-motion";
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

/** Word-by-word headline reveal — each word rises in sequence. */
function StaggerHeadline() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const line1 = t("hero_headline_1");
  const line2 = t("hero_headline_2");
  const words: { text: string; accent: boolean }[] = [
    ...line1.split(" ").map((w) => ({ text: w, accent: false })),
    ...line2.split(" ").map((w) => ({ text: w, accent: true })),
  ];
  if (reduced) {
    return (
      <h1 className="display-hero mt-6 max-w-2xl text-[34px] leading-[1.12] text-white sm:text-[44px] lg:text-[50px]">
        {line1} <em className="text-secondary-light">{line2}</em>
      </h1>
    );
  }
  return (
    <h1 className="display-hero mt-6 max-w-2xl text-[34px] leading-[1.12] text-white sm:text-[44px] lg:text-[50px]" aria-label={`${line1} ${line2}`}>
      {words.map((w, i) => (
        <span key={`${w.text}-${i}`} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className={`inline-block ${w.accent ? "text-secondary-light" : ""}`}
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.18 + i * 0.055, ease: EASE_OUT_EXPO }}
          >
            {w.text}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

/** Counts up when in view; static under reduced motion. `fast` ticks like a rate board. */
function Counter({ to, fast = false }: { to: number; fast?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const [started, setStarted] = useState(false);
  const [value, setValue] = useState(to);

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true);
          setValue(0);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (!started || reduced) return;
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
  }, [started, reduced, to, fast]);

  return <span ref={ref}>{value.toLocaleString()}</span>;
}

function trendClasses(trend: string) {
  if (trend === "up") return { glyph: "▲", color: "text-emerald-400", label: "up" };
  if (trend === "down") return { glyph: "▼", color: "text-red-400", label: "down" };
  return { glyph: "—", color: "text-white/35", label: "stable" };
}

/** Ordered category priority for the exchange board display */
const BOARD_CATEGORY_ORDER = [
  { key: "poultry",    label: "🐔 Poultry",    keywords: ["broiler", "murgh", "desi murgh"] },
  { key: "livestock",  label: "🐄 Livestock",   keywords: ["beef", "cattle", "qurbani"] },
  { key: "eggs",       label: "🥚 Eggs",        keywords: ["eggs", "egg"] },
  { key: "sugarcane",  label: "🌿 Sugarcane",   keywords: ["sugarcane"] },
  { key: "cotton",     label: "🧶 Cotton",       keywords: ["cotton"] },
  { key: "maize",      label: "🌽 Maize",        keywords: ["maize"] },
  { key: "wheat",      label: "🌾 Wheat",        keywords: ["wheat"] },
  { key: "barley",     label: "🌾 Barley",       keywords: ["barley", "jow"] },
  { key: "oilseeds",   label: "🫚 Oilseeds",    keywords: ["mustard", "canola", "sesame", "sunflower", "oilseed"] },
  { key: "rice",       label: "🍚 Rice",         keywords: ["basmati", "rice", "irri"] },
];

/** Static board fallback rows — one per category, shown when DB has no matching row */
const BOARD_STATIC_FALLBACK = [
  { commodity: "Broiler Chicken (Live)", city: "Lahore",     unit: "per kg",       modalPrice: 395, trend: "up" },
  { commodity: "Beef (Boneless)",        city: "Lahore",     unit: "per kg",       modalPrice: 1100, trend: "up" },
  { commodity: "Eggs (Farm White)",      city: "Lahore",     unit: "per dozen",    modalPrice: 185, trend: "up" },
  { commodity: "Sugarcane",              city: "Lahore",     unit: "40 kg",        modalPrice: 450, trend: "up" },
  { commodity: "Cotton Phutti",          city: "Multan",     unit: "40 kg (Maund)",modalPrice: 8700, trend: "up" },
  { commodity: "Maize",                  city: "Faisalabad", unit: "40 kg (Maund)",modalPrice: 3250, trend: "up" },
  { commodity: "Wheat",                  city: "Lahore",     unit: "40 kg (Maund)",modalPrice: 4380, trend: "up" },
  { commodity: "Barley (Jow)",           city: "Multan",     unit: "40 kg (Maund)",modalPrice: 2800, trend: "stable" },
  { commodity: "Mustard / Canola",       city: "Lahore",     unit: "40 kg (Maund)",modalPrice: 9200, trend: "up" },
  { commodity: "Super Basmati",          city: "Lahore",     unit: "40 kg (Maund)",modalPrice: 9800, trend: "up" },
];

function pickOrderedBoardRows(allRates: ReturnType<typeof useMarketRates>["rates"]) {
  const fallbackMap = new Map(
    BOARD_STATIC_FALLBACK.map((row, i) => [BOARD_CATEGORY_ORDER[i]?.key ?? "", row])
  );
  const result: typeof BOARD_STATIC_FALLBACK = [];
  for (const cat of BOARD_CATEGORY_ORDER) {
    // Try to find a live DB row matching this category
    const live = allRates.find((r) =>
      cat.keywords.some((kw) => r.commodity.toLowerCase().includes(kw))
    );
    if (live) {
      result.push({ commodity: live.commodity, city: live.city, unit: live.unit ?? "", modalPrice: live.modalPrice, trend: live.trend });
    } else {
      const fb = fallbackMap.get(cat.key);
      if (fb) result.push(fb);
    }
    if (result.length >= 10) break;
  }
  return result;
}

function ExchangeBoard() {
  const { t } = useTranslation();
  const { rates: rawRates, loading, indicative, lastUpdated } = useMarketRates(80);
  const [flashRow, setFlashRow] = useState(-1);
  const reduced = useReducedMotion();

  // Build the ordered board rows from DB + static fallback
  const rates = pickOrderedBoardRows(rawRates);

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

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [2.2, -2.2]), { stiffness: 120, damping: 20 });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-2.6, 2.6]), { stiffness: 120, damping: 20 });
  const canTilt = !reduced && typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;

  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <motion.div
      style={canTilt ? { rotateX, rotateY, transformPerspective: 1200 } : {}}
      onPointerMove={canTilt ? (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width - 0.5);
        py.set((e.clientY - r.top) / r.height - 0.5);
      } : undefined}
      onPointerLeave={canTilt ? () => { px.set(0); py.set(0); } : undefined}
      className="overflow-hidden rounded-3xl border border-white/20 bg-[#071d11]/85 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
    >
      {/* Board header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-black/20">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute h-full w-full animate-ping rounded-full bg-secondary opacity-70" />
            <span className="relative h-2 w-2 rounded-full bg-secondary" />
          </span>
          {t("board_title")}
        </p>
        <p className="stat-num text-xs font-semibold uppercase tracking-[0.12em] text-white/50">
          {updatedLabel ? `${t("board_updated")} ${updatedLabel} PKT` : "…"}
        </p>
      </div>

      {/* Column headers */}
      <div
        role="row"
        className="hidden grid-cols-[1.4fr_1fr_0.9fr_0.5fr] gap-3 border-b border-white/[0.07] px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/40 sm:grid"
      >
        <span role="columnheader">{t("board_col_commodity")}</span>
        <span role="columnheader">{t("board_col_mandi")}</span>
        <span role="columnheader" className="text-right">{t("board_col_rate")}</span>
        <span role="columnheader" className="text-right">Δ</span>
      </div>

      {/* Rows */}
      <motion.div variants={enterStagger} initial="hidden" animate="show" role="rowgroup" className="divide-y divide-white/[0.06]">
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => (
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
                className={`grid grid-cols-[1fr_auto] items-center gap-x-4 px-5 py-3 transition-colors duration-300 hover:bg-white/[0.05] sm:grid-cols-[1.4fr_1fr_0.9fr_0.5fr] sm:gap-3 ${index === flashRow ? "row-flash" : ""}`}
              >
                <span role="cell" className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-white/95">{rate.commodity}</span>
                  <span className="block truncate text-xs text-white/60 sm:hidden">{rate.city}</span>
                </span>
                <span role="cell" className="hidden truncate text-xs text-white/60 sm:block">{rate.city}</span>
                <span role="cell" className="stat-num text-right text-[13px] font-semibold text-white">
                  ₨ <Counter to={rate.modalPrice} fast />
                  {rate.unit ? <span className="ml-1 text-xs font-normal text-white/50">/{normalizeUnit(rate.unit)}</span> : null}
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
      <div className="flex items-center justify-between border-t border-white/10 bg-black/30 px-5 py-3">
        <p className="text-xs text-white/50">
          {indicative ? t("board_footer_indicative") : t("board_footer_live")}
        </p>
        <Link to="/rates" className="group flex items-center gap-1 text-xs font-semibold text-secondary hover:underline">
          {t("board_full_market")}
          <span className="material-symbols-outlined text-[14px] transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">arrow_forward</span>
        </Link>
      </div>
    </motion.div>
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
    <section className="relative overflow-hidden bg-[#07180e]">
      {/* High-resolution Pakistani agricultural farmlands & crops background photograph - clearly visible */}
      <img
        src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=2400&q=90"
        alt="Lush Agricultural Farmland Pakistan"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center transform scale-100"
        loading="eager"
      />

      {/* Light, translucent gradient overlay — keeps the green fields, horizon, and trees clearly visible */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#03150a]/80 via-[#051c0d]/50 to-[#072412]/25"
        aria-hidden="true"
      />

      {/* Soft top and bottom blend */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#041208]/80"
        aria-hidden="true"
      />

      {/* Warm natural sunbeam accent */}
      <div className="pointer-events-none absolute right-[15%] top-[15%] h-[350px] w-[350px] rounded-full bg-amber-300/20 blur-[100px]" aria-hidden="true" />
      <div className="pointer-events-none absolute left-[5%] bottom-[15%] h-[250px] w-[250px] rounded-full bg-emerald-400/20 blur-[90px]" aria-hidden="true" />

      <div className="relative mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="grid items-center gap-12 pb-16 pt-12 md:gap-16 md:pb-20 md:pt-16 lg:grid-cols-12 lg:gap-14 lg:pb-24 lg:pt-20">
          {/* Left: thesis + actions */}
          <motion.div variants={enterStagger} initial="hidden" animate="show" className="lg:col-span-5">
            <motion.div variants={enterItem} className="inline-flex items-center gap-2 rounded-full bg-emerald-950/70 border border-emerald-400/40 px-3.5 py-1 backdrop-blur-md shadow-md">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-amber-300">
                {t("hero_badge")}
              </span>
            </motion.div>

            <div className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
              <StaggerHeadline />
            </div>

            <motion.p variants={enterItem} className="mt-5 max-w-md text-[15px] font-medium leading-7 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
              {t("hero_sub_short")}
            </motion.p>

            <motion.form
              variants={enterItem}
              onSubmit={handleSearch}
              className="mt-8 flex max-w-lg items-center gap-2 rounded-2xl border border-white/40 bg-white/95 p-1.5 shadow-2xl backdrop-blur-lg transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/20"
            >
              <span className="material-symbols-outlined pl-2.5 text-[22px] text-emerald-800" aria-hidden="true">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("hero_search_placeholder")}
                aria-label={t("hero_search_placeholder")}
                className="min-w-0 flex-1 bg-transparent py-2 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-500"
              />
              <button type="submit" className="press shrink-0 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:from-emerald-700 hover:to-emerald-800 cursor-pointer">
                {t("hero_search_cta")}
              </button>
            </motion.form>

            <motion.div variants={enterItem} className="mt-7 flex flex-wrap items-center gap-4">
              <Link to="/onboarding" className="press inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-emerald-950 shadow-xl transition hover:bg-amber-300">
                {t("hero_join_free")}
                <span className="material-symbols-outlined text-[17px]" aria-hidden="true">arrow_forward</span>
              </Link>
              <Link to="/apps/agri-biz" className="group inline-flex items-center gap-1.5 rounded-xl border border-white/40 bg-emerald-950/60 px-4 py-2.5 text-sm font-bold text-white shadow-lg backdrop-blur-md hover:bg-emerald-900/80">
                {t("hero_cta_primary")}
                <span className="material-symbols-outlined text-[16px] text-amber-300 transition-transform group-hover:translate-x-0.5" aria-hidden="true">arrow_forward</span>
              </Link>
            </motion.div>

            {/* Facts — counting up with translucent backing */}
            <motion.div variants={enterItem} className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-white/20 bg-black/40 px-4 py-3 text-xs font-bold uppercase tracking-[0.13em] text-white/90 backdrop-blur-md shadow-md">
              {FACTS.map((fact, index) => (
                <span key={fact.labelKey} className="flex items-center gap-3">
                  {index > 0 ? <span className="h-1 w-1 rounded-full bg-amber-400" aria-hidden="true" /> : null}
                  <span className="stat-num text-amber-300 font-mono">
                    <Counter to={fact.n} />
                  </span>
                  <span>{t(fact.labelKey)}</span>
                </span>
              ))}
            </motion.div>
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

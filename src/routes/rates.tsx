/**
 * /rates — the full Mandi Rates board: every commodity, every market,
 * filterable by city and commodity, sortable, with per-mandi summary
 * cards. Shares the polled useMarketRates source with the hero board
 * and ticker, and computes real day-over-day change percentages.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { normalizeUnit, useMarketRates, type MarketRate } from "@/hooks/useMarketRates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rates")({
  head: () => ({
    meta: [{ title: "Mandi Rates Board | AgriBusiness Pakistan" },
      { name: "description", content: "Live mandi rates for wheat, rice, cotton, maize, sugarcane, and fertilizer across Pakistani markets — with day-over-day change." },
      { property: "og:title", content: "AgriBusiness Mandi Rates Board" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: RatesPage,
});

type SortKey = "commodity" | "price" | "change";

function trendView(r: MarketRate) {
  if (r.changePct !== null && r.changePct > 0.05) return { glyph: "▲", color: "text-success", label: `up ${r.changePct.toFixed(1)}%` };
  if (r.changePct !== null && r.changePct < -0.05) return { glyph: "▼", color: "text-error", label: `down ${Math.abs(r.changePct).toFixed(1)}%` };
  if (r.trend === "up") return { glyph: "▲", color: "text-success", label: "up" };
  if (r.trend === "down") return { glyph: "▼", color: "text-error", label: "down" };
  return { glyph: "—", color: "text-on-surface-variant/40", label: "stable" };
}

function RatesPage() {
  const { rates, loading, indicative, lastUpdated, refresh } = useMarketRates(120);
  const [cityFilter, setCityFilter] = useState("");
  const [commodityFilter, setCommodityFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("commodity");
  const [onlyMovers, setOnlyMovers] = useState(false);

  const cities = useMemo(() => Array.from(new Set(rates.map((r) => r.city))).sort(), [rates]);
  const commodities = useMemo(() => Array.from(new Set(rates.map((r) => r.commodity))).sort(), [rates]);

  const filtered = useMemo(() => {
    let rows = rates;
    if (cityFilter) rows = rows.filter((r) => r.city === cityFilter);
    if (commodityFilter) rows = rows.filter((r) => r.commodity === commodityFilter);
    if (onlyMovers) rows = rows.filter((r) => r.changePct !== null && Math.abs(r.changePct) > 0.05);
    return [...rows].sort((a, b) => {
      if (sort === "price") return b.modalPrice - a.modalPrice;
      if (sort === "change") return (b.changePct ?? 0) - (a.changePct ?? 0);
      return a.commodity.localeCompare(b.commodity) || a.city.localeCompare(b.city);
    });
  }, [rates, cityFilter, commodityFilter, sort, onlyMovers]);

  // Summary cards: biggest mover + highest volume commodity counts
  const summary = useMemo(() => {
    const withChange = rates.filter((r) => r.changePct !== null);
    const topMover = [...withChange].sort((a, b) => Math.abs(b.changePct!) - Math.abs(a.changePct!))[0];
    const gainers = withChange.filter((r) => r.changePct! > 0).length;
    const losers = withChange.filter((r) => r.changePct! < 0).length;
    return { topMover, gainers, losers, markets: cities.length };
  }, [rates, cities.length]);

  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })
    : "";

  const selectClass =
    "rounded-xl border border-outline-variant/60 bg-white px-3 py-2 text-xs font-medium text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

  return (
    <>
      <Navbar />
      <main className="min-h-screen pb-16">
        {/* Board header */}
        <div className="relative overflow-hidden bg-exchange pb-14 pt-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "100% 44px" }}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden" aria-hidden="true">
            <div className="scanline h-px w-full bg-gradient-to-r from-transparent via-secondary/50 to-transparent" />
          </div>

          <div className="relative mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
            <p className="eyebrow text-secondary">Mandi exchange</p>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
              The full rates board
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              {indicative
                ? "Live rates are unreachable right now — showing indicative figures. Verify at your mandi before transacting."
                : "Every commodity on the platform's exchange — modal rates, ranges, and honest day-over-day change from rate history. Verify locally before transacting."}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-wider text-white/45">
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-secondary opacity-70" />
                  <span className="relative h-2 w-2 rounded-full bg-secondary" />
                </span>
                {updatedLabel ? `Updated ${updatedLabel} PKT` : "Loading…"}
              </span>
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex items-center gap-1 text-white/60 transition-colors hover:text-white"
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">refresh</span>
                Refresh now
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          {/* Summary cards */}
          <div className="-mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-outline-variant/40 bg-white p-5 shadow-md">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Markets reporting</p>
              <p className="stat-num mt-2 font-display text-3xl font-bold text-primary">{loading ? "…" : summary.markets}</p>
            </div>
            <div className="rounded-2xl border border-success/25 bg-success/5 p-5 shadow-md">
              <p className="text-xs font-bold uppercase tracking-wider text-success">Advancing</p>
              <p className="stat-num mt-2 font-display text-3xl font-bold text-success">{loading ? "…" : summary.gainers}</p>
            </div>
            <div className="rounded-2xl border border-error/25 bg-error/5 p-5 shadow-md">
              <p className="text-xs font-bold uppercase tracking-wider text-error">Declining</p>
              <p className="stat-num mt-2 font-display text-3xl font-bold text-error">{loading ? "…" : summary.losers}</p>
            </div>
            <div className="rounded-2xl border border-secondary/30 bg-secondary-container/50 p-5 shadow-md">
              <p className="text-xs font-bold uppercase tracking-wider text-on-secondary-container">Top mover</p>
              {summary.topMover ? (
                <>
                  <p className="mt-2 truncate font-display text-base font-bold text-on-secondary-container">
                    {summary.topMover.commodity} · {summary.topMover.city}
                  </p>
                  <p className={cn("stat-num text-xl font-bold", summary.topMover.changePct! >= 0 ? "text-success" : "text-error")}>
                    {summary.topMover.changePct! >= 0 ? "+" : ""}{summary.topMover.changePct!.toFixed(1)}%
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs text-on-secondary-container">Awaiting history data</p>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="rates-city">City filter</label>
            <select id="rates-city" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={selectClass}>
              <option value="">All markets</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="sr-only" htmlFor="rates-commodity">Commodity filter</label>
            <select id="rates-commodity" value={commodityFilter} onChange={(e) => setCommodityFilter(e.target.value)} className={selectClass}>
              <option value="">All commodities</option>
              {commodities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="sr-only" htmlFor="rates-sort">Sort</label>
            <select id="rates-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={selectClass}>
              <option value="commodity">Sort: commodity</option>
              <option value="price">Sort: price (high → low)</option>
              <option value="change">Sort: change (movers first)</option>
            </select>
            <button
              type="button"
              onClick={() => setOnlyMovers((v) => !v)}
              aria-pressed={onlyMovers}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition",
                onlyMovers ? "bg-primary text-on-primary" : "border border-outline-variant/60 bg-white text-on-surface-variant",
              )}
            >
              Movers only
            </button>
            {(cityFilter || commodityFilter || onlyMovers) && (
              <button
                type="button"
                onClick={() => { setCityFilter(""); setCommodityFilter(""); setOnlyMovers(false); }}
                className="rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-xs font-bold text-error transition hover:bg-error/10"
              >
                Clear
              </button>
            )}
            <p className="ml-auto text-xs font-semibold text-on-surface-variant">
              {loading ? "Loading board…" : `${filtered.length} rate${filtered.length === 1 ? "" : "s"}`}
            </p>
          </div>

          {/* Board */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-outline-variant/40 bg-white card-shadow">
            <div role="row" className="hidden grid-cols-[1.5fr_1fr_1.2fr_1fr_0.8fr] gap-3 border-b border-outline-variant/40 bg-surface-container-low px-5 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant md:grid">
              <span role="columnheader">Commodity</span>
              <span role="columnheader">Mandi</span>
              <span role="columnheader">Modal / Range</span>
              <span role="columnheader" className="text-right">Price</span>
              <span role="columnheader" className="text-right">Δ Day</span>
            </div>

            {loading ? (
              <div className="divide-y divide-outline-variant/30">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="px-5 py-4">
                    <div className="h-4 w-2/3 rounded skeleton" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <span className="material-symbols-outlined text-[44px] text-on-surface-variant/30" aria-hidden="true">candlestick_chart</span>
                <p className="mt-3 font-display text-lg text-on-surface-variant">No rates match these filters</p>
                <p className="mt-1 text-xs text-on-surface-variant/70">Try clearing a filter or checking back after the next board update.</p>
              </div>
            ) : (
              <div role="rowgroup" className="divide-y divide-outline-variant/30">
                {filtered.map((r) => {
                  const t = trendView(r);
                  return (
                    <div
                      key={`${r.commodity}-${r.city}-${r.rateDate}`}
                      role="row"
                      className="grid grid-cols-[1fr_auto] items-center gap-x-4 px-5 py-3.5 transition-colors hover:bg-surface-container-low/60 md:grid-cols-[1.5fr_1fr_1.2fr_1fr_0.8fr] md:gap-3"
                    >
                      <div role="cell" className="min-w-0">
                        <p className="truncate text-sm font-bold text-primary">{r.commodity}</p>
                        <p className="truncate text-xs text-on-surface-variant md:hidden">{r.city}</p>
                      </div>
                      <p role="cell" className="hidden text-sm text-on-surface-variant md:block">{r.city}</p>
                      <p role="cell" className="stat-num hidden text-sm text-on-surface-variant/80 md:block">
                        {r.minPrice !== null && r.maxPrice !== null
                          ? `${r.modalPrice.toLocaleString()} (${r.minPrice.toLocaleString()}–${r.maxPrice.toLocaleString()})`
                          : r.modalPrice.toLocaleString()}
                      </p>
                      <p role="cell" className="stat-num text-right text-sm font-bold text-primary">
                        ₨ {r.modalPrice.toLocaleString()}
                        {r.unit ? <span className="ml-1 text-xs font-normal text-on-surface-variant/70">/{normalizeUnit(r.unit)}</span> : null}
                      </p>
                      <p role="cell" className={cn("stat-num text-right text-sm font-bold", t.color)}>
                        <span aria-hidden="true">{t.glyph}</span>{" "}
                        {r.changePct !== null && Math.abs(r.changePct) > 0.05 ? `${r.changePct >= 0 ? "+" : ""}${r.changePct.toFixed(1)}%` : ""}
                        <span className="sr-only">{t.label}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t border-outline-variant/40 bg-surface-container-low/50 px-5 py-3">
              <p className="text-xs text-on-surface-variant/70">
                {indicative
                  ? "Indicative figures shown while the live board is unreachable — always verify at your mandi."
                  : "Modal rates from the platform's rate table; day-change computed from recorded history. Always verify at your mandi before transacting."}
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

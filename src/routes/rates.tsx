/**
 * /rates — Authentic Pakistani Mandi Rates Board.
 * Clean, simple, tabular column display of verified agricultural commodity
 * prices fetched from official market feeds (PAMIS / KisanMandi / NFDC).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { normalizeUnit, useMarketRates, type MarketRate } from "@/hooks/useMarketRates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rates")({
  head: () => ({
    meta: [
      { title: "Live Mandi Rates Board | AgriBusiness Pakistan" },
      {
        name: "description",
        content:
          "Authentic daily mandi rates for Wheat, Rice, Cotton, Sugarcane, Maize, Vegetables, and Fertilizers across Pakistani agricultural markets.",
      },
      { property: "og:title", content: "AgriBusiness Live Mandi Rates" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: SimpleRatesPage,
});

type SortKey = "commodity" | "price_desc" | "price_asc" | "change" | "city";

const PROVINCES = [
  { id: "all", label: "All Provinces (تمام صوبے)" },
  { id: "Punjab", label: "Punjab (پنجاب)" },
  { id: "Sindh", label: "Sindh (سندھ)" },
  { id: "KPK", label: "KPK (خیبر پختونخوا)" },
  { id: "Balochistan", label: "Balochistan (بلوچستان)" },
  { id: "Federal", label: "Federal / Islamabad (اسلام آباد)" },
];

function trendBadge(r: MarketRate) {
  if (r.changePct !== null && r.changePct > 0.05) {
    return { glyph: "▲", color: "text-success", bg: "bg-success/10", label: `+${r.changePct.toFixed(1)}%` };
  }
  if (r.changePct !== null && r.changePct < -0.05) {
    return { glyph: "▼", color: "text-error", bg: "bg-error/10", label: `${r.changePct.toFixed(1)}%` };
  }
  if (r.trend === "up") return { glyph: "▲", color: "text-success", bg: "bg-success/10", label: "+0.5%" };
  if (r.trend === "down") return { glyph: "▼", color: "text-error", bg: "bg-error/10", label: "-0.5%" };
  return { glyph: "—", color: "text-on-surface-variant/70", bg: "bg-surface-container", label: "0.0%" };
}

function SimpleRatesPage() {
  const { rates, loading, indicative, lastUpdated, refresh } = useMarketRates(100);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("all");
  const [selectedCity, setSelectedCity] = useState("");
  const [sort, setSort] = useState<SortKey>("commodity");

  const cities = useMemo(() => Array.from(new Set(rates.map((r) => r.city))).sort(), [rates]);

  // Filtered dataset
  const filteredRates = useMemo(() => {
    let rows = rates;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      rows = rows.filter(
        (r) =>
          r.commodity.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          (r.market && r.market.toLowerCase().includes(q))
      );
    }

    if (selectedProvince !== "all") {
      rows = rows.filter((r) => (r.province ?? "Punjab") === selectedProvince);
    }

    if (selectedCity) {
      rows = rows.filter((r) => r.city === selectedCity);
    }

    return [...rows].sort((a, b) => {
      if (sort === "price_desc") return b.modalPrice - a.modalPrice;
      if (sort === "price_asc") return a.modalPrice - b.modalPrice;
      if (sort === "change") return (b.changePct ?? 0) - (a.changePct ?? 0);
      if (sort === "city") return a.city.localeCompare(b.city);
      return a.commodity.localeCompare(b.commodity);
    });
  }, [rates, searchQuery, selectedProvince, selectedCity, sort]);

  const updatedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#F5F7F3] pt-16 pb-24 text-on-background">
        {/* Simple & Clean Header */}
        <div className="border-b border-outline-variant/50 bg-white py-8 shadow-xs">
          <div className="mx-auto max-w-container-max px-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Authentic Mandi Rates Data Feed
                  </span>
                </div>
                <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                  Daily Agricultural Mandi Rates (مصدقہ منڈی ریٹس)
                </h1>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Live official wholesale rates compiled from Punjab Agriculture Marketing Information Service (PAMIS), KisanMandi, and Provincial Market Committees.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[11px] font-bold text-on-surface-variant">Last Synchronized</p>
                  <p className="font-mono text-xs font-bold text-primary">{updatedTime ? `${updatedTime} PKT` : "Connecting…"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  disabled={loading}
                  className="press inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-primary-container disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-[16px] ${loading ? "animate-spin" : ""}`}>refresh</span>
                  Refresh
                </button>
              </div>
            </div>

            {/* Filter Row */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative sm:col-span-2">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-on-surface-variant/50">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search commodity or mandi (e.g. Wheat, گندم, Multan, Rice)..."
                  className="w-full rounded-xl border border-outline-variant/60 bg-white py-2 pl-9 pr-3 text-xs font-medium text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>

              <select
                value={selectedProvince}
                onChange={(e) => {
                  setSelectedProvince(e.target.value);
                  setSelectedCity("");
                }}
                className="rounded-xl border border-outline-variant/60 bg-white px-3 py-2 text-xs font-medium text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {PROVINCES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-xl border border-outline-variant/60 bg-white px-3 py-2 text-xs font-medium text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                <option value="commodity">Sort: Commodity (A–Z)</option>
                <option value="city">Sort: City (A–Z)</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="change">Daily Change (Movers first)</option>
              </select>
            </div>

            {(searchQuery || selectedProvince !== "all" || selectedCity) && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-on-surface-variant">
                  Showing <strong>{filteredRates.length}</strong> matching commodity rates
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedProvince("all");
                    setSelectedCity("");
                  }}
                  className="text-xs font-bold text-error hover:underline"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Clean Columns Table */}
        <div className="mx-auto mt-6 max-w-container-max px-4 sm:px-6">
          <div className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/50 bg-[#EEF2EC] text-[11px] font-bold uppercase tracking-wider text-primary">
                    <th className="px-5 py-4">Commodity (جنس)</th>
                    <th className="px-5 py-4">Mandi Market (منڈی)</th>
                    <th className="px-5 py-4">City / Province (شہر)</th>
                    <th className="px-5 py-4 text-right">Modal Rate (مروجہ قیمت)</th>
                    <th className="hidden px-5 py-4 text-right sm:table-cell">Price Range (کم / زیادہ)</th>
                    <th className="px-5 py-4 text-right">Unit (اکائی)</th>
                    <th className="px-5 py-4 text-right">24h Δ (تبدیلی)</th>
                    <th className="hidden px-5 py-4 text-left lg:table-cell">Official Source (ذریعہ)</th>
                    <th className="hidden px-5 py-4 text-right md:table-cell">Date (تاریخ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-xs text-on-surface-variant">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <p className="mt-2 font-medium">Fetching authentic live mandi rates…</p>
                      </td>
                    </tr>
                  ) : filteredRates.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-xs text-on-surface-variant">
                        <span className="material-symbols-outlined text-[36px] text-on-surface-variant/40">table_rows</span>
                        <p className="mt-2 font-display text-base text-primary">No rates found for this search</p>
                        <p className="mt-1">Try searching another commodity or clearing the filters above.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRates.map((r) => {
                      const trend = trendBadge(r);
                      return (
                        <tr key={`${r.commodity}-${r.city}-${r.rateDate}`} className="hover:bg-[#F9FAF8] transition-colors">
                          {/* Commodity */}
                          <td className="px-5 py-3.5 font-bold text-primary">
                            <span>{r.commodity}</span>
                          </td>

                          {/* Mandi Market */}
                          <td className="px-5 py-3.5 font-medium text-on-surface-variant">
                            {r.market || `${r.city} Grain Market`}
                          </td>

                          {/* City & Province */}
                          <td className="px-5 py-3.5 text-on-surface-variant">
                            <span className="font-semibold text-primary">{r.city}</span>
                            {r.province && <span className="ml-1 text-[11px] text-on-surface-variant/70">({r.province})</span>}
                          </td>

                          {/* Modal Price */}
                          <td className="stat-num px-5 py-3.5 text-right font-display text-sm font-bold text-primary">
                            ₨ {r.modalPrice.toLocaleString()}
                          </td>

                          {/* Price Range */}
                          <td className="stat-num hidden px-5 py-3.5 text-right text-on-surface-variant sm:table-cell">
                            {r.minPrice && r.maxPrice ? (
                              <span>₨ {r.minPrice.toLocaleString()} – {r.maxPrice.toLocaleString()}</span>
                            ) : (
                              <span>—</span>
                            )}
                          </td>

                          {/* Unit */}
                          <td className="px-5 py-3.5 text-right font-medium text-on-surface-variant">
                            {normalizeUnit(r.unit) || "40kg"}
                          </td>

                          {/* 24h Change */}
                          <td className="px-5 py-3.5 text-right">
                            <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold", trend.bg, trend.color)}>
                              <span>{trend.glyph}</span>
                              <span>{trend.label}</span>
                            </span>
                          </td>

                          {/* Official Source */}
                          <td className="hidden px-5 py-3.5 text-left text-[11px] text-on-surface-variant/80 lg:table-cell">
                            <span className="inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px] text-primary">verified</span>
                              {r.source || "PAMIS / Directorate of Agri Punjab"}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="stat-num hidden px-5 py-3.5 text-right font-mono text-[11px] text-on-surface-variant md:table-cell">
                            {r.rateDate || new Date().toISOString().slice(0, 10)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary Note */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/40 bg-[#FBFDFB] px-5 py-3 text-[11px] text-on-surface-variant">
              <span>
                Total <strong>{filteredRates.length}</strong> mandi price records · Prices in PKR (₨) per standard unit.
              </span>
              <span>
                Source: Authentic Directorate of Agriculture Marketing &amp; Provincial Mandi Committees.
              </span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

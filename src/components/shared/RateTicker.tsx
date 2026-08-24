import { cn } from "@/lib/utils";
import { normalizeUnit, useMarketRates } from "@/hooks/useMarketRates";

/**
 * Thin mandi-rate strip under the navbar. Shares the useMarketRates source
 * with the hero board (one fetch, one truth). Change percentages come from
 * real rate-date history — when there is none, only the trend glyph shows.
 */
export function RateTicker() {
  const { rates, loading, indicative } = useMarketRates(12);

  const items = rates.map((r) => ({
    label: `${r.commodity} (${r.city})`,
    price: `₨ ${r.modalPrice.toLocaleString()}${r.unit ? `/${normalizeUnit(r.unit)}` : ""}`,
    changePct: r.changePct !== null ? `${r.changePct >= 0 ? "+" : ""}${r.changePct.toFixed(1)}%` : null,
    trend: r.trend,
  }));

  return (
    <div className="relative overflow-hidden border-b border-black/[0.06] bg-surface-container-low py-2.5">
      <div className="mx-auto flex max-w-container-max items-center justify-between gap-3 px-margin-mobile md:px-margin-desktop">
        {/* Left live indicator */}
        <div className="flex shrink-0 items-center gap-1.5 pl-1">
          <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-black/60">
            Mandi Rates{indicative ? " · indicative" : ""}
          </span>
        </div>

        {/* Seamless marquee — the duplicated half is hidden from assistive tech */}
        <div className="group relative mx-2 flex-1 overflow-hidden">
          {loading ? (
            <div className="h-4 w-48 animate-pulse rounded bg-black/5" aria-hidden="true" />
          ) : (
            <div className="flex animate-ticker items-center gap-8 whitespace-nowrap">
              <div className="flex items-center gap-8">
                {items.map((rate, i) => (
                  <div key={i} className="inline-flex items-center gap-1.5 text-xs">
                    <span className="text-xs font-medium text-black/50">{rate.label}:</span>
                    <span className="stat-num text-xs font-semibold text-black">{rate.price}</span>
                    {rate.changePct !== null ? (
                      <span
                        className={cn(
                          "text-xs font-bold",
                          rate.trend === "up" ? "text-success" : rate.trend === "down" ? "text-error" : "text-black/40",
                        )}
                      >
                        {rate.changePct}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "text-xs font-bold",
                          rate.trend === "up" ? "text-success" : rate.trend === "down" ? "text-error" : "text-black/40",
                        )}
                        aria-label={rate.trend}
                      >
                        {rate.trend === "up" ? "▲" : rate.trend === "down" ? "▼" : "—"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-8" aria-hidden="true">
                {items.map((rate, i) => (
                  <div key={i} className="inline-flex items-center gap-1.5 text-xs">
                    <span className="text-xs font-medium text-black/50">{rate.label}:</span>
                    <span className="stat-num text-xs font-semibold text-black">{rate.price}</span>
                    <span
                      className={cn(
                        "text-xs font-bold",
                        rate.trend === "up" ? "text-success" : rate.trend === "down" ? "text-error" : "text-black/40",
                      )}
                    >
                      {rate.changePct ?? (rate.trend === "up" ? "▲" : rate.trend === "down" ? "▼" : "—")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right link to full board */}
        <a href="/rates" className="hidden shrink-0 items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-black/40 transition-colors hover:text-primary sm:flex">
          <span className="material-symbols-outlined text-[13px]" aria-hidden="true">table_chart</span>
          Full board
        </a>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Single source of truth for mandi rates across the app
 * (Exchange Board hero, RateTicker, feed sidebar, /rates page).
 *
 * - Fetches the latest `limit` rows, polling every `pollMs` while visible.
 * - Computes honest change percentages by comparing each row against the
 *   previous available rate_date for the same commodity + market — never
 *   fabricating deltas from the trend column.
 * - `indicative` is true when the table is unreachable/empty, so callers
 *   can label fallback data truthfully.
 */

export interface MarketRate {
  commodity: string;
  city: string;
  unit: string | null;
  modalPrice: number;
  minPrice: number | null;
  maxPrice: number | null;
  trend: string;
  rateDate: string;
  /** Real % change vs the previous rate_date for this commodity+market; null when no history. */
  changePct: number | null;
}

export const normalizeUnit = (u: string | null | undefined) =>
  u ? u.replace("40 kg (Maund)", "40kg") : "";

interface RawRate {
  commodity: string;
  city: string | null;
  unit: string | null;
  modal_price: number | null;
  min_price: number | null;
  max_price: number | null;
  trend: string | null;
  rate_date: string;
}

export function useMarketRates(limit = 10, pollMs = 60_000) {
  const [rates, setRates] = useState<MarketRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [indicative, setIndicative] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("market_rates")
      .select("commodity,city,unit,modal_price,min_price,max_price,trend,rate_date")
      .order("rate_date", { ascending: false })
      .order("recorded_at", { ascending: false })
      .limit(limit);

    if (!alive.current) return;

    if (error || !data || data.length === 0) {
      setIndicative(true);
      setLoading(false);
      return;
    }

    const latest = data as RawRate[];
    const latestDate = latest[0].rate_date;
    const prevDate = latest.map((r) => r.rate_date).find((d) => d < latestDate) ?? null;

    // Pull the previous day's rows to compute real deltas where history exists.
    let prevMap = new Map<string, number>();
    if (prevDate) {
      const { data: prevRows } = await supabase
        .from("market_rates")
        .select("commodity,city,modal_price,rate_date")
        .eq("rate_date", prevDate)
        .limit(limit * 2);
      if (prevRows) {
        prevMap = new Map(
          (prevRows as { commodity: string; city: string | null; modal_price: number | null }[]).map((r) => [
            `${r.commodity}|${r.city ?? ""}`,
            Number(r.modal_price ?? 0),
          ]),
        );
      }
    }

    const mapped: MarketRate[] = latest.map((r) => {
      const modal = Number(r.modal_price ?? 0);
      const prev = prevMap.get(`${r.commodity}|${r.city ?? ""}`);
      const changePct = prev && prev > 0 ? ((modal - prev) / prev) * 100 : null;
      return {
        commodity: r.commodity,
        city: r.city ?? "—",
        unit: r.unit,
        modalPrice: modal,
        minPrice: r.min_price === null ? null : Number(r.min_price),
        maxPrice: r.max_price === null ? null : Number(r.max_price),
        trend: r.trend ?? "stable",
        rateDate: r.rate_date,
        changePct,
      };
    });

    if (!alive.current) return;
    setRates(mapped);
    setIndicative(false);
    setLastUpdated(new Date());
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    alive.current = true;
    void load();

    const tick = () => {
      if (document.visibilityState === "visible") void load();
    };
    const interval = setInterval(tick, pollMs);

    return () => {
      alive.current = false;
      clearInterval(interval);
    };
  }, [load, pollMs]);

  return { rates, loading, indicative, lastUpdated, refresh: load };
}

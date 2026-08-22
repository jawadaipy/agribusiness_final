/**
 * Farmer intelligence: live local weather (open-meteo), the Pakistan crop
 * calendar for the current month, mandi rates, and derived advisories.
 */
import { useEffect, useState } from "react";
import type { MemberProfile } from "@/lib/member";
import { supabase } from "@/lib/supabase";
import {
  fetchCityWeather,
  seasonSnapshot,
  cropsInSeason,
  buildAdvisories,
  MONTH_NAMES,
  type CityWeather,
} from "@/lib/agri-intel";

type MandiRate = { commodity: string; city: string; modal_price: number; unit: string; trend: string };

export function FarmerIntelligence({ profile }: { profile: MemberProfile }) {
  const [weather, setWeather] = useState<CityWeather | null>(null);
  const [weatherOffline, setWeatherOffline] = useState(false);
  const [myCrops, setMyCrops] = useState<string[]>([]);
  const [rates, setRates] = useState<MandiRate[]>([]);
  const [ratesUnavailable, setRatesUnavailable] = useState(false);

  const month = new Date().getMonth() + 1;
  const snapshot = seasonSnapshot(month);
  const mine = cropsInSeason(myCrops, month);
  const mineIds = new Set(mine.map((c) => c.id));
  const advisories = buildAdvisories(weather, month);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const weatherPromise = fetchCityWeather(profile.city).then((w) => {
        if (cancelled) return;
        if (!w) setWeatherOffline(true);
        else setWeather(w);
      });
      const cropsPromise = supabase
        .from("farmer_profiles")
        .select("crops")
        .eq("profile_id", profile.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled) setMyCrops(data?.crops ?? []);
        });
      const ratesPromise = supabase
        .from("market_rates")
        .select("commodity,city,modal_price,unit,trend")
        .limit(8)
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error || !data?.length) setRatesUnavailable(true);
          else setRates(data as MandiRate[]);
        });
      await Promise.all([weatherPromise, cropsPromise, ratesPromise]);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [profile.id, profile.city]);

  const pkr = (value: number) => `₨ ${new Intl.NumberFormat("en-PK").format(value)}`;

  return (
    <section className="rounded-2xl border border-outline-variant/60 bg-white p-5 shadow-[0_10px_28px_rgba(15,81,50,0.06)] md:p-7">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[.14em] text-on-surface-variant/65">Farm intelligence · {MONTH_NAMES[month - 1]}</p>
          <h2 className="mt-1 font-display text-2xl text-primary">Weather, season, and mandi — at a glance</h2>
          <p className="mt-2 max-w-2xl text-[11px] leading-5 text-on-surface-variant">
            Local forecast for {profile.city || "your region"}, what the crop calendar says for this month
            {myCrops.length > 0 ? " (your crops highlighted)" : ""}, and the latest mandi indications.
          </p>
        </div>
        {weather ? (
          <p className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]">update</span>
            Updated {weather.fetchedAt} PKT
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {/* Weather */}
        <div className="rounded-2xl bg-primary p-5 text-on-primary">
          {weather ? (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.12em] text-secondary-container">{weather.city} · now</p>
                  <p className="mt-2 font-display text-5xl leading-none">{weather.temperature}°C</p>
                  <p className="mt-1.5 text-xs font-semibold text-white/80">{weather.label}</p>
                </div>
                <span className="material-symbols-outlined text-[44px] text-secondary">{weather.icon}</span>
              </div>
              <div className="mt-4 flex gap-4 text-[11px] text-white/75">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">water_drop</span>{weather.humidity}% humidity</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">air</span>{weather.windSpeed} km/h</span>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 border-t border-white/15 pt-3">
                {weather.days.map((day) => (
                  <div key={day.date} className="text-center">
                    <p className="text-[9px] font-bold uppercase text-white/60">
                      {new Intl.DateTimeFormat("en-PK", { weekday: "short" }).format(new Date(day.date))}
                    </p>
                    <p className="mt-1 text-xs font-bold">{day.max}°</p>
                    <p className="text-[10px] text-white/60">{day.min}°</p>
                    <p className={`text-[9px] font-bold ${day.rainChance >= 60 ? "text-secondary" : "text-white/50"}`}>{day.rainChance}%</p>
                  </div>
                ))}
              </div>
            </>
          ) : weatherOffline ? (
            <div className="flex h-full flex-col items-center justify-center py-8 text-center">
              <span className="material-symbols-outlined text-[36px] text-secondary">cloud_off</span>
              <p className="mt-3 text-xs font-bold">Weather unavailable</p>
              <p className="mt-1 text-[10px] leading-4 text-white/70">The forecast service could not be reached. Seasonal guidance below is still valid.</p>
            </div>
          ) : (
            <div className="space-y-3 py-6">
              {[0, 1, 2].map((i) => <div key={i} className="h-5 animate-pulse rounded bg-white/15" />)}
            </div>
          )}
        </div>

        {/* Crop calendar */}
        <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low/60 p-5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-on-surface-variant">
            <span className="material-symbols-outlined text-[15px] text-primary">calendar_month</span>
            Crop calendar · {MONTH_NAMES[month - 1]}
          </p>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-primary">Sowing window</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {snapshot.sowNow.length === 0 ? (
                <span className="text-[11px] text-on-surface-variant">No major sowings this month</span>
              ) : (
                snapshot.sowNow.map((crop) => (
                  <span
                    key={crop.id}
                    title={crop.tip}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${mineIds.has(crop.id) ? "bg-primary text-on-primary" : "bg-primary/10 text-primary"}`}
                  >
                    {crop.en} <span className="opacity-75">{crop.ur}</span>
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-primary">Harvest window</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {snapshot.harvestNow.length === 0 ? (
                <span className="text-[11px] text-on-surface-variant">No major harvests this month</span>
              ) : (
                snapshot.harvestNow.map((crop) => (
                  <span
                    key={crop.id}
                    title={crop.tip}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${mineIds.has(crop.id) ? "bg-secondary text-primary" : "bg-secondary/30 text-[#6B4E00]"}`}
                  >
                    {crop.en} <span className="opacity-75">{crop.ur}</span>
                  </span>
                ))
              )}
            </div>
          </div>
          {mine.length > 0 ? (
            <p className="mt-3 rounded-xl bg-secondary-container p-2.5 text-[10px] leading-4 text-on-secondary-container">
              <span className="font-bold">Your crops this month:</span> {mine.map((c) => c.en).join(", ")}. Tap a chip for the field tip.
            </p>
          ) : myCrops.length === 0 ? (
            <p className="mt-3 text-[10px] leading-4 text-on-surface-variant">Add your crops under My profile so this calendar highlights your season.</p>
          ) : null}
        </div>

        {/* Mandi rates */}
        <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low/60 p-5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-on-surface-variant">
            <span className="material-symbols-outlined text-[15px] text-primary">trending_up</span>
            Mandi indications
          </p>
          {ratesUnavailable ? (
            <p className="mt-3 text-[11px] leading-5 text-on-surface-variant">Live mandi rates are not available right now. The ticker on the homepage carries indicative rates.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {rates.slice(0, 6).map((rate) => (
                <li key={`${rate.commodity}-${rate.city}`} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate font-semibold text-primary">{rate.commodity} <span className="font-medium text-on-surface-variant">· {rate.city}</span></span>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className="font-bold text-primary">{pkr(rate.modal_price)}</span>
                    <span className={`material-symbols-outlined text-[14px] ${rate.trend === "up" ? "text-emerald-600" : rate.trend === "down" ? "text-red-500" : "text-on-surface-variant/50"}`}>
                      {rate.trend === "up" ? "trending_up" : rate.trend === "down" ? "trending_down" : "trending_flat"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Advisories */}
      <div className="mt-4 rounded-2xl border border-secondary/30 bg-secondary-container/40 p-4">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-on-secondary-container">
          <span className="material-symbols-outlined text-[15px]">tips_and_updates</span>
          This week's field advisories
        </p>
        <ul className="mt-2.5 space-y-1.5">
          {advisories.map((note) => (
            <li key={note} className="flex items-start gap-2 text-[11px] leading-5 text-on-surface-variant">
              <span className="material-symbols-outlined mt-0.5 text-[13px] text-primary">arrow_right</span>
              {note}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[9px] leading-4 text-on-surface-variant/60">
          Advisory text is seasonal guidance, not a prescription. Confirm doses and timings with a verified consultant or your local extension office.
        </p>
      </div>
    </section>
  );
}

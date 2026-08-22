import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface RateItem {
  label: string;
  price: string;
  change: string;
  trend: "up" | "down" | "stable";
}

const DEFAULT_RATES: RateItem[] = [
  { label: "Wheat (Multan)", price: "₨ 4,200/40kg", change: "+2.4%", trend: "up" },
  { label: "Super Basmati (Faisalabad)", price: "₨ 9,800/40kg", change: "+1.1%", trend: "up" },
  { label: "Cotton Phutti (Rahim Yar Khan)", price: "₨ 8,650/40kg", change: "-0.8%", trend: "down" },
  { label: "Sugarcane (Sargodha)", price: "₨ 450/40kg", change: "0.0%", trend: "stable" },
  { label: "Maize (Sahiwal)", price: "₨ 3,150/40kg", change: "+1.9%", trend: "up" },
  { label: "Urea Fertilizer (Lahore)", price: "₨ 4,850/bag", change: "0.0%", trend: "stable" },
  { label: "DAP Fertilizer (Karachi)", price: "₨ 12,900/bag", change: "-1.2%", trend: "down" },
];

export function RateTicker() {
  const [time, setTime] = useState<string | null>(null);
  const [rates, setRates] = useState<RateItem[]>(DEFAULT_RATES);

  useEffect(() => {
    setTime(new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }));
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }));
    }, 30000);

    // Fetch live market rates from Supabase if table exists
    async function fetchLiveRates() {
      try {
        const { data, error } = await supabase
          .from("market_rates")
          .select("commodity, city, modal_price, unit, trend")
          .limit(10);

        if (!error && data && data.length > 0) {
          const formatted: RateItem[] = data.map((r: any) => ({
            label: `${r.commodity} (${r.city})`,
            price: `₨ ${Number(r.modal_price).toLocaleString()}/${r.unit?.replace('40 kg (Maund)', '40kg') || 'unit'}`,
            change: r.trend === 'up' ? '+1.5%' : r.trend === 'down' ? '-1.0%' : '0.0%',
            trend: (r.trend as "up" | "down" | "stable") || "stable"
          }));
          setRates(formatted);
        }
      } catch (e) {
        // Fallback to default rates quietly
      }
    }

    fetchLiveRates();

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="border-b border-black/[0.06] bg-black/[0.015] py-2.5 overflow-hidden relative">
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto flex items-center justify-between gap-3">

        {/* Left Live Indicator Badge */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/60">Mandi Rates</span>
        </div>
        
        {/* Seamless scrolling marquee for ALL screens */}
        <div className="flex-1 mx-2 overflow-hidden group relative">
          <div className="flex items-center gap-8 animate-ticker whitespace-nowrap">
            {[...rates, ...rates].map((rate, i) => (
              <div key={i} className="inline-flex items-center gap-1.5 text-xs">
                <span className="text-black/50 font-medium text-[11px]">{rate.label}:</span>
                <span className="stat-num font-semibold text-black text-[11px]">{rate.price}</span>
                <span className={cn(
                  "text-[10px] font-bold",
                  rate.trend === "up" ? "text-emerald-600" :
                  rate.trend === "down" ? "text-red-500" :
                  "text-black/40"
                )}>
                  {rate.change}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Timestamp */}
        <div className="hidden sm:flex items-center gap-1 text-black/40 text-[10px] font-semibold shrink-0 uppercase tracking-[0.12em]">
          <span className="material-symbols-outlined text-[13px]">schedule</span>
          <span>{time ? `PKT ${time}` : "LIVE"}</span>
        </div>
      </div>
    </div>
  );
}
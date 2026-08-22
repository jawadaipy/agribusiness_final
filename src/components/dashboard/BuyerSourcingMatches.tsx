/**
 * Buyer sourcing desk: matches the buyer's commodity and collection-region
 * profile against live marketplace listings from real producers.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { MemberProfile } from "@/lib/member";
import { supabase } from "@/lib/supabase";
import { textKeywordMatches } from "@/lib/matching";

type SourcingMatch = {
  id: string;
  title: string;
  price: number | null;
  unit: string | null;
  quantity: number | string | null;
  city: string | null;
  commodityHits: string[];
  regionHit: string | null;
};

export function BuyerSourcingMatches({ profile }: { profile: MemberProfile }) {
  const [matches, setMatches] = useState<SourcingMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [{ data: buyer }, { data: listings }] = await Promise.all([
        supabase.from("buyer_profiles").select("commodities,procurement_regions").eq("profile_id", profile.id).maybeSingle(),
        supabase
          .from("listings")
          .select("id,title,price,unit,quantity,city,location")
          .eq("status", "active")
          .neq("profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(80),
      ]);
      if (cancelled) return;
      const commodities: string[] = buyer?.commodities ?? [];
      const regions: string[] = buyer?.procurement_regions ?? [];
      if (commodities.length === 0 && regions.length === 0) {
        setNoProfile(true);
        setLoading(false);
        return;
      }

      const scored: SourcingMatch[] = [];
      for (const listing of (listings ?? []) as Array<{
        id: string; title: string; price: number | null; unit: string | null; quantity: number | string | null;
        city: string | null; location: string | null;
      }>) {
        const haystack = [listing.title, listing.city, listing.location];
        const commodityHits = textKeywordMatches(commodities, haystack);
        const placeText = [listing.city, listing.location].filter(Boolean).join(" ").toLowerCase();
        const regionHit = regions.find((r) => r.trim() && placeText.includes(r.trim().toLowerCase())) ?? null;
        if (commodityHits.length === 0 && !regionHit) continue;
        scored.push({
          id: listing.id,
          title: listing.title,
          price: listing.price,
          unit: listing.unit,
          quantity: listing.quantity,
          city: listing.city,
          commodityHits,
          regionHit,
        });
      }
      scored.sort((a, b) => b.commodityHits.length * 2 + (b.regionHit ? 1 : 0) - (a.commodityHits.length * 2 + (a.regionHit ? 1 : 0)));
      setMatches(scored.slice(0, 4));
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  return (
    <section className="rounded-2xl border border-outline-variant/60 bg-white p-5 shadow-[0_10px_28px_rgba(15,81,50,0.06)] md:p-7">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[.14em] text-on-surface-variant/65">Sourcing desk</p>
          <h2 className="mt-1 font-display text-2xl text-primary">Supply matched to your requirements</h2>
          <p className="mt-2 max-w-2xl text-[11px] leading-5 text-on-surface-variant">
            Live producer listings that overlap with the commodities and collection regions on your procurement profile.
          </p>
        </div>
        <Link to="/marketplace" className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-outline-variant/70 px-3.5 py-2.5 text-[11px] font-bold text-primary transition hover:bg-surface-container-low">
          <span className="material-symbols-outlined text-[15px]">storefront</span>
          Open marketplace
        </Link>
      </div>

      {loading ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-container-low" />)}
        </div>
      ) : noProfile ? (
        <p className="mt-5 rounded-xl border border-dashed border-outline bg-surface-container-low p-4 text-xs leading-5 text-on-surface-variant">
          Add the commodities you buy and your collection regions under <span className="font-bold text-primary">My profile</span> — this desk then surfaces matching producer supply automatically.
        </p>
      ) : matches.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-outline bg-surface-container-low p-4 text-xs leading-5 text-on-surface-variant">
          No live listings match your commodity and region profile right now. New producer listings will appear here as they are published.
        </p>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {matches.map((match) => (
            <Link
              key={match.id}
              to="/marketplace"
              className="group rounded-xl border border-outline-variant/50 bg-surface-container-low/60 p-4 transition hover:border-primary/40 hover:bg-white"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-bold text-primary group-hover:underline">{match.title}</h3>
                <span className="material-symbols-outlined shrink-0 text-[16px] text-on-surface-variant/40 transition-transform group-hover:translate-x-1">chevron_right</span>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-primary">
                {match.price !== null && match.price !== undefined && match.price !== ("" as unknown as number)
                  ? `₨ ${new Intl.NumberFormat("en-PK").format(Number(match.price))}${match.unit ? ` / ${match.unit}` : ""}`
                  : "Price on request"}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {match.commodityHits.map((hit) => (
                  <span key={hit} className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">Your commodity: {hit}</span>
                ))}
                {match.regionHit ? (
                  <span key={match.regionHit} className="rounded-full bg-secondary/30 px-2 py-0.5 text-[9px] font-bold text-[#6B4E00]">Your region: {match.regionHit}</span>
                ) : null}
                {match.city ? <span className="rounded-full bg-surface-container px-2 py-0.5 text-[9px] font-bold text-on-surface-variant">{match.city}</span> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

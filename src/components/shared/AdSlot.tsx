/**
 * Sponsored placement slot. Renders approved ads that are inside their
 * flight window (mirrors the public RLS policy). Honest by design:
 * every creative is labelled "Sponsored", and impressions/clicks are
 * tracked through the anon-safe track_ad_event RPC — never fabricated.
 * Renders nothing (no layout shift after load) when a slot is empty.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

interface AdRow {
  id: string;
  title: string;
  body: string | null;
  creative_url: string | null;
  target_url: string | null;
}

type Variant = "banner" | "card";

export function AdSlot({ variant = "banner", className = "" }: { variant?: Variant; className?: string }) {
  const [ad, setAd] = useState<AdRow | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase
      .from("ads")
      .select("id,title,body,creative_url,target_url")
      .eq("status", "approved")
      .lte("starts_at", new Date().toISOString())
      .gte("ends_at", new Date().toISOString())
      .not("creative_url", "is", null)
      .order("rotation_order")
      .limit(5)
      .then(({ data }) => {
        if (!alive || !data?.length) return;
        // Rotation: stable per page-load pick weighted by rotation order.
        const pick = data[Math.floor(Math.random() * data.length)] as AdRow;
        setAd(pick);
        void supabase.rpc("track_ad_event", { p_ad_id: pick.id, p_event: "impression" });
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!ad) return null;

  const trackClick = () => {
    void supabase.rpc("track_ad_event", { p_ad_id: ad.id, p_event: "click" });
  };

  const inner = (
    <>
      {ad.creative_url && !imgError ? (
        <img
          src={ad.creative_url}
          alt=""
          loading="lazy"
          onError={() => setImgError(true)}
          className={
            variant === "banner"
              ? "h-36 w-full object-cover sm:h-44"
              : "aspect-[16/9] w-full object-cover"
          }
        />
      ) : null}
      <div className="flex flex-col gap-1 p-5">
        <p className="font-display text-base font-bold leading-snug text-primary">{ad.title}</p>
        {ad.body ? <p className="line-clamp-2 text-xs leading-5 text-on-surface-variant">{ad.body}</p> : null}
        <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-secondary">
          Learn more
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
        </span>
      </div>
    </>
  );

  const label = (
    <span className="absolute right-3 top-3 z-10 rounded-md bg-black/55 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-sm">
      Sponsored
    </span>
  );

  // External links open in a new tab; internal routes use the router.
  const isExternal = ad.target_url?.startsWith("http");
  const cls =
    variant === "banner"
      ? `group relative my-10 block overflow-hidden rounded-2xl border border-outline-variant/40 bg-white card-shadow transition-all hover:card-shadow-hover md:my-12 ${className}`
      : `group relative flex flex-col overflow-hidden rounded-2xl border border-outline-variant/40 bg-white card-shadow transition-all hover:card-shadow-hover ${className}`;

  return isExternal ? (
    <a href={ad.target_url!} target="_blank" rel="noopener noreferrer sponsored" onClick={trackClick} className={cls} aria-label={`Sponsored: ${ad.title}`}>
      {label}
      {inner}
    </a>
  ) : (
    <Link to={(ad.target_url ?? "/") as never} onClick={trackClick} className={cls} aria-label={`Sponsored: ${ad.title}`}>
      {label}
      {inner}
    </Link>
  );
}

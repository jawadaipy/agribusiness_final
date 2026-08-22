/**
 * /marketplace — Public browse page for all active listings.
 * Filterable by city, service category, and user type.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import { CITIES, AGRI_SERVICES } from "@/lib/constants";
import { SaveButton } from "@/components/shared/SaveButton";
import { fetchSavedIds } from "@/lib/saved-items";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    title: "Marketplace | AgriBusiness Pakistan",
    meta: [{ name: "description", content: "Browse produce listings, agri services, and products from verified Pakistani farmers, consultants, and agri-businesses." }],
  }),
  component: MarketplacePage,
});

type ListingCard = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  unit: string | null;
  quantity: number | null;
  city: string | null;
  status: string;
  created_at: string;
  profile: {
    full_name: string | null;
    user_type: string;
    avatar_url: string | null;
    is_verified: boolean;
  } | null;
};

function formatPkr(v: number | null) {
  if (v === null) return "Price on request";
  return `PKR ${v.toLocaleString("en-PK")}`;
}

const TYPE_LABELS: Record<string, string> = {
  farmer: "Farmer",
  consultant: "Consultant",
  company: "Company",
  buyer: "Buyer",
};

function ListingCardView({ listing, savedInitially }: { listing: ListingCard; savedInitially: boolean }) {
  const initials = (listing.profile?.full_name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <article className="group flex flex-col rounded-2xl border border-outline-variant/50 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      {/* Seller chip */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-[11px] font-bold text-primary">
          {listing.profile?.avatar_url ? (
            <img src={listing.profile.avatar_url} alt="" className="h-full w-full rounded-xl object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold text-primary">{listing.profile?.full_name ?? "Unknown"}</p>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-secondary">
            {TYPE_LABELS[listing.profile?.user_type ?? ""] ?? listing.profile?.user_type}
            {listing.profile?.is_verified && (
              <span className="ml-1 text-primary">✓</span>
            )}
          </p>
        </div>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="rounded-full bg-primary/8 px-2 py-0.5 text-[9px] font-bold uppercase text-primary">
            {listing.status}
          </span>
          <SaveButton kind="listing" targetId={listing.id} initiallySaved={savedInitially} compact />
        </span>
      </div>

      {/* Title */}
      <h2 className="font-display text-base font-bold leading-snug text-primary group-hover:text-secondary transition-colors line-clamp-2">
        {listing.title}
      </h2>

      {/* Description */}
      {listing.description && (
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-on-surface-variant">
          {listing.description}
        </p>
      )}

      <div className="mt-auto pt-4">
        {/* Price */}
        <p className="text-base font-bold text-primary">
          {formatPkr(listing.price)}
          {listing.unit && (
            <span className="ml-1 text-[10px] font-medium text-on-surface-variant">
              / {listing.unit}
            </span>
          )}
        </p>

        {/* Meta */}
        <p className="mt-1 flex items-center gap-1 text-[10px] text-on-surface-variant">
          <span className="material-symbols-outlined text-[13px]">location_on</span>
          {listing.city ?? "Pakistan"}
          {listing.quantity != null && (
            <span className="ml-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">inventory_2</span>
              {listing.quantity.toLocaleString()} units
            </span>
          )}
        </p>

        {/* CTA */}
        <Link
          to={`/profile/${listing.profile?.id ?? ""}` as "/profile/$id"}
          params={{ id: listing.profile?.id ?? "" } as never}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary/8 py-2 text-xs font-bold text-primary transition hover:bg-primary hover:text-on-primary"
        >
          <span className="material-symbols-outlined text-[14px]">person</span>
          View seller profile
        </Link>
      </div>
    </article>
  );
}

function MarketplacePage() {
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [filtered, setFiltered] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [savedListingIds, setSavedListingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase
      .from("listings")
      .select("id,title,description,price,unit,quantity,city,status,created_at,profile_id,profiles!listings_profile_id_fkey(full_name,user_type,avatar_url,is_verified)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(120)
      .then(({ data }) => {
        // Remap joined profile
        const mapped = (data ?? []).map((row: Record<string, unknown>) => ({
          ...(row as object),
          profile: {
            ...(row.profiles as Record<string, unknown>),
            id: row.profile_id,
          },
        })) as ListingCard[];
        setListings(mapped);
        setFiltered(mapped);
        setLoading(false);
      });
    // Pre-fill bookmark state for signed-in members
    supabase.auth.getUser().then(({ data: authData }) => {
      if (!authData.user) return;
      void fetchSavedIds(authData.user.id).then(({ listingIds }) => setSavedListingIds(listingIds));
    });
  }, []);

  useEffect(() => {
    let result = listings;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          (l.description ?? "").toLowerCase().includes(q) ||
          (l.city ?? "").toLowerCase().includes(q),
      );
    }
    if (cityFilter) result = result.filter((l) => l.city === cityFilter);
    if (typeFilter) result = result.filter((l) => l.profile?.user_type === typeFilter);
    setFiltered(result);
  }, [search, cityFilter, typeFilter, serviceFilter, listings]);

  const inputClass = "w-full rounded-xl border border-outline-variant/60 bg-white px-3 py-2 text-xs font-medium text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-16">
        {/* Hero banner */}
        <div className="bg-gradient-to-br from-primary to-primary-container px-4 py-12 text-center text-white">
          <h1 className="font-display text-4xl font-bold tracking-tight">Agri Marketplace</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed opacity-90">
            Browse produce, services, and products from verified Pakistani farmers, consultants, and agri-businesses.
          </p>
          {/* Search */}
          <div className="mx-auto mt-6 flex max-w-lg items-center gap-2 rounded-2xl bg-white p-2 shadow-lg">
            <span className="material-symbols-outlined ml-2 text-[20px] text-on-surface-variant">search</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search wheat, mango, irrigation, consulting…"
              className="flex-1 bg-transparent py-1 text-sm text-primary outline-none placeholder:text-on-surface-variant/60"
            />
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8">
          {/* Filters row */}
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={inputClass}>
              <option value="">All cities</option>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputClass}>
              <option value="">All seller types</option>
              <option value="farmer">Farmer</option>
              <option value="consultant">Consultant / Expert</option>
              <option value="company">Company</option>
            </select>
            <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className={inputClass}>
              <option value="">All categories</option>
              {AGRI_SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Stats bar */}
          <div className="mb-5 flex items-center justify-between">
            <p className="text-xs text-on-surface-variant">
              Showing <span className="font-bold text-primary">{filtered.length}</span> listing{filtered.length !== 1 ? "s" : ""}
            </p>
            {(search || cityFilter || typeFilter) && (
              <button
                type="button"
                onClick={() => { setSearch(""); setCityFilter(""); setTypeFilter(""); setServiceFilter(""); }}
                className="text-xs font-bold text-error hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1,2,3,4,5,6,7,8].map((i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-white" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-outline bg-white py-20 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30">storefront</span>
              <p className="font-display text-xl text-on-surface-variant">No listings found</p>
              <p className="text-xs text-on-surface-variant/60">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((listing) => (
                <ListingCardView key={listing.id} listing={listing} savedInitially={savedListingIds.has(listing.id)} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

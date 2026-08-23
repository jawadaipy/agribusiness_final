/**
 * /marketplace — Public browse page for all active listings.
 * Filterable by search, city, seller type, and real category (joined from
 * `categories`). Sortable by newest/price. Loads in pages of 24.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import { CITIES } from "@/lib/constants";
import { formatPKR } from "@/lib/format";
import { SaveButton } from "@/components/shared/SaveButton";
import { AdSlot } from "@/components/shared/AdSlot";
import { fetchSavedIds } from "@/lib/saved-items";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    title: "Marketplace | AgriBusiness Pakistan",
    meta: [{ name: "description", content: "Browse produce listings, agri services, and products from verified Pakistani farmers, consultants, and agri-businesses." }],
  }),
  component: MarketplacePage,
});

const PAGE_SIZE = 24;

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
  category: { name: string } | null;
  profile: {
    id: string;
    full_name: string | null;
    user_type: string;
    avatar_url: string | null;
    is_verified: boolean;
  } | null;
};

const TYPE_LABELS: Record<string, string> = {
  farmer: "Farmer",
  consultant: "Consultant",
  company: "Company",
  buyer: "Buyer",
};

type SortKey = "newest" | "price-asc" | "price-desc";

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
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-xs font-bold text-primary">
          {listing.profile?.avatar_url ? (
            <img src={listing.profile.avatar_url} alt="" className="h-full w-full rounded-xl object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-primary">{listing.profile?.full_name ?? "Unknown"}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {TYPE_LABELS[listing.profile?.user_type ?? ""] ?? listing.profile?.user_type}
            {listing.profile?.is_verified && (
              <span className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-secondary text-on-secondary" title="Verified member" aria-label="Verified member">
                <span className="material-symbols-outlined text-[10px]" aria-hidden="true">check</span>
              </span>
            )}
          </p>
        </div>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="rounded-full bg-primary/8 px-2 py-0.5 text-xs font-bold uppercase text-primary">
            {listing.status}
          </span>
          <SaveButton kind="listing" targetId={listing.id} initiallySaved={savedInitially} compact />
        </span>
      </div>

      {/* Title + category */}
      <h2 className="line-clamp-2 font-display text-base font-bold leading-snug text-primary transition-colors group-hover:text-secondary">
        {listing.title}
      </h2>
      {listing.category?.name && (
        <span className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-lg border border-outline-variant/30 bg-surface-container-low px-2 py-0.5 text-xs font-semibold text-primary">
          {listing.category.name}
        </span>
      )}

      {/* Description */}
      {listing.description && (
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-on-surface-variant">
          {listing.description}
        </p>
      )}

      <div className="mt-auto pt-4">
        {/* Price */}
        <p className="text-base font-bold text-primary">
          {listing.price === null ? "Price on request" : formatPKR(listing.price)}
          {listing.unit && (
            <span className="ml-1 text-xs font-medium text-on-surface-variant">/ {listing.unit}</span>
          )}
        </p>

        {/* Meta */}
        <p className="mt-1 flex items-center gap-1 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">location_on</span>
          {listing.city ?? "Pakistan"}
          {listing.quantity != null && (
            <span className="ml-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">inventory_2</span>
              {listing.quantity.toLocaleString()} units
            </span>
          )}
        </p>

        {/* CTA */}
        <Link
          to="/profile/$id"
          params={{ id: listing.profile?.id ?? "" }}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary/8 py-2 text-xs font-bold text-primary transition hover:bg-primary hover:text-on-primary"
        >
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">person</span>
          View seller profile
        </Link>
      </div>
    </article>
  );
}

function MarketplacePage() {
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [savedListingIds, setSavedListingIds] = useState<Set<string>>(new Set());

  const loadPage = useCallback(async (from: number, replace: boolean) => {
    let query = supabase
      .from("listings")
      .select("id,title,description,price,unit,quantity,city,status,created_at,profile_id,category:categories(name),profiles!listings_profile_id_fkey(full_name,user_type,avatar_url,is_verified)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (sort === "price-asc") query = query.order("price", { ascending: true, nullsFirst: false });
    if (sort === "price-desc") query = query.order("price", { ascending: false, nullsFirst: true });

    const { data } = await query;
    const mapped = (data ?? []).map((row: Record<string, unknown>) => ({
      ...(row as object),
      profile: {
        ...(row.profiles as Record<string, unknown>),
        id: row.profile_id,
      },
    })) as ListingCard[];

    if (replace) {
      setListings(mapped);
      setLoading(false);
    } else {
      setListings((prev) => [...prev, ...mapped]);
    }
    setHasMore(mapped.length === PAGE_SIZE);
    setLoadingMore(false);
  }, [sort]);

  useEffect(() => {
    setLoading(true);
    void loadPage(0, true);
  }, [loadPage]);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id,name")
      .eq("is_active", true)
      .is("parent_id", null)
      .order("sort_order")
      .then(({ data }) => setCategories((data as { id: string; name: string }[]) ?? []));

    // Pre-fill bookmark state for signed-in members
    supabase.auth.getUser().then(({ data: authData }) => {
      if (!authData.user) return;
      void fetchSavedIds(authData.user.id).then(({ listingIds }) => setSavedListingIds(listingIds));
    });
  }, []);

  // Client-side refinement of the loaded pages
  const filtered = listings.filter((l) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const haystack = `${l.title} ${(l.description ?? "")} ${l.city ?? ""} ${l.category?.name ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (cityFilter && l.city !== cityFilter) return false;
    if (typeFilter && l.profile?.user_type !== typeFilter) return false;
    if (categoryFilter && (l.category?.name ?? "") !== categoryFilter) return false;
    return true;
  });

  const inputClass =
    "w-full rounded-xl border border-outline-variant/60 bg-white px-3 py-2 text-xs font-medium text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";

  return (
    <>
      <Navbar />
      <main className="min-h-screen pb-16 pt-20">
        {/* Hero banner */}
        <div className="relative bg-gradient-to-br from-primary to-primary-container px-4 py-12 text-center text-white">
          <div className="pointer-events-none absolute inset-0 bg-field-grid opacity-30" style={{ maskImage: "linear-gradient(to bottom, black, transparent 90%)" }} aria-hidden="true" />
          <p className="eyebrow relative justify-center text-secondary-container">Live from Pakistani farms</p>
          <h1 className="relative mt-3 font-display text-4xl font-semibold tracking-tight">Agri Marketplace</h1>
          <p className="relative mx-auto mt-3 max-w-lg text-sm leading-relaxed opacity-90">
            Browse produce, services, and products from verified Pakistani farmers, consultants, and agri-businesses.
          </p>
          {/* Search */}
          <div className="mx-auto mt-6 flex max-w-lg items-center gap-2 rounded-2xl bg-white p-2 shadow-lg">
            <span className="material-symbols-outlined ml-2 text-[20px] text-on-surface-variant" aria-hidden="true">search</span>
            <label htmlFor="marketplace-search" className="sr-only">Search listings</label>
            <input
              id="marketplace-search"
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
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="sr-only" htmlFor="filter-city">City</label>
            <select id="filter-city" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={inputClass}>
              <option value="">All cities</option>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="sr-only" htmlFor="filter-type">Seller type</label>
            <select id="filter-type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputClass}>
              <option value="">All seller types</option>
              <option value="farmer">Farmer</option>
              <option value="consultant">Consultant / Expert</option>
              <option value="company">Company</option>
            </select>
            <label className="sr-only" htmlFor="filter-category">Category</label>
            <select id="filter-category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={inputClass}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <label className="sr-only" htmlFor="filter-sort">Sort</label>
            <select id="filter-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={inputClass}>
              <option value="newest">Newest first</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
            {(search || cityFilter || typeFilter || categoryFilter) && (
              <button
                type="button"
                onClick={() => { setSearch(""); setCityFilter(""); setTypeFilter(""); setCategoryFilter(""); }}
                className="rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-xs font-bold text-error transition hover:bg-error/10"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Stats bar */}
          <div className="mb-5 flex items-center justify-between">
            <p className="text-xs text-on-surface-variant">
              Showing <span className="font-bold text-primary">{filtered.length}</span> listing{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Platform-sponsored placement (only when a flight is live) */}
          <div className="mb-5">
            <AdSlot variant="banner" />
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-64 skeleton rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-outline bg-white py-20 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30" aria-hidden="true">storefront</span>
              <p className="font-display text-xl text-on-surface-variant">No listings found</p>
              <p className="text-xs text-on-surface-variant/60">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((listing) => (
                  <ListingCardView key={listing.id} listing={listing} savedInitially={savedListingIds.has(listing.id)} />
                ))}
              </div>
              {hasMore && !search && !cityFilter && !typeFilter && !categoryFilter && (
                <div className="mt-10 text-center">
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() => {
                      setLoadingMore(true);
                      void loadPage(listings.length, false);
                    }}
                    className="rounded-xl border border-primary/30 bg-white px-6 py-3 text-xs font-bold uppercase tracking-wider text-primary transition hover:bg-primary/5 disabled:opacity-60"
                  >
                    {loadingMore ? "Loading…" : "Load more listings"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

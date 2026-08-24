import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatPKR } from "@/lib/format";
import { CITIES } from "@/lib/constants";

type ListingItem = {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  price: number | null;
  unit: string | null;
  quantity: number | null;
  location: string | null;
  city: string | null;
  created_at: string;
  sellerName?: string;
  sellerType?: string;
  isVerified?: boolean;
};

const CategoryDetailPage = () => {
  const { slug } = useParams({ from: "/categories/$slug" });

  const [categoryName, setCategoryName] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");

  useEffect(() => {
    let alive = true;
    setIsLoading(true);
    setLoadError("");
    setNotFound(false);

    (async () => {
      // Resolve the category by slug only — an unknown slug must not
      // silently fall back to every listing on the platform.
      const { data: categoryData } = await supabase
        .from("categories")
        .select("id,name")
        .eq("slug", slug)
        .maybeSingle();

      if (!alive) return;

      if (!categoryData?.id) {
        setNotFound(true);
        setListings([]);
        setIsLoading(false);
        return;
      }
      setCategoryName(categoryData.name);

      const { data: listingsData, error: listingsError } = await supabase
        .from("listings")
        .select("id,profile_id,title,description,price,unit,quantity,location,city,created_at")
        .eq("status", "active")
        .eq("category_id", categoryData.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!alive) return;

      if (listingsError) {
        setLoadError("Category marketplace records could not be loaded.");
        setListings([]);
        setIsLoading(false);
        return;
      }

      const rawListings = (listingsData ?? []) as ListingItem[];

      if (rawListings.length > 0) {
        const profileIds = Array.from(new Set(rawListings.map((l) => l.profile_id)));
        const { data: profilesData } = await supabase
          .from("directory_profiles")
          .select("id,display_name,user_type,is_verified")
          .in("id", profileIds);

        const profileMap = new Map((profilesData ?? []).map((p) => [p.id, p]));

        const enriched = rawListings.map((item) => {
          const prof = profileMap.get(item.profile_id);
          return {
            ...item,
            sellerName: prof?.display_name || "Verified Producer",
            sellerType: prof?.user_type || "farmer",
            isVerified: prof?.is_verified === true,
          };
        });
        setListings(enriched);
      } else {
        setListings([]);
      }

      setIsLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [slug]);

  const filtered = listings.filter((item) => {
    const matchesText = [item.title, item.description || "", item.location || "", item.city || ""]
      .some((str) => str.toLowerCase().includes(filterQuery.toLowerCase().trim()));
    const matchesCity = selectedCity === "all" || item.city === selectedCity;
    return matchesText && matchesCity;
  });

  return (
    <div className="min-h-screen bg-background text-on-background">
      <Navbar />
      <main className="pb-16 pt-24 text-left">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">

          {notFound ? (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-outline bg-white py-24 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30" aria-hidden="true">category</span>
              <h1 className="font-display text-2xl font-bold text-primary">Category not found</h1>
              <p className="max-w-sm text-xs text-on-surface-variant">
                No sector exists for “{slug}”. Browse all sectors to find what you need.
              </p>
              <Link to="/categories" className="btn-primary mt-2 inline-flex items-center gap-1.5 text-xs">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
                All sectors
              </Link>
            </div>
          ) : (
            <>
              {/* Header Banner */}
              <div className="relative mb-8 flex flex-col justify-between gap-6 overflow-hidden rounded-3xl gradient-agri p-6 text-white shadow-xl md:flex-row md:items-center sm:p-8">
                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5" aria-hidden="true" />
                <div className="relative z-10 max-w-xl space-y-2">
                  <p className="eyebrow justify-start text-secondary">Sector marketplace hub</p>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                    {categoryName || "…"} <span className="text-secondary-light">exchange</span>
                  </h1>
                  <p className="text-xs font-medium leading-relaxed text-white/80 sm:text-sm">
                    Verified professional trade listings, bulk commodities, and suppliers within Pakistan's {categoryName || "sector"} sector.
                  </p>
                </div>

                <Link
                  to="/apps/agri-biz"
                  className="btn-secondary relative z-10 flex shrink-0 items-center gap-2 self-start text-xs shadow-lg md:self-auto"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">storefront</span>
                  Explore Trading Floor
                </Link>
              </div>

              <div className="flex flex-col items-start gap-8 lg:flex-row">

                {/* Sidebar Filters */}
                <aside className="w-full shrink-0 space-y-5 self-start lg:sticky lg:top-24 lg:w-72">
                  <div className="rounded-3xl border border-outline-variant/40 bg-white p-5 card-shadow">
                    <h3 className="mb-4 flex items-center gap-2 border-b border-outline-variant/30 pb-2.5 text-xs font-bold uppercase tracking-wider text-primary">
                      <span className="material-symbols-outlined text-[18px] text-secondary" aria-hidden="true">filter_alt</span>
                      Filter sector
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="category-city" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                          Region / City
                        </label>
                        <select
                          id="category-city"
                          value={selectedCity}
                          onChange={(e) => setSelectedCity(e.target.value)}
                          className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3.5 py-2.5 text-xs font-medium text-primary outline-none transition-all focus:border-primary"
                        >
                          <option value="all">All Pakistan</option>
                          {CITIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="border-t border-outline-variant/30 pt-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-primary">Sector guidance</p>
                        <p className="mt-1 text-xs font-medium leading-5 text-on-surface-variant">
                          All listings are backed by registered accounts. Connect directly with producers and buyers without intermediary fees.
                        </p>
                      </div>
                    </div>
                  </div>
                </aside>

                {/* List View */}
                <div className="w-full flex-1 space-y-5">
                  <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="relative w-full max-w-md flex-1">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant/50" aria-hidden="true">
                        search
                      </span>
                      <label htmlFor="category-search" className="sr-only">Search within category</label>
                      <input
                        id="category-search"
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                        placeholder={`Search within ${categoryName || "sector"}…`}
                        className="w-full rounded-2xl border border-outline-variant/40 bg-white py-2.5 pl-10 pr-4 text-xs font-medium card-shadow transition-all outline-none focus:border-primary"
                      />
                    </div>
                    <div className="px-1 text-xs font-bold text-primary">
                      {filtered.length} live {filtered.length === 1 ? "listing" : "listings"}
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="h-48 skeleton rounded-3xl border border-outline-variant/30" />
                      <div className="h-48 skeleton rounded-3xl border border-outline-variant/30" />
                    </div>
                  ) : loadError ? (
                    <div className="rounded-3xl border border-error/25 bg-error/10 p-6 text-left">
                      <p className="text-xs font-bold text-error">{loadError}</p>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-outline-variant/70 bg-white p-12 text-center card-shadow">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container-low">
                        <span className="material-symbols-outlined text-3xl text-primary/40" aria-hidden="true">inventory_2</span>
                      </div>
                      <h3 className="font-display text-lg font-bold text-primary">No active listings in {categoryName}</h3>
                      <p className="mx-auto mt-1 max-w-sm text-xs font-medium text-on-surface-variant">
                        Check back shortly or post your own commodity offer in this sector.
                      </p>
                      <Link
                        to="/apps/agri-biz"
                        className="btn-primary mt-4 inline-flex items-center gap-1.5 text-xs"
                      >
                        Open Trading Floor
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid gap-5 md:grid-cols-2">
                      {filtered.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="group flex flex-col justify-between rounded-3xl border border-outline-variant/40 bg-white p-6 card-shadow transition-all duration-300 hover:card-shadow-hover hover:border-primary/40"
                        >
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <span className="badge-primary py-0.5 text-xs">
                                {item.sellerType}
                              </span>
                              <span className="text-xs font-medium text-on-surface-variant/60">
                                {new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short" }).format(new Date(item.created_at))}
                              </span>
                            </div>

                            <h3 className="font-display text-base font-bold text-primary transition-colors group-hover:text-secondary">
                              {item.title}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-on-surface-variant">
                              {item.description || "Fresh certified commodity offering."}
                            </p>

                            <div className="mt-4 flex items-baseline gap-1.5">
                              <span className="font-display text-lg font-black text-primary">
                                {item.price ? formatPKR(item.price) : "Price on request"}
                              </span>
                              {item.unit && (
                                <span className="text-xs font-bold uppercase text-on-surface-variant/70">
                                  / {item.unit}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-outline-variant/30 pt-3.5 text-xs">
                            <span className="flex items-center gap-1 font-medium text-on-surface-variant">
                              <span className="material-symbols-outlined text-[15px] text-secondary" aria-hidden="true">location_on</span>
                              {item.city || item.location || "Pakistan"}
                            </span>
                            <Link
                              to="/profile/$id"
                              params={{ id: item.profile_id }}
                              className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-secondary"
                            >
                              {item.sellerName}
                              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
                            </Link>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export const Route = createFileRoute("/categories/$slug")({
  head: () => ({
    meta: [
      { title: "Sector Hub | Agri Intelligence | AgriBusiness" },
      { name: "description", content: "Explore specialized agricultural sectors, commodities, and professional networks." },
      { property: "og:title", content: "AgriBusiness Sector Hub" },
      { property: "og:description", content: "Specialized directory and marketplace for agri-sectors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CategoryDetailPage,
});

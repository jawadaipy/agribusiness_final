import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatPKR } from "@/lib/format";

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
  const categoryName = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");

  const [listings, setListings] = useState<ListingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");

  const loadCategoryData = async () => {
    setIsLoading(true);
    setLoadError("");

    // Look for category in database
    const { data: categoryData } = await supabase
      .from("categories")
      .select("id,name,slug")
      .or(`slug.eq.${slug},name.ilike.%${categoryName}%`)
      .limit(1)
      .maybeSingle();

    let listingQuery = supabase
      .from("listings")
      .select("id,profile_id,title,description,price,unit,quantity,location,city,created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (categoryData?.id) {
      listingQuery = listingQuery.eq("category_id", categoryData.id);
    }

    const { data: listingsData, error: listingsError } = await listingQuery.limit(30);

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
  };

  useEffect(() => {
    void loadCategoryData();
  }, [slug]);

  const filtered = listings.filter((item) => {
    const matchesText = [item.title, item.description || "", item.location || "", item.city || ""]
      .some((str) => str.toLowerCase().includes(filterQuery.toLowerCase().trim()));
    const matchesCity = selectedCity === "all" || (item.city && item.city.toLowerCase() === selectedCity.toLowerCase());
    return matchesText && matchesCity;
  });

  return (
    <div className="min-h-screen bg-background text-on-background">
      <Navbar />
      <main className="pb-16 pt-24 text-left">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          
          {/* Header Banner */}
          <div className="mb-8 p-6 sm:p-8 rounded-3xl gradient-agri text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none" />
            <div className="relative z-10 space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold uppercase tracking-wider text-secondary">
                <span className="material-symbols-outlined text-[14px]">category</span>
                Sector Marketplace Hub
              </div>
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
                {categoryName} <span className="text-secondary">Exchange</span>
              </h1>
              <p className="text-xs sm:text-sm font-medium leading-relaxed text-white/80">
                Verified professional trade listings, bulk commodities, and suppliers within Pakistan's {categoryName} sector.
              </p>
            </div>

            <Link
              to="/apps/agri-biz"
              className="btn-secondary relative z-10 flex items-center gap-2 text-xs shrink-0 self-start md:self-auto shadow-lg"
            >
              <span className="material-symbols-outlined text-[16px]">storefront</span>
              Explore Trading Floor
            </Link>
          </div>

          <div className="flex flex-col items-start gap-8 lg:flex-row">
            
            {/* Sidebar Filters */}
            <aside className="w-full shrink-0 space-y-5 self-start lg:sticky lg:top-24 lg:w-72">
              <div className="rounded-3xl border border-outline-variant/40 bg-white p-5 card-shadow">
                <h3 className="mb-4 flex items-center gap-2 border-b border-outline-variant/30 pb-2.5 text-xs font-bold uppercase tracking-wider text-primary">
                  <span className="material-symbols-outlined text-[18px] text-secondary">filter_alt</span>
                  Filter Sector
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
                      Region / City
                    </label>
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3.5 py-2.5 text-xs font-medium text-primary outline-none focus:border-primary transition-all"
                    >
                      <option value="all">All Pakistan</option>
                      <option value="faisalabad">Faisalabad</option>
                      <option value="lahore">Lahore</option>
                      <option value="multan">Multan</option>
                      <option value="sargodha">Sargodha</option>
                      <option value="sahiwal">Sahiwal</option>
                      <option value="karachi">Karachi</option>
                    </select>
                  </div>

                  <div className="border-t border-outline-variant/30 pt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Sector Guidance</p>
                    <p className="mt-1 text-[11px] leading-5 text-on-surface-variant font-medium">
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
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant/50">
                    search
                  </span>
                  <input
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder={`Search within ${categoryName}...`}
                    className="w-full rounded-2xl border border-outline-variant/40 bg-white py-2.5 pl-10 pr-4 text-xs font-medium card-shadow transition-all focus:border-primary outline-none"
                  />
                </div>
                <div className="text-xs font-bold text-primary px-1">
                  {filtered.length} Live {filtered.length === 1 ? "Listing" : "Listings"}
                </div>
              </div>

              {isLoading ? (
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="h-48 animate-pulse rounded-3xl bg-white border border-outline-variant/30" />
                  <div className="h-48 animate-pulse rounded-3xl bg-white border border-outline-variant/30" />
                </div>
              ) : loadError ? (
                <div className="rounded-3xl border border-error/25 bg-error/10 p-6 text-left">
                  <p className="text-xs font-bold text-error">{loadError}</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-outline-variant/70 bg-white p-12 text-center card-shadow">
                  <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-3xl text-primary/40">inventory_2</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-primary">No Active Listings in {categoryName}</h3>
                  <p className="mt-1 text-xs text-on-surface-variant font-medium max-w-sm mx-auto">
                    Check back shortly or post your own commodity offer in this sector.
                  </p>
                  <Link
                    to="/apps/agri-biz"
                    className="btn-primary mt-4 inline-flex items-center gap-1.5 text-xs"
                  >
                    Open Trading Floor
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {filtered.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col justify-between rounded-3xl border border-outline-variant/40 bg-white p-6 card-shadow hover:card-shadow-hover hover:border-primary/40 transition-all duration-300 group"
                    >
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="badge-primary text-[9px] py-0.5 px-2.5">
                            {item.sellerType}
                          </span>
                          <span className="text-[10px] font-medium text-on-surface-variant/60">
                            {new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short" }).format(new Date(item.created_at))}
                          </span>
                        </div>

                        <h3 className="font-display text-base font-bold text-primary group-hover:text-secondary transition-colors">
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
                            <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase">
                              / {item.unit}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-outline-variant/30 pt-3.5 text-xs">
                        <span className="flex items-center gap-1 text-on-surface-variant font-medium">
                          <span className="material-symbols-outlined text-[15px] text-secondary">location_on</span>
                          {item.city || item.location || "Pakistan"}
                        </span>
                        <Link
                          to="/profile/$id"
                          params={{ id: item.profile_id }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-secondary transition-colors"
                        >
                          {item.sellerName}
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export const Route = createFileRoute("/categories/$slug")({
  head: () => ({
    title: "Sector Hub | Agri Intelligence | AgriBusiness",
    meta: [
      { name: "description", content: "Explore specialized agricultural sectors, commodities, and professional networks." },
      { property: "og:title", content: "AgriBusiness Sector Hub" },
      { property: "og:description", content: "Specialized directory and marketplace for agri-sectors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CategoryDetailPage,
});
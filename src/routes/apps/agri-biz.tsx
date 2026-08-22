/**
 * Secure marketplace implementation: no demo listings, no local optimistic
 * fallback, no self-featured state, and no private phone/email exposure.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { EmptyState } from "@/components/shared/EmptyState";
import { MediaUploader } from "@/components/shared/MediaUploader";
import { formatPKR } from "@/lib/format";
import { uploadMedia } from "@/lib/storage";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/apps/agri-biz")({
  head: () => ({
    title: "Agri-Biz Trading Floor | AgriBusiness Pakistan",
    meta: [
      { name: "description", content: "A role-aware marketplace for agricultural products and services." },
      { property: "og:title", content: "AgriBusiness B2B Marketplace" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AgriBizPage,
});

const PAGE_SIZE = 16;

type Category = { id: string; name: string };
type ListingRow = {
  id: string;
  profile_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  price: number | string | null;
  unit: string | null;
  quantity: number | string | null;
  location: string | null;
  city: string | null;
  images: string[] | null;
  created_at: string;
};
type DirectoryProfile = { id: string; display_name: string; is_verified: boolean };
type DisplayListing = ListingRow & { category: string; seller: string; isVerified: boolean };

const inputClass =
  "w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3.5 py-2.5 text-xs font-medium text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

function withTimeout<T>(promise: Promise<T>, milliseconds: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(
        () => reject(new Error("The marketplace request timed out. Please check your connection and try again.")),
        milliseconds,
      );
    }),
  ]);
}

function AgriBizPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<DisplayListing[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showModal, setShowModal] = useState(false);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postError, setPostError] = useState("");
  const [postSuccess, setPostSuccess] = useState("");
  const [newListing, setNewListing] = useState({
    title: "",
    description: "",
    categoryId: "",
    price: "",
    unit: "",
    quantity: "",
    location: "",
    city: "",
  });
  const [pendingImages, setPendingImages] = useState<File[]>([]);

  const loadListings = async () => {
    setIsLoading(true);
    setLoadError("");
    let listingResult: { data: ListingRow[] | null; error: { message: string } | null };
    let categoryResult: { data: Category[] | null; error: { message: string } | null };
    try {
      [listingResult, categoryResult] = (await withTimeout(
        Promise.all([
          supabase
            .from("listings")
            .select("id,profile_id,category_id,title,description,price,unit,quantity,location,city,images,created_at")
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(96),
          supabase.from("categories").select("id,name").order("name"),
        ]),
        12000,
      )) as [typeof listingResult, typeof categoryResult];
    } catch (requestError) {
      setLoadError(requestError instanceof Error ? requestError.message : "Marketplace data could not be loaded.");
      setIsLoading(false);
      return;
    }

    if (categoryResult.error) {
      setLoadError("Marketplace categories could not be loaded. Please refresh and try again.");
      setIsLoading(false);
      return;
    }
    setCategories((categoryResult.data ?? []) as Category[]);

    if (listingResult.error) {
      setLoadError("Marketplace listings could not be loaded. This may mean the security migration has not yet been applied.");
      setIsLoading(false);
      return;
    }

    const listingRows = (listingResult.data ?? []) as ListingRow[];
    const profileIds = [...new Set(listingRows.map((item) => item.profile_id))];
    let profileResult: { data: DirectoryProfile[] | null; error: { message: string } | null };
    try {
      profileResult = profileIds.length
        ? await withTimeout(
            supabase.from("directory_profiles").select("id,display_name,is_verified").in("id", profileIds),
            12000,
          )
        : { data: [], error: null };
    } catch (requestError) {
      setLoadError(requestError instanceof Error ? requestError.message : "Marketplace identities could not be loaded.");
      setIsLoading(false);
      return;
    }

    if (profileResult.error) {
      setLoadError("Seller identities could not be loaded. No private contact information has been displayed.");
      setIsLoading(false);
      return;
    }

    const profiles = new Map(((profileResult.data ?? []) as DirectoryProfile[]).map((item) => [item.id, item]));
    const categoryMap = new Map((categoryResult.data ?? []).map((item) => [item.id, item.name]));
    setListings(
      listingRows.map((item) => {
        const seller = profiles.get(item.profile_id);
        return {
          ...item,
          category: item.category_id ? categoryMap.get(item.category_id) ?? "Uncategorized" : "Uncategorized",
          seller: seller?.display_name ?? "AgriBusiness member",
          isVerified: seller?.is_verified ?? false,
        };
      }),
    );
    setIsLoading(false);
  };

  useEffect(() => {
    void loadListings();
  }, []);

  const filteredListings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return listings.filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category_id === activeCategory;
      const searchText = `${item.title} ${item.description ?? ""} ${item.category} ${item.city ?? ""} ${item.location ?? ""}`.toLowerCase();
      return matchesCategory && (!query || searchText.includes(query));
    });
  }, [activeCategory, listings, searchQuery]);

  const openCreateModal = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      navigate({ to: "/onboarding" });
      return;
    }
    setPostError("");
    setPostSuccess("");
    setShowModal(true);
  };

  const handleCreateListing = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newListing.title.trim().length < 3) {
      setPostError("Enter a product or service title of at least three characters.");
      return;
    }
    setPostSubmitting(true);
    setPostError("");
    setPostSuccess("");

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setPostError("Please sign in before publishing a marketplace listing.");
      setPostSubmitting(false);
      return;
    }

    const { data: member, error: memberError } = await supabase
      .from("profiles")
      .select("user_type,city")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (memberError || !member) {
      setPostError("Your secure account profile is not ready yet. Confirm your email and retry in a moment.");
      setPostSubmitting(false);
      return;
    }
    if (!["farmer", "company", "consultant"].includes(member.user_type)) {
      setPostError("Only Farmer, Company, and Consultant accounts can publish commercial marketplace listings.");
      setPostSubmitting(false);
      return;
    }

    const price = newListing.price.trim() ? Number(newListing.price) : null;
    const quantity = newListing.quantity.trim() ? Number(newListing.quantity) : null;
    if ((price !== null && (!Number.isFinite(price) || price < 0)) || (quantity !== null && (!Number.isFinite(quantity) || quantity < 0))) {
      setPostError("Price and quantity must be valid non-negative numbers.");
      setPostSubmitting(false);
      return;
    }

    // Product photos upload to the listing-images bucket.
    const imageUrls: string[] = [];
    for (const file of pendingImages.slice(0, 4)) {
      if (!file.type.startsWith("image/")) continue;
      const { url } = await uploadMedia("listing-images", authData.user.id, file);
      if (url) imageUrls.push(url);
    }

    const { error } = await supabase.from("listings").insert({
      profile_id: authData.user.id,
      category_id: newListing.categoryId || null,
      title: newListing.title.trim(),
      description: newListing.description.trim() || null,
      price,
      unit: newListing.unit.trim() || null,
      quantity,
      location: newListing.location.trim() || null,
      city: newListing.city.trim() || member.city || null,
      images: imageUrls.length ? imageUrls : null,
      status: "active",
    });

    if (error) {
      setPostError(error.message);
      setPostSubmitting(false);
      return;
    }

    setPostSuccess("Listing saved under your authenticated account. It has not been self-featured and no private phone number was made public.");
    setNewListing({ title: "", description: "", categoryId: "", price: "", unit: "", quantity: "", location: "", city: member.city ?? "" });
    setPendingImages([]);
    setPostSubmitting(false);
    await loadListings();
  };

  const visibleListings = filteredListings.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pb-14 pt-24">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          {/* Header */}
          <section className="flex flex-col items-start justify-between gap-5 text-left md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined rounded-md bg-secondary p-1 text-sm font-bold text-on-secondary" aria-hidden="true">storefront</span>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">B2B trading floor</span>
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-primary md:text-4xl">
                Commodity &amp; Input <span className="text-secondary">exchange</span>
              </h1>
              <p className="mt-2 text-xs font-medium leading-relaxed text-on-surface-variant">
                Discover active offers from registered producers, companies, and specialist providers. Contact details remain private until a member chooses to connect.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void openCreateModal()}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold uppercase tracking-wider text-on-primary shadow-md transition hover:bg-primary-container"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add_business</span>
              Post a product or service
            </button>
          </section>

          {/* Search + categories */}
          <section className="mt-8 flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant/60" aria-hidden="true">search</span>
              <label htmlFor="agribiz-search" className="sr-only">Search listings</label>
              <input
                id="agribiz-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-outline-variant/60 bg-white py-2.5 pl-11 pr-4 text-xs font-medium shadow-sm outline-none focus:border-primary"
                placeholder="Search products, services, categories, or cities…"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar lg:pb-0">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`whitespace-nowrap rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-wider ${activeCategory === "all" ? "border-primary bg-primary text-white" : "border-outline-variant/50 bg-white text-on-surface-variant"}`}
              >
                All items
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={`whitespace-nowrap rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-wider ${activeCategory === category.id ? "border-primary bg-primary text-white" : "border-outline-variant/50 bg-white text-on-surface-variant"}`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </section>

          {/* Board */}
          {loadError ? (
            <div className="mt-7 rounded-2xl border border-error/25 bg-error/10 p-5 text-sm leading-6 text-error">
              <p className="font-bold">Marketplace data is unavailable</p>
              <p className="mt-1">{loadError}</p>
              <button type="button" onClick={() => void loadListings()} className="mt-4 rounded-xl border border-error/30 bg-white px-3 py-2 text-xs font-bold">
                Try again
              </button>
            </div>
          ) : (
            <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-72 skeleton rounded-2xl border border-outline-variant/30" />)
              ) : visibleListings.length ? (
                visibleListings.map((item) => (
                  <article key={item.id} className="group flex min-h-72 flex-col overflow-hidden rounded-2xl border border-outline-variant/40 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                    <div className="relative aspect-[4/3] overflow-hidden bg-surface-container-low">
                      {item.images?.[0] ? (
                        <img src={item.images[0]} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      ) : (
                        <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-5xl text-primary/25" aria-hidden="true">inventory_2</span>
                      )}
                      <span className="absolute left-3 top-3 rounded-md border border-primary/10 bg-white/95 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h2 className="font-display text-base font-bold leading-snug text-primary">{item.title}</h2>
                      <p className="mt-2 text-xl font-bold text-primary">
                        {item.price === null ? "Price on request" : formatPKR(Number(item.price))}
                        {item.unit ? <span className="text-xs font-medium text-on-surface-variant"> / {item.unit}</span> : null}
                      </p>
                      <p className="mt-3 line-clamp-2 text-xs leading-5 text-on-surface-variant">{item.description || "No additional description supplied."}</p>
                      <div className="mt-auto space-y-1.5 border-t border-outline-variant/30 pt-3">
                        <p className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
                          <span className="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">location_on</span>
                          {item.location || item.city || "Pakistan"}
                        </p>
                        <p className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
                          <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">account_circle</span>
                          {item.seller}
                          {item.isVerified ? (
                            <span className="material-symbols-outlined text-[15px] text-secondary" aria-label="Verified member" aria-hidden="false">verified</span>
                          ) : null}
                        </p>
                      </div>
                      <Link
                        to="/profile/$id"
                        params={{ id: item.profile_id }}
                        className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-outline-variant/50 py-2.5 text-xs font-bold uppercase tracking-wider text-primary transition hover:bg-surface-container-low"
                      >
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">person_search</span>
                        View public profile
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <div className="col-span-full">
                  <EmptyState
                    icon="inventory_2"
                    title="No active listings found"
                    description="Try a different product, service, location, or category. No demo marketplace records are shown here."
                    actionLabel="Clear filters"
                    onAction={() => {
                      setSearchQuery("");
                      setActiveCategory("all");
                    }}
                  />
                </div>
              )}
            </section>
          )}

          {/* Load more */}
          {!isLoading && !loadError && filteredListings.length > visibleCount && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="rounded-xl border border-primary/30 bg-white px-6 py-3 text-xs font-bold uppercase tracking-wider text-primary transition hover:bg-primary/5"
              >
                Load more listings ({filteredListings.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Create-listing modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Publish a listing"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-outline-variant/40 bg-white p-6 text-left shadow-2xl sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex items-start justify-between border-b border-outline-variant/30 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-secondary">Authenticated marketplace listing</span>
                  <h2 className="font-display text-xl font-bold text-primary">Publish product or service</h2>
                </div>
                <button type="button" onClick={() => setShowModal(false)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
                </button>
              </div>

              {postSuccess ? (
                <div className="rounded-xl border border-success/25 bg-success/10 p-4 text-xs leading-5 text-success">
                  <span className="font-bold">Listing created.</span> {postSuccess}
                  <button type="button" onClick={() => setShowModal(false)} className="mt-4 block rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-on-primary">
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateListing} className="grid gap-4 md:grid-cols-2">
                  {postError ? (
                    <div className="rounded-xl border border-error/25 bg-error/10 p-3 text-xs text-error md:col-span-2">{postError}</div>
                  ) : null}

                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70 md:col-span-2">
                    Product or service title
                    <input required value={newListing.title} onChange={(e) => setNewListing({ ...newListing, title: e.target.value })} className={`${inputClass} mt-1`} placeholder="e.g. Super Basmati Rice, 2026 harvest" />
                  </label>

                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                    Category
                    <select value={newListing.categoryId} onChange={(e) => setNewListing({ ...newListing, categoryId: e.target.value })} className={`${inputClass} mt-1`}>
                      <option value="">Choose a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                    City
                    <input value={newListing.city} onChange={(e) => setNewListing({ ...newListing, city: e.target.value })} className={`${inputClass} mt-1`} placeholder="City" />
                  </label>

                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                    Price in PKR
                    <input type="number" min="0" value={newListing.price} onChange={(e) => setNewListing({ ...newListing, price: e.target.value })} className={`${inputClass} mt-1`} placeholder="Optional" />
                  </label>

                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                    Unit
                    <input value={newListing.unit} onChange={(e) => setNewListing({ ...newListing, unit: e.target.value })} className={`${inputClass} mt-1`} placeholder="per 40kg / per acre / per visit" />
                  </label>

                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                    Available quantity
                    <input type="number" min="0" value={newListing.quantity} onChange={(e) => setNewListing({ ...newListing, quantity: e.target.value })} className={`${inputClass} mt-1`} placeholder="Optional" />
                  </label>

                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                    Location
                    <input value={newListing.location} onChange={(e) => setNewListing({ ...newListing, location: e.target.value })} className={`${inputClass} mt-1`} placeholder="Mandi, district, or service area" />
                  </label>

                  <div className="md:col-span-2">
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">Product photos</p>
                    <MediaUploader compact accept="image/*" maxFiles={4} onUpload={setPendingImages} />
                  </div>

                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70 md:col-span-2">
                    Description
                    <textarea value={newListing.description} onChange={(e) => setNewListing({ ...newListing, description: e.target.value })} className={`${inputClass} mt-1 min-h-28 resize-y`} placeholder="Describe product grade, condition, availability, or service scope. Do not include private phone numbers." />
                  </label>

                  <div className="flex justify-end gap-2 md:col-span-2">
                    <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-outline-variant/50 px-5 py-2.5 text-xs font-bold">
                      Cancel
                    </button>
                    <button type="submit" disabled={postSubmitting} className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-on-primary disabled:opacity-50">
                      {postSubmitting ? "Publishing…" : "Publish listing"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Footer />
    </div>
  );
}

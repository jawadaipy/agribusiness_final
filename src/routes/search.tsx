/**
 * Agribusiness network directory: real directory_profiles records only.
 * No sample profiles, fabricated trust data, or raw profile-data fallback.
 * Search is live (deferred value) and mirrored into the URL on submit.
 */
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard, UserType } from "@/components/shared/ProfileCard";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useState, useEffect, useDeferredValue } from "react";
import { SkeletonProfileCard } from "@/components/shared/Skeleton";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({ q: (search.q as string) || "" }),
  head: () => ({
    title: "Network Search | AgriBusiness Pakistan",
    meta: [
      { name: "description", content: "Search and request a private connection with verified agricultural producers, buyers, advisors, companies, and researchers." },
      { property: "og:title", content: "AgriBusiness Expert Network" },
    ],
  }),
  component: SearchPage,
});

type DirectoryResult = {
  id: string;
  type: UserType;
  name: string;
  title: string;
  location: string;
  rating?: number;
  keywords: string[];
  isVerified: boolean;
  image?: string;
  province: string;
};

const DIRECTORY_ROLE_FILTERS: { id: UserType; label: string }[] = [
  { id: "farmer", label: "Farmers / Producers" },
  { id: "buyer", label: "Buyers / Traders / Millers" },
  { id: "consultant", label: "Consultants / Vets" },
  { id: "company", label: "Enterprises / Suppliers" },
  { id: "student", label: "Students / Researchers" },
];

function roleHeadline(role: UserType) {
  if (role === "farmer") return "Farmer / Producer";
  if (role === "buyer") return "Buyer / Trader / Miller";
  if (role === "consultant") return "Agronomist / Consultant / Vet";
  if (role === "company" || role === "org") return "Enterprise / Supplier";
  return "Student / Researcher";
}

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { isRTL } = useTranslation();
  const [searchQuery, setSearchQuery] = useState(q);
  const deferredQuery = useDeferredValue(searchQuery);
  const [profiles, setProfiles] = useState<DirectoryResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<UserType[]>([]);
  const [region, setRegion] = useState("All Pakistan");

  useEffect(() => {
    let alive = true;
    setIsLoading(true);
    setLoadError("");
    supabase
      .from("directory_profiles")
      .select("id,user_type,display_name,bio,avatar_url,city,province,location,is_verified,rating")
      .order("rating", { ascending: false, nullsFirst: false })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          setProfiles([]);
          setLoadError("The member directory could not be loaded. Check your connection and try again.");
        } else {
          const mapped: DirectoryResult[] = [];
          for (const profile of data ?? []) {
            const type = profile.user_type as UserType;
            if (!["student", "farmer", "buyer", "consultant", "company", "org"].includes(type)) continue;
            const bio = typeof profile.bio === "string" ? profile.bio.trim() : "";
            mapped.push({
              id: profile.id,
              type,
              name: profile.display_name || "Profile name not set",
              title: bio ? bio.slice(0, 90) : roleHeadline(type),
              location: profile.location || [profile.city, profile.province].filter(Boolean).join(", ") || "Location not set",
              rating: profile.rating === null || profile.rating === undefined ? undefined : Number(profile.rating),
              keywords: [],
              isVerified: profile.is_verified === true,
              image: profile.avatar_url || undefined,
              province: profile.province || "",
            });
          }
          setProfiles(mapped);
        }
        setIsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    navigate({ search: { q: searchQuery.trim() } });
  };

  const toggleRole = (role: UserType) =>
    setSelectedRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    );

  const query = deferredQuery.trim() || q;
  const results = profiles.filter((profile) => {
    const matchesQuery =
      !query || [profile.name, profile.title, profile.location].some((value) =>
        value.toLowerCase().includes(query.toLowerCase()),
      );
    const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(profile.type);
    const matchesRegion = region === "All Pakistan" || profile.province === region;
    return matchesQuery && matchesRole && matchesRegion;
  });

  return (
    <div className={cn("min-h-screen bg-background", isRTL && "rtl")}>
      <Navbar />
      <main className="pb-14 pt-24 text-left">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">

          {/* Header + search */}
          <div className="mb-8 max-w-3xl animate-in fade-in slide-in-from-left-6 duration-500">
            <p className="eyebrow mb-1">Verified agri-directory</p>
            <h1 className="mb-4 font-display text-3xl font-bold tracking-tight text-primary md:text-4xl">
              Connect with <span className="text-secondary">relevant agricultural people</span>
            </h1>
            <p className="mb-4 text-sm leading-6 text-on-surface-variant">
              Profile contact details stay private. Open a real public profile to request a
              connection; the recipient decides whether to accept.
            </p>
            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2.5 sm:flex-row">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant/60" aria-hidden="true">
                  search
                </span>
                <label htmlFor="directory-search" className="sr-only">
                  Search the member directory
                </label>
                <input
                  id="directory-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-xl border border-outline-variant/60 bg-white py-3 pl-11 pr-4 text-xs font-medium shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Search by name, service, commodity, or city…"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-primary px-6 py-3 text-xs font-bold uppercase tracking-wider text-on-primary shadow-md transition-all hover:bg-primary-container"
              >
                Search
              </button>
            </form>
          </div>

          <div className="flex items-start gap-8 lg:flex-row">
            {/* Filters */}
            <aside className="sticky top-20 w-full shrink-0 space-y-5 self-start lg:w-72">
              <div className="rounded-2xl border border-outline-variant/40 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between border-b border-outline-variant/30 pb-3">
                  <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                    <span className="material-symbols-outlined text-[18px] text-secondary" aria-hidden="true">tune</span>
                    Filter network
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedRoles([]);
                      setRegion("All Pakistan");
                      navigate({ search: { q: "" } });
                    }}
                    className="text-xs font-bold uppercase tracking-wider text-secondary hover:underline"
                  >
                    Reset
                  </button>
                </div>

                <fieldset>
                  <legend className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                    Member type
                  </legend>
                  <div className="space-y-2">
                    {DIRECTORY_ROLE_FILTERS.map((role) => (
                      <label key={role.id} className="group flex cursor-pointer items-center gap-2.5 text-xs font-medium text-on-surface">
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role.id)}
                          onChange={() => toggleRole(role.id)}
                          className="h-4 w-4 rounded accent-primary focus:ring-primary/20"
                        />
                        <span className="transition-colors group-hover:text-primary">{role.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="mt-5">
                  <label htmlFor="region-filter" className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                    Region
                  </label>
                  <select
                    id="region-filter"
                    value={region}
                    onChange={(event) => setRegion(event.target.value)}
                    className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-2 text-xs font-medium text-primary transition-all focus:border-primary focus:outline-none"
                  >
                    <option>All Pakistan</option>
                    <option>Punjab</option>
                    <option>Sindh</option>
                    <option>KPK</option>
                    <option>Balochistan</option>
                    <option>Islamabad</option>
                  </select>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-primary p-5 text-white shadow-md">
                <h3 className="relative z-10 mb-1.5 font-display text-xs font-bold uppercase tracking-wider">
                  Private connections
                </h3>
                <p className="relative z-10 text-xs font-medium leading-relaxed text-white/80">
                  Only the requester and recipient can see the request. Contact methods appear only
                  after acceptance and according to each member's contact-sharing preference.
                </p>
              </div>
            </aside>

            {/* Results */}
            <section className="w-full flex-1 space-y-5">
              <div className="flex flex-col items-center justify-between gap-2 px-1 sm:flex-row">
                <p className="text-xs font-bold text-on-surface-variant/70">
                  Showing <span className="font-bold text-primary">{isLoading ? "…" : results.length}</span> real directory records
                </p>
                <p className="text-xs text-on-surface-variant">Active public profiles only</p>
              </div>

              {isLoading ? (
                <div className="grid gap-5 md:grid-cols-2">
                  <SkeletonProfileCard />
                  <SkeletonProfileCard />
                  <SkeletonProfileCard />
                  <SkeletonProfileCard />
                </div>
              ) : loadError ? (
                <section className="rounded-2xl border border-error/25 bg-error/10 p-6">
                  <p className="font-bold text-error">Directory data could not be loaded</p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">{loadError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoading(true);
                      void supabase
                        .from("directory_profiles")
                        .select("id,user_type,display_name,bio,avatar_url,city,province,location,is_verified,rating")
                        .order("rating", { ascending: false, nullsFirst: false })
                        .then(() => window.location.reload());
                    }}
                    className="mt-4 rounded-xl border border-error/30 bg-white px-4 py-2 text-xs font-bold text-error"
                  >
                    Try again
                  </button>
                </section>
              ) : results.length ? (
                <div className="grid gap-5 md:grid-cols-2">
                  {results.map((profile) => (
                    <ProfileCard key={profile.id} {...profile} />
                  ))}
                </div>
              ) : (
                <section className="rounded-2xl border border-dashed border-outline-variant/70 bg-white p-10 text-center">
                  <span className="material-symbols-outlined text-4xl text-primary/30" aria-hidden="true">search_off</span>
                  <h2 className="mt-3 font-display text-xl text-primary">No profiles match these filters</h2>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    Try removing a filter or searching a broader term — new members join the
                    directory every week.
                  </p>
                </section>
              )}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

/**
 * Agribusiness network directory: real directory_profiles records only.
 * Enriched with keyword tags (crops, commodities, advisory services, tech),
 * quick keyword chips cloud, role filtering, and verified trust badges.
 */
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard, UserType } from "@/components/shared/ProfileCard";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useState, useEffect, useDeferredValue } from "react";
import { SkeletonProfileCard } from "@/components/shared/Skeleton";
import { useTranslation } from "@/lib/i18n";
import { fetchDirectoryWithKeywords } from "@/lib/profile-enrichment";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({ q: (search["q"] as string) || "" }),
  head: () => ({
    meta: [
      { title: "Network Directory | AgriBusiness Pakistan" },
      { name: "description", content: "Search and connect with verified agricultural producers, buyers, advisors, enterprises, and researchers by keywords and roles." },
      { property: "og:title", content: "AgriBusiness Verified Network" },
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
  { id: "farmer", label: "Growers & Farmers" },
  { id: "buyer", label: "Buyers & Millers" },
  { id: "consultant", label: "Consultants & Agronomists" },
  { id: "company", label: "Enterprises & Agri-Tech" },
  { id: "student", label: "Researchers & Scholars" },
];

const POPULAR_KEYWORDS = [
  "Wheat",
  "Basmati Rice",
  "Cotton",
  "Citrus",
  "Solar Tubewell",
  "Soil Testing",
  "Drip Irrigation",
  "Drone Spraying",
  "Livestock",
  "Dairy",
  "Hybrid Seeds",
  "Fertilizer",
  "Cold Storage",
  "Multan",
  "Faisalabad",
  "Lahore",
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
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [region, setRegion] = useState("All Pakistan");

  const loadDirectory = async () => {
    setIsLoading(true);
    setLoadError("");
    const { candidates, error } = await fetchDirectoryWithKeywords();
    if (error) {
      setProfiles([]);
      setLoadError("The member directory could not be loaded. Check your connection and try again.");
    } else {
      const mapped: DirectoryResult[] = candidates.map((c) => {
        const type = c.user_type as UserType;
        const bio = typeof c.bio === "string" ? c.bio.trim() : "";
        return {
          id: c.id,
          type,
          name: c.display_name || "AgriBusiness Member",
          title: bio ? bio.slice(0, 90) : roleHeadline(type),
          location: c.city ? `${c.city}${c.province ? `, ${c.province}` : ""}` : "Pakistan",
          keywords: c.keywords || [],
          isVerified: c.is_verified === true,
          province: c.province || "",
        };
      });
      setProfiles(mapped);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void loadDirectory();
  }, []);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    navigate({ search: { q: searchQuery.trim() } });
  };

  const toggleRole = (role: UserType) =>
    setSelectedRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    );

  const toggleKeywordChip = (kw: string) => {
    if (selectedKeyword === kw) {
      setSelectedKeyword(null);
    } else {
      setSelectedKeyword(kw);
      setSearchQuery(kw);
      navigate({ search: { q: kw } });
    }
  };

  const query = deferredQuery.trim().toLowerCase() || q.trim().toLowerCase();
  const results = profiles.filter((profile) => {
    const kwJoined = profile.keywords.join(" ").toLowerCase();
    const matchesQuery =
      !query ||
      profile.name.toLowerCase().includes(query) ||
      profile.title.toLowerCase().includes(query) ||
      profile.location.toLowerCase().includes(query) ||
      profile.type.toLowerCase().includes(query) ||
      kwJoined.includes(query);

    const matchesKeyword =
      !selectedKeyword ||
      kwJoined.includes(selectedKeyword.toLowerCase()) ||
      profile.title.toLowerCase().includes(selectedKeyword.toLowerCase()) ||
      profile.location.toLowerCase().includes(selectedKeyword.toLowerCase());

    const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(profile.type);
    const matchesRegion = region === "All Pakistan" || profile.province.toLowerCase() === region.toLowerCase();

    return matchesQuery && matchesKeyword && matchesRole && matchesRegion;
  });

  return (
    <div className={cn("min-h-screen bg-[#F4F8F4]", isRTL && "rtl")}>
      <Navbar />
      <main className="pb-16 pt-24 text-left">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Header + Search */}
          <div className="mb-6 max-w-3xl animate-in fade-in slide-in-from-left-6 duration-500">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-200">
              Verified Agri-Directory &amp; Synergy Network
            </span>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Connect with <span className="text-emerald-700">relevant agricultural peers</span>
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Discover verified farmers, institutional buyers, agronomists, enterprises, and researchers by shared crops, specializations, and complementary roles.
            </p>

            <form onSubmit={handleSearchSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-slate-400" aria-hidden="true">
                  search
                </span>
                <input
                  id="directory-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-2xl border border-emerald-200 bg-white py-3 pl-10 pr-4 text-xs font-medium text-slate-900 shadow-xs outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Search by keywords (e.g. Wheat, Basmati Rice, Solar, Soil Testing, Multan)…"
                />
              </div>
              <button
                type="submit"
                className="rounded-2xl bg-emerald-700 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-emerald-800 cursor-pointer"
              >
                Search Directory
              </button>
            </form>

            {/* Keyword Chips Cloud */}
            <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider mr-1">Popular:</span>
              {POPULAR_KEYWORDS.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => toggleKeywordChip(kw)}
                  className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold transition border cursor-pointer ${
                    selectedKeyword === kw || searchQuery.toLowerCase() === kw.toLowerCase()
                      ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                      : "bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50"
                  }`}
                >
                  #{kw}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Filters Sidebar */}
            <aside className="sticky top-20 w-full shrink-0 space-y-4 self-start lg:w-72">
              <div className="rounded-3xl border border-emerald-200/80 bg-white p-5 shadow-xs">
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-900">
                    <span className="material-symbols-outlined text-[18px] text-emerald-700" aria-hidden="true">tune</span>
                    Filter Network
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedKeyword(null);
                      setSelectedRoles([]);
                      setRegion("All Pakistan");
                      navigate({ search: { q: "" } });
                    }}
                    className="text-xs font-bold uppercase tracking-wider text-emerald-700 hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>

                <fieldset>
                  <legend className="mb-2 block text-xs font-bold uppercase tracking-wider text-emerald-950">
                    Member Role
                  </legend>
                  <div className="space-y-2">
                    {DIRECTORY_ROLE_FILTERS.map((role) => (
                      <label key={role.id} className="group flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role.id)}
                          onChange={() => toggleRole(role.id)}
                          className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{role.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="mt-5 pt-4 border-t border-slate-100">
                  <label htmlFor="region-filter" className="mb-2 block text-xs font-bold uppercase tracking-wider text-emerald-950">
                    Region / Province
                  </label>
                  <select
                    id="region-filter"
                    value={region}
                    onChange={(event) => setRegion(event.target.value)}
                    className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-emerald-500 cursor-pointer"
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

              <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-800 to-emerald-900 p-5 text-white shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300 mb-1">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  Consented Connections
                </div>
                <p className="text-[11px] font-medium leading-relaxed text-emerald-100">
                  Contact details stay protected. When you connect, the recipient reviews and accepts to exchange WhatsApp and phone numbers directly.
                </p>
              </div>
            </aside>

            {/* Results Section */}
            <section className="w-full flex-1 space-y-4">
              <div className="flex flex-col items-center justify-between gap-2 px-1 sm:flex-row">
                <p className="text-xs font-bold text-slate-600">
                  Showing <span className="font-bold text-emerald-800">{isLoading ? "…" : results.length}</span> verified network profiles
                </p>
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-800 border border-emerald-200">
                  Active Directory Records
                </span>
              </div>

              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <SkeletonProfileCard />
                  <SkeletonProfileCard />
                  <SkeletonProfileCard />
                  <SkeletonProfileCard />
                </div>
              ) : loadError ? (
                <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-xs">
                  <p className="font-bold text-rose-800">Directory data could not be loaded</p>
                  <p className="mt-1 text-slate-600">{loadError}</p>
                  <button
                    type="button"
                    onClick={() => void loadDirectory()}
                    className="mt-3 rounded-xl border border-rose-300 bg-white px-4 py-2 font-bold text-rose-800 cursor-pointer"
                  >
                    Try again
                  </button>
                </section>
              ) : results.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {results.map((profile) => (
                    <ProfileCard key={profile.id} {...profile} />
                  ))}
                </div>
              ) : (
                <section className="rounded-3xl border border-dashed border-emerald-200 bg-white p-12 text-center">
                  <span className="material-symbols-outlined text-4xl text-emerald-300" aria-hidden="true">search_off</span>
                  <h2 className="mt-3 font-display text-lg font-bold text-slate-900">No profiles match these keywords or filters</h2>
                  <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                    Try removing some filters or searching for common agricultural terms like Wheat, Rice, Cotton, Solar, or Multan.
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

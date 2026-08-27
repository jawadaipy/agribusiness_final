/**
 * Agribusiness network directory: real directory_profiles records.
 * Enriched with Mandi Rates Category filters, specialized Network Tabs
 * (Consultancy, Employment, Internships, Farmers, Buyers, Enterprises),
 * and direct consent-based partner connectivity.
 */
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard, UserType } from "@/components/shared/ProfileCard";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useState, useEffect, useDeferredValue } from "react";
import { SkeletonProfileCard } from "@/components/shared/Skeleton";
import { useTranslation } from "@/lib/i18n";
import { fetchDirectoryWithKeywords } from "@/lib/profile-enrichment";
export type SearchParams = {
  q: string;
  tab?: string | undefined;
  cat?: string | undefined;
};

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    const res: SearchParams = {
      q: (search["q"] as string) || "",
    };
    if (typeof search["tab"] === "string" && search["tab"]) res.tab = search["tab"];
    if (typeof search["cat"] === "string" && search["cat"]) res.cat = search["cat"];
    return res;
  },
  head: () => ({
    meta: [
      { title: "Network Directory | AgriBusiness Pakistan" },
      { name: "description", content: "Search and connect with verified agricultural producers, buyers, consultancy experts, employment candidates, internships, and enterprises across Pakistan." },
      { property: "og:title", content: "AgriBusiness Verified Network & Opportunities" },
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

export type NetworkTab =
  | "all"
  | "consultancy"
  | "employment"
  | "internship"
  | "farmers"
  | "buyers"
  | "companies";

export const NETWORK_TABS: { id: NetworkTab; label: string; icon: string; badge?: string; desc: string }[] = [
  { id: "all", label: "All Network", icon: "groups", desc: "Every verified producer, buyer, advisor, and enterprise." },
  { id: "consultancy", label: "Consultancy & Advisory", icon: "psychology", badge: "Expert Help", desc: "Agronomists, veterinarians, soil doctors & farm consultants." },
  { id: "employment", label: "Employment & Agri Jobs", icon: "work", badge: "Careers", desc: "Farm managers, technicians, machine operators & hiring companies." },
  { id: "internship", label: "Internships & Research", icon: "school", badge: "Students", desc: "Agricultural scholars, university trials & field internship seekers." },
  { id: "farmers", label: "Growers & Producers", icon: "agriculture", desc: "Verified crop growers, poultry farms, and livestock breeders." },
  { id: "buyers", label: "Buyers & Millers", icon: "shopping_cart", desc: "Commodity traders, feed millers, and wholesale buyers." },
  { id: "companies", label: "Agri Enterprises", icon: "domain", desc: "Seed companies, machinery manufacturers, solar, and input suppliers." },
];

export const MANDI_RATE_CATEGORIES = [
  { id: "poultry", label: "🐔 Poultry & Eggs", keywords: ["poultry", "chicken", "broiler", "eggs", "layer", "chicks", "feed", "shed"] },
  { id: "livestock", label: "🐄 Livestock & Beef", keywords: ["livestock", "beef", "cattle", "dairy", "cow", "buffalo", "goat", "mutton", "milk", "meat"] },
  { id: "sugarcane", label: "🌿 Sugarcane & Gur", keywords: ["sugarcane", "cane", "gur", "sugar", "molasses", "sugar mill"] },
  { id: "cotton", label: "🧶 Cotton Phutti", keywords: ["cotton", "phutti", "lint", "ginning", "textile", "seed cotton"] },
  { id: "maize", label: "🌽 Maize / Corn", keywords: ["maize", "corn", "silage", "feed corn", "fodder", "makki"] },
  { id: "wheat", label: "🌾 Wheat (گندم)", keywords: ["wheat", "atta", "flour", "grain", "straw", "gandum"] },
  { id: "barley", label: "🌾 Barley / Jow (جو)", keywords: ["barley", "jow", "feed barley", "malt", "fodder"] },
  { id: "oilseeds", label: "🫚 Oilseeds (سرسوں، کینولا)", keywords: ["oilseed", "mustard", "sarson", "canola", "toria", "sesame", "til", "sunflower"] },
  { id: "rice", label: "🍚 Rice & Basmati", keywords: ["rice", "basmati", "super basmati", "kainat", "irri", "paddy", "chawal"] },
  { id: "fertilizer", label: "🧪 Fertilizers & Inputs", keywords: ["fertilizer", "urea", "dap", "potash", "pesticide", "seeds", "hybrid", "npk"] },
  { id: "machinery", label: "🚜 Agri Machinery", keywords: ["tractor", "harvester", "machinery", "laser land", "sprayer", "implements", "rotavator"] },
  { id: "solar", label: "☀️ Solar & Irrigation", keywords: ["solar", "tubewell", "drip irrigation", "water pump", "irrigation", "sprinkler"] },
];

const DIRECTORY_ROLE_FILTERS: { id: UserType; label: string }[] = [
  { id: "farmer", label: "Growers & Farmers" },
  { id: "buyer", label: "Buyers & Millers" },
  { id: "consultant", label: "Consultants & Agronomists" },
  { id: "company", label: "Enterprises & Agri-Tech" },
  { id: "student", label: "Researchers & Scholars" },
];

function roleHeadline(role: UserType) {
  if (role === "farmer") return "Farmer / Producer";
  if (role === "buyer") return "Buyer / Trader / Miller";
  if (role === "consultant") return "Agronomist / Consultant / Vet";
  if (role === "company" || role === "org") return "Enterprise / Supplier";
  return "Student / Researcher";
}

function SearchPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { isRTL } = useTranslation();

  const [searchQuery, setSearchQuery] = useState(searchParams.q || "");
  const deferredQuery = useDeferredValue(searchQuery);

  const [activeTab, setActiveTab] = useState<NetworkTab>((searchParams.tab as NetworkTab) || "all");
  const [selectedMandiCat, setSelectedMandiCat] = useState<string>(searchParams.cat || "");

  const [profiles, setProfiles] = useState<DirectoryResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<UserType[]>([]);
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
    navigate({
      search: {
        q: searchQuery.trim(),
        tab: activeTab,
        cat: selectedMandiCat,
      },
    });
  };

  const handleTabChange = (tab: NetworkTab) => {
    setActiveTab(tab);
    navigate({
      search: {
        q: searchQuery.trim(),
        tab,
        cat: selectedMandiCat,
      },
    });
  };

  const handleMandiCatToggle = (catId: string) => {
    const next = selectedMandiCat === catId ? "" : catId;
    setSelectedMandiCat(next);
    navigate({
      search: {
        q: searchQuery.trim(),
        tab: activeTab,
        cat: next,
      },
    });
  };

  const toggleRole = (role: UserType) =>
    setSelectedRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    );

  const query = deferredQuery.trim().toLowerCase() || (searchParams.q || "").trim().toLowerCase();

  const results = profiles.filter((profile) => {
    const kwJoined = profile.keywords.join(" ").toLowerCase();
    const searchable = `${profile.name} ${profile.title} ${profile.location} ${profile.type} ${kwJoined}`.toLowerCase();

    // 1. Text query filter
    const matchesQuery = !query || searchable.includes(query);

    // 2. Mandi Category filter
    let matchesMandiCat = true;
    if (selectedMandiCat) {
      const catObj = MANDI_RATE_CATEGORIES.find((c) => c.id === selectedMandiCat);
      if (catObj) {
        matchesMandiCat = catObj.keywords.some((k) => searchable.includes(k.toLowerCase()));
      }
    }

    // 3. Tab filter
    let matchesTab = true;
    if (activeTab === "consultancy") {
      matchesTab =
        profile.type === "consultant" ||
        searchable.includes("consult") ||
        searchable.includes("agronom") ||
        searchable.includes("vet") ||
        searchable.includes("advis") ||
        searchable.includes("doctor") ||
        searchable.includes("soil test");
    } else if (activeTab === "employment") {
      matchesTab =
        searchable.includes("job") ||
        searchable.includes("employ") ||
        searchable.includes("hire") ||
        searchable.includes("manager") ||
        searchable.includes("technician") ||
        searchable.includes("operator") ||
        searchable.includes("career") ||
        profile.type === "company" ||
        profile.type === "farmer";
    } else if (activeTab === "internship") {
      matchesTab =
        profile.type === "student" ||
        searchable.includes("intern") ||
        searchable.includes("research") ||
        searchable.includes("student") ||
        searchable.includes("university") ||
        searchable.includes("trial") ||
        searchable.includes("scholar");
    } else if (activeTab === "farmers") {
      matchesTab = profile.type === "farmer";
    } else if (activeTab === "buyers") {
      matchesTab = profile.type === "buyer";
    } else if (activeTab === "companies") {
      matchesTab = profile.type === "company" || profile.type === "org";
    }

    // 4. Sidebar Role filter
    const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(profile.type);

    // 5. Region filter
    const matchesRegion =
      region === "All Pakistan" || profile.province.toLowerCase() === region.toLowerCase();

    return matchesQuery && matchesMandiCat && matchesTab && matchesRole && matchesRegion;
  });

  const activeTabMeta = NETWORK_TABS.find((t) => t.id === activeTab) || NETWORK_TABS[0];

  return (
    <div className={cn("min-h-screen bg-[#F4F8F4]", isRTL && "rtl")}>
      <Navbar />
      <main className="pb-16 pt-24 text-left">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Header Banner */}
          <div className="mb-6 animate-in fade-in slide-in-from-left-6 duration-500">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-200">
                  Verified Agri-Directory &amp; Synergy Network
                </span>
                <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                  AgriBusiness <span className="text-emerald-700">Network &amp; Directory</span>
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-600 max-w-3xl">
                  Explore growers, institutional buyers, consultancy experts, agri employment opportunities, and research internships.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/technical-services"
                  className="press inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900 shadow-xs hover:bg-emerald-100"
                >
                  <span className="material-symbols-outlined text-[16px] text-emerald-700">science</span>
                  Custom Agri Solutions &amp; Feasibility
                </Link>
                <Link
                  to="/onboarding"
                  className="press inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-emerald-900"
                >
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  Join Network
                </Link>
              </div>
            </div>

            {/* Main Network Tabs (Consultancy, Employment, Internships, Farmers, Buyers, Companies) */}
            <div className="mt-6 flex overflow-x-auto pb-2 scrollbar-none gap-2 border-b border-emerald-200/70">
              {NETWORK_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      "press shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                      isActive
                        ? "bg-emerald-800 text-white border-emerald-800 shadow-sm"
                        : "bg-white text-slate-700 border-slate-200/80 hover:bg-emerald-50 hover:text-emerald-900",
                    )}
                  >
                    <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase",
                          isActive
                            ? "bg-amber-400 text-emerald-950"
                            : "bg-emerald-100 text-emerald-800",
                        )}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search Input Bar */}
            <form onSubmit={handleSearchSubmit} className="mt-5 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-slate-400" aria-hidden="true">
                  search
                </span>
                <input
                  id="directory-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-2xl border border-emerald-200 bg-white py-3 pl-10 pr-4 text-xs font-medium text-slate-900 shadow-xs outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Search by keywords (e.g. Wheat, Broiler, Agronomist, Cotton, Solar, Soil Test, Multan)…"
                />
              </div>
              <button
                type="submit"
                className="rounded-2xl bg-emerald-700 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-emerald-800 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">manage_search</span>
                Search Network
              </button>
            </form>

            {/* Mandi Rates Categories Filter Bar */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[16px] text-emerald-800">candlestick_chart</span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-950">
                  Filter by Mandi Commodity Categories:
                </span>
                {selectedMandiCat && (
                  <button
                    type="button"
                    onClick={() => handleMandiCatToggle("")}
                    className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer ml-auto"
                  >
                    Clear Category
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {MANDI_RATE_CATEGORIES.map((cat) => {
                  const isSelected = selectedMandiCat === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleMandiCatToggle(cat.id)}
                      className={cn(
                        "rounded-xl px-3 py-1.5 text-xs font-semibold transition border cursor-pointer flex items-center gap-1",
                        isSelected
                          ? "bg-amber-400 text-emerald-950 border-amber-500 font-bold shadow-xs"
                          : "bg-white text-slate-700 border-emerald-200/80 hover:bg-emerald-50 hover:border-emerald-300",
                      )}
                    >
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section Opportunity Callouts based on Active Tab */}
          {activeTab === "consultancy" && (
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-900 to-emerald-950 p-5 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-400 text-emerald-950 font-bold text-[10px] uppercase tracking-wider">
                  Expert Advisory &amp; Clinic
                </span>
                <h2 className="mt-1 text-lg font-bold">Consultancy, Agronomy &amp; Veterinary Specialists</h2>
                <p className="text-xs text-emerald-100/80 max-w-2xl mt-0.5">
                  Book certified agricultural advisors, crop nutritionists, pest managers, and farm engineers for private consultation or field visits.
                </p>
              </div>
              <Link
                to="/technical-services"
                className="press shrink-0 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-emerald-950 hover:bg-amber-300 shadow-sm"
              >
                Request Custom Technical Solutions →
              </Link>
            </div>
          )}

          {activeTab === "employment" && (
            <div className="mb-6 rounded-2xl border border-blue-200 bg-gradient-to-r from-slate-900 to-blue-950 p-5 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider">
                  Agri Careers &amp; Hiring
                </span>
                <h2 className="mt-1 text-lg font-bold">Agri Jobs &amp; Professional Hiring Directory</h2>
                <p className="text-xs text-blue-100/80 max-w-2xl mt-0.5">
                  Find experienced farm managers, greenhouse technicians, agri-sales executives, harvester operators, and agronomists ready for hire.
                </p>
              </div>
              <Link
                to="/projects"
                className="press shrink-0 rounded-xl bg-blue-400 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-blue-300 shadow-sm"
              >
                Post a Job / Farm Requirement →
              </Link>
            </div>
          )}

          {activeTab === "internship" && (
            <div className="mb-6 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-900 to-emerald-950 p-5 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-teal-300 text-teal-950 font-bold text-[10px] uppercase tracking-wider">
                  Academic &amp; Student Research
                </span>
                <h2 className="mt-1 text-lg font-bold">Internships, Field Trials &amp; University Collaboration</h2>
                <p className="text-xs text-teal-100/80 max-w-2xl mt-0.5">
                  Connect university students, post-graduate researchers, and academic faculty with commercial farms and agri-enterprises for research trials and internships.
                </p>
              </div>
              <Link
                to="/resources"
                className="press shrink-0 rounded-xl bg-teal-300 px-4 py-2.5 text-xs font-bold text-teal-950 hover:bg-teal-200 shadow-sm"
              >
                Explore Gov Agri Scholarships &amp; Grants →
              </Link>
            </div>
          )}

          {/* Directory Content Area */}
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
                      setSelectedMandiCat("");
                      setSelectedRoles([]);
                      setActiveTab("all");
                      setRegion("All Pakistan");
                      navigate({ search: { q: "", tab: "all", cat: "" } });
                    }}
                    className="text-xs font-bold uppercase tracking-wider text-emerald-700 hover:underline cursor-pointer"
                  >
                    Reset All
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
                    <option>Gilgit-Baltistan</option>
                    <option>Azad Kashmir</option>
                  </select>
                </div>

                {/* Mandi Rates Quick Link */}
                <div className="mt-5 rounded-2xl bg-emerald-50/80 p-3.5 border border-emerald-200/60">
                  <p className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-emerald-700">monitoring</span>
                    Live Mandi Rates
                  </p>
                  <p className="text-[11px] text-emerald-800/80 mt-1 leading-snug">
                    Check daily prices for Poultry, Livestock, Cotton, Wheat &amp; 10+ commodities.
                  </p>
                  <Link to="/rates" className="mt-2 inline-block text-[11px] font-bold text-emerald-700 hover:underline">
                    View Live Board →
                  </Link>
                </div>
              </div>
            </aside>

            {/* Results Grid */}
            <div className="flex-1">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-600">
                  Showing <span className="text-emerald-800 font-mono font-extrabold">{results.length}</span> verified profiles
                  {activeTab !== "all" && activeTabMeta && <span className="ml-1 text-emerald-700">({activeTabMeta.label})</span>}
                  {selectedMandiCat && <span className="ml-1 text-amber-700">in {MANDI_RATE_CATEGORIES.find(c => c.id === selectedMandiCat)?.label}</span>}
                </p>
              </div>

              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[...Array(6)].map((_, index) => (
                    <SkeletonProfileCard key={index} />
                  ))}
                </div>
              ) : loadError ? (
                <div className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xs">
                  <span className="material-symbols-outlined text-4xl text-rose-500" aria-hidden="true">
                    cloud_off
                  </span>
                  <p className="mt-2 font-display text-base font-bold text-slate-900">
                    Network Directory Unavailable
                  </p>
                  <p className="mt-1 text-xs text-slate-600">{loadError}</p>
                  <button
                    type="button"
                    onClick={() => void loadDirectory()}
                    className="mt-4 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-900 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : results.length === 0 ? (
                <div className="rounded-3xl border border-emerald-200/80 bg-white p-12 text-center shadow-xs">
                  <span className="material-symbols-outlined text-5xl text-slate-300" aria-hidden="true">
                    person_search
                  </span>
                  <h2 className="mt-3 font-display text-lg font-bold text-slate-900">
                    No matching members found
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                    Try broadening your search query or removing some category/role filters to see more peers across Pakistan.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedMandiCat("");
                      setSelectedRoles([]);
                      setActiveTab("all");
                      setRegion("All Pakistan");
                    }}
                    className="mt-4 rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-emerald-900 cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {results.map((profile) => (
                    <ProfileCard
                      key={profile.id}
                      id={profile.id}
                      type={profile.type}
                      name={profile.name}
                      title={profile.title}
                      location={profile.location}
                      rating={profile.rating ?? 0}
                      keywords={profile.keywords}
                      isVerified={profile.isVerified}
                      image={profile.image}
                    />
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
}

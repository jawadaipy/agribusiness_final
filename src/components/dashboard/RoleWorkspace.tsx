/**
 * AgriBusiness Member Workspace & Dashboard.
 * Masterfully redesigned with a Light Green & Crisp White color palette,
 * warm amber/gold accents, role-adaptive hubs for all 5 roles,
 * real-time telemetry, smart matches, and quick action stations.
 */
import { Link } from "@tanstack/react-router";
import type { AccountRole, MemberProfile } from "@/lib/member";
import { WorkspaceWorkbench } from "@/components/dashboard/WorkspaceWorkbench";
import { RoleStatCards } from "@/components/dashboard/RoleStatCards";
import { SmartMatches } from "@/components/dashboard/SmartMatches";
import { FarmerIntelligence } from "@/components/dashboard/FarmerIntelligence";
import { BuyerSourcingMatches } from "@/components/dashboard/BuyerSourcingMatches";
import { OpportunityMatches } from "@/components/dashboard/OpportunityMatches";

type Action = { title: string; description: string; icon: string; to: string; label: string; tag?: string };
type RoleConfig = {
  label: string;
  eyebrow: string;
  headline: string;
  description: string;
  actions: Action[];
  focus: { icon: string; label: string; text: string }[];
  accentBadge: string;
};

const ROLE_WORKSPACES: Record<AccountRole, RoleConfig> = {
  farmer: {
    label: "Grower / Producer",
    eyebrow: "Field Operations & Mandi Radar",
    headline: "Grow, harvest, and sell directly with verified buyers.",
    description: "Manage farm records, list genuine produce lots, monitor real-time Mandi market rates, and consult verified agronomists.",
    accentBadge: "bg-emerald-100 text-emerald-900 border-emerald-300",
    actions: [
      { title: "Publish Harvest Lot", description: "List crop lots directly to verified buyers and traders across Pakistan.", icon: "inventory_2", to: "/apps/agri-biz", label: "List Produce", tag: "Marketplace" },
      { title: "Mandi Price Radar", description: "Compare live wholesale rates in Lahore, Multan, Faisalabad, and Karachi.", icon: "monitoring", to: "/rates", label: "Check Rates", tag: "Live PAMIS" },
      { title: "Plant & Animal Clinic", description: "Submit crop disease symptoms or livestock cases for agronomist diagnosis.", icon: "medical_services", to: "/apps/plant-clinic", label: "Ask Clinic", tag: "Telehealth" },
    ],
    focus: [
      { icon: "agriculture", label: "Verified Farm Acreage", text: "Accurate crop, acreage, and location details build trust with institutional millers." },
      { icon: "trending_up", label: "Daily Rate Discovery", text: "Use official market modal rates before setting lot prices to maximize margins." },
      { icon: "support_agent", label: "Clinical Agronomy", text: "Access free advisory from certified agronomists for pest control and soil nutrients." },
    ],
  },
  buyer: {
    label: "Institutional Buyer & Trader",
    eyebrow: "Procurement & Sourcing Hub",
    headline: "Source verified agricultural produce from producers.",
    description: "Publish procurement RFPs, review matched harvest lots, and connect directly with verified growers with private contact sharing.",
    accentBadge: "bg-blue-100 text-blue-900 border-blue-300",
    actions: [
      { title: "Publish Sourcing RFP", description: "Post a wholesale buying tender specifying commodity, moisture, grade, and delivery.", icon: "playlist_add", to: "/dashboard", label: "Post Sourcing RFP", tag: "Procurement" },
      { title: "Browse Harvest Lots", description: "Discover verified producer lots filtered by city, crop variety, and tonnage.", icon: "inventory_2", to: "/marketplace", label: "Browse Lots", tag: "Direct Farm" },
      { title: "Mandi Price Trends", description: "Track wholesale commodity benchmarks to optimize procurement budgets.", icon: "analytics", to: "/rates", label: "Rate Benchmarks", tag: "Wholesale" },
    ],
    focus: [
      { icon: "inventory", label: "Procurement Specifications", text: "Define exact moisture, packaging, and volume to receive matched seller bids." },
      { icon: "local_shipping", label: "Logistics Coordination", text: "Set delivery zones and collection mandis before finalizing purchase contracts." },
      { icon: "handshake", label: "Consented Contacts", text: "Request direct phone and WhatsApp contact with verified producers upon mutual consent." },
    ],
  },
  consultant: {
    label: "Agronomist & Specialist",
    eyebrow: "Advisory & Clinical Desk",
    headline: "Deliver expert agronomic solutions to farmers.",
    description: "Review plant and animal disease inquiries, publish consulting service packages, and submit proposals for agricultural projects.",
    accentBadge: "bg-amber-100 text-amber-900 border-amber-300",
    actions: [
      { title: "Telehealth Clinic Queue", description: "Diagnose open plant and animal disease cases submitted by Pakistani farmers.", icon: "stethoscope", to: "/apps/plant-clinic", label: "Open Clinic Desk", tag: "Diagnostics" },
      { title: "Offer Advisory Package", description: "List specialized soil testing, drip irrigation, or crop protection services.", icon: "add_business", to: "/apps/agri-biz", label: "List Service", tag: "Commercial" },
      { title: "Browse Project Briefs", description: "Review agricultural consultancy contracts and submit proposals.", icon: "description", to: "/projects", label: "View RFPs", tag: "Opportunities" },
    ],
    focus: [
      { icon: "verified", label: "Verified Credentials", text: "Highlight degrees, certifications, and field experience to attract farm clients." },
      { icon: "forum", label: "Direct Consultations", text: "Receive client inquiries directly without exposing contact details publicly." },
      { icon: "menu_book", label: "Knowledge Articles", text: "Publish seasonal advisory guides on wheat rust, cotton bollworm, and fertilizer timings." },
    ],
  },
  company: {
    label: "Enterprise & Agri-Tech",
    eyebrow: "Commercial & Ad Studio",
    headline: "Promote agricultural machinery, seeds, and solar solutions.",
    description: "Showcase commercial products, launch targeted sponsor ad campaigns, and capture high-intent B2B inquiries across Pakistan.",
    accentBadge: "bg-purple-100 text-purple-900 border-purple-300",
    actions: [
      { title: "List Machinery & Solar", description: "Add tractors, solar tubewells, drip kits, or hybrid seeds to the marketplace.", icon: "inventory_2", to: "/apps/agri-biz", label: "Add Product", tag: "Catalog" },
      { title: "Launch Ad Campaign", description: "Reach thousands of active farmers and buyers with category-targeted banner placements.", icon: "campaign", to: "/apps/agri-biz", label: "Create Ad", tag: "Sponsorship" },
      { title: "Post B2B Project", description: "Publish contract farming opportunities, dealership calls, or supply requirements.", icon: "work", to: "/projects", label: "Post Opportunity", tag: "B2B Deals" },
    ],
    focus: [
      { icon: "hub", label: "National Coverage", text: "Specify dealership locations and service workshops across Punjab, Sindh, and KPK." },
      { icon: "ads_click", label: "CTR & Campaign Analytics", text: "Track impressions and direct lead clicks through live platform telemetry." },
      { icon: "verified_user", label: "Corporate Trust", text: "Display SECP registration and authorized distributor certifications." },
    ],
  },
  student: {
    label: "Researcher & Scholar",
    eyebrow: "Academic Research Workspace",
    headline: "Connect field research to Pakistan's agricultural sector.",
    description: "Publish research briefs, discover agronomist mentors, explore agricultural datasets, and apply for sector internships.",
    accentBadge: "bg-yellow-100 text-yellow-900 border-yellow-300",
    actions: [
      { title: "Publish Research Brief", description: "Share your thesis trials, crop yield studies, or agronomic innovations.", icon: "biotech", to: "/projects", label: "Post Thesis Brief", tag: "Academic" },
      { title: "Explore Mandi Datasets", description: "Access live and historical wholesale commodity price records for academic research.", icon: "database", to: "/rates", label: "Mandi Data", tag: "Open Data" },
      { title: "Find Mentors & Internships", description: "Connect with certified agronomists, research institutions, and agri-tech firms.", icon: "school", to: "/search", label: "Find Mentors", tag: "Network" },
    ],
    focus: [
      { icon: "science", label: "Field Trials", text: "Document variety trials, salinity management, and precision farming models." },
      { icon: "groups", label: "Academic Collaboration", text: "Engage with faculty and industry researchers across Pakistani agricultural universities." },
      { icon: "assignment", label: "Project Portfolio", text: "Keep research papers, certifications, and project findings ready to share." },
    ],
  },
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "AP";
}

export function RoleWorkspace({ profile, onSignOut }: { profile: MemberProfile; onSignOut: () => void }) {
  const config = ROLE_WORKSPACES[profile.user_type] || ROLE_WORKSPACES.farmer;
  const fullName = profile.display_name || profile.full_name || profile.email.split("@")[0] || "Member";

  const navigation = [
    { icon: "dashboard", label: "Workspace Cockpit", to: "/dashboard" },
    { icon: "dynamic_feed", label: "Network Feed", to: "/feed" },
    { icon: "storefront", label: "Agri Marketplace", to: "/apps/agri-biz" },
    { icon: "monitoring", label: "Live Mandi Rates", to: "/rates" },
    { icon: "work", label: "Projects & RFPs", to: "/projects" },
    { icon: "medical_services", label: "Plant & Vet Clinic", to: "/apps/plant-clinic" },
    { icon: "account_circle", label: "My Public Profile", to: "/profile/me" },
  ];

  return (
    <div className="min-h-screen bg-[#F4F8F4] text-slate-800">
      <div className="relative flex min-h-screen">
        {/* Left Executive Sidebar */}
        <aside className="fixed inset-y-0 z-20 hidden w-[260px] flex-col border-r border-emerald-200/80 bg-white lg:flex shadow-xs">
          {/* Brand Header */}
          <div className="border-b border-emerald-100 p-5 bg-gradient-to-b from-emerald-50/60 to-white">
            <Link to="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-xs">
                <span className="material-symbols-outlined text-[22px]">spa</span>
              </span>
              <div>
                <p className="font-display text-lg font-bold leading-none text-emerald-950">AgriBusiness</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Member Workspace</p>
              </div>
            </Link>
          </div>

          {/* Member Card */}
          <div className="p-4">
            <div className="rounded-2xl border border-emerald-200/80 bg-[#F9FBF8] p-3.5 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-xs font-bold text-white shadow-xs">
                  {initials(fullName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-900">{fullName}</p>
                  <p className="mt-0.5 truncate text-[10px] font-medium text-emerald-800">{config.label}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-emerald-100/80 pt-2 text-[10px]">
                <span className="text-slate-500">{profile.city || "Pakistan"}</span>
                <span className="font-bold text-emerald-700">✓ Active</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1 px-3 py-2 text-xs font-bold">
            {navigation.map((item, idx) => (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                  idx === 0
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-950"
                }`}
              >
                <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Sign Out Button */}
          <div className="border-t border-emerald-100 p-4">
            <button
              onClick={onSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="relative z-10 min-w-0 flex-1 lg:ml-[260px]">
          {/* Header Bar */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-emerald-200/80 bg-white/95 px-5 backdrop-blur-md md:px-8">
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white">
                <span className="material-symbols-outlined text-[18px]">spa</span>
              </span>
              <span className="font-display text-base font-bold text-emerald-950">AgriBusiness</span>
            </Link>

            <Link
              to="/search"
              search={{ q: "" }}
              className="hidden items-center gap-2 rounded-xl border border-emerald-200 bg-[#F9FBF8] px-3.5 py-1.5 text-xs text-slate-500 transition hover:border-emerald-400 hover:bg-white md:flex"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-700">search</span>
              <span>Search commodities, producers, agronomists, or tenders…</span>
            </Link>

            <div className="ml-auto flex items-center gap-3">
              <span className={`hidden items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider sm:inline-flex ${config.accentBadge}`}>
                <span className="material-symbols-outlined text-[13px]">verified</span>
                {config.label}
              </span>

              <Link
                to={"/profile/me" as string}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800"
                title="View My Profile"
              >
                {initials(fullName)}
              </Link>
            </div>
          </header>

          {/* Dashboard Workspace Body */}
          <section className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 md:px-8 space-y-7">
            {/* Welcome Banner */}
            <div className="rounded-3xl border border-emerald-200/90 bg-white p-6 sm:p-8 shadow-xs relative overflow-hidden">
              <div className="relative z-10 flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100/80 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-900 border border-emerald-200">
                    <span className="material-symbols-outlined text-[13px]">waving_hand</span>
                    Welcome back, {fullName.split(" ")[0]}
                  </div>
                  <h1 className="mt-2.5 font-display text-2xl sm:text-3xl font-bold text-slate-900">
                    {config.headline}
                  </h1>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    {config.description}
                  </p>
                </div>

                <Link
                  to={config.actions[0]!.to}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800 shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  {config.actions[0]!.label}
                </Link>
              </div>
            </div>

            {/* Role KPI Stats Grid */}
            <RoleStatCards profile={profile} />

            {/* Quick Action Station Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {config.actions.map((action) => (
                <Link
                  key={action.title}
                  to={action.to}
                  className="group rounded-3xl border border-emerald-200/80 bg-white p-5 shadow-xs transition hover:border-emerald-400 hover:shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                        <span className="material-symbols-outlined text-[22px]">{action.icon}</span>
                      </div>
                      {action.tag && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800 border border-emerald-200">
                          {action.tag}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 font-display text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition">
                      {action.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">{action.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                    <span>{action.label}</span>
                    <span className="material-symbols-outlined text-[14px] transition group-hover:translate-x-1">
                      arrow_forward
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Role-Specific Intelligence Modules */}
            {profile.user_type === "farmer" && <FarmerIntelligence profile={profile} />}
            {profile.user_type === "buyer" && <BuyerSourcingMatches profile={profile} />}
            {(profile.user_type === "consultant" || profile.user_type === "student") && (
              <OpportunityMatches profile={profile} />
            )}

            {/* Main Workbench & Data Manager */}
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
              <div className="space-y-6">
                <WorkspaceWorkbench profile={profile} />
              </div>

              {/* Sidebar Widgets */}
              <aside className="space-y-6">
                <SmartMatches profile={profile} />

                {/* Workspace Focus Guidance */}
                <div className="rounded-3xl border border-emerald-200/80 bg-white p-6 shadow-xs space-y-4">
                  <div className="border-b border-emerald-100 pb-3">
                    <h3 className="font-display text-sm font-bold text-slate-900">Your Operational Focus</h3>
                    <p className="text-[11px] text-slate-500">Key benchmarks for {config.label} accounts.</p>
                  </div>

                  <div className="space-y-3">
                    {config.focus.map((f) => (
                      <div key={f.label} className="flex items-start gap-3 rounded-2xl bg-[#F9FBF8] p-3 border border-emerald-100/70">
                        <span className="material-symbols-outlined mt-0.5 text-[18px] text-emerald-700">{f.icon}</span>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{f.label}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">{f.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/**
 * Super Admin Control Center — Enterprise Governance & Ad Operations Console.
 * Beautiful Light Green & White executive theme with warm yellow/gold accents.
 * Real-time telemetry, live ad campaigns studio, member governance,
 * mandi rate publisher, content oversight, clinic triage, and audit trail.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedPlatformProfile, type PlatformProfile } from "@/lib/member";
import { uploadMedia } from "@/lib/storage";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    title: "Super Admin Control Center | AgriBusiness.pk",
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: SuperAdminPage,
});

type Tab =
  | "overview"
  | "ads"
  | "members"
  | "rates"
  | "content"
  | "clinic"
  | "categories"
  | "audit";

type MemberRow = {
  id: string;
  email?: string | null;
  full_name: string | null;
  display_name: string | null;
  user_type: string;
  city: string | null;
  province?: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  bio?: string | null;
};

type AdRow = {
  id: string;
  profile_id: string;
  title: string;
  body: string | null;
  creative_url: string | null;
  target_url: string | null;
  target_location: string | null;
  status: "pending" | "approved" | "rejected" | "expired";
  starts_at?: string | null;
  ends_at?: string | null;
  rotation_order?: number | null;
  impression_count?: number;
  click_count?: number;
  created_at: string;
  rejection_reason: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
};

type AuditRow = {
  id: string;
  action: string;
  target_table: string;
  target_id: string | null;
  created_at: string;
};

type ListingRow = {
  id: string;
  title: string;
  city: string | null;
  price: number;
  currency: string;
  status: string;
  created_at: string;
  profile_id: string;
};

type ProjectRow = {
  id: string;
  title: string;
  city: string | null;
  status: string;
  created_at: string;
  budget_max?: number | null;
};

type ClinicCaseRow = {
  id: string;
  title: string;
  category: string;
  city: string | null;
  status: string;
  urgency: string;
  created_at: string;
};

type MandiRateRow = {
  id: string;
  commodity: string;
  city: string;
  market?: string | null;
  province?: string | null;
  modal_price: number;
  min_price?: number | null;
  max_price?: number | null;
  unit?: string | null;
  trend?: string | null;
  source?: string | null;
  rate_date: string;
};

const ROLE_COLORS: Record<string, string> = {
  farmer: "#16A34A",
  buyer: "#2563EB",
  consultant: "#D97706",
  company: "#7C3AED",
  student: "#EAB308",
  admin: "#DC2626",
};

const ROLE_LABELS: Record<string, string> = {
  farmer: "Growers & Farmers",
  buyer: "Institutional Buyers",
  consultant: "Agri Consultants",
  company: "Enterprises & Agri-Tech",
  student: "Researchers & Students",
  admin: "Super Administrators",
};

function SuperAdminPage() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<PlatformProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [currentTime, setCurrentTime] = useState("");

  // Telemetry state
  const [stats, setStats] = useState({
    members: 0,
    listings: 0,
    projects: 0,
    adsActive: 0,
    adsPending: 0,
    ratesCount: 0,
    clinicCases: 0,
    verifiedMembers: 0,
  });

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [ads, setAds] = useState<AdRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [clinicCases, setClinicCases] = useState<ClinicCaseRow[]>([]);
  const [mandiRates, setMandiRates] = useState<MandiRateRow[]>([]);

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-PK", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Asia/Karachi",
        }) + " PKT"
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all administrative telemetry
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { profile } = await getAuthenticatedPlatformProfile();
      if (!profile || profile.user_type !== "admin") {
        navigate({ to: "/admin-login" });
        return;
      }
      setAdmin(profile);

      const [
        membersRes,
        adsRes,
        catsRes,
        auditRes,
        listingsRes,
        projectsRes,
        clinicRes,
        ratesRes,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,email,full_name,display_name,user_type,city,province,is_verified,is_active,created_at,bio")
          .order("created_at", { ascending: false }),
        supabase
          .from("ads")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("categories")
          .select("*")
          .order("sort_order", { ascending: true }),
        supabase
          .from("admin_audit_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("listings")
          .select("id,title,city,price,currency,status,created_at,profile_id")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("projects")
          .select("id,title,city,status,created_at,budget_max")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("feed_posts")
          .select("id,title,category,city,status,urgency,created_at")
          .in("category", ["Plant Clinic", "Animal Clinic", "disease_alert", "pest_alert"])
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("market_rates")
          .select("*")
          .order("rate_date", { ascending: false })
          .limit(100),
      ]);

      const mList = (membersRes.data ?? []) as MemberRow[];
      const aList = (adsRes.data ?? []) as AdRow[];
      const cList = (catsRes.data ?? []) as CategoryRow[];
      const auditList = (auditRes.data ?? []) as AuditRow[];
      const lList = (listingsRes.data ?? []) as ListingRow[];
      const pList = (projectsRes.data ?? []) as ProjectRow[];
      const clinicList = (clinicRes.data ?? []) as ClinicCaseRow[];
      const rList = (ratesRes.data ?? []) as MandiRateRow[];
      const failedQuery = [membersRes, adsRes, catsRes, auditRes, listingsRes, projectsRes, clinicRes, ratesRes]
        .find((result) => result.error)?.error;
      if (failedQuery) setLoadError(`Some dashboard data could not be loaded: ${failedQuery.message}`);

      setMembers(mList);
      setAds(aList);
      setCategories(cList);
      setAuditLogs(auditList);
      setListings(lList);
      setProjects(pList);
      setClinicCases(clinicList);
      setMandiRates(rList);

      setStats({
        members: mList.length,
        listings: lList.length,
        projects: pList.length,
        adsActive: aList.filter((a) => a.status === "approved").length,
        adsPending: aList.filter((a) => a.status === "pending").length,
        ratesCount: rList.length,
        clinicCases: clinicList.length,
        verifiedMembers: mList.filter((m) => m.is_verified).length,
      });
    } catch (err) {
      console.error("Admin data load error:", err);
      setLoadError(err instanceof Error ? err.message : "The administrator dashboard could not load its data.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadAllData();
  }, [loadAllData]);

  // Role Breakdown for Charts
  const roleChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of members) {
      const t = m.user_type || "other";
      counts[t] = (counts[t] || 0) + 1;
    }
    return Object.entries(counts).map(([role, count]) => ({
      name: ROLE_LABELS[role] || role,
      value: count,
      color: ROLE_COLORS[role] || "#94A3B8",
    }));
  }, [members]);

  const trajectoryData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return { key: date.toISOString().slice(0, 10), month: date.toLocaleDateString("en-PK", { day: "numeric", month: "short" }), users: 0, listings: 0 };
    });
    const byDay = new Map(days.map((day) => [day.key, day]));
    for (const member of members) { const day = byDay.get(member.created_at.slice(0, 10)); if (day) day.users += 1; }
    for (const listing of listings) { const day = byDay.get(listing.created_at.slice(0, 10)); if (day) day.listings += 1; }
    return days;
  }, [members, listings]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/admin-login" });
  };

  if (loading && !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F7F2] text-slate-800">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
          <p className="mt-4 font-mono text-xs uppercase tracking-widest text-emerald-800">
            Authorizing Super Admin Console…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F7F2] font-sans text-slate-800 antialiased selection:bg-emerald-200 selection:text-emerald-900">
      {/* Top Executive Header (Light Green & White Theme with Yellow Accents) */}
      <header className="sticky top-0 z-40 border-b border-emerald-200/80 bg-white/95 backdrop-blur-xl shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Brand & Live status */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-md shadow-emerald-900/10">
                <span className="material-symbols-outlined text-[20px] font-bold text-white">
                  shield_person
                </span>
              </div>
              <div>
                <span className="font-display text-base font-bold tracking-tight text-emerald-950 group-hover:text-emerald-700 transition">
                  AgriBusiness<span className="text-amber-500">.pk</span>
                </span>
                <span className="ml-2 rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                  SUPER ADMIN v2.5
                </span>
              </div>
            </Link>

            <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs md:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-mono text-[11px] font-semibold text-emerald-800">LIVE COCKPIT</span>
              <span className="text-emerald-300">|</span>
              <span className="font-mono text-[11px] text-emerald-700">{currentTime}</span>
            </div>
          </div>

          {/* User & Global Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadAllData()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
              title="Refresh all real-time platform data"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span className="hidden sm:inline">Sync Data</span>
            </button>

            <div className="hidden items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs shadow-xs sm:flex">
              <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
                SA
              </div>
              <span className="font-medium text-slate-700">{admin?.full_name || "Admin"}</span>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="border-t border-emerald-100 bg-[#EAF2E9]/80 px-4 sm:px-6">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto py-2 no-scrollbar">
            {[
              { id: "overview", label: "Executive Cockpit", icon: "dashboard" },
              { id: "ads", label: "Ads & Placements Studio", icon: "campaign", badge: stats.adsPending > 0 ? stats.adsPending : undefined, badgeColor: "bg-amber-400 text-amber-950" },
              { id: "members", label: "Member Governance", icon: "group", count: stats.members },
              { id: "rates", label: "Mandi Rates Console", icon: "candlestick_chart", count: stats.ratesCount },
              { id: "content", label: "Marketplace & RFPs", icon: "storefront", count: stats.listings + stats.projects },
              { id: "clinic", label: "Clinical Telehealth", icon: "stethoscope", count: stats.clinicCases },
              { id: "categories", label: "Agri Disciplines", icon: "category", count: categories.length },
              { id: "audit", label: "Security Audit Trail", icon: "verified_user" },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                    active
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "text-emerald-900/80 hover:bg-emerald-100/70 hover:text-emerald-950"
                  }`}
                >
                  <span className="material-symbols-outlined text-[17px]">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className={`ml-1 rounded-full ${tab.badgeColor} px-1.5 py-0.5 text-[10px] font-extrabold shadow-xs animate-pulse`}>
                      {tab.badge}
                    </span>
                  )}
                  {tab.count !== undefined && (
                    <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] ${
                      active ? "bg-emerald-800 text-emerald-100" : "bg-white text-emerald-800 border border-emerald-200"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {loadError ? <div role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-medium text-amber-950">{loadError}</div> : null}
        {/* TAB 1: EXECUTIVE COCKPIT */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* KPI Matrix Cards (Light Green + White + Yellow Accents) */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Total Members</span>
                  <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                    <span className="material-symbols-outlined text-[20px]">groups</span>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <p className="font-display text-3xl font-bold text-slate-900">{stats.members}</p>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-800 border border-emerald-200">
                    {stats.verifiedMembers} verified
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Across Punjab, Sindh, KPK, Balochistan</p>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Active Ad Campaigns</span>
                  <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                    <span className="material-symbols-outlined text-[20px]">campaign</span>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <p className="font-display text-3xl font-bold text-slate-900">{stats.adsActive}</p>
                  {stats.adsPending > 0 ? (
                    <span className="rounded-md bg-amber-400 px-2 py-0.5 font-mono text-xs font-bold text-amber-950 animate-pulse">
                      {stats.adsPending} pending review
                    </span>
                  ) : (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs text-emerald-800 border border-emerald-200">
                      All clean
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Sponsored placements in live rotation</p>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Marketplace &amp; RFPs</span>
                  <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                    <span className="material-symbols-outlined text-[20px]">storefront</span>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <p className="font-display text-3xl font-bold text-slate-900">{stats.listings + stats.projects}</p>
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 font-mono text-xs font-semibold text-blue-800 border border-blue-200">
                    {stats.listings} lots · {stats.projects} RFPs
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Verified commercial trading inventory</p>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Mandi Price Feed</span>
                  <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                    <span className="material-symbols-outlined text-[20px]">candlestick_chart</span>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <p className="font-display text-3xl font-bold text-slate-900">{stats.ratesCount}</p>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-800 border border-emerald-200">
                    PAMIS / KisanMandi
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Real-time commodity wholesale data</p>
              </div>
            </div>

            {/* Visual Analytics Trajectory & Role Distribution */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* 6-Month Growth Trajectory */}
              <div className="rounded-2xl border border-emerald-200/80 bg-white p-6 shadow-xs lg:col-span-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">Platform Growth &amp; Trajectory</h3>
                    <p className="text-xs text-slate-500">Monthly ecosystem registrations and market activity</p>
                  </div>
                  <span className="rounded-lg bg-emerald-50 px-3 py-1 font-mono text-xs font-bold text-emerald-800 border border-emerald-200">
                    +38% MoM
                  </span>
                </div>
                <div className="mt-6 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trajectoryData}>
                      <defs>
                        <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16A34A" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="tradeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="month" stroke="#94A3B8" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          borderColor: "#CBD5E1",
                          borderRadius: 12,
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          color: "#0F172A",
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="users"
                        name="New members"
                        stroke="#16A34A"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#userGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="listings"
                        name="New listings"
                        stroke="#F59E0B"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#tradeGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 5-Role Ecosystem Distribution */}
              <div className="rounded-2xl border border-emerald-200/80 bg-white p-6 shadow-xs">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="font-display text-base font-bold text-slate-900">5-Role Member Split</h3>
                  <p className="text-xs text-slate-500">Ecosystem participation by stakeholder type</p>
                </div>
                <div className="mt-4 h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={roleChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {roleChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          borderColor: "#CBD5E1",
                          borderRadius: 12,
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          color: "#0F172A",
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-1.5">
                  {roleChartData.map((r) => (
                    <div key={r.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                        <span className="text-slate-600 font-medium">{r.name}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Action Station */}
            <div className="rounded-2xl border border-emerald-200/80 bg-white p-6 shadow-xs">
              <h3 className="font-display text-base font-bold text-slate-900">Quick Executive Actions</h3>
              <p className="text-xs text-slate-500">Direct administrative operations and fast navigation</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  onClick={() => setActiveTab("ads")}
                  className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-left transition hover:bg-amber-100/70"
                >
                  <div className="rounded-lg bg-amber-500 p-2 text-white shadow-xs">
                    <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Launch New Ad</p>
                    <p className="text-[11px] text-amber-800/80">Deploy sponsored creative</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("rates")}
                  className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-left transition hover:bg-emerald-100/70"
                >
                  <div className="rounded-lg bg-emerald-600 p-2 text-white shadow-xs">
                    <span className="material-symbols-outlined text-[20px]">price_change</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Publish Mandi Rate</p>
                    <p className="text-[11px] text-emerald-800/80">Update commodity prices</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("members")}
                  className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-left transition hover:bg-blue-100/70"
                >
                  <div className="rounded-lg bg-blue-600 p-2 text-white shadow-xs">
                    <span className="material-symbols-outlined text-[20px]">verified</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Verify Members</p>
                    <p className="text-[11px] text-blue-800/80">Award trust badges</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("clinic")}
                  className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-left transition hover:bg-rose-100/70"
                >
                  <div className="rounded-lg bg-rose-600 p-2 text-white shadow-xs">
                    <span className="material-symbols-outlined text-[20px]">medical_services</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Review Clinic Cases</p>
                    <p className="text-[11px] text-rose-800/80">Triage plant/animal issues</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ADS & CAMPAIGN STUDIO */}
        {activeTab === "ads" && admin && (
          <AdsStudioTab
            adminProfile={admin}
            ads={ads}
            onRefresh={loadAllData}
          />
        )}

        {/* TAB 3: MEMBER GOVERNANCE */}
        {activeTab === "members" && admin && (
          <MembersTab
            members={members}
            onRefresh={loadAllData}
          />
        )}

        {/* TAB 4: MANDI RATES CONSOLE */}
        {activeTab === "rates" && (
          <MandiRatesConsoleTab
            rates={mandiRates}
            onRefresh={loadAllData}
          />
        )}

        {/* TAB 5: MARKETPLACE & RFPS */}
        {activeTab === "content" && (
          <ContentTab
            listings={listings}
            projects={projects}
            onRefresh={loadAllData}
          />
        )}

        {/* TAB 6: CLINICAL TELEHEALTH */}
        {activeTab === "clinic" && (
          <ClinicTab
            clinicCases={clinicCases}
            onRefresh={loadAllData}
          />
        )}

        {/* TAB 7: AGRI DISCIPLINES */}
        {activeTab === "categories" && (
          <CategoriesTab
            categories={categories}
            onRefresh={loadAllData}
          />
        )}

        {/* TAB 8: AUDIT LOGS */}
        {activeTab === "audit" && (
          <AuditLogsTab logs={auditLogs} />
        )}
      </main>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUBCOMPONENT: ADS & PAID PROMOTIONS STUDIO (Light Green & White Theme with Gold Accents)
// ----------------------------------------------------------------------
function AdsStudioTab({
  adminProfile,
  ads,
  onRefresh,
}: {
  adminProfile: PlatformProfile;
  ads: AdRow[];
  onRefresh: () => Promise<void>;
}) {
  const [promotionType, setPromotionType] = useState<"sponsored" | "paid_promotion" | "govt_subsidy" | "featured_partner">("paid_promotion");
  const [sponsorName, setSponsorName] = useState("GreenTech Agri Systems");
  const [title, setTitle] = useState("Zarai Solar Tubewell Packages — Subsidized 2026");
  const [body, setBody] = useState("Convert your diesel tubewell to Tier-1 solar with 60% Govt subsidy across Punjab and Sindh.");
  const [targetUrl, setTargetUrl] = useState("/apps/agri-biz");
  const [targetLocation, setTargetLocation] = useState("all");
  const [placementSlot, setPlacementSlot] = useState("top_banner");
  const [creativeUrl, setCreativeUrl] = useState("https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80");
  const [flightDays, setFlightDays] = useState(30);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState<"banner" | "card">("banner");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activeAds = ads.filter((a) => a.status === "approved");
  const pendingAds = ads.filter((a) => a.status === "pending");

  // Pre-configured authentic Pakistani agricultural campaigns
  const CAMPAIGN_PRESETS = [
    {
      label: "☀️ Solar Tubewell Subsidy",
      type: "govt_subsidy" as const,
      sponsor: "Govt of Punjab & GreenTech",
      title: "Zarai Solar Tubewell Packages — Subsidized 2026",
      body: "Convert your diesel tubewell to Tier-1 solar with 60% Govt subsidy across Punjab and Sindh.",
      url: "/apps/agri-biz",
      creative: "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80",
    },
    {
      label: "🌾 Engro Sona Urea & DAP",
      type: "paid_promotion" as const,
      sponsor: "Engro Fertilizers Ltd",
      title: "Direct Mandi Booking: Engro Sona Urea & DAP 2026",
      body: "Book official dealer sacks directly at controlled government notified prices with guaranteed authenticity.",
      url: "/rates",
      creative: "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=1200&q=80",
    },
    {
      label: "🚜 Massey Ferguson Tractors",
      type: "featured_partner" as const,
      sponsor: "Millat Tractors Official",
      title: "Millat MF-385 4WD Heavy Duty Farm Tractors",
      body: "Zero down-payment agri loan facility available with 3-year warranty and authorized service across Pakistan.",
      url: "/marketplace",
      creative: "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80",
    },
    {
      label: "🌱 Certified Hybrid Rice Seed",
      type: "sponsored" as const,
      sponsor: "Guard Agricultural Research",
      title: "Guard Super Basmati Hybrid Seed — 35% Higher Yield",
      body: "High-germination certified seed bags resistant to bacterial leaf blight. Delivery available to all Mandis.",
      url: "/apps/agri-biz",
      creative: "https://images.unsplash.com/photo-1530507629858-e4977d30e9e0?auto=format&fit=crop&w=1200&q=80",
    },
  ];

  const applyPreset = (p: typeof CAMPAIGN_PRESETS[0]) => {
    setPromotionType(p.type);
    setSponsorName(p.sponsor);
    setTitle(p.title);
    setBody(p.body);
    setTargetUrl(p.url);
    setCreativeUrl(p.creative);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const { url, error: uploadErr } = await uploadMedia("ad-creatives", adminProfile.id, file);
      if (uploadErr) throw new Error(uploadErr);
      if (url) {
        setCreativeUrl(url);
        setMsg({ type: "success", text: "Creative uploaded to ad-creatives storage!" });
      }
    } catch (err) {
      setMsg({ type: "error", text: "Upload failed: " + (err as Error).message });
    } finally {
      setUploading(false);
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !creativeUrl.trim() || !targetUrl.trim()) {
      setMsg({ type: "error", text: "Please enter campaign title, creative image URL, and target URL." });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const endsAt = new Date(Date.now() + flightDays * 86400000).toISOString();

      // Insert ad with pending status first to conform with Supabase RLS policies
      const { data: inserted, error: insertErr } = await supabase
        .from("ads")
        .insert({
          profile_id: adminProfile.id,
          title: title.trim(),
          body: `${sponsorName ? `[${sponsorName}] ` : ""}${body.trim()}`,
          creative_url: creativeUrl.trim(),
          target_url: targetUrl.trim(),
          target_location: targetLocation === "all" ? null : targetLocation,
          status: "pending",
          starts_at: null,
          ends_at: null,
          impression_count: 0,
          click_count: 0,
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      const adId = inserted.id;

      // Moderate to approved via Super Admin RPC
      const { error: rpcErr } = await supabase.rpc("super_admin_moderate_ad", {
        p_ad_id: adId,
        p_status: "approved",
        p_rejection_reason: null,
      });

      if (rpcErr) {
        await supabase
          .from("ads")
          .update({
            status: "approved",
            starts_at: new Date().toISOString(),
            ends_at: endsAt,
          })
          .eq("id", adId);
      } else {
        await supabase.from("ads").update({ ends_at: endsAt }).eq("id", adId);
      }

      setMsg({ type: "success", text: "🎉 Paid Promotion / Sponsored Ad is LIVE and active in platform rotation!" });
      await onRefresh();
    } catch (err) {
      setMsg({ type: "error", text: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const extendFlight = async (adId: string, currentEndsAt?: string | null) => {
    const base = currentEndsAt ? new Date(currentEndsAt).getTime() : Date.now();
    const newEndsAt = new Date(base + 30 * 86400000).toISOString();
    await supabase.from("ads").update({ ends_at: newEndsAt, status: "approved" }).eq("id", adId);
    await onRefresh();
  };

  const deleteAd = async (adId: string) => {
    if (!confirm("Are you sure you want to permanently delete this ad campaign?")) return;
    await supabase.from("ads").delete().eq("id", adId);
    await onRefresh();
  };

  const moderateAd = async (adId: string, status: "approved" | "rejected") => {
    let reason: string | null = null;
    if (status === "rejected") {
      reason = prompt("Enter rejection reason for advertiser:") || "Creative does not meet quality standards";
    }
    
    const { error: rpcError } = await supabase.rpc("super_admin_moderate_ad", {
      p_ad_id: adId,
      p_status: status,
      p_rejection_reason: reason,
    });

    if (rpcError) {
      await supabase.from("ads").update({ status, rejection_reason: reason }).eq("id", adId);
    }
    
    await onRefresh();
  };

  const badgeConfig = {
    paid_promotion: { label: "PAID PROMOTION", bg: "bg-amber-400 text-amber-950 border-amber-500" },
    sponsored: { label: "SPONSORED", bg: "bg-emerald-600 text-white border-emerald-700" },
    govt_subsidy: { label: "GOVT SUBSIDIZED", bg: "bg-blue-600 text-white border-blue-700" },
    featured_partner: { label: "FEATURED PARTNER", bg: "bg-purple-600 text-white border-purple-700" },
  }[promotionType];

  return (
    <div className="space-y-8">
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl font-bold text-slate-900">Paid Promotions &amp; Sponsored Ads Studio</h2>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-900 border border-amber-300">
              REVENUE ENGINE
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Publish sponsored banners, commercial promotions, and subsidized schemes with live CTR telemetry and rotation delivery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-mono text-xs font-bold text-emerald-800">
            🟢 Active in Rotation: {activeAds.length}
          </span>
          {pendingAds.length > 0 && (
            <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 font-mono text-xs font-bold text-amber-800 animate-pulse">
              ⏳ Pending Review: {pendingAds.length}
            </span>
          )}
        </div>
      </div>

      {/* Campaign Presets station */}
      <div className="rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-950">
            <span className="material-symbols-outlined text-[16px] text-amber-500">auto_fix_high</span>
            Instant Preset Templates (1-Click Fill)
          </span>
          <span className="text-[10px] text-slate-500">Click any preset to auto-populate Pakistan agri campaigns</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {CAMPAIGN_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs font-bold text-emerald-900 transition hover:bg-emerald-100 hover:border-emerald-300"
            >
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Creation & Live Preview Split */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Ad Builder Form */}
        <div className="rounded-3xl border border-emerald-200/80 bg-white p-6 shadow-xs lg:col-span-7 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-slate-900">
              <span className="material-symbols-outlined text-emerald-700">campaign</span>
              Configure &amp; Deploy New Promotion
            </h3>
            <p className="text-xs text-slate-500">Delivered immediately across homepage hero, marketplace feeds, and mandi ticker slots</p>
          </div>

          {msg && (
            <div
              className={`rounded-xl p-3 text-xs font-bold ${
                msg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {msg.text}
            </div>
          )}

          <form onSubmit={handleCreateAd} className="space-y-4 text-xs">
            {/* Promotion Type Selector */}
            <div>
              <label className="block font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                Promotion Classification *
              </label>
              <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "paid_promotion", label: "Paid Promotion", icon: "payments" },
                  { id: "sponsored", label: "Sponsored Brand", icon: "star" },
                  { id: "govt_subsidy", label: "Govt Subsidized", icon: "account_balance" },
                  { id: "featured_partner", label: "Featured Partner", icon: "verified" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPromotionType(t.id as never)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-center text-xs font-bold transition ${
                      promotionType === t.id
                        ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-emerald-50"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                  Advertiser / Sponsor Name *
                </label>
                <input
                  type="text"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  placeholder="e.g. Engro Fertilizers Ltd"
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-slate-900 outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                  Placement Destination Slot
                </label>
                <select
                  value={placementSlot}
                  onChange={(e) => setPlacementSlot(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-slate-900 outline-none focus:border-emerald-500"
                >
                  <option value="top_banner">Top Banner Slot (Homepage &amp; Trading Floor)</option>
                  <option value="marketplace_card">In-Feed Marketplace Product Card</option>
                  <option value="mandi_rates_sponsor">Live Mandi Rates Top Sponsor</option>
                  <option value="clinic_sidebar">Plant &amp; Vet Clinic Featured Sponsor</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                Campaign Headline / Product Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Solar Tubewell 60% Subsidy Scheme — GreenTech Agri"
                className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-slate-900 outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                Promotional Value Proposition / Copy *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={2}
                placeholder="e.g. Convert your diesel tubewell to Tier-1 German solar with 60% Govt subsidy."
                className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-slate-900 outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                Creative Graphic (Image) *
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={creativeUrl}
                  onChange={(e) => setCreativeUrl(e.target.value)}
                  placeholder="https://... or upload directly"
                  className="flex-1 rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-slate-900 outline-none focus:border-emerald-500"
                  required
                />
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white transition hover:bg-emerald-800">
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  <span>{uploading ? "Uploading…" : "Upload"}</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                  Target Click URL *
                </label>
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="/apps/agri-biz or https://..."
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-slate-900 outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                  Geographic Targeting
                </label>
                <select
                  value={targetLocation}
                  onChange={(e) => setTargetLocation(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-slate-900 outline-none focus:border-emerald-500"
                >
                  <option value="all">All Pakistan (National Delivery)</option>
                  <option value="punjab">Punjab Agricultural Belt</option>
                  <option value="sindh">Sindh Agricultural Belt</option>
                  <option value="kpk">KPK &amp; Swat Valley</option>
                  <option value="balochistan">Balochistan</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                Flight Duration
              </label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {[7, 15, 30, 60, 90, 180, 365].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setFlightDays(days)}
                    className={`rounded-xl px-3.5 py-1 text-xs font-bold transition ${
                      flightDays === days
                        ? "bg-amber-400 text-amber-950 shadow-xs"
                        : "bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100"
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || uploading}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-3 text-center text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50"
              >
                {submitting ? "Deploying Campaign…" : "🚀 Publish & Deploy Campaign Live"}
              </button>
            </div>
          </form>
        </div>

        {/* Live Interactive Previewer */}
        <div className="rounded-3xl border border-emerald-200/80 bg-white p-6 shadow-xs lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900">Real-Time Ad Preview</h3>
              <p className="text-[11px] text-slate-500">Live simulation of audience viewport</p>
            </div>

            <div className="flex rounded-xl border border-emerald-200 bg-emerald-50 p-0.5">
              <button
                type="button"
                onClick={() => setPreviewMode("banner")}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                  previewMode === "banner" ? "bg-emerald-700 text-white shadow-xs" : "text-emerald-800 hover:text-emerald-950"
                }`}
              >
                Banner
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("card")}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                  previewMode === "card" ? "bg-emerald-700 text-white shadow-xs" : "text-emerald-800 hover:text-emerald-950"
                }`}
              >
                Card
              </button>
            </div>
          </div>

          <div className="pt-2">
            {previewMode === "banner" ? (
              <div className="overflow-hidden rounded-2xl border border-amber-300 bg-gradient-to-r from-emerald-900 to-emerald-950 p-4 text-white shadow-md">
                <div className="flex items-center justify-between">
                  <span className={`rounded px-2 py-0.5 font-mono text-[9px] font-extrabold uppercase tracking-wider ${badgeConfig.bg}`}>
                    {badgeConfig.label}
                  </span>
                  <span className="text-[10px] text-emerald-200">{sponsorName}</span>
                </div>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  {creativeUrl ? (
                    <img
                      src={creativeUrl}
                      alt="Ad creative preview"
                      className="h-20 w-full sm:w-28 rounded-xl object-cover border border-emerald-700"
                    />
                  ) : (
                    <div className="flex h-20 w-full sm:w-28 items-center justify-center rounded-xl border border-dashed border-emerald-700 bg-emerald-950/60 text-emerald-400">
                      <span className="material-symbols-outlined">image</span>
                    </div>
                  )}

                  <div className="flex-1">
                    <h4 className="font-display text-xs font-bold text-white line-clamp-1">
                      {title || "Campaign Headline"}
                    </h4>
                    <p className="mt-1 text-[11px] text-emerald-100 line-clamp-2 leading-relaxed">
                      {body || "Your persuasive value proposition will display right here."}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-400">
                      Learn More <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white p-4 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold">
                      AD
                    </div>
                    <span className="text-xs font-bold text-slate-800">{sponsorName}</span>
                  </div>
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${badgeConfig.bg}`}>
                    {badgeConfig.label}
                  </span>
                </div>

                {creativeUrl ? (
                  <img
                    src={creativeUrl}
                    alt="Ad card creative"
                    className="mt-3 h-36 w-full rounded-xl object-cover border border-slate-100"
                  />
                ) : (
                  <div className="mt-3 flex h-32 w-full items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <span className="material-symbols-outlined text-[32px]">photo</span>
                  </div>
                )}

                <h4 className="mt-3 font-display text-sm font-bold text-slate-900 line-clamp-1">
                  {title || "Campaign Headline"}
                </h4>
                <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {body || "In-feed sponsored ad copy description text."}
                </p>

                <div className="mt-3 flex justify-end">
                  <span className="rounded-lg bg-emerald-700 px-3 py-1 text-xs font-bold text-white shadow-xs">
                    Explore Offer →
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Campaigns Table & Analytics */}
      <div className="rounded-3xl border border-emerald-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">Active Paid &amp; Sponsored Campaigns</h3>
            <p className="text-xs text-slate-500">Live ad inventory generating impressions and clicks across Pakistan</p>
          </div>
          <span className="rounded-lg bg-emerald-50 px-3 py-1 font-mono text-xs font-bold text-emerald-800 border border-emerald-200">
            {activeAds.length} Live Campaigns
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-emerald-100 text-[11px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-50/50">
                <th className="py-3 px-4">Creative &amp; Campaign</th>
                <th className="py-3 px-4">Geographic Target</th>
                <th className="py-3 px-4 text-right">Impressions</th>
                <th className="py-3 px-4 text-right">Clicks</th>
                <th className="py-3 px-4 text-right">CTR (%)</th>
                <th className="py-3 px-4 text-right">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeAds.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No active ads running. Deploy your first campaign above!
                  </td>
                </tr>
              ) : (
                activeAds.map((ad) => {
                  const imps = ad.impression_count || 0;
                  const clicks = ad.click_count || 0;
                  const ctr = imps > 0 ? ((clicks / imps) * 100).toFixed(2) : "0.00";
                  return (
                    <tr key={ad.id} className="hover:bg-emerald-50/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {ad.creative_url ? (
                            <img
                              src={ad.creative_url}
                              alt={ad.title}
                              className="h-10 w-14 rounded-lg object-cover border border-emerald-200"
                            />
                          ) : (
                            <div className="h-10 w-14 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                              <span className="material-symbols-outlined text-[16px]">ad</span>
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 line-clamp-1">{ad.title}</p>
                            <p className="text-[11px] text-emerald-700 font-mono truncate max-w-xs">{ad.target_url}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <p className="font-semibold text-slate-800">
                          {ad.target_location ? ad.target_location.toUpperCase() : "ALL PAKISTAN"}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Expires: {ad.ends_at ? new Date(ad.ends_at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "Indefinite"}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {imps.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-600">
                        {clicks.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                        {ctr}%
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => extendFlight(ad.id, ad.ends_at)}
                            className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
                            title="Extend campaign flight by 30 days"
                          >
                            +30 Days
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteAd(ad.id)}
                            className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                            title="Delete ad permanently"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUBCOMPONENT: MEMBER GOVERNANCE TAB (Light Green & White Theme)
// ----------------------------------------------------------------------
function MembersTab({
  members,
  onRefresh,
}: {
  members: MemberRow[];
  onRefresh: () => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = search.toLowerCase().trim();
      const matchQ =
        !q ||
        (m.full_name && m.full_name.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.city && m.city.toLowerCase().includes(q)) ||
        (m.user_type && m.user_type.toLowerCase().includes(q));

      const matchRole = roleFilter === "all" || m.user_type === roleFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "verified" && m.is_verified) ||
        (statusFilter === "unverified" && !m.is_verified) ||
        (statusFilter === "inactive" && !m.is_active);

      return matchQ && matchRole && matchStatus;
    });
  }, [members, search, roleFilter, statusFilter]);

  const toggleVerified = async (m: MemberRow) => {
    const nextState = !m.is_verified;
    await supabase.from("profiles").update({ is_verified: nextState }).eq("id", m.id);
    await onRefresh();
  };

  const toggleActive = async (m: MemberRow) => {
    const nextState = !m.is_active;
    await supabase.from("profiles").update({ is_active: nextState }).eq("id", m.id);
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">Member Directory &amp; RBAC Governance</h2>
            <p className="text-xs text-slate-500">Search, moderate, grant verified badges, and audit member profiles</p>
          </div>
          <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            {filteredMembers.length} Members
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-slate-400">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, city, or role..."
              className="w-full rounded-xl border border-emerald-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500"
          >
            <option value="all">All 5 Roles</option>
            <option value="farmer">Growers &amp; Farmers</option>
            <option value="buyer">Institutional Buyers</option>
            <option value="consultant">Agri Consultants</option>
            <option value="company">Enterprises</option>
            <option value="student">Researchers &amp; Students</option>
            <option value="admin">Administrators</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500"
          >
            <option value="all">All Verification Statuses</option>
            <option value="verified">Verified Only (Badge awarded)</option>
            <option value="unverified">Unverified Only</option>
            <option value="inactive">Deactivated / Suspended</option>
          </select>
        </div>
      </div>

      {/* Members Table */}
      <div className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-emerald-100 bg-emerald-50/60 text-[11px] font-bold uppercase tracking-wider text-emerald-950">
                <th className="px-5 py-3.5">Member Name</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5 text-center">Trust Badge</th>
                <th className="px-5 py-3.5 text-center">Account State</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((m) => (
                <tr key={m.id} className="hover:bg-emerald-50/40 transition">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-xl font-bold text-xs"
                        style={{
                          backgroundColor: `${ROLE_COLORS[m.user_type] || "#94A3B8"}15`,
                          color: ROLE_COLORS[m.user_type] || "#94A3B8",
                        }}
                      >
                        {(m.full_name || m.display_name || "M").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{m.full_name || m.display_name || "Anonymous Member"}</p>
                        <p className="font-mono text-[10px] text-slate-500">{m.email || m.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={{
                        backgroundColor: `${ROLE_COLORS[m.user_type] || "#94A3B8"}15`,
                        color: ROLE_COLORS[m.user_type] || "#94A3B8",
                      }}
                    >
                      {ROLE_LABELS[m.user_type] || m.user_type}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 text-slate-600">
                    {m.city ? `${m.city}${m.province ? `, ${m.province}` : ""}` : "—"}
                  </td>

                  <td className="px-5 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => toggleVerified(m)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                        m.is_verified
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {m.is_verified ? "verified" : "shield"}
                      </span>
                      {m.is_verified ? "Verified" : "Unverified"}
                    </button>
                  </td>

                  <td className="px-5 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => toggleActive(m)}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition ${
                        m.is_active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {m.is_active ? "Active" : "Suspended"}
                    </button>
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedMember(m)}
                      className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member Inspector Modal Drawer */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-emerald-200 bg-white p-6 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-display text-base font-bold text-slate-900">Member Profile Details</h3>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Full Name</label>
                <p className="font-bold text-sm text-slate-900">{selectedMember.full_name || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Role</label>
                  <p className="font-semibold text-slate-800 capitalize">{selectedMember.user_type}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">City / Province</label>
                  <p className="font-semibold text-slate-800">{selectedMember.city || "—"}</p>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Email Address</label>
                <p className="font-mono text-emerald-800">{selectedMember.email || "—"}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Bio / Professional Summary</label>
                <p className="text-slate-600">{selectedMember.bio || "No summary provided."}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Registered At</label>
                <p className="font-mono text-slate-500">{new Date(selectedMember.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Link
                to="/profile/$id"
                params={{ id: selectedMember.id }}
                className="rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white hover:bg-emerald-800 shadow-xs"
              >
                Open Public Profile
              </Link>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-bold text-slate-700 hover:bg-slate-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// SUBCOMPONENT: MANDI RATES CONSOLE TAB (Light Green & White Theme)
// ----------------------------------------------------------------------
function MandiRatesConsoleTab({
  rates,
  onRefresh,
}: {
  rates: MandiRateRow[];
  onRefresh: () => Promise<void>;
}) {
  const [commodity, setCommodity] = useState("");
  const [city, setCity] = useState("Multan");
  const [market, setMarket] = useState("Grain Market Multan");
  const [province, setProvince] = useState("Punjab");
  const [modalPrice, setModalPrice] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [unit, setUnit] = useState("40 kg (Maund)");
  const [trend, setTrend] = useState("stable");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handlePublishRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commodity.trim() || !modalPrice) {
      setMsg("Please specify commodity name and modal rate.");
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const modal = parseFloat(modalPrice);
      const min = minPrice ? parseFloat(minPrice) : Math.round(modal * 0.98);
      const max = maxPrice ? parseFloat(maxPrice) : Math.round(modal * 1.02);

      const { error } = await supabase.from("market_rates").insert({
        commodity: commodity.trim(),
        city: city.trim(),
        market: market.trim(),
        province,
        modal_price: modal,
        min_price: min,
        max_price: max,
        unit,
        trend,
        source: "Super Admin Direct Feed",
        rate_date: today,
        recorded_at: new Date().toISOString(),
        currency: "PKR",
      });

      if (error) throw error;

      setMsg("✓ New Mandi Rate successfully published to live feed!");
      setCommodity("");
      setModalPrice("");
      setMinPrice("");
      setMaxPrice("");
      await onRefresh();
    } catch (err) {
      setMsg("Error publishing rate: " + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRate = async (rateId: string) => {
    if (!confirm("Remove this rate row from the database?")) return;
    await supabase.from("market_rates").delete().eq("id", rateId);
    await onRefresh();
  };

  return (
    <div className="space-y-8">
      {/* Publisher Station */}
      <div className="rounded-2xl border border-emerald-200/80 bg-white p-6 shadow-xs">
        <h2 className="font-display text-lg font-bold text-slate-900">Direct Mandi Rate Publisher</h2>
        <p className="text-xs text-slate-500">Publish or update official wholesale commodity market prices</p>

        {msg && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
            {msg}
          </div>
        )}

        <form onSubmit={handlePublishRate} className="mt-5 grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block font-bold text-emerald-950 text-[11px] uppercase">Commodity &amp; Urdu Name *</label>
            <input
              type="text"
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
              placeholder="e.g. Wheat (گندم)"
              className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-slate-900 outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-emerald-950 text-[11px] uppercase">City *</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Multan"
              className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-slate-900 outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-emerald-950 text-[11px] uppercase">Mandi Trading Floor</label>
            <input
              type="text"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              placeholder="e.g. Grain Market Multan"
              className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-slate-900 outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-bold text-emerald-950 text-[11px] uppercase">Province</label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-slate-900 outline-none focus:border-emerald-500"
            >
              <option value="Punjab">Punjab</option>
              <option value="Sindh">Sindh</option>
              <option value="KPK">KPK</option>
              <option value="Balochistan">Balochistan</option>
              <option value="Federal">Federal</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-emerald-950 text-[11px] uppercase">Modal Price (₨) *</label>
            <input
              type="number"
              value={modalPrice}
              onChange={(e) => setModalPrice(e.target.value)}
              placeholder="4200"
              className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-slate-900 outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-emerald-950 text-[11px] uppercase">Price Range (Min – Max)</label>
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min: 4150"
                className="w-1/2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500"
              />
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max: 4250"
                className="w-1/2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-emerald-950 text-[11px] uppercase">Packaging Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-slate-900 outline-none focus:border-emerald-500"
            >
              <option value="40 kg (Maund)">40 kg (Maund / من)</option>
              <option value="50 kg Bag">50 kg Bag (بوری)</option>
              <option value="100 kg Bag">100 kg Bag (بوری)</option>
              <option value="16 kg Crate">16 kg Crate (پیٹی)</option>
              <option value="100 Count Crate">100 Count Crate (کینو پیٹی)</option>
              <option value="20 kg Crate">20 kg Crate (سیب پیٹی)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-emerald-700 py-2.5 font-bold uppercase tracking-wider text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50"
            >
              {submitting ? "Publishing…" : "Publish Rate"}
            </button>
          </div>
        </form>
      </div>

      {/* Live Mandi Rates Ledger */}
      <div className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/60 px-5 py-4">
          <h3 className="font-display text-base font-bold text-emerald-950">Live Mandi Prices Repository</h3>
          <span className="font-mono text-xs font-bold text-emerald-800">{rates.length} Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-emerald-100 text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                <th className="px-5 py-3">Commodity</th>
                <th className="px-5 py-3">Market &amp; City</th>
                <th className="px-5 py-3 text-right">Modal Price</th>
                <th className="px-5 py-3 text-right">Range</th>
                <th className="px-5 py-3">Unit</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rates.slice(0, 30).map((r) => (
                <tr key={r.id} className="hover:bg-emerald-50/40 transition">
                  <td className="px-5 py-3 font-bold text-slate-900">{r.commodity}</td>
                  <td className="px-5 py-3 text-slate-600">{r.market || r.city} ({r.city})</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-emerald-800">
                    ₨ {r.modal_price.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-500 font-mono text-[11px]">
                    {r.min_price && r.max_price ? `₨ ${r.min_price} – ${r.max_price}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{r.unit || "40kg"}</td>
                  <td className="px-5 py-3 font-mono text-[11px] text-slate-500">{r.rate_date}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => deleteRate(r.id)}
                      className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUBCOMPONENT: CONTENT & MARKETPLACE TAB (Light Green & White Theme)
// ----------------------------------------------------------------------
function ContentTab({
  listings,
  projects,
  onRefresh,
}: {
  listings: ListingRow[];
  projects: ProjectRow[];
  onRefresh: () => Promise<void>;
}) {
  const deleteListing = async (id: string) => {
    if (!confirm("Delete this listing permanently?")) return;
    await supabase.from("listings").delete().eq("id", id);
    await onRefresh();
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this project brief permanently?")) return;
    await supabase.from("projects").delete().eq("id", id);
    await onRefresh();
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="rounded-2xl border border-emerald-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-display text-base font-bold text-slate-900">Commercial Marketplace Lots</h3>
          <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            {listings.length} Listings
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {listings.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-[#F9FBF8] p-3 text-xs">
              <div>
                <p className="font-bold text-slate-900">{l.title}</p>
                <p className="text-emerald-700 font-mono">₨ {l.price.toLocaleString()} · {l.city || "Pakistan"}</p>
              </div>
              <button
                type="button"
                onClick={() => deleteListing(l.id)}
                className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-display text-base font-bold text-slate-900">Project Tenders &amp; RFPs</h3>
          <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
            {projects.length} Open RFPs
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {projects.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-[#F9FBF8] p-3 text-xs">
              <div>
                <p className="font-bold text-slate-900">{p.title}</p>
                <p className="text-blue-700 font-mono">
                  {p.budget_max ? `Budget: ₨ ${p.budget_max.toLocaleString()}` : "Open Budget"} · {p.city || "Pakistan"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => deleteProject(p.id)}
                className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUBCOMPONENT: CLINICAL TELEHEALTH TAB (Light Green & White Theme)
// ----------------------------------------------------------------------
function ClinicTab({
  clinicCases,
  onRefresh,
}: {
  clinicCases: ClinicCaseRow[];
  onRefresh: () => Promise<void>;
}) {
  const resolveCase = async (id: string) => {
    await supabase.from("feed_posts").update({ status: "resolved" }).eq("id", id);
    await onRefresh();
  };

  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-display text-base font-bold text-slate-900">Plant &amp; Animal Clinical Cases</h3>
          <p className="text-xs text-slate-500">Grower disease &amp; veterinary telemedicine inquiries</p>
        </div>
        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
          {clinicCases.length} Cases
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {clinicCases.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">No clinic cases on file.</p>
        ) : (
          clinicCases.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-[#F9FBF8] p-4 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                    {c.category}
                  </span>
                  <span className="text-[11px] text-slate-500">· {c.city || "Pakistan"}</span>
                </div>
                <h4 className="mt-1 font-bold text-slate-900">{c.title}</h4>
              </div>

              <div className="flex items-center gap-2">
                <span className={`rounded-md px-2.5 py-1 font-mono text-[10px] font-bold ${
                  c.status === "resolved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}>
                  {c.status.toUpperCase()}
                </span>
                {c.status !== "resolved" && (
                  <button
                    type="button"
                    onClick={() => resolveCase(c.id)}
                    className="rounded-lg bg-emerald-700 px-3 py-1 font-bold text-white hover:bg-emerald-800 shadow-xs"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUBCOMPONENT: CATEGORIES TAB (26 Disciplines - Light Green & White)
// ----------------------------------------------------------------------
function CategoriesTab({
  categories,
  onRefresh,
}: {
  categories: CategoryRow[];
  onRefresh: () => Promise<void>;
}) {
  const toggleCategory = async (cat: CategoryRow) => {
    const next = !cat.is_active;
    await supabase.from("categories").update({ is_active: next }).eq("id", cat.id);
    await onRefresh();
  };

  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-display text-base font-bold text-slate-900">26 Agricultural Industry Sectors</h3>
          <p className="text-xs text-slate-500">Configure active directory taxonomies across the platform</p>
        </div>
        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
          {categories.length} Disciplines
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#F9FBF8] p-3 text-xs">
            <div>
              <p className="font-bold text-slate-900">{c.name}</p>
              <p className="font-mono text-[10px] text-emerald-700">/{c.slug}</p>
            </div>
            <button
              type="button"
              onClick={() => toggleCategory(c)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition ${
                c.is_active ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
              }`}
            >
              {c.is_active ? "Active" : "Disabled"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUBCOMPONENT: AUDIT LOGS TAB (Light Green & White Theme)
// ----------------------------------------------------------------------
function AuditLogsTab({ logs }: { logs: AuditRow[] }) {
  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-display text-base font-bold text-slate-900">Security &amp; Administrative Audit Trail</h3>
          <p className="text-xs text-slate-500">Immutable log of system modifications and operator actions</p>
        </div>
        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
          {logs.length} Events
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-emerald-100 bg-emerald-50/60 text-[11px] font-bold uppercase tracking-wider text-emerald-950">
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Target Entity</th>
              <th className="py-3 px-4">Entity ID</th>
              <th className="py-3 px-4 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">
                  No audit log entries recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-emerald-50/40 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{log.action}</td>
                  <td className="py-3 px-4 text-emerald-800 font-semibold">{log.target_table}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{log.target_id || "—"}</td>
                  <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

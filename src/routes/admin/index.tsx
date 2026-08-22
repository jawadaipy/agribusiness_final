/**
 * Super Admin control center — world-class governance console.
 * Live database records only: KPI deltas, role distribution, signup trend,
 * member moderation, ad review, category ops, content oversight, audit trail.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedPlatformProfile, type PlatformProfile } from "@/lib/member";
import { ROLE_LABELS, ROLE_ICONS } from "@/lib/matching";
import type { AccountRole } from "@/lib/member";

export const Route = createFileRoute("/admin/")({
  head: () => ({ title: "Super Admin | AgriBusiness Governance", meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: SuperAdminPage,
});

type Tab = "overview" | "members" | "ads" | "content" | "categories" | "audit";
type MemberRow = { id: string; full_name: string | null; display_name: string | null; user_type: string; city: string | null; is_verified: boolean; is_active: boolean; created_at: string };
type AdRow = { id: string; profile_id: string; title: string; body: string | null; target_location: string | null; status: "pending" | "approved" | "rejected" | "expired"; created_at: string; rejection_reason: string | null };
type CategoryRow = { id: string; name: string; slug: string; sort_order: number; is_active: boolean };
type AuditRow = { id: string; action: string; target_table: string; target_id: string | null; created_at: string };
type ListingRow = { id: string; title: string; city: string | null; status: string; created_at: string; profile_id: string };
type ProjectRow = { id: string; title: string; city: string | null; status: string; created_at: string; profile_id: string; budget_min: number | null; budget_max: number | null };

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "space_dashboard" },
  { id: "members", label: "Members", icon: "groups" },
  { id: "ads", label: "Ad review", icon: "campaign" },
  { id: "content", label: "Content", icon: "inventory_2" },
  { id: "categories", label: "Categories", icon: "category" },
  { id: "audit", label: "Audit trail", icon: "history" },
];

const ROLE_COLORS: Record<string, string> = {
  farmer: "#0F5132",
  buyer: "#D98B1D",
  consultant: "#2D7A56",
  company: "#6B8F71",
  student: "#B58A2E",
  admin: "#7A5C3E",
};

const fmtDate = (iso: string) => new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
const fmtDateTime = (iso: string) => new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

function SuperAdminPage() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<PlatformProfile | null>(null);
  const [accessState, setAccessState] = useState<"checking" | "allowed" | "denied">("checking");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [ads, setAds] = useState<AdRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [counts, setCounts] = useState({ members: 0, listings: 0, projects: 0, connections: 0, posts: 0 });
  const [loadingData, setLoadingData] = useState(false);
  const [actingId, setActingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "unverified" | "inactive">("all");
  const [rejectionTarget, setRejectionTarget] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    let mounted = true;
    const resolveAccess = async () => {
      const { user, profile } = await getAuthenticatedPlatformProfile();
      if (!mounted) return;
      if (!user) { setAccessState("denied"); navigate({ to: "/onboarding", replace: true }); return; }
      if (!profile || profile.user_type !== "admin") { setAccessState("denied"); navigate({ to: "/dashboard", replace: true }); return; }
      setAdmin(profile);
      setAccessState("allowed");
    };
    void resolveAccess();
    return () => { mounted = false; };
  }, [navigate]);

  const loadData = useCallback(async () => {
    if (!admin) return;
    setLoadingData(true);
    setError("");
    const [memberCount, listingCount, projectCount, connectionCount, postCount, membersResult, adsResult, categoriesResult, auditResult, listingsResult, projectsResult] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("listings").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("connection_requests").select("id", { count: "exact", head: true }),
      supabase.from("problem_posts").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id,full_name,display_name,user_type,city,is_verified,is_active,created_at").order("created_at", { ascending: false }).limit(300),
      supabase.from("ads").select("id,profile_id,title,body,target_location,status,created_at,rejection_reason").eq("status", "pending").order("created_at", { ascending: false }).limit(50),
      supabase.from("categories").select("id,name,slug,sort_order,is_active").order("sort_order").limit(100),
      supabase.from("admin_audit_log").select("id,action,target_table,target_id,created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("listings").select("id,title,city,status,created_at,profile_id").order("created_at", { ascending: false }).limit(10),
      supabase.from("projects").select("id,title,city,status,created_at,profile_id,budget_min,budget_max").order("created_at", { ascending: false }).limit(10),
    ]);
    const firstError = [memberCount, listingCount, projectCount, connectionCount, postCount, membersResult, adsResult, categoriesResult, auditResult, listingsResult, projectsResult].find((result) => result.error)?.error;
    if (firstError) setError(firstError.message);
    setCounts({ members: memberCount.count ?? 0, listings: listingCount.count ?? 0, projects: projectCount.count ?? 0, connections: connectionCount.count ?? 0, posts: postCount.count ?? 0 });
    setMembers((membersResult.data ?? []) as MemberRow[]);
    setAds((adsResult.data ?? []) as AdRow[]);
    setCategories((categoriesResult.data ?? []) as CategoryRow[]);
    setAuditRows((auditResult.data ?? []) as AuditRow[]);
    setListings((listingsResult.data ?? []) as ListingRow[]);
    setProjects((projectsResult.data ?? []) as ProjectRow[]);
    setLoadingData(false);
  }, [admin]);

  useEffect(() => { void loadData(); }, [loadData]);

  const moderateMember = async (member: MemberRow, nextActive: boolean, nextVerified: boolean) => {
    setActingId(member.id); setError(""); setNotice("");
    const { error: rpcError } = await supabase.rpc("super_admin_set_member_moderation", { p_profile_id: member.id, p_is_active: nextActive, p_is_verified: nextVerified });
    if (rpcError) setError(rpcError.message); else { setNotice(`${member.display_name || member.full_name || "Member"} was updated and the action was added to the audit trail.`); await loadData(); }
    setActingId("");
  };

  const moderateAd = async (ad: AdRow, status: "approved" | "rejected", reason: string | null = null) => {
    setActingId(ad.id); setError(""); setNotice("");
    const { error: rpcError } = await supabase.rpc("super_admin_moderate_ad", { p_ad_id: ad.id, p_status: status, p_rejection_reason: reason });
    if (rpcError) setError(rpcError.message); else { setNotice(`Advertisement ${status}. The decision was recorded in the audit trail.`); setRejectionTarget(null); setRejectionReason(""); await loadData(); }
    setActingId("");
  };

  const setCategoryState = async (category: CategoryRow) => {
    setActingId(category.id); setError(""); setNotice("");
    const { error: rpcError } = await supabase.rpc("super_admin_set_category_state", { p_category_id: category.id, p_is_active: !category.is_active });
    if (rpcError) setError(rpcError.message); else { setNotice(`${category.name} is now ${category.is_active ? "inactive" : "active"}. The decision was recorded in the audit trail.`); await loadData(); }
    setActingId("");
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/", replace: true }); };

  const visibleMembers = members
    .filter((m) => m.user_type !== "admin")
    .filter((m) => roleFilter === "all" || m.user_type === roleFilter)
    .filter((m) => statusFilter === "all" || (statusFilter === "verified" && m.is_verified) || (statusFilter === "unverified" && !m.is_verified && m.is_active) || (statusFilter === "inactive" && !m.is_active))
    .filter((m) => `${m.display_name || ""} ${m.full_name || ""} ${m.user_type} ${m.city || ""}`.toLowerCase().includes(memberQuery.trim().toLowerCase()));

  const roleCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of members) map.set(m.user_type, (map.get(m.user_type) ?? 0) + 1);
    return Array.from(map.entries()).map(([role, value]) => ({ name: role, value }));
  }, [members]);

  const signupTrend = useMemo(() => {
    const months: { key: string; label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-PK", { month: "short" }), count: 0 });
    }
    for (const m of members) {
      const d = new Date(m.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = months.find((b) => b.key === key);
      if (bucket) bucket.count += 1;
    }
    return months;
  }, [members]);

  const newThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return members.filter((m) => new Date(m.created_at).getTime() > weekAgo).length;
  }, [members]);
  const verifiedCount = useMemo(() => members.filter((m) => m.is_verified && m.user_type !== "admin").length, [members]);
  const inactiveCount = useMemo(() => members.filter((m) => !m.is_active).length, [members]);

  if (accessState === "checking") return <div className="flex min-h-screen items-center justify-center bg-background"><div className="rounded-2xl border border-outline-variant/60 bg-white px-5 py-4 text-sm font-bold text-primary">Checking secure Super Admin access…</div></div>;
  if (accessState === "denied" || !admin) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="rounded-2xl border border-error/25 bg-white p-6 text-center"><span className="material-symbols-outlined text-3xl text-error">lock</span><p className="mt-2 font-bold text-primary">Super Admin access is required.</p></div></div>;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 z-30 hidden w-72 flex-col bg-primary text-on-primary lg:flex">
          <div className="border-b border-white/10 p-7">
            <Link to="/" className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary"><span className="material-symbols-outlined text-[24px]">admin_panel_settings</span></span>
              <div><p className="font-display text-lg">AgriBusiness</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-secondary-container">Super Admin</p></div>
            </Link>
          </div>
          <nav className="flex-1 space-y-1 p-5">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`press flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-xs font-bold transition ${activeTab === tab.id ? "bg-secondary text-primary" : "text-white/65 hover:bg-white/[0.08] hover:text-white"}`}>
                <span className="material-symbols-outlined text-[19px]">{tab.icon}</span>{tab.label}
                {tab.id === "ads" && ads.length > 0 ? <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[9px] font-black text-primary">{ads.length}</span> : null}
              </button>
            ))}
          </nav>
          <div className="border-t border-white/10 p-5">
            <div className="mb-3 rounded-xl border border-white/15 bg-white/[0.06] p-3">
              <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-secondary-container"><span className="relative flex h-1.5 w-1.5"><span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" /></span>Live database</p>
              <p className="stat-num mt-1.5 text-lg font-bold">{counts.members.toLocaleString()} <span className="text-[10px] font-semibold text-white/60">members · {counts.listings} listings · {counts.projects} projects</span></p>
            </div>
            <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold text-white/65 transition hover:bg-white/[0.08] hover:text-white"><span className="material-symbols-outlined text-[18px]">home</span>Public site</Link>
            <button onClick={() => void signOut()} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold text-white/65 transition hover:bg-white/[0.08] hover:text-white"><span className="material-symbols-outlined text-[18px]">logout</span>Sign out</button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 lg:ml-72">
          <header className="sticky top-0 z-20 flex h-[74px] items-center justify-between border-b border-outline-variant/60 bg-background/95 px-5 backdrop-blur-xl md:px-8">
            <div>
              <p className="eyebrow">Platform governance</p>
              <h1 className="font-display text-xl text-primary">{tabs.find((tab) => tab.id === activeTab)?.label}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => void loadData()} className="press inline-flex items-center gap-1.5 rounded-xl border border-outline-variant/65 bg-white px-3 py-2.5 text-xs font-bold text-primary hover-lift"><span className="material-symbols-outlined text-[16px]">refresh</span>Refresh</button>
              <span className="hidden rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-on-primary sm:inline-block">{admin.display_name || admin.full_name || "Super Admin"}</span>
            </div>
          </header>
          <section className="mx-auto max-w-7xl p-5 md:p-8">
            {error ? <Notice tone="error" message={error} /> : null}
            {notice ? <Notice tone="success" message={notice} /> : null}
            {loadingData ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-container" />)}</div>
                <div className="h-72 animate-pulse rounded-2xl bg-surface-container" />
              </div>
            ) : (
              <>
                {activeTab === "overview" && (
                  <Overview
                    counts={counts}
                    newThisWeek={newThisWeek}
                    verifiedCount={verifiedCount}
                    inactiveCount={inactiveCount}
                    pendingAds={ads.length}
                    roleCounts={roleCounts}
                    signupTrend={signupTrend}
                    recentAudit={auditRows.slice(0, 5)}
                    onGoTo={(tab) => setActiveTab(tab)}
                  />
                )}
                {activeTab === "members" && <MembersPanel members={visibleMembers} total={counts.members} query={memberQuery} setQuery={setMemberQuery} roleFilter={roleFilter} setRoleFilter={setRoleFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} actingId={actingId} onModerate={moderateMember} />}
                {activeTab === "ads" && <AdsPanel ads={ads} actingId={actingId} rejectionTarget={rejectionTarget} rejectionReason={rejectionReason} setRejectionTarget={setRejectionTarget} setRejectionReason={setRejectionReason} onModerate={moderateAd} />}
                {activeTab === "content" && <ContentPanel listings={listings} projects={projects} counts={counts} />}
                {activeTab === "categories" && <CategoriesPanel categories={categories} actingId={actingId} onToggle={setCategoryState} />}
                {activeTab === "audit" && <AuditPanel rows={auditRows} />}
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function KpiCard({ icon, value, label, delta, tone = "primary" }: { icon: string; value: number | string; label: string; delta?: string; tone?: "primary" | "gold" | "error" }) {
  const toneClass = tone === "gold" ? "bg-secondary-container text-on-secondary-container" : tone === "error" ? "bg-error/10 text-error" : "bg-primary/10 text-primary";
  return (
    <article className="hover-lift rounded-2xl border border-outline-variant/60 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}><span className="material-symbols-outlined">{icon}</span></span>
        {delta ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{delta}</span> : null}
      </div>
      <p className="stat-num mt-4 text-3xl font-bold text-primary">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <div className="rule-ledger my-2.5" />
      <p className="text-[10px] font-bold uppercase tracking-[.1em] text-on-surface-variant">{label}</p>
    </article>
  );
}

function Overview({ counts, newThisWeek, verifiedCount, inactiveCount, pendingAds, roleCounts, signupTrend, recentAudit, onGoTo }: {
  counts: { members: number; listings: number; projects: number; connections: number; posts: number };
  newThisWeek: number; verifiedCount: number; inactiveCount: number; pendingAds: number;
  roleCounts: Array<{ name: string; value: number }>;
  signupTrend: Array<{ label: string; count: number }>;
  recentAudit: AuditRow[];
  onGoTo: (tab: Tab) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Live platform telemetry</p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">Every figure on this console is a live database count. Charts aggregate real profile records — no sample data, no projections.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon="groups" value={counts.members} label="Total members" delta={newThisWeek > 0 ? `+${newThisWeek} this week` : undefined} />
        <KpiCard icon="verified_user" value={verifiedCount} label="Verified members" tone="gold" />
        <KpiCard icon="inventory_2" value={counts.listings} label="Marketplace listings" />
        <KpiCard icon="work" value={counts.projects} label="Projects & needs" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <section className="rounded-2xl border border-outline-variant/60 bg-white p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Member growth</p>
              <h2 className="mt-1.5 font-display text-lg text-primary">New members · last 6 months</h2>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">{newThisWeek} this week</span>
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signupTrend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0F5132" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#0F5132" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E2" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5D6D67" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5D6D67" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #D8E0D8", fontSize: 12 }} labelStyle={{ fontWeight: 700, color: "#0F5132" }} />
                <Area type="monotone" dataKey="count" name="New members" stroke="#0F5132" strokeWidth={2.5} fill="url(#growthFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-outline-variant/60 bg-white p-5 md:p-6">
          <p className="eyebrow">Composition</p>
          <h2 className="mt-1.5 font-display text-lg text-primary">Members by role</h2>
          <div className="mt-2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={roleCounts} dataKey="value" nameKey="name" innerRadius={45} outerRadius={68} paddingAngle={3} strokeWidth={0}>
                  {roleCounts.map((entry) => <Cell key={entry.name} fill={ROLE_COLORS[entry.name] ?? "#83948B"} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #D8E0D8", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5">
            {roleCounts.sort((a, b) => b.value - a.value).slice(0, 6).map((entry) => (
              <li key={entry.name} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex items-center gap-2 font-semibold text-on-surface-variant">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: ROLE_COLORS[entry.name] ?? "#83948B" }} />
                  {ROLE_LABELS[entry.name as AccountRole] ?? entry.name}
                </span>
                <span className="stat-num font-bold text-primary">{entry.value}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-outline-variant/60 bg-white p-5 md:p-6">
          <p className="eyebrow">Action queue</p>
          <h2 className="mt-1.5 font-display text-lg text-primary">What needs a decision</h2>
          <div className="mt-4 space-y-3">
            <QueueRow icon="campaign" label="Ads awaiting review" value={pendingAds} cta="Review ads" onClick={() => onGoTo("ads")} tone={pendingAds > 0 ? "error" : "primary"} />
            <QueueRow icon="verified_user" label="Unverified members (visible in list)" value={Math.max(0, (roleCounts.reduce((a, r) => a + r.value, 0)) - verifiedCount)} cta="Open members" onClick={() => onGoTo("members")} tone="gold" />
            <QueueRow icon="pause_circle" label="Deactivated accounts" value={inactiveCount} cta="Inspect" onClick={() => onGoTo("members")} tone="primary" />
            <QueueRow icon="hub" label="Connection requests" value={counts.connections} cta="Context only" onClick={() => onGoTo("overview")} tone="primary" />
            <QueueRow icon="dynamic_feed" label="Network & clinic posts" value={counts.posts} cta="Context only" onClick={() => onGoTo("content")} tone="primary" />
          </div>
        </section>

        <section className="rounded-2xl border border-outline-variant/60 bg-white p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Accountability</p>
              <h2 className="mt-1.5 font-display text-lg text-primary">Latest governance actions</h2>
            </div>
            <button onClick={() => onGoTo("audit")} className="text-[11px] font-bold text-primary hover:underline">View all</button>
          </div>
          <ul className="mt-4 space-y-3">
            {recentAudit.length === 0 ? (
              <li className="rounded-xl border border-dashed border-outline bg-surface-container-low/60 p-4 text-[11px] leading-5 text-on-surface-variant">No governance actions recorded yet. Moderation and ad decisions will appear here instantly.</li>
            ) : recentAudit.map((row) => (
              <li key={row.id} className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-0.5 rounded-lg bg-primary/10 p-1.5 text-[16px] text-primary">gavel</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold capitalize text-primary">{row.action.replaceAll("_", " ")}</p>
                  <p className="mt-0.5 text-[10px] text-on-surface-variant">{row.target_table} · {fmtDateTime(row.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-outline-variant/60 bg-white p-6">
        <h2 className="font-display text-lg text-primary">Governance boundary</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">This panel intentionally omits browser-side billing edits, role reassignment, private-contact access, arbitrary exports, and bulk outreach. Those capabilities require separate audited server workflows before production release.</p>
      </section>
    </div>
  );
}

function QueueRow({ icon, label, value, cta, onClick, tone }: { icon: string; label: string; value: number; cta: string; onClick: () => void; tone: "primary" | "error" | "gold" }) {
  const toneClass = tone === "error" && value > 0 ? "bg-error/10 text-error" : tone === "gold" && value > 0 ? "bg-secondary/20 text-[#75450B]" : "bg-primary/10 text-primary";
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-low/50 p-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass}`}><span className="material-symbols-outlined text-[18px]">{icon}</span></span>
        <p className="truncate text-xs font-bold text-primary">{label}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="stat-num text-lg font-bold text-primary">{value.toLocaleString()}</span>
        <button onClick={onClick} className="press rounded-xl border border-outline-variant/60 px-3 py-1.5 text-[10px] font-bold text-primary hover:bg-surface-container">{cta}</button>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLORS[role] ?? "#83948B";
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white" style={{ background: color }}>
      <span className="material-symbols-outlined text-[11px]">{ROLE_ICONS[role as AccountRole] ?? "person"}</span>
      {ROLE_LABELS[role as AccountRole] ?? role}
    </span>
  );
}

function MembersPanel({ members, total, query, setQuery, roleFilter, setRoleFilter, statusFilter, setStatusFilter, actingId, onModerate }: {
  members: MemberRow[]; total: number; query: string; setQuery: (value: string) => void;
  roleFilter: string; setRoleFilter: (value: string) => void;
  statusFilter: "all" | "verified" | "unverified" | "inactive"; setStatusFilter: (value: "all" | "verified" | "unverified" | "inactive") => void;
  actingId: string; onModerate: (member: MemberRow, active: boolean, verified: boolean) => Promise<void>;
}) {
  const roleChips = ["all", "farmer", "buyer", "consultant", "company", "student"];
  return (
    <div>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow">Moderation</p>
          <h2 className="mt-1.5 font-display text-2xl text-primary">Member moderation</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-on-surface-variant">Activate, deactivate, verify, or unverify member profiles. Every change uses a protected audit function — nothing changes silently.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-wrap gap-1.5">
            {roleChips.map((chip) => (
              <button key={chip} onClick={() => setRoleFilter(chip)} className={`press rounded-xl px-2.5 py-2 text-[10px] font-bold capitalize transition ${roleFilter === chip ? "bg-primary text-on-primary" : "border border-outline-variant/60 bg-white text-on-surface-variant hover:bg-surface-container-low"}`}>
                {chip === "all" ? "All roles" : ROLE_LABELS[chip as AccountRole] ?? chip}
              </button>
            ))}
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="rounded-xl border border-outline-variant/65 bg-white px-3 py-2.5 text-xs font-bold text-primary outline-none focus:border-primary">
            <option value="all">All statuses</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
            <option value="inactive">Deactivated</option>
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full max-w-sm rounded-xl border border-outline-variant/65 bg-white px-3.5 py-2.5 text-xs text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="Search name, role, or city…" />
        <p className="text-[11px] font-bold text-on-surface-variant"><span className="stat-num text-primary">{members.length}</span> shown · <span className="stat-num">{total.toLocaleString()}</span> total</p>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-outline-variant/60 bg-white">
        {members.length ? (
          <div className="divide-y divide-outline-variant/45">
            {members.map((member) => (
              <article key={member.id} className="focus-row flex flex-col justify-between gap-4 p-5 outline-none transition hover:bg-surface-container-low/40 lg:flex-row lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-[10px] font-black text-on-primary">
                      {(member.display_name || member.full_name || "M").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
                    </span>
                    <p className="font-bold text-primary">{member.display_name || member.full_name || "Unnamed member"}</p>
                    <RoleBadge role={member.user_type} />
                    {member.is_verified ? <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[9px] font-bold text-on-secondary-container">Verified</span> : null}
                    {!member.is_active ? <span className="rounded-full bg-error/10 px-2 py-0.5 text-[9px] font-bold text-error">Inactive</span> : null}
                  </div>
                  <p className="mt-1.5 text-[11px] text-on-surface-variant">{member.city || "No city set"} · Joined {fmtDate(member.created_at)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button disabled={actingId === member.id} onClick={() => void onModerate(member, !member.is_active, member.is_verified)} className="press rounded-xl border border-outline-variant/65 bg-white px-3 py-2 text-xs font-bold text-primary hover-lift disabled:opacity-50">{member.is_active ? "Deactivate" : "Activate"}</button>
                  <button disabled={actingId === member.id} onClick={() => void onModerate(member, member.is_active, !member.is_verified)} className="press rounded-xl bg-primary px-3 py-2 text-xs font-bold text-on-primary hover-lift disabled:opacity-50">{member.is_verified ? "Remove verification" : "Verify"}</button>
                </div>
              </article>
            ))}
          </div>
        ) : <EmptyState icon="groups" title="No members found" text="No member matches this filter combination. Adjust the role, status, or search query." />}
      </div>
    </div>
  );
}

function AdsPanel({ ads, actingId, rejectionTarget, rejectionReason, setRejectionTarget, setRejectionReason, onModerate }: {
  ads: AdRow[]; actingId: string; rejectionTarget: string | null; rejectionReason: string; setRejectionTarget: (value: string | null) => void; setRejectionReason: (value: string) => void;
  onModerate: (ad: AdRow, status: "approved" | "rejected", reason?: string | null) => Promise<void>;
}) {
  return (
    <div>
      <p className="eyebrow">Advertising</p>
      <h2 className="mt-1.5 font-display text-2xl text-primary">Advertisement review</h2>
      <p className="mt-1 max-w-2xl text-xs leading-5 text-on-surface-variant">Approve or reject only real pending campaigns. Rejections require a reason and every decision is stored in the audit trail.</p>
      <div className="mt-6 space-y-4">
        {ads.length ? ads.map((ad) => (
          <article key={ad.id} className="hover-lift rounded-2xl border border-outline-variant/60 bg-white p-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-primary">{ad.title}</h3>
                  <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[9px] font-bold uppercase text-on-secondary-container">{ad.status}</span>
                </div>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-on-surface-variant">{ad.body || "No campaign description supplied."}</p>
                <p className="mt-3 flex flex-wrap gap-3 text-[11px] text-on-surface-variant">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px] text-secondary">location_on</span>{ad.target_location || "No geographic target"}</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px] text-secondary">schedule</span>Submitted {fmtDate(ad.created_at)}</span>
                </p>
              </div>
              <div className="flex h-fit gap-2">
                <button disabled={actingId === ad.id} onClick={() => void onModerate(ad, "approved")} className="press rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-on-primary hover-lift disabled:opacity-50">Approve</button>
                <button disabled={actingId === ad.id} onClick={() => { setRejectionTarget(ad.id); setRejectionReason(""); }} className="press rounded-xl border border-error/30 bg-white px-4 py-2.5 text-xs font-bold text-error hover:bg-error/10 disabled:opacity-50">Reject</button>
              </div>
            </div>
            {rejectionTarget === ad.id ? (
              <div className="mt-4 flex flex-col gap-2 border-t border-outline-variant/45 pt-4 sm:flex-row">
                <input value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} className="flex-1 rounded-xl border border-outline-variant/65 bg-white px-3 py-2.5 text-xs text-primary outline-none focus:border-primary" placeholder="Reason required for rejection" />
                <button disabled={!rejectionReason.trim() || actingId === ad.id} onClick={() => void onModerate(ad, "rejected", rejectionReason)} className="press rounded-xl bg-error px-4 py-2.5 text-xs font-bold text-on-error disabled:opacity-50">Confirm rejection</button>
                <button onClick={() => setRejectionTarget(null)} className="press rounded-xl border border-outline-variant/65 px-4 py-2.5 text-xs font-bold text-primary">Cancel</button>
              </div>
            ) : null}
          </article>
        )) : <EmptyState icon="campaign" title="No pending ads" text="There are no real campaigns awaiting review. New submissions appear here instantly." />}
      </div>
    </div>
  );
}

function ContentPanel({ listings, projects, counts }: { listings: ListingRow[]; projects: ProjectRow[]; counts: { listings: number; projects: number; posts: number } }) {
  const pkr = (value: number | null) => (value === null ? null : new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(value));
  return (
    <div className="space-y-7">
      <div>
        <p className="eyebrow">Marketplace oversight</p>
        <h2 className="mt-1.5 font-display text-2xl text-primary">Content operations</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-on-surface-variant">A read-only pulse on what members are publishing across listings, opportunities, and the network feed — the context behind moderation decisions.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard icon="inventory_2" value={counts.listings} label="Total listings" />
        <KpiCard icon="work" value={counts.projects} label="Total projects" />
        <KpiCard icon="dynamic_feed" value={counts.posts} label="Feed & clinic posts" tone="gold" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-white">
          <header className="flex items-center justify-between border-b border-outline-variant/50 bg-surface-container-low/50 px-5 py-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Latest listings</h3>
            <Link to="/marketplace" className="text-[10px] font-bold text-primary hover:underline">Public view</Link>
          </header>
          <div className="divide-y divide-outline-variant/45">
            {listings.length === 0 ? <EmptyState icon="inventory_2" title="No listings yet" text="Published produce and service listings will appear here." /> : listings.map((listing) => (
              <article key={listing.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-primary">{listing.title}</p>
                  <p className="mt-0.5 text-[10px] text-on-surface-variant">{listing.city || "No city"} · {fmtDate(listing.created_at)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${listing.status === "active" ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700"}`}>{listing.status}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-white">
          <header className="flex items-center justify-between border-b border-outline-variant/50 bg-surface-container-low/50 px-5 py-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Latest opportunities</h3>
            <Link to="/projects" className="text-[10px] font-bold text-primary hover:underline">Public view</Link>
          </header>
          <div className="divide-y divide-outline-variant/45">
            {projects.length === 0 ? <EmptyState icon="work" title="No projects yet" text="Published farm needs and briefs will appear here." /> : projects.map((project) => (
              <article key={project.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-primary">{project.title}</p>
                  <p className="mt-0.5 text-[10px] text-on-surface-variant">
                    {project.city || "No city"}
                    {project.budget_min !== null || project.budget_max !== null ? ` · ${pkr(project.budget_min)}–${pkr(project.budget_max)}` : " · Budget on request"}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${project.status === "open" ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700"}`}>{project.status}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function CategoriesPanel({ categories, actingId, onToggle }: { categories: CategoryRow[]; actingId: string; onToggle: (category: CategoryRow) => Promise<void> }) {
  return (
    <div>
      <p className="eyebrow">Taxonomy</p>
      <h2 className="mt-1.5 font-display text-2xl text-primary">Category operations</h2>
      <p className="mt-1 max-w-2xl text-xs leading-5 text-on-surface-variant">Activate or pause existing categories through an audited Super Admin action. Category creation and restructuring remain a controlled follow-up release.</p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-outline-variant/60 bg-white">
        {categories.length ? (
          <div className="divide-y divide-outline-variant/45">
            {categories.map((category) => (
              <article key={category.id} className="flex items-center justify-between gap-4 p-4 transition hover:bg-surface-container-low/40">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="stat-num flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container text-[11px] font-black text-primary">{category.sort_order}</span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-primary">{category.name}</p>
                    <p className="text-[11px] text-on-surface-variant">/{category.slug}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`h-2 w-2 rounded-full ${category.is_active ? "bg-emerald-500" : "bg-outline"}`} title={category.is_active ? "Active" : "Paused"} />
                  <button disabled={actingId === category.id} onClick={() => void onToggle(category)} className={`press rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50 ${category.is_active ? "bg-primary text-on-primary" : "border border-outline-variant/65 bg-white text-primary"}`}>{category.is_active ? "Pause" : "Activate"}</button>
                </div>
              </article>
            ))}
          </div>
        ) : <EmptyState icon="category" title="No categories found" text="No example category records are shown." />}
      </div>
    </div>
  );
}

function AuditPanel({ rows }: { rows: AuditRow[] }) {
  return (
    <div>
      <p className="eyebrow">Accountability</p>
      <h2 className="mt-1.5 font-display text-2xl text-primary">Audit trail</h2>
      <p className="mt-1 max-w-2xl text-xs leading-5 text-on-surface-variant">Append-only record of Super Admin actions. Private contact fields are intentionally never exposed in the browser.</p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-outline-variant/60 bg-white">
        {rows.length ? (
          <div className="divide-y divide-outline-variant/45">
            {rows.map((row) => (
              <article key={row.id} className="flex flex-col justify-between gap-2 p-5 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined mt-0.5 rounded-lg bg-primary/10 p-1.5 text-[16px] text-primary">gavel</span>
                  <div>
                    <p className="font-bold capitalize text-primary">{row.action.replaceAll("_", " ")}</p>
                    <p className="mt-0.5 text-[11px] text-on-surface-variant">{row.target_table}{row.target_id ? ` · ${row.target_id.slice(0, 8)}…` : ""}</p>
                  </div>
                </div>
                <time className="stat-num text-[11px] font-semibold text-on-surface-variant">{fmtDateTime(row.created_at)}</time>
              </article>
            ))}
          </div>
        ) : <EmptyState icon="history" title="No audit events yet" text="Governance actions will appear here after a Super Admin performs them." />}
      </div>
    </div>
  );
}

function Notice({ tone, message }: { tone: "success" | "error"; message: string }) {
  return <div className={`mb-5 flex items-start gap-2.5 rounded-xl border p-3.5 text-xs leading-5 ${tone === "success" ? "border-primary/20 bg-primary/10 text-primary" : "border-error/25 bg-error/10 text-error"}`}>
    <span className="material-symbols-outlined text-[16px]">{tone === "success" ? "check_circle" : "error"}</span>{message}
  </div>;
}

function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <div className="p-10 text-center"><span className="material-symbols-outlined text-4xl text-primary/30">{icon}</span><p className="mt-3 font-bold text-primary">{title}</p><p className="mt-1 text-xs leading-5 text-on-surface-variant">{text}</p></div>;
}

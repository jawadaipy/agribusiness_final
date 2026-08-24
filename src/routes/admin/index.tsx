/**
 * Super Admin Control Center — Enterprise Governance & Ad Operations Console.
 * Real-time telemetry, live ad campaigns studio, member moderation,
 * content oversight, category operations, and audit trail.
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
  BarChart,
  Bar,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedPlatformProfile, type PlatformProfile } from "@/lib/member";
import { uploadMedia } from "@/lib/storage";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    title: "Super Admin Control Center | AgriBusiness Governance",
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: SuperAdminPage,
});

type Tab = "overview" | "ads" | "members" | "content" | "categories" | "audit";

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
  profile_id: string;
  budget_min: number | null;
  budget_max: number | null;
};

type PostRow = {
  id: string;
  title: string;
  tags: string[] | null;
  is_resolved: boolean;
  view_count: number;
  created_at: string;
  profile_id: string;
};

const TABS: { id: Tab; label: string; icon: string; badge?: string }[] = [
  { id: "overview", label: "Overview", icon: "space_dashboard" },
  { id: "ads", label: "Ads & Placements", icon: "campaign" },
  { id: "members", label: "Member Directory", icon: "groups" },
  { id: "content", label: "Content Oversight", icon: "inventory_2" },
  { id: "categories", label: "24 Disciplines", icon: "category" },
  { id: "audit", label: "Audit Timeline", icon: "history" },
];

const ROLE_COLORS: Record<string, string> = {
  farmer: "#0F5132",
  buyer: "#D98B1D",
  consultant: "#2D7A56",
  company: "#6B8F71",
  student: "#B58A2E",
  admin: "#0B3D27",
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
};

const fmtDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
};

function SuperAdminPage() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<PlatformProfile | null>(null);
  const [accessState, setAccessState] = useState<"checking" | "allowed" | "denied">("checking");
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Data states
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [allAds, setAllAds] = useState<AdRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [counts, setCounts] = useState({
    members: 0,
    listings: 0,
    projects: 0,
    connections: 0,
    posts: 0,
    activeAds: 0,
    pendingAds: 0,
  });

  const [loadingData, setLoadingData] = useState(false);
  const [actingId, setActingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Member filtering & inspection
  const [memberQuery, setMemberQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "unverified" | "inactive">("all");
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);

  // Ad review rejection state
  const [rejectionTarget, setRejectionTarget] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Auth verification check
  useEffect(() => {
    let mounted = true;
    const resolveAccess = async () => {
      const { user, profile } = await getAuthenticatedPlatformProfile();
      if (!mounted) return;
      if (!user) {
        setAccessState("denied");
        navigate({ to: "/admin-login", replace: true });
        return;
      }
      if (!profile || profile.user_type !== "admin") {
        setAccessState("denied");
        navigate({ to: "/admin-login", replace: true });
        return;
      }
      setAdmin(profile);
      setAccessState("allowed");
    };
    void resolveAccess();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const loadData = useCallback(async () => {
    if (!admin) return;
    setLoadingData(true);
    setError("");

    try {
      const [
        memberCount,
        listingCount,
        projectCount,
        connectionCount,
        postCount,
        membersResult,
        adsResult,
        categoriesResult,
        auditResult,
        listingsResult,
        projectsResult,
        postsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("listings").select("id", { count: "exact", head: true }),
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("connection_requests").select("id", { count: "exact", head: true }),
        supabase.from("problem_posts").select("id", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("id,email,full_name,display_name,user_type,city,province,is_verified,is_active,created_at,bio")
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("ads")
          .select(
            "id,profile_id,title,body,creative_url,target_url,target_location,status,starts_at,ends_at,rotation_order,impression_count,click_count,created_at,rejection_reason"
          )
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("categories").select("id,name,slug,sort_order,is_active").order("sort_order").limit(100),
        supabase.from("admin_audit_log").select("id,action,target_table,target_id,created_at").order("created_at", { ascending: false }).limit(60),
        supabase.from("listings").select("id,title,city,price,currency,status,created_at,profile_id").order("created_at", { ascending: false }).limit(25),
        supabase.from("projects").select("id,title,city,status,created_at,profile_id,budget_min,budget_max").order("created_at", { ascending: false }).limit(25),
        supabase.from("problem_posts").select("id,title,tags,is_resolved,view_count,created_at,profile_id").order("created_at", { ascending: false }).limit(25),
      ]);

      const fetchedAds = (adsResult.data ?? []) as AdRow[];
      const activeAdsCount = fetchedAds.filter((a) => a.status === "approved").length;
      const pendingAdsCount = fetchedAds.filter((a) => a.status === "pending").length;

      setCounts({
        members: memberCount.count ?? 0,
        listings: listingCount.count ?? 0,
        projects: projectCount.count ?? 0,
        connections: connectionCount.count ?? 0,
        posts: postCount.count ?? 0,
        activeAds: activeAdsCount,
        pendingAds: pendingAdsCount,
      });

      setMembers((membersResult.data ?? []) as MemberRow[]);
      setAllAds(fetchedAds);
      setCategories((categoriesResult.data ?? []) as CategoryRow[]);
      setAuditRows((auditResult.data ?? []) as AuditRow[]);
      setListings((listingsResult.data ?? []) as ListingRow[]);
      setProjects((projectsResult.data ?? []) as ProjectRow[]);
      setPosts((postsResult.data ?? []) as PostRow[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load governance dataset.");
    } finally {
      setLoadingData(false);
    }
  }, [admin]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Moderation actions
  const moderateMember = async (member: MemberRow, nextActive: boolean, nextVerified: boolean) => {
    const label = member.display_name || member.full_name || "Member";
    if (!nextActive && !window.confirm(`Deactivate ${label}? They will lose platform access immediately.`)) return;
    if (nextActive && member.is_active && nextVerified && !member.is_verified && !window.confirm(`Award verified badge to ${label}?`)) return;

    setActingId(member.id);
    setError("");
    setNotice("");
    const { error: rpcError } = await supabase.rpc("super_admin_set_member_moderation", {
      p_profile_id: member.id,
      p_is_active: nextActive,
      p_is_verified: nextVerified,
    });
    if (rpcError) {
      setError(rpcError.message);
    } else {
      setNotice(`Updated ${label}. Action recorded in audit trail.`);
      await loadData();
    }
    setActingId("");
  };

  const moderateAd = async (ad: AdRow, status: "approved" | "rejected", reason: string | null = null) => {
    setActingId(ad.id);
    setError("");
    setNotice("");
    const { error: rpcError } = await supabase.rpc("super_admin_moderate_ad", {
      p_ad_id: ad.id,
      p_status: status,
      p_rejection_reason: reason,
    });
    if (rpcError) {
      setError(rpcError.message);
    } else {
      setNotice(`Ad campaign marked as ${status}.`);
      setRejectionTarget(null);
      setRejectionReason("");
      await loadData();
    }
    setActingId("");
  };

  const deleteAd = async (ad: AdRow) => {
    if (!window.confirm(`Permanently delete campaign "${ad.title}"?`)) return;
    setActingId(ad.id);
    const { error: delErr } = await supabase.from("ads").delete().eq("id", ad.id);
    if (delErr) setError(delErr.message);
    else {
      setNotice("Ad campaign deleted.");
      await loadData();
    }
    setActingId("");
  };

  const extendAdFlight = async (ad: AdRow, extraDays = 30) => {
    setActingId(ad.id);
    const currentEnd = ad.ends_at ? new Date(ad.ends_at).getTime() : Date.now();
    const newEnd = new Date(Math.max(currentEnd, Date.now()) + extraDays * 86400000).toISOString();
    const { error: updErr } = await supabase.from("ads").update({ ends_at: newEnd, status: "approved" }).eq("id", ad.id);
    if (updErr) setError(updErr.message);
    else {
      setNotice(`Campaign flight extended by ${extraDays} days.`);
      await loadData();
    }
    setActingId("");
  };

  const setCategoryState = async (category: CategoryRow) => {
    setActingId(category.id);
    setError("");
    setNotice("");
    const { error: rpcError } = await supabase.rpc("super_admin_set_category_state", {
      p_category_id: category.id,
      p_is_active: !category.is_active,
    });
    if (rpcError) setError(rpcError.message);
    else {
      setNotice(`${category.name} is now ${category.is_active ? "inactive" : "active"}.`);
      await loadData();
    }
    setActingId("");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/admin-login", replace: true });
  };

  // Derived filters and charts
  const visibleMembers = useMemo(() => {
    return members
      .filter((m) => m.user_type !== "admin")
      .filter((m) => roleFilter === "all" || m.user_type === roleFilter)
      .filter(
        (m) =>
          statusFilter === "all" ||
          (statusFilter === "verified" && m.is_verified) ||
          (statusFilter === "unverified" && !m.is_verified && m.is_active) ||
          (statusFilter === "inactive" && !m.is_active)
      )
      .filter((m) =>
        `${m.display_name || ""} ${m.full_name || ""} ${m.email || ""} ${m.user_type} ${m.city || ""} ${m.province || ""}`
          .toLowerCase()
          .includes(memberQuery.trim().toLowerCase())
      );
  }, [members, roleFilter, statusFilter, memberQuery]);

  const roleDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of members) {
      if (m.user_type === "admin") continue;
      map.set(m.user_type, (map.get(m.user_type) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([role, value]) => ({ name: role, value }));
  }, [members]);

  const signupTrend = useMemo(() => {
    const months: { key: string; label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("en-PK", { month: "short" }),
        count: 0,
      });
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

  if (accessState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-exchange text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
          <p className="text-xs font-bold uppercase tracking-widest text-secondary">Verifying Super Admin Authorization…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F2] text-on-background antialiased">
      {/* Top Executive Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-exchange shadow-xl">
        <div className="mx-auto flex max-w-container-max items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary font-black shadow-md">
                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
              </span>
              <div>
                <span className="font-display text-lg font-bold text-white tracking-tight">AgriBusiness</span>
                <span className="ml-2 rounded-md bg-secondary/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-secondary">
                  Super Admin
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-exchange-raised px-3 py-1 text-xs text-white/70 sm:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative h-2 w-2 rounded-full bg-success" />
              </span>
              <span>PKT Live Telemetry</span>
            </div>

            <button
              onClick={() => void loadData()}
              disabled={loadingData}
              title="Refresh dataset"
              className="press flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-exchange-raised text-white/80 transition hover:bg-white/15 hover:text-white disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[16px] ${loadingData ? "animate-spin" : ""}`}>refresh</span>
            </button>

            <Link
              to="/"
              className="press hidden items-center gap-1.5 rounded-lg border border-white/10 bg-exchange-raised px-3 py-1.5 text-xs font-bold text-white/90 transition hover:bg-white/15 sm:inline-flex"
            >
              <span className="material-symbols-outlined text-[15px]">public</span>
              View Website
            </Link>

            <button
              onClick={signOut}
              className="press inline-flex items-center gap-1.5 rounded-lg bg-error/20 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-error/30"
            >
              <span className="material-symbols-outlined text-[15px]">logout</span>
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Executive Sub-Navigation Tabs */}
        <div className="mx-auto max-w-container-max px-4 sm:px-6">
          <nav className="flex space-x-1 overflow-x-auto py-1 scrollbar-none" aria-label="Admin Sections">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              let badgeCount = 0;
              if (tab.id === "ads") badgeCount = counts.pendingAds;
              if (tab.id === "members" && inactiveCount > 0) badgeCount = inactiveCount;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`press group flex items-center gap-2 whitespace-nowrap rounded-t-xl px-4 py-3 text-xs font-bold transition-all ${
                    isActive
                      ? "border-b-2 border-secondary bg-white text-primary shadow-sm"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className={`material-symbols-outlined text-[17px] ${isActive ? "text-secondary" : "text-white/50"}`}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                  {badgeCount > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                        isActive ? "bg-secondary text-primary" : "bg-secondary/30 text-secondary"
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="mx-auto max-w-container-max px-4 py-8 sm:px-6">
        {/* Flash feedback alerts */}
        {error && (
          <div className="mb-6 flex items-start justify-between rounded-2xl border border-error/30 bg-error/10 p-4 text-xs font-semibold text-error shadow-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-error/60 hover:text-error">
              ✕
            </button>
          </div>
        )}

        {notice && (
          <div className="mb-6 flex items-start justify-between rounded-2xl border border-success/30 bg-success/10 p-4 text-xs font-semibold text-success shadow-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{notice}</span>
            </div>
            <button onClick={() => setNotice("")} className="text-success/60 hover:text-success">
              ✕
            </button>
          </div>
        )}

        {/* Tab 1: Overview Dashboard */}
        {activeTab === "overview" && (
          <OverviewTab
            counts={counts}
            newThisWeek={newThisWeek}
            verifiedCount={verifiedCount}
            inactiveCount={inactiveCount}
            roleDistribution={roleDistribution}
            signupTrend={signupTrend}
            recentAudit={auditRows.slice(0, 8)}
            onGoToTab={(t) => setActiveTab(t)}
          />
        )}

        {/* Tab 2: Ads Studio & Placements */}
        {activeTab === "ads" && admin && (
          <AdsStudioTab
            adminProfile={admin}
            ads={allAds}
            actingId={actingId}
            rejectionTarget={rejectionTarget}
            rejectionReason={rejectionReason}
            setRejectionTarget={setRejectionTarget}
            setRejectionReason={setRejectionReason}
            onModerate={moderateAd}
            onDelete={deleteAd}
            onExtend={extendAdFlight}
            onCreated={loadData}
          />
        )}

        {/* Tab 3: Member Directory & Moderation */}
        {activeTab === "members" && (
          <MembersTab
            members={visibleMembers}
            totalCount={members.length}
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            memberQuery={memberQuery}
            setMemberQuery={setMemberQuery}
            actingId={actingId}
            onModerate={moderateMember}
            onSelectMember={(m) => setSelectedMember(m)}
          />
        )}

        {/* Tab 4: Content Oversight */}
        {activeTab === "content" && (
          <ContentOversightTab
            listings={listings}
            projects={projects}
            posts={posts}
            onDeleteListing={async (id) => {
              if (!window.confirm("Remove this listing from marketplace?")) return;
              await supabase.from("listings").delete().eq("id", id);
              await loadData();
            }}
            onDeleteProject={async (id) => {
              if (!window.confirm("Remove this RFP from project board?")) return;
              await supabase.from("projects").delete().eq("id", id);
              await loadData();
            }}
          />
        )}

        {/* Tab 5: 24 Agricultural Categories */}
        {activeTab === "categories" && (
          <CategoriesTab
            categories={categories}
            actingId={actingId}
            onToggleState={setCategoryState}
            onRefresh={loadData}
          />
        )}

        {/* Tab 6: Audit Timeline */}
        {activeTab === "audit" && <AuditTimelineTab auditRows={auditRows} />}
      </main>

      {/* Member Details Modal */}
      {selectedMember && (
        <MemberDetailModal member={selectedMember} onClose={() => setSelectedMember(null)} onModerate={moderateMember} actingId={actingId} />
      )}
    </div>
  );
}

/* ===================================================================
   OVERVIEW TAB COMPONENT
   =================================================================== */
function OverviewTab({
  counts,
  newThisWeek,
  verifiedCount,
  inactiveCount,
  roleDistribution,
  signupTrend,
  recentAudit,
  onGoToTab,
}: {
  counts: { members: number; listings: number; projects: number; connections: number; posts: number; activeAds: number; pendingAds: number };
  newThisWeek: number;
  verifiedCount: number;
  inactiveCount: number;
  roleDistribution: { name: string; value: number }[];
  signupTrend: { label: string; count: number }[];
  recentAudit: AuditRow[];
  onGoToTab: (tab: Tab) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Total Members"
          value={counts.members}
          delta={`+${newThisWeek} this week`}
          icon="groups"
          onClick={() => onGoToTab("members")}
        />
        <StatCard
          label="Active Listings"
          value={counts.listings}
          delta="Trading Floor"
          icon="storefront"
          onClick={() => onGoToTab("content")}
        />
        <StatCard
          label="Open RFPs"
          value={counts.projects}
          delta="Project Bids"
          icon="assignment"
          onClick={() => onGoToTab("content")}
        />
        <StatCard
          label="Active Campaigns"
          value={counts.activeAds}
          delta={`${counts.pendingAds} pending review`}
          icon="campaign"
          tone={counts.pendingAds > 0 ? "highlight" : "default"}
          onClick={() => onGoToTab("ads")}
        />
        <StatCard
          label="Verified Badges"
          value={verifiedCount}
          delta="Trusted Members"
          icon="verified"
          onClick={() => onGoToTab("members")}
        />
        <StatCard
          label="Connections"
          value={counts.connections}
          delta="Network B2B"
          icon="handshake"
          onClick={() => onGoToTab("overview")}
        />
      </div>

      {/* Action Queue & Telemetry Area */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Quick Decision Queue */}
        <div className="rounded-3xl border border-outline-variant/50 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-primary">
            <span className="material-symbols-outlined text-secondary">pending_actions</span>
            Decision Action Queue
          </h2>
          <p className="mt-1 text-xs text-on-surface-variant">Pending administrative actions requiring approval or inspection.</p>

          <div className="mt-5 divide-y divide-outline-variant/30">
            <QueueItem
              icon="campaign"
              title="Ad Campaigns Awaiting Review"
              count={counts.pendingAds}
              cta="Review Ads"
              onClick={() => onGoToTab("ads")}
              isUrgent={counts.pendingAds > 0}
            />
            <QueueItem
              icon="person_add"
              title="Unverified Registered Members"
              count={counts.members - verifiedCount}
              cta="Review Members"
              onClick={() => onGoToTab("members")}
            />
            <QueueItem
              icon="block"
              title="Deactivated Member Accounts"
              count={inactiveCount}
              cta="Inspect Accounts"
              onClick={() => onGoToTab("members")}
            />
          </div>
        </div>

        {/* Middle: Signup Trend Area Chart */}
        <div className="rounded-3xl border border-outline-variant/50 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-primary">
            <span className="material-symbols-outlined text-secondary">trending_up</span>
            6-Month Registration Velocity
          </h2>
          <p className="mt-1 text-xs text-on-surface-variant">New agricultural member signups by calendar month.</p>

          <div className="mt-4 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signupTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F5132" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0F5132" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#08160F",
                    border: "none",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#0F5132" strokeWidth={2.5} fill="url(#growthGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: 5-Role Ecosystem Distribution */}
        <div className="rounded-3xl border border-outline-variant/50 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-primary">
            <span className="material-symbols-outlined text-secondary">pie_chart</span>
            5-Role Ecosystem Mix
          </h2>
          <p className="mt-1 text-xs text-on-surface-variant">Distribution across Pakistan's agricultural personas.</p>

          <div className="mt-2 flex h-48 items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={64}
                  paddingAngle={3}
                >
                  {roleDistribution.map((entry) => (
                    <Cell key={entry.name} fill={ROLE_COLORS[entry.name] || "#0F5132"} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: unknown) => [Number(val) || 0, "Members"]}
                  contentStyle={{
                    backgroundColor: "#08160F",
                    border: "none",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap justify-center gap-3 text-[11px] font-bold">
            {roleDistribution.map((r) => (
              <span key={r.name} className="flex items-center gap-1.5 capitalize text-on-surface-variant">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ROLE_COLORS[r.name] || "#0F5132" }} />
                {r.name} ({r.value})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: Recent Audit Stream */}
      <div className="rounded-3xl border border-outline-variant/50 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-primary">
              <span className="material-symbols-outlined text-secondary">history</span>
              Live Governance Audit Stream
            </h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">Immutable ledger of administrative actions and moderation events.</p>
          </div>
          <button
            onClick={() => onGoToTab("audit")}
            className="press text-xs font-bold text-primary hover:underline"
          >
            View full log →
          </button>
        </div>

        <div className="mt-4 divide-y divide-outline-variant/30">
          {recentAudit.length > 0 ? (
            recentAudit.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-surface-container px-2 py-1 font-mono text-[11px] font-bold text-primary">
                    {row.action}
                  </span>
                  <span className="text-on-surface-variant">
                    Target Table: <span className="font-semibold text-primary">{row.target_table}</span>
                    {row.target_id && <span className="ml-1 text-[11px] text-on-surface-variant/60">({row.target_id.slice(0, 8)}…)</span>}
                  </span>
                </div>
                <span className="text-on-surface-variant/60">{fmtDateTime(row.created_at)}</span>
              </div>
            ))
          ) : (
            <p className="py-4 text-xs text-on-surface-variant">No administrative events recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  icon,
  tone = "default",
  onClick,
}: {
  label: string;
  value: number;
  delta: string;
  icon: string;
  tone?: "default" | "highlight";
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`press hover-lift flex flex-col justify-between rounded-2xl border p-4 text-left shadow-sm transition ${
        tone === "highlight"
          ? "border-secondary/40 bg-secondary/10"
          : "border-outline-variant/50 bg-white hover:border-primary/30"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/70">{label}</span>
        <span className={`material-symbols-outlined text-[18px] ${tone === "highlight" ? "text-secondary" : "text-primary/70"}`}>
          {icon}
        </span>
      </div>
      <div className="mt-3">
        <p className="stat-num font-display text-2xl font-bold text-primary">{value.toLocaleString()}</p>
        <p className="mt-0.5 text-[11px] font-semibold text-on-surface-variant/80">{delta}</p>
      </div>
    </button>
  );
}

function QueueItem({
  icon,
  title,
  count,
  cta,
  onClick,
  isUrgent = false,
}: {
  icon: string;
  title: string;
  count: number;
  cta: string;
  onClick: () => void;
  isUrgent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            isUrgent ? "bg-error/15 text-error" : "bg-surface-container text-primary"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </span>
        <div>
          <p className="text-xs font-bold text-primary">{title}</p>
          <p className="text-[11px] text-on-surface-variant">{count} item{count === 1 ? "" : "s"}</p>
        </div>
      </div>
      <button
        onClick={onClick}
        className={`press rounded-xl px-3 py-1.5 text-xs font-bold transition ${
          isUrgent
            ? "bg-error text-white hover:bg-error/90"
            : "bg-surface-container text-primary hover:bg-surface-container-high"
        }`}
      >
        {cta}
      </button>
    </div>
  );
}

/* ===================================================================
   ADS STUDIO & PLACEMENTS COMPONENT
   =================================================================== */
function AdsStudioTab({
  adminProfile,
  ads,
  actingId,
  rejectionTarget,
  rejectionReason,
  setRejectionTarget,
  setRejectionReason,
  onModerate,
  onDelete,
  onExtend,
  onCreated,
}: {
  adminProfile: PlatformProfile;
  ads: AdRow[];
  actingId: string;
  rejectionTarget: string | null;
  rejectionReason: string;
  setRejectionTarget: (value: string | null) => void;
  setRejectionReason: (value: string) => void;
  onModerate: (ad: AdRow, status: "approved" | "rejected", reason?: string | null) => Promise<void>;
  onDelete: (ad: AdRow) => Promise<void>;
  onExtend: (ad: AdRow, extraDays?: number) => Promise<void>;
  onCreated: () => Promise<void>;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetUrl, setTargetUrl] = useState("/apps/agri-biz");
  const [targetLocation, setTargetLocation] = useState("All Pakistan");
  const [creativeUrl, setCreativeUrl] = useState("");
  const [creativeFile, setCreativeFile] = useState<File | null>(null);
  const [durationDays, setDurationDays] = useState(30);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [previewMode, setPreviewMode] = useState<"banner" | "card">("banner");

  const pendingAds = ads.filter((a) => a.status === "pending");
  const activeAds = ads.filter((a) => a.status === "approved");
  const otherAds = ads.filter((a) => a.status === "rejected" || a.status === "expired");

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (title.trim().length < 4) {
      setFormError("Campaign headline must be at least 4 characters.");
      return;
    }

    let finalImageUrl = creativeUrl.trim();

    if (creativeFile) {
      setSaving(true);
      const { url, error: uploadErr } = await uploadMedia("ad-creatives", adminProfile.id, creativeFile);
      if (uploadErr || !url) {
        setFormError(uploadErr ?? "Failed to upload image file to storage.");
        setSaving(false);
        return;
      }
      finalImageUrl = url;
    }

    if (!finalImageUrl) {
      setFormError("Please upload an image creative or paste an image URL.");
      return;
    }

    setSaving(true);
    const startsAt = new Date().toISOString();
    const endsAt = new Date(Date.now() + durationDays * 86400000).toISOString();

    const { error: insErr } = await supabase.from("ads").insert({
      profile_id: adminProfile.id,
      title: title.trim(),
      body: body.trim() || null,
      creative_url: finalImageUrl,
      target_url: targetUrl.trim() || "/",
      target_location: targetLocation,
      status: "approved",
      starts_at: startsAt,
      ends_at: endsAt,
      rotation_order: 1,
    });

    setSaving(false);
    if (insErr) {
      setFormError(insErr.message);
    } else {
      setTitle("");
      setBody("");
      setCreativeUrl("");
      setCreativeFile(null);
      setIsCreating(false);
      await onCreated();
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner Header with Creator Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-primary/20 bg-exchange p-6 text-white shadow-md">
        <div>
          <span className="eyebrow text-secondary">Campaign Studio</span>
          <h2 className="mt-1 font-display text-2xl font-bold">Advertising &amp; Sponsor Placements</h2>
          <p className="mt-1 text-xs text-white/70">
            Publish site-wide sponsored banners, control rotation order, and inspect live impressions and clicks.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="press inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary hover:bg-secondary-light"
        >
          <span className="material-symbols-outlined text-[18px]">{isCreating ? "close" : "add_photo_alternate"}</span>
          {isCreating ? "Close Studio" : "Upload New Campaign"}
        </button>
      </div>

      {/* Creation Studio Drawer / Form */}
      {isCreating && (
        <div className="rounded-3xl border border-outline-variant/60 bg-white p-6 shadow-md md:p-8">
          <div className="mb-6 flex items-center justify-between border-b border-outline-variant/40 pb-4">
            <div>
              <h3 className="font-display text-xl font-bold text-primary">Create &amp; Publish Ad Campaign</h3>
              <p className="text-xs text-on-surface-variant">Live instant preview as you construct your banner creative.</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-surface-container p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPreviewMode("banner")}
                className={`rounded-lg px-2.5 py-1 ${previewMode === "banner" ? "bg-white text-primary shadow-xs" : "text-on-surface-variant"}`}
              >
                Banner View
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("card")}
                className={`rounded-lg px-2.5 py-1 ${previewMode === "card" ? "bg-white text-primary shadow-xs" : "text-on-surface-variant"}`}
              >
                Card View
              </button>
            </div>
          </div>

          {formError && (
            <div className="mb-6 rounded-xl border border-error/25 bg-error/10 p-3.5 text-xs font-semibold text-error">
              {formError}
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Form Fields */}
            <form onSubmit={handleCreateAd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Campaign Headline *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Solar Tubewell Conversion 2026 — 60% Subsidized"
                  className="mt-1 w-full rounded-xl border border-outline-variant/60 bg-white px-3.5 py-2.5 text-xs font-medium text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Subtitle / Promo Body
                </label>
                <textarea
                  rows={2}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="e.g. Tier-1 monocrystalline panels with inverter. Applicable for Multan, Faisalabad & Bahawalpur farmers."
                  className="mt-1 w-full rounded-xl border border-outline-variant/60 bg-white px-3.5 py-2.5 text-xs font-medium text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Destination URL
                  </label>
                  <input
                    type="text"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="/apps/agri-biz or https://..."
                    className="mt-1 w-full rounded-xl border border-outline-variant/60 bg-white px-3.5 py-2.5 text-xs font-medium text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {["/apps/agri-biz", "/rates", "/projects", "/resources"].map((shortcut) => (
                      <button
                        key={shortcut}
                        type="button"
                        onClick={() => setTargetUrl(shortcut)}
                        className="rounded-md bg-surface-container px-1.5 py-0.5 text-[10px] font-bold text-primary hover:bg-surface-container-high"
                      >
                        {shortcut}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Target Region
                  </label>
                  <select
                    value={targetLocation}
                    onChange={(e) => setTargetLocation(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-outline-variant/60 bg-white px-3 py-2.5 text-xs font-medium text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  >
                    <option value="All Pakistan">All Pakistan</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Sindh">Sindh</option>
                    <option value="KPK">Khyber Pakhtunkhwa</option>
                    <option value="Balochistan">Balochistan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Flight Duration (Days)
                </label>
                <div className="mt-1 flex items-center gap-3">
                  {[7, 15, 30, 60, 90, 180, 365].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDurationDays(d)}
                      className={`press rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                        durationDays === d ? "bg-primary text-white" : "border border-outline-variant/60 bg-white text-on-surface-variant"
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Creative Image (Upload or CDN URL)
                </label>
                <div className="mt-1 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container px-3.5 py-2 text-xs font-bold text-primary transition hover:bg-surface-container-high">
                      <span className="material-symbols-outlined text-[16px]">upload_file</span>
                      {creativeFile ? creativeFile.name.slice(0, 24) : "Choose File"}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setCreativeFile(e.target.files[0]);
                            setCreativeUrl(URL.createObjectURL(e.target.files[0]));
                          }
                        }}
                      />
                    </label>
                    <span className="text-xs text-on-surface-variant/50">or paste URL</span>
                  </div>
                  <input
                    type="url"
                    value={creativeUrl.startsWith("blob:") ? "" : creativeUrl}
                    onChange={(e) => {
                      setCreativeUrl(e.target.value);
                      setCreativeFile(null);
                    }}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full rounded-xl border border-outline-variant/60 bg-white px-3.5 py-2 text-xs font-medium text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="press inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-primary-container disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">publish</span>
                  {saving ? "Uploading & Publishing…" : `Publish Live for ${durationDays} Days`}
                </button>
              </div>
            </form>

            {/* Live Interactive Preview */}
            <div className="flex flex-col justify-between rounded-2xl border border-dashed border-outline-variant bg-[#F9FBF8] p-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-secondary">Live Banner Preview</p>
                <p className="text-xs text-on-surface-variant">This is how your ad will appear to growers and buyers on the website.</p>

                <div className="mt-4 overflow-hidden rounded-2xl border border-outline-variant/40 bg-white shadow-md">
                  <div className="relative">
                    <span className="absolute right-3 top-3 z-10 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-xs">
                      Sponsored
                    </span>
                    {creativeUrl ? (
                      <img
                        src={creativeUrl}
                        alt="Preview"
                        className={`w-full object-cover ${previewMode === "banner" ? "h-36 sm:h-40" : "aspect-[16/9]"}`}
                      />
                    ) : (
                      <div className="flex h-36 w-full items-center justify-center bg-surface-container text-on-surface-variant/40">
                        <span className="material-symbols-outlined text-[48px]">image</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-display text-base font-bold text-primary">
                      {title || "Your Campaign Headline Goes Here"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">
                      {body || "Your campaign description and call to action will appear here on the banner card."}
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-outline-variant/30 pt-2 text-[11px]">
                      <span className="font-bold text-secondary flex items-center gap-1">
                        Learn more <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                      </span>
                      <span className="text-on-surface-variant/60">{targetLocation}</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-[11px] text-on-surface-variant/60">
                Placement: High-impact banner slot rendered automatically on Homepage, Trading Floor, and Companion App headers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Review Queue for Member-Submitted Campaigns */}
      {pendingAds.length > 0 && (
        <div className="rounded-3xl border border-secondary/40 bg-secondary/10 p-6 shadow-sm">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-primary">
            <span className="material-symbols-outlined text-secondary">rate_review</span>
            Member Ads Awaiting Review ({pendingAds.length})
          </h3>
          <p className="mt-1 text-xs text-on-surface-variant">
            Advertisers have submitted these campaigns. Inspect creatives and approve or reject with reason.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {pendingAds.map((ad) => (
              <div key={ad.id} className="rounded-2xl border border-outline-variant/60 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-primary">{ad.title}</h4>
                  <span className="rounded-md bg-secondary/20 px-2 py-0.5 text-[10px] font-black uppercase text-secondary">
                    Pending
                  </span>
                </div>
                {ad.creative_url && (
                  <img src={ad.creative_url} alt="" className="mt-3 h-28 w-full rounded-xl object-cover" />
                )}
                <p className="mt-2 text-xs text-on-surface-variant">{ad.body || "No description provided."}</p>
                <div className="mt-3 flex items-center justify-between border-t border-outline-variant/30 pt-3">
                  <span className="text-[11px] text-on-surface-variant/60">Submitted {fmtDate(ad.created_at)}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => void onModerate(ad, "approved")}
                      disabled={actingId === ad.id}
                      className="press rounded-lg bg-success px-3 py-1 text-xs font-bold text-white hover:bg-success/90"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = window.prompt("Enter rejection reason for the advertiser:", "Creative does not meet quality standards");
                        if (reason) void onModerate(ad, "rejected", reason);
                      }}
                      disabled={actingId === ad.id}
                      className="press rounded-lg bg-error/15 px-3 py-1 text-xs font-bold text-error hover:bg-error/25"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active & Live Campaigns Table */}
      <div className="rounded-3xl border border-outline-variant/50 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-primary">Active Platform Campaigns ({activeAds.length})</h3>
            <p className="text-xs text-on-surface-variant">Currently active banner ads rendered across the website.</p>
          </div>
        </div>

        {activeAds.length > 0 ? (
          <div className="mt-5 divide-y divide-outline-variant/30">
            {activeAds.map((ad) => {
              const daysLeft = ad.ends_at ? Math.max(0, Math.ceil((new Date(ad.ends_at).getTime() - Date.now()) / 86400000)) : 0;
              const ctr = ad.impression_count ? ((Number(ad.click_count || 0) / ad.impression_count) * 100).toFixed(1) : "0.0";

              return (
                <div key={ad.id} className="flex flex-col justify-between gap-4 py-4 md:flex-row md:items-center">
                  <div className="flex items-start gap-4">
                    {ad.creative_url ? (
                      <img src={ad.creative_url} alt="" className="h-16 w-24 rounded-xl object-cover shadow-xs" />
                    ) : (
                      <div className="flex h-16 w-24 items-center justify-center rounded-xl bg-surface-container text-on-surface-variant/40">
                        <span className="material-symbols-outlined">image</span>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-primary">{ad.title}</h4>
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                          Live ({daysLeft}d left)
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 max-w-xl text-xs text-on-surface-variant">{ad.body || "No description."}</p>
                      <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-on-surface-variant/70">
                        <span>Target: <strong className="text-primary">{ad.target_location || "All Pakistan"}</strong></span>
                        <span>Link: <strong className="text-primary">{ad.target_url || "/"}</strong></span>
                        <span>Impressions: <strong className="text-primary">{ad.impression_count || 0}</strong></span>
                        <span>Clicks: <strong className="text-primary">{ad.click_count || 0}</strong> (CTR: {ctr}%)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => void onExtend(ad, 30)}
                      disabled={actingId === ad.id}
                      className="press rounded-xl border border-outline-variant/60 bg-white px-3 py-1.5 text-xs font-bold text-primary hover:bg-surface-container"
                    >
                      +30 Days
                    </button>
                    <button
                      onClick={() => void onDelete(ad)}
                      disabled={actingId === ad.id}
                      className="press rounded-xl bg-error/10 px-3 py-1.5 text-xs font-bold text-error hover:bg-error/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[40px] text-on-surface-variant/30">campaign</span>
            <p className="mt-2 font-display text-base text-primary">No active campaigns running right now</p>
            <p className="mt-1">Click "Upload New Campaign" above to publish sponsored banners.</p>
          </div>
        )}
      </div>

      {/* History / Other campaigns */}
      {otherAds.length > 0 && (
        <div className="rounded-3xl border border-outline-variant/50 bg-white p-6 shadow-sm">
          <h3 className="font-display text-base font-bold text-on-surface-variant">Expired &amp; Rejected History ({otherAds.length})</h3>
          <div className="mt-3 divide-y divide-outline-variant/30">
            {otherAds.map((ad) => (
              <div key={ad.id} className="flex items-center justify-between py-3 text-xs">
                <div>
                  <span className="font-bold text-primary">{ad.title}</span>
                  <span className="ml-2 rounded-md bg-surface-container px-2 py-0.5 text-[10px] uppercase font-bold text-on-surface-variant">
                    {ad.status}
                  </span>
                  {ad.rejection_reason && <span className="ml-2 text-error">Reason: {ad.rejection_reason}</span>}
                </div>
                <button onClick={() => void onDelete(ad)} className="text-xs text-error hover:underline">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================================================================
   MEMBERS DIRECTORY & MODERATION COMPONENT
   =================================================================== */
function MembersTab({
  members,
  totalCount,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  memberQuery,
  setMemberQuery,
  actingId,
  onModerate,
  onSelectMember,
}: {
  members: MemberRow[];
  totalCount: number;
  roleFilter: string;
  setRoleFilter: (val: string) => void;
  statusFilter: "all" | "verified" | "unverified" | "inactive";
  setStatusFilter: (val: "all" | "verified" | "unverified" | "inactive") => void;
  memberQuery: string;
  setMemberQuery: (val: string) => void;
  actingId: string;
  onModerate: (m: MemberRow, nextActive: boolean, nextVerified: boolean) => Promise<void>;
  onSelectMember: (m: MemberRow) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="rounded-3xl border border-outline-variant/50 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-primary">Member Governance Directory</h2>
            <p className="text-xs text-on-surface-variant">Manage role badges, verified trust seals, and account statuses.</p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            Showing {members.length} of {totalCount} members
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-1">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-on-surface-variant/50">search</span>
            <input
              type="text"
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              placeholder="Search by name, email, city..."
              className="w-full rounded-xl border border-outline-variant/60 bg-white py-2 pl-9 pr-3 text-xs font-medium text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-outline-variant/60 bg-white px-3 py-2 text-xs font-medium text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            <option value="all">All 5 Roles</option>
            <option value="farmer">🚜 Farmers &amp; Growers</option>
            <option value="buyer">🏢 Commodity Buyers &amp; Millers</option>
            <option value="consultant">🔬 Agronomists &amp; Vets</option>
            <option value="company">🏭 Agribusiness Enterprises</option>
            <option value="student">🎓 Students &amp; Researchers</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "verified" | "unverified" | "inactive")}
            className="rounded-xl border border-outline-variant/60 bg-white px-3 py-2 text-xs font-medium text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            <option value="all">All Verification Statuses</option>
            <option value="verified">Verified Badge Awarded</option>
            <option value="unverified">Unverified (Pending Review)</option>
            <option value="inactive">Deactivated / Banned</option>
          </select>
        </div>
      </div>

      {/* Member Cards / Table */}
      <div className="rounded-3xl border border-outline-variant/50 bg-white p-6 shadow-sm">
        {members.length > 0 ? (
          <div className="divide-y divide-outline-variant/30">
            {members.map((m) => (
              <div key={m.id} className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3.5">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-black text-white shadow-xs"
                    style={{ backgroundColor: ROLE_COLORS[m.user_type] || "#0F5132" }}
                  >
                    {(m.display_name || m.full_name || "M")
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => onSelectMember(m)}
                        className="font-display font-bold text-primary hover:underline"
                      >
                        {m.display_name || m.full_name || "Unnamed Member"}
                      </button>
                      <span
                        className="rounded-md px-2 py-0.5 text-[10px] font-black uppercase"
                        style={{
                          backgroundColor: `${ROLE_COLORS[m.user_type]}20`,
                          color: ROLE_COLORS[m.user_type] || "#0F5132",
                        }}
                      >
                        {m.user_type}
                      </span>
                      {m.is_verified && (
                        <span className="flex items-center gap-0.5 rounded-md bg-secondary/20 px-1.5 py-0.5 text-[10px] font-bold text-secondary">
                          <span className="material-symbols-outlined text-[13px]">verified</span> Verified
                        </span>
                      )}
                      {!m.is_active && (
                        <span className="rounded-md bg-error/10 px-1.5 py-0.5 text-[10px] font-bold text-error">
                          Deactivated
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                      {m.city ? `${m.city}${m.province ? `, ${m.province}` : ""}` : "Pakistan"} · Joined {fmtDate(m.created_at)}
                      {m.email && <span className="ml-2 font-mono text-[11px] text-on-surface-variant/70">({m.email})</span>}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => onSelectMember(m)}
                    className="press rounded-xl border border-outline-variant/60 bg-white px-3 py-1.5 text-xs font-bold text-primary hover:bg-surface-container"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => void onModerate(m, m.is_active, !m.is_verified)}
                    disabled={actingId === m.id}
                    className={`press rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      m.is_verified
                        ? "border border-outline-variant/60 bg-white text-on-surface-variant hover:bg-surface-container"
                        : "bg-secondary text-primary font-black hover:bg-secondary-light"
                    }`}
                  >
                    {m.is_verified ? "Revoke Badge" : "Verify Badge"}
                  </button>
                  <button
                    onClick={() => void onModerate(m, !m.is_active, m.is_verified)}
                    disabled={actingId === m.id}
                    className={`press rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      m.is_active ? "bg-error/10 text-error hover:bg-error/20" : "bg-success text-white hover:bg-success/90"
                    }`}
                  >
                    {m.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[40px] text-on-surface-variant/30">search_off</span>
            <p className="mt-2 font-display text-base text-primary">No members match your criteria</p>
            <p className="mt-1">Try clearing filters or search query.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================================================================
   MEMBER DETAIL DRAWER MODAL
   =================================================================== */
function MemberDetailModal({
  member,
  onClose,
  onModerate,
  actingId,
}: {
  member: MemberRow;
  onClose: () => void;
  onModerate: (m: MemberRow, nextActive: boolean, nextVerified: boolean) => Promise<void>;
  actingId: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-3xl border border-outline-variant/60 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-black text-white"
              style={{ backgroundColor: ROLE_COLORS[member.user_type] || "#0F5132" }}
            >
              {(member.display_name || member.full_name || "M").slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h3 className="font-display text-lg font-bold text-primary">
                {member.display_name || member.full_name || "Member Profile"}
              </h3>
              <p className="text-xs text-on-surface-variant">ID: {member.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container">
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-3 rounded-2xl bg-surface-container-low p-4 text-xs">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Role:</span>
            <span className="font-bold capitalize text-primary">{member.user_type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Email:</span>
            <span className="font-mono text-primary">{member.email || "Private / Unset"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Location:</span>
            <span className="font-semibold text-primary">{member.city || "Not specified"}, {member.province || "Pakistan"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Member Since:</span>
            <span className="font-semibold text-primary">{fmtDateTime(member.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Verified Status:</span>
            <span className={`font-bold ${member.is_verified ? "text-success" : "text-on-surface-variant"}`}>
              {member.is_verified ? "Verified Badge Active" : "Unverified"}
            </span>
          </div>
          {member.bio && (
            <div className="border-t border-outline-variant/30 pt-2">
              <span className="text-on-surface-variant">Bio:</span>
              <p className="mt-1 text-primary">{member.bio}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Link
            to={`/profile/${member.id}` as never}
            target="_blank"
            className="press rounded-xl border border-outline-variant/60 bg-white px-4 py-2 text-xs font-bold text-primary hover:bg-surface-container"
          >
            View Public Profile
          </Link>
          <button
            onClick={() => void onModerate(member, member.is_active, !member.is_verified)}
            disabled={actingId === member.id}
            className="press rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-container"
          >
            {member.is_verified ? "Revoke Verification" : "Award Verified Badge"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
   CONTENT & MARKETPLACE OVERSIGHT COMPONENT
   =================================================================== */
function ContentOversightTab({
  listings,
  projects,
  posts,
  onDeleteListing,
  onDeleteProject,
}: {
  listings: ListingRow[];
  projects: ProjectRow[];
  posts: PostRow[];
  onDeleteListing: (id: string) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
}) {
  const [contentView, setContentView] = useState<"listings" | "projects" | "posts">("listings");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-outline-variant/50 bg-white p-6 shadow-sm">
        <div>
          <h2 className="font-display text-xl font-bold text-primary">Content &amp; Marketplace Oversight</h2>
          <p className="text-xs text-on-surface-variant">Live pulse of commercial produce lots, RFPs, and clinical posts.</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-surface-container p-1 text-xs font-bold">
          <button
            onClick={() => setContentView("listings")}
            className={`rounded-lg px-3 py-1.5 transition ${contentView === "listings" ? "bg-white text-primary shadow-xs" : "text-on-surface-variant"}`}
          >
            Marketplace ({listings.length})
          </button>
          <button
            onClick={() => setContentView("projects")}
            className={`rounded-lg px-3 py-1.5 transition ${contentView === "projects" ? "bg-white text-primary shadow-xs" : "text-on-surface-variant"}`}
          >
            Projects/RFPs ({projects.length})
          </button>
          <button
            onClick={() => setContentView("posts")}
            className={`rounded-lg px-3 py-1.5 transition ${contentView === "posts" ? "bg-white text-primary shadow-xs" : "text-on-surface-variant"}`}
          >
            Clinical Cases ({posts.length})
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-outline-variant/50 bg-white p-6 shadow-sm">
        {contentView === "listings" && (
          <div className="divide-y divide-outline-variant/30">
            {listings.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-3.5 text-xs">
                <div>
                  <span className="font-bold text-primary">{l.title}</span>
                  <span className="ml-2 font-mono font-bold text-secondary">
                    ₨ {Number(l.price).toLocaleString()}
                  </span>
                  <span className="ml-2 text-on-surface-variant/60">{l.city || "Pakistan"} · {fmtDate(l.created_at)}</span>
                </div>
                <button onClick={() => void onDeleteListing(l.id)} className="press rounded-lg bg-error/10 px-2.5 py-1 text-xs font-bold text-error hover:bg-error/20">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {contentView === "projects" && (
          <div className="divide-y divide-outline-variant/30">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3.5 text-xs">
                <div>
                  <span className="font-bold text-primary">{p.title}</span>
                  <span className="ml-2 font-mono text-secondary">
                    Budget: ₨ {p.budget_max ? Number(p.budget_max).toLocaleString() : "Open"}
                  </span>
                  <span className="ml-2 text-on-surface-variant/60">{p.city || "Pakistan"} · {fmtDate(p.created_at)}</span>
                </div>
                <button onClick={() => void onDeleteProject(p.id)} className="press rounded-lg bg-error/10 px-2.5 py-1 text-xs font-bold text-error hover:bg-error/20">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {contentView === "posts" && (
          <div className="divide-y divide-outline-variant/30">
            {posts.map((post) => (
              <div key={post.id} className="flex items-center justify-between py-3.5 text-xs">
                <div>
                  <span className="font-bold text-primary">{post.title}</span>
                  <span className={`ml-2 rounded-md px-2 py-0.5 text-[10px] font-bold ${post.is_resolved ? "bg-success/15 text-success" : "bg-secondary/20 text-secondary"}`}>
                    {post.is_resolved ? "Resolved" : "Open Case"}
                  </span>
                  <span className="ml-2 text-on-surface-variant/60">{post.view_count || 0} views · {fmtDate(post.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================================================================
   CATEGORIES MANAGER COMPONENT
   =================================================================== */
function CategoriesTab({
  categories,
  actingId,
  onToggleState,
  onRefresh,
}: {
  categories: CategoryRow[];
  actingId: string;
  onToggleState: (c: CategoryRow) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-outline-variant/50 bg-white p-6 shadow-sm">
        <h2 className="font-display text-xl font-bold text-primary">24 Agricultural Industry Disciplines</h2>
        <p className="text-xs text-on-surface-variant">
          Control sector taxonomies used across the directory, classifieds, and project bidding boards.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className={`flex items-center justify-between rounded-2xl border p-4 shadow-xs transition ${
              cat.is_active ? "border-outline-variant/50 bg-white" : "border-error/20 bg-error/5 opacity-60"
            }`}
          >
            <div>
              <p className="font-bold text-primary">{cat.name}</p>
              <p className="font-mono text-[11px] text-on-surface-variant/70">slug: {cat.slug}</p>
            </div>
            <button
              onClick={() => void onToggleState(cat)}
              disabled={actingId === cat.id}
              className={`press rounded-xl px-3 py-1.5 text-xs font-bold ${
                cat.is_active ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-success text-white hover:bg-success/90"
              }`}
            >
              {cat.is_active ? "Active" : "Disabled"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===================================================================
   AUDIT TIMELINE COMPONENT
   =================================================================== */
function AuditTimelineTab({ auditRows }: { auditRows: AuditRow[] }) {
  return (
    <div className="rounded-3xl border border-outline-variant/50 bg-white p-6 shadow-sm">
      <h2 className="font-display text-xl font-bold text-primary">Administrative Audit Timeline</h2>
      <p className="text-xs text-on-surface-variant">Cryptographically auditable log of moderation and configuration events.</p>

      <div className="mt-6 space-y-4">
        {auditRows.map((row) => (
          <div key={row.id} className="relative flex gap-4 border-l-2 border-primary/20 pl-4">
            <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-secondary" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-primary">{row.action}</span>
                <span className="text-on-surface-variant/60">{fmtDateTime(row.created_at)}</span>
              </div>
              <p className="mt-1 text-xs text-on-surface-variant">
                Target: <span className="font-semibold text-primary">{row.target_table}</span>
                {row.target_id && <span className="ml-1 font-mono text-[11px]">({row.target_id})</span>}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

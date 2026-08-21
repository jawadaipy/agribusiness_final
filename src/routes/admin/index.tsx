/**
 * Super Admin control center. The route uses Evergreen, Harvest Gold, Rice
 * Canvas, and Slate Leaf only. It never uses mock sessions or sample records.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedPlatformProfile, type PlatformProfile } from "@/lib/member";

export const Route = createFileRoute("/admin/")({
  head: () => ({ title: "Super Admin | AgriBusiness Governance", meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: SuperAdminPage,
});

type Tab = "overview" | "members" | "ads" | "categories" | "audit";
type Metrics = { members: number; listings: number; projects: number; pendingAds: number; pendingConnections: number };
type MemberRow = { id: string; full_name: string | null; display_name: string | null; user_type: string; city: string | null; is_verified: boolean; is_active: boolean; created_at: string };
type AdRow = { id: string; profile_id: string; title: string; body: string | null; target_location: string | null; status: "pending" | "approved" | "rejected" | "expired"; created_at: string; rejection_reason: string | null };
type CategoryRow = { id: string; name: string; slug: string; sort_order: number; is_active: boolean };
type AuditRow = { id: string; action: string; target_table: string; target_id: string | null; created_at: string };

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "space_dashboard" },
  { id: "members", label: "Members", icon: "groups" },
  { id: "ads", label: "Ad review", icon: "campaign" },
  { id: "categories", label: "Categories", icon: "category" },
  { id: "audit", label: "Audit trail", icon: "history" },
];

function SuperAdminPage() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<PlatformProfile | null>(null);
  const [accessState, setAccessState] = useState<"checking" | "allowed" | "denied">("checking");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [metrics, setMetrics] = useState<Metrics>({ members: 0, listings: 0, projects: 0, pendingAds: 0, pendingConnections: 0 });
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [ads, setAds] = useState<AdRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [actingId, setActingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [rejectionTarget, setRejectionTarget] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    let mounted = true;
    const resolveAccess = async () => {
      const { user, profile } = await getAuthenticatedPlatformProfile();
      if (!mounted) return;
      if (!user) {
        setAccessState("denied");
        navigate({ to: "/onboarding", replace: true });
        return;
      }
      if (!profile || profile.user_type !== "admin") {
        setAccessState("denied");
        navigate({ to: "/dashboard", replace: true });
        return;
      }
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
    const [memberCount, listingCount, projectCount, pendingAdCount, connectionCount, membersResult, adsResult, categoriesResult, auditResult] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("listings").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("ads").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("connection_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profiles").select("id,full_name,display_name,user_type,city,is_verified,is_active,created_at").neq("user_type", "admin").order("created_at", { ascending: false }).limit(50),
      supabase.from("ads").select("id,profile_id,title,body,target_location,status,created_at,rejection_reason").eq("status", "pending").order("created_at", { ascending: false }).limit(50),
      supabase.from("categories").select("id,name,slug,sort_order,is_active").order("sort_order").limit(100),
      supabase.from("admin_audit_log").select("id,action,target_table,target_id,created_at").order("created_at", { ascending: false }).limit(50),
    ]);
    const firstError = [memberCount, listingCount, projectCount, pendingAdCount, connectionCount, membersResult, adsResult, categoriesResult, auditResult].find((result) => result.error)?.error;
    if (firstError) setError(firstError.message);
    setMetrics({ members: memberCount.count ?? 0, listings: listingCount.count ?? 0, projects: projectCount.count ?? 0, pendingAds: pendingAdCount.count ?? 0, pendingConnections: connectionCount.count ?? 0 });
    setMembers((membersResult.data ?? []) as MemberRow[]);
    setAds((adsResult.data ?? []) as AdRow[]);
    setCategories((categoriesResult.data ?? []) as CategoryRow[]);
    setAuditRows((auditResult.data ?? []) as AuditRow[]);
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
  const visibleMembers = members.filter((member) => `${member.display_name || ""} ${member.full_name || ""} ${member.user_type} ${member.city || ""}`.toLowerCase().includes(memberQuery.trim().toLowerCase()));

  if (accessState === "checking") return <div className="flex min-h-screen items-center justify-center bg-background"><div className="rounded-2xl border border-outline-variant/60 bg-white px-5 py-4 text-sm font-bold text-primary">Checking secure Super Admin access…</div></div>;
  if (accessState === "denied" || !admin) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="rounded-2xl border border-error/25 bg-white p-6 text-center"><span className="material-symbols-outlined text-3xl text-error">lock</span><p className="mt-2 font-bold text-primary">Super Admin access is required.</p></div></div>;

  return <div className="min-h-screen bg-background text-on-background"><div className="flex min-h-screen"><aside className="fixed inset-y-0 z-30 hidden w-72 flex-col bg-primary text-on-primary lg:flex"><div className="border-b border-white/10 p-7"><Link to="/" className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary"><span className="material-symbols-outlined text-[24px]">admin_panel_settings</span></span><div><p className="font-display text-lg">AgriBusiness</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-secondary-container">Super Admin</p></div></Link></div><nav className="flex-1 space-y-1 p-5">{tabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-xs font-bold transition ${activeTab === tab.id ? "bg-secondary text-primary" : "text-white/65 hover:bg-white/[0.08] hover:text-white"}`}><span className="material-symbols-outlined text-[19px]">{tab.icon}</span>{tab.label}</button>)}</nav><div className="border-t border-white/10 p-5"><Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold text-white/65 transition hover:bg-white/[0.08] hover:text-white"><span className="material-symbols-outlined text-[18px]">home</span>Public site</Link><button onClick={() => void signOut()} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold text-white/65 transition hover:bg-white/[0.08] hover:text-white"><span className="material-symbols-outlined text-[18px]">logout</span>Sign out</button></div></aside>
    <main className="min-w-0 flex-1 lg:ml-72"><header className="sticky top-0 z-20 flex h-[74px] items-center justify-between border-b border-outline-variant/60 bg-background/95 px-5 backdrop-blur-xl md:px-8"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant/65">Platform governance</p><h1 className="font-display text-xl text-primary">{tabs.find((tab) => tab.id === activeTab)?.label}</h1></div><div className="flex items-center gap-3"><button onClick={() => void loadData()} className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant/65 bg-white px-3 py-2 text-xs font-bold text-primary"><span className="material-symbols-outlined text-[16px]">refresh</span>Refresh</button><span className="hidden rounded-xl bg-primary px-3 py-2 text-xs font-bold text-on-primary sm:inline-block">{admin.display_name || admin.full_name || "Super Admin"}</span></div></header>
      <section className="mx-auto max-w-7xl p-5 md:p-8">{error ? <Notice tone="error" message={error} /> : null}{notice ? <Notice tone="success" message={notice} /> : null}{loadingData ? <div className="mt-5 rounded-2xl border border-outline-variant/60 bg-white p-5 text-sm text-on-surface-variant">Loading live platform records…</div> : <>{activeTab === "overview" && <Overview metrics={metrics} />}{activeTab === "members" && <MembersPanel members={visibleMembers} query={memberQuery} setQuery={setMemberQuery} actingId={actingId} onModerate={moderateMember} />}{activeTab === "ads" && <AdsPanel ads={ads} actingId={actingId} rejectionTarget={rejectionTarget} rejectionReason={rejectionReason} setRejectionTarget={setRejectionTarget} setRejectionReason={setRejectionReason} onModerate={moderateAd} />}{activeTab === "categories" && <CategoriesPanel categories={categories} actingId={actingId} onToggle={setCategoryState} />}{activeTab === "audit" && <AuditPanel rows={auditRows} />}</>}</section>
    </main></div></div>;
}

function Overview({ metrics }: { metrics: Metrics }) {
  const cards = [{ label: "Members", value: metrics.members, icon: "groups", help: "Registered, database-backed profiles" }, { label: "Listings", value: metrics.listings, icon: "inventory_2", help: "Marketplace records" }, { label: "Open projects", value: metrics.projects, icon: "work", help: "Project board records" }, { label: "Pending ad review", value: metrics.pendingAds, icon: "campaign", help: "Awaiting a decision" }, { label: "Pending connections", value: metrics.pendingConnections, icon: "group_add", help: "Recipient action required" }];
  return <div><div className="max-w-2xl"><p className="text-sm leading-6 text-on-surface-variant">These figures are live database counts, not dashboard examples. Use the focused operational tabs to moderate members, advertising, and categories through audited actions.</p></div><div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{cards.map((card) => <article key={card.label} className="rounded-2xl border border-outline-variant/60 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container"><span className="material-symbols-outlined">{card.icon}</span></span><span className="text-2xl font-bold text-primary">{card.value.toLocaleString()}</span></div><p className="mt-5 text-sm font-bold text-primary">{card.label}</p><p className="mt-1 text-[11px] leading-5 text-on-surface-variant">{card.help}</p></article>)}</div><div className="mt-7 rounded-2xl border border-outline-variant/60 bg-white p-6"><h2 className="font-display text-xl text-primary">Governance boundary</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">This panel intentionally omits browser-side billing edits, role reassignment, private-contact access, arbitrary exports, and bulk outreach. Those capabilities require separate audited server workflows before production release.</p></div></div>;
}

function MembersPanel({ members, query, setQuery, actingId, onModerate }: { members: MemberRow[]; query: string; setQuery: (value: string) => void; actingId: string; onModerate: (member: MemberRow, active: boolean, verified: boolean) => Promise<void> }) {
  return <div><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 className="font-display text-2xl text-primary">Member moderation</h2><p className="mt-1 text-xs leading-5 text-on-surface-variant">Activate, deactivate, verify, or unverify non-admin member profiles. Every change uses a protected audit function.</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-xl border border-outline-variant/65 bg-white px-3 py-2.5 text-xs text-primary outline-none focus:border-primary" placeholder="Search name, role, or city" /></div><div className="mt-6 overflow-hidden rounded-2xl border border-outline-variant/60 bg-white">{members.length ? <div className="divide-y divide-outline-variant/45">{members.map((member) => <article key={member.id} className="flex flex-col justify-between gap-4 p-5 lg:flex-row lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-primary">{member.display_name || member.full_name || "Unnamed member"}</p><span className="rounded-full bg-surface-container-low px-2 py-1 text-[9px] font-bold uppercase text-on-surface-variant">{member.user_type}</span>{member.is_verified ? <span className="rounded-full bg-secondary-container px-2 py-1 text-[9px] font-bold text-on-secondary-container">Verified</span> : null}{!member.is_active ? <span className="rounded-full bg-error/10 px-2 py-1 text-[9px] font-bold text-error">Inactive</span> : null}</div><p className="mt-1 text-[11px] text-on-surface-variant">{member.city || "No city set"} · Joined {new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", year: "numeric" }).format(new Date(member.created_at))}</p></div><div className="flex flex-wrap gap-2"><button disabled={actingId === member.id} onClick={() => void onModerate(member, !member.is_active, member.is_verified)} className="rounded-xl border border-outline-variant/65 px-3 py-2 text-xs font-bold text-primary disabled:opacity-50">{member.is_active ? "Deactivate" : "Activate"}</button><button disabled={actingId === member.id} onClick={() => void onModerate(member, member.is_active, !member.is_verified)} className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-50">{member.is_verified ? "Remove verification" : "Verify"}</button></div></article>)}</div> : <EmptyState icon="groups" title="No members found" text="There are no members matching this search. No example accounts are shown." />}</div></div>;
}

function AdsPanel({ ads, actingId, rejectionTarget, rejectionReason, setRejectionTarget, setRejectionReason, onModerate }: { ads: AdRow[]; actingId: string; rejectionTarget: string | null; rejectionReason: string; setRejectionTarget: (value: string | null) => void; setRejectionReason: (value: string) => void; onModerate: (ad: AdRow, status: "approved" | "rejected", reason?: string | null) => Promise<void> }) {
  return <div><h2 className="font-display text-2xl text-primary">Advertisement review</h2><p className="mt-1 text-xs leading-5 text-on-surface-variant">Approve or reject only real pending campaigns. Rejections require a reason and every decision is stored in the audit trail.</p><div className="mt-6 space-y-4">{ads.length ? ads.map((ad) => <article key={ad.id} className="rounded-2xl border border-outline-variant/60 bg-white p-5"><div className="flex flex-col justify-between gap-4 lg:flex-row"><div><div className="flex items-center gap-2"><h3 className="font-bold text-primary">{ad.title}</h3><span className="rounded-full bg-secondary-container px-2 py-1 text-[9px] font-bold uppercase text-on-secondary-container">{ad.status}</span></div><p className="mt-2 max-w-2xl text-xs leading-5 text-on-surface-variant">{ad.body || "No campaign description supplied."}</p><p className="mt-3 text-[11px] text-on-surface-variant">{ad.target_location || "No geographic target"} · Submitted {new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", year: "numeric" }).format(new Date(ad.created_at))}</p></div><div className="flex h-fit gap-2"><button disabled={actingId === ad.id} onClick={() => void onModerate(ad, "approved")} className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-50">Approve</button><button disabled={actingId === ad.id} onClick={() => { setRejectionTarget(ad.id); setRejectionReason(""); }} className="rounded-xl border border-error/30 px-3 py-2 text-xs font-bold text-error disabled:opacity-50">Reject</button></div></div>{rejectionTarget === ad.id ? <div className="mt-4 flex flex-col gap-2 border-t border-outline-variant/45 pt-4 sm:flex-row"><input value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} className="flex-1 rounded-xl border border-outline-variant/65 px-3 py-2 text-xs text-primary outline-none focus:border-primary" placeholder="Reason required for rejection" /><button disabled={!rejectionReason.trim() || actingId === ad.id} onClick={() => void onModerate(ad, "rejected", rejectionReason)} className="rounded-xl bg-error px-3 py-2 text-xs font-bold text-on-error disabled:opacity-50">Confirm rejection</button><button onClick={() => setRejectionTarget(null)} className="rounded-xl border border-outline-variant/65 px-3 py-2 text-xs font-bold text-primary">Cancel</button></div> : null}</article>) : <EmptyState icon="campaign" title="No pending ads" text="There are no real campaigns awaiting review." />}</div></div>;
}

function CategoriesPanel({ categories, actingId, onToggle }: { categories: CategoryRow[]; actingId: string; onToggle: (category: CategoryRow) => Promise<void> }) {
  return <div><h2 className="font-display text-2xl text-primary">Category operations</h2><p className="mt-1 text-xs leading-5 text-on-surface-variant">Activate or pause existing categories through an audited Super Admin action. Category creation and restructuring remain a controlled follow-up release.</p><div className="mt-6 overflow-hidden rounded-2xl border border-outline-variant/60 bg-white">{categories.length ? <div className="divide-y divide-outline-variant/45">{categories.map((category) => <article key={category.id} className="flex items-center justify-between gap-4 p-5"><div><p className="font-bold text-primary">{category.name}</p><p className="mt-1 text-[11px] text-on-surface-variant">/{category.slug} · Display order {category.sort_order}</p></div><button disabled={actingId === category.id} onClick={() => void onToggle(category)} className={`rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50 ${category.is_active ? "bg-primary text-on-primary" : "border border-outline-variant/65 text-primary"}`}>{category.is_active ? "Pause category" : "Activate category"}</button></article>)}</div> : <EmptyState icon="category" title="No categories found" text="No example category records are shown." />}</div></div>;
}

function AuditPanel({ rows }: { rows: AuditRow[] }) {
  return <div><h2 className="font-display text-2xl text-primary">Audit trail</h2><p className="mt-1 text-xs leading-5 text-on-surface-variant">This is an append-only view of Super Admin actions. It intentionally omits private contact fields from the browser.</p><div className="mt-6 overflow-hidden rounded-2xl border border-outline-variant/60 bg-white">{rows.length ? <div className="divide-y divide-outline-variant/45">{rows.map((row) => <article key={row.id} className="flex flex-col justify-between gap-2 p-5 sm:flex-row sm:items-center"><div><p className="font-bold text-primary">{row.action.replaceAll("_", " ")}</p><p className="mt-1 text-[11px] text-on-surface-variant">{row.target_table}{row.target_id ? ` · ${row.target_id.slice(0, 8)}…` : ""}</p></div><time className="text-[11px] text-on-surface-variant">{new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.created_at))}</time></article>)}</div> : <EmptyState icon="history" title="No audit events yet" text="Governance actions will appear here after the migration is applied and a Super Admin performs them." />}</div></div>;
}

function Notice({ tone, message }: { tone: "success" | "error"; message: string }) { return <div className={`mb-5 rounded-xl border p-3 text-xs leading-5 ${tone === "success" ? "border-primary/20 bg-primary/10 text-primary" : "border-error/25 bg-error/10 text-error"}`}>{message}</div>; }
function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) { return <div className="p-10 text-center"><span className="material-symbols-outlined text-4xl text-primary/30">{icon}</span><p className="mt-3 font-bold text-primary">{title}</p><p className="mt-1 text-xs leading-5 text-on-surface-variant">{text}</p></div>; }

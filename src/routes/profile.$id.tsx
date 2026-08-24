/**
 * Member Profile Page — AgriBusiness Pakistan.
 * Redesigned from scratch with modern light green & white aesthetics,
 * role-adaptive cover hero, consented contact sharing, active marketplace
 * lots, open project briefs, clinical insights, and inline profile editing.
 */
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import { roleDefinition } from "@/lib/roles";
import { CitySelect } from "@/components/shared/CitySelect";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile/$id")({
  head: () => ({
    meta: [
      { title: "Member Profile | AgriBusiness Pakistan" },
      { name: "description", content: "View verified agricultural member profile, listings, and project portfolio on AgriBusiness.pk." },
      { property: "og:title", content: "AgriBusiness Member Profile" },
      { property: "og:type", content: "profile" },
    ],
  }),
  component: ProfilePage,
});

type ProfileView = {
  id: string;
  fullName: string;
  userType: string;
  city: string;
  province: string;
  location: string;
  phone: string;
  email: string;
  bio: string;
  isVerified: boolean;
  avatarUrl: string;
  shareEmail: boolean;
  sharePhone: boolean;
  createdAt?: string;
};

type ConnectionState = {
  id: string;
  requester_profile_id: string;
  recipient_profile_id: string;
  status: "pending" | "accepted" | "declined" | "blocked" | "withdrawn";
};

type ContactCard = { email: string | null; phone: string | null };

type UserListing = {
  id: string;
  title: string;
  price: number;
  currency: string;
  city: string | null;
  unit: string | null;
  status: string;
  created_at: string;
};

type UserProject = {
  id: string;
  title: string;
  budget_max: number | null;
  city: string | null;
  status: string;
  created_at: string;
};

type UserClinicPost = {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
};

const ROLE_THEMES: Record<string, { badge: string; bg: string; text: string; icon: string; title: string }> = {
  farmer: { badge: "bg-emerald-100 text-emerald-800 border-emerald-300", bg: "from-emerald-700 to-emerald-900", text: "text-emerald-700", icon: "agriculture", title: "Grower / Farm Producer" },
  buyer: { badge: "bg-blue-100 text-blue-800 border-blue-300", bg: "from-blue-700 to-blue-900", text: "text-blue-700", icon: "storefront", title: "Institutional Buyer & Trader" },
  consultant: { badge: "bg-amber-100 text-amber-800 border-amber-300", bg: "from-amber-600 to-amber-800", text: "text-amber-700", icon: "stethoscope", title: "Agri Consultant & Agronomist" },
  company: { badge: "bg-purple-100 text-purple-800 border-purple-300", bg: "from-purple-700 to-purple-900", text: "text-purple-700", icon: "domain", title: "Agri-Tech & Input Enterprise" },
  student: { badge: "bg-yellow-100 text-yellow-800 border-yellow-300", bg: "from-yellow-600 to-yellow-800", text: "text-yellow-700", icon: "school", title: "Academic & Researcher" },
  admin: { badge: "bg-rose-100 text-rose-800 border-rose-300", bg: "from-rose-700 to-rose-900", text: "text-rose-700", icon: "shield_person", title: "Platform Administrator" },
};

function ProfilePage() {
  const { id } = useParams({ from: "/profile/$id" });
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [editForm, setEditForm] = useState<ProfileView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "listings" | "projects" | "clinic">("overview");

  // Activity portfolios
  const [userListings, setUserListings] = useState<UserListing[]>([]);
  const [userProjects, setUserProjects] = useState<UserProject[]>([]);
  const [userClinicPosts, setUserClinicPosts] = useState<UserClinicPost[]>([]);

  // Connection & privacy states
  const [connection, setConnection] = useState<ConnectionState | null>(null);
  const [connectionContact, setConnectionContact] = useState<ContactCard | null>(null);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionFeedback, setConnectionFeedback] = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState("");
  const [imgError, setImgError] = useState(false);

  const loadProfileData = async () => {
    setIsLoading(true);
    setImgError(false);
    setConnection(null);
    setConnectionContact(null);

    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id;
    const isSelfRoute = id === "me" || id === "self";

    if (isSelfRoute && !currentUserId) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }

    const effectiveId = isSelfRoute ? currentUserId! : id;
    const owner = currentUserId === effectiveId;
    setIsOwner(owner);

    // Fetch profile, private data, and public portfolios in parallel
    const [profileRes, privateRes, relationRes, listingsRes, projectsRes, clinicRes] = await Promise.all([
      owner
        ? supabase.from("profiles").select("*").eq("id", effectiveId).maybeSingle()
        : supabase.from("directory_profiles").select("*").eq("id", effectiveId).maybeSingle(),
      owner
        ? supabase.from("profile_private").select("*").eq("profile_id", effectiveId).maybeSingle()
        : Promise.resolve({ data: null, error: null as never }),
      !owner && currentUserId
        ? supabase
            .from("connection_requests")
            .select("id,requester_profile_id,recipient_profile_id,status")
            .or(`and(requester_profile_id.eq.${currentUserId},recipient_profile_id.eq.${effectiveId}),and(requester_profile_id.eq.${effectiveId},recipient_profile_id.eq.${currentUserId})`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null as never }),
      supabase.from("listings").select("id,title,price,currency,city,unit,status,created_at").eq("profile_id", effectiveId).limit(10),
      supabase.from("projects").select("id,title,budget_max,city,status,created_at").eq("profile_id", effectiveId).limit(10),
      supabase.from("feed_posts").select("id,title,category,status,created_at").eq("author_id", effectiveId).limit(10),
    ]);

    if (!profileRes.data) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    const p = profileRes.data;
    const priv = privateRes?.data;

    const loaded: ProfileView = {
      id: p.id,
      fullName: p.full_name || p.display_name || "AgriBusiness Member",
      userType: p.user_type || "farmer",
      city: p.city || "",
      province: p.province || "",
      location: p.location || [p.city, p.province].filter(Boolean).join(", ") || "Pakistan",
      phone: priv?.phone || "",
      email: owner ? authData.user?.email || "" : "",
      bio: p.bio || "",
      isVerified: p.is_verified === true,
      avatarUrl: p.avatar_url || "",
      shareEmail: priv?.share_email_with_connections === true,
      sharePhone: priv?.share_phone_with_connections === true,
      createdAt: p.created_at,
    };

    setProfile(loaded);
    setEditForm(loaded);
    setUserListings((listingsRes.data ?? []) as UserListing[]);
    setUserProjects((projectsRes.data ?? []) as UserProject[]);
    setUserClinicPosts((clinicRes.data ?? []) as UserClinicPost[]);

    const rel = relationRes?.data as ConnectionState | null;
    if (rel) {
      setConnection(rel);
      if (rel.status === "accepted") {
        const { data: contactData } = await supabase.rpc("get_accepted_connection_contact", {
          p_other_profile_id: effectiveId,
        });
        const contact = Array.isArray(contactData) ? contactData[0] : contactData;
        if (contact) {
          setConnectionContact({ email: contact.email ?? null, phone: contact.phone ?? null });
        }
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Save profile updates (Owner only)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !editForm || !isOwner) return;
    setSaveLoading(true);
    setSaveFeedback("");
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.fullName.trim(),
          city: editForm.city.trim() || null,
          province: editForm.province.trim() || null,
          bio: editForm.bio.trim() || null,
          avatar_url: editForm.avatarUrl.trim() || null,
        })
        .eq("id", profile.id);
      if (profileError) throw profileError;

      const { error: privateError } = await supabase
        .from("profile_private")
        .upsert({
          profile_id: profile.id,
          phone: editForm.phone.trim() || null,
          share_email_with_connections: editForm.shareEmail,
          share_phone_with_connections: editForm.sharePhone,
        });
      if (privateError) throw privateError;

      setProfile(editForm);
      setIsEditing(false);
      setSaveFeedback("Profile updated successfully!");
    } catch (err) {
      setSaveFeedback("Error saving profile: " + (err as Error).message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Connection request actions
  const handleConnectionAction = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      navigate({ to: "/onboarding" });
      return;
    }
    if (!profile) return;

    setConnectionLoading(true);
    const iAmRequester = connection?.requester_profile_id === authData.user.id;

    if (connection?.status === "pending" && iAmRequester) {
      await supabase
        .from("connection_requests")
        .update({ status: "withdrawn" })
        .eq("id", connection.id);
      setConnection({ ...connection, status: "withdrawn" });
      setConnectionFeedback("Connection request withdrawn.");
    } else if (!connection || connection.status === "withdrawn" || connection.status === "declined") {
      const { data, error } = await supabase
        .from("connection_requests")
        .insert({ requester_profile_id: authData.user.id, recipient_profile_id: profile.id, status: "pending" })
        .select("id,requester_profile_id,recipient_profile_id,status")
        .single();
      if (!error && data) {
        setConnection(data as ConnectionState);
        setConnectionFeedback("Connection request sent! Once accepted, direct WhatsApp and phone contacts will be shared.");
      }
    }
    setConnectionLoading(false);
  };

  const copyProfileLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2500);
  };

  const roleMeta = useMemo(() => {
    const r = profile?.userType || "farmer";
    return ROLE_THEMES[r] || {
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      bg: "from-emerald-700 to-emerald-900",
      text: "text-emerald-700",
      icon: "agriculture",
      title: "Grower / Farm Producer",
    };
  }, [profile?.userType]);

  const initials = profile?.fullName
    ? profile.fullName.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "AP";

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#F4F8F4] pt-20 pb-24 text-slate-800">
        {isLoading ? (
          <div className="mx-auto max-w-5xl px-4 py-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
            <p className="mt-3 text-xs font-semibold text-emerald-800">Loading verified member profile…</p>
          </div>
        ) : !profile ? (
          <div className="mx-auto max-w-lg px-4 py-20 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-400">person_off</span>
            <h2 className="mt-3 font-display text-xl font-bold text-slate-900">Member Profile Not Found</h2>
            <p className="mt-1 text-xs text-slate-500">This profile may have been deactivated or does not exist.</p>
            <Link to="/search" search={{ q: "" }} className="mt-5 inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white">
              Search Directory
            </Link>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            {/* Profile Cover & Header Card */}
            <div className="overflow-hidden rounded-3xl border border-emerald-200/80 bg-white shadow-sm">
              {/* Decorative Cover Banner */}
              <div className={`h-36 sm:h-44 w-full bg-gradient-to-r ${roleMeta.bg} relative p-6 flex items-end justify-between`}>
                <div className="pointer-events-none absolute inset-0 opacity-15 bg-field-grid" />
                <span className="relative z-10 font-mono text-[10px] font-bold uppercase tracking-widest text-white/80 bg-black/30 backdrop-blur-xs px-2.5 py-1 rounded-full">
                  AgriBusiness.pk Verified Profile
                </span>
                {profile.createdAt && (
                  <span className="relative z-10 text-[10px] text-white/70 font-mono hidden sm:inline">
                    Member Since {new Date(profile.createdAt).toLocaleDateString("en-PK", { month: "short", year: "numeric" })}
                  </span>
                )}
              </div>

              {/* Avatar + Primary Details */}
              <div className="relative px-6 pb-6 pt-0">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-14 mb-4">
                  {/* Avatar with Verified Badge */}
                  <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-2xl border-4 border-white bg-emerald-100 shadow-md overflow-hidden flex items-center justify-center">
                    {profile.avatarUrl && !imgError ? (
                      <img
                        src={profile.avatarUrl}
                        alt={profile.fullName}
                        onError={() => setImgError(true)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="font-display text-2xl font-bold text-emerald-800">{initials}</span>
                    )}
                    {profile.isVerified && (
                      <div className="absolute bottom-1 right-1 rounded-full bg-emerald-600 text-white p-1 shadow-xs border-2 border-white" title="Verified Trust Badge">
                        <span className="material-symbols-outlined text-[14px] font-bold block">verified</span>
                      </div>
                    )}
                  </div>

                  {/* Profile Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {isOwner ? (
                      <button
                        type="button"
                        onClick={() => setIsEditing(!isEditing)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-900 transition hover:bg-emerald-100"
                      >
                        <span className="material-symbols-outlined text-[16px]">{isEditing ? "close" : "edit"}</span>
                        {isEditing ? "Cancel Editing" : "Edit My Profile"}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleConnectionAction}
                          disabled={connectionLoading}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-xs ${
                            connection?.status === "accepted"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : connection?.status === "pending"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-emerald-700 text-white hover:bg-emerald-800"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {connection?.status === "accepted" ? "handshake" : connection?.status === "pending" ? "hourglass_top" : "person_add"}
                          </span>
                          {connection?.status === "accepted"
                            ? "Connected (Contacts Shared)"
                            : connection?.status === "pending"
                            ? "Request Pending (Withdraw)"
                            : "Request Direct Contact"}
                        </button>

                        <Link
                          to="/messages"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">chat</span>
                          Message
                        </Link>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={copyProfileLink}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                      title="Share public profile link"
                    >
                      <span className="material-symbols-outlined text-[16px]">share</span>
                      {copyFeedback && <span className="text-[10px] text-emerald-700">Copied!</span>}
                    </button>
                  </div>
                </div>

                {/* Identity Text */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">{profile.fullName}</h1>
                    <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${roleMeta.badge}`}>
                      <span className="material-symbols-outlined text-[13px]">{roleMeta.icon}</span>
                      {roleMeta.title}
                    </span>
                  </div>

                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600 pt-1">
                    <span className="material-symbols-outlined text-[15px] text-emerald-700">location_on</span>
                    <span>{profile.location}</span>
                    {profile.isVerified && (
                      <span className="ml-2 inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800 border border-emerald-200">
                        ✓ ID Verified
                      </span>
                    )}
                  </p>

                  <p className="text-xs text-slate-700 pt-2 leading-relaxed max-w-3xl">
                    {profile.bio || "This agricultural member has not added a detailed biography yet."}
                  </p>
                </div>

                {/* Connection Feedback Alert */}
                {connectionFeedback && (
                  <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">
                    {connectionFeedback}
                  </div>
                )}

                {/* Consented Contact Card Details (Unlocked after accepted connection or owner) */}
                {(isOwner || connectionContact) && (
                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-[#F8FAF7] p-4 text-xs">
                    <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                      <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-emerald-950">
                        <span className="material-symbols-outlined text-[16px] text-emerald-700">lock_open</span>
                        Consented Contact Details
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">Shared Privately</span>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
                          <span className="material-symbols-outlined text-[16px]">phone_iphone</span>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Direct Phone / WhatsApp</p>
                          <p className="font-mono font-bold text-slate-900">
                            {isOwner ? profile.phone || "Not configured" : connectionContact?.phone || "Private"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
                          <span className="material-symbols-outlined text-[16px]">mail</span>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Direct Email Address</p>
                          <p className="font-mono font-bold text-slate-900">
                            {isOwner ? profile.email : connectionContact?.email || "Private"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Inline Profile Editor (When isOwner & isEditing) */}
            {isOwner && isEditing && editForm && (
              <form onSubmit={handleSaveProfile} className="mt-6 rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm text-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-display text-base font-bold text-slate-900">Edit Your Public &amp; Private Profile</h3>
                  <p className="text-slate-500">Update your verified professional details and privacy sharing preferences.</p>
                </div>

                {saveFeedback && (
                  <div className="rounded-xl bg-emerald-50 p-3 text-emerald-800 font-bold border border-emerald-200">
                    {saveFeedback}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-bold text-emerald-950 uppercase text-[11px]">Full Display Name *</label>
                    <input
                      type="text"
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-emerald-950 uppercase text-[11px]">City / Tehsil</label>
                    <CitySelect
                      value={editForm.city}
                      onChange={(city) => setEditForm({ ...editForm, city })}
                      className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-emerald-950 uppercase text-[11px]">Bio &amp; Agricultural Experience</label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    rows={3}
                    placeholder="Describe your acreage, crop specializations, advisory services, or commercial offers..."
                    className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-bold text-emerald-950 uppercase text-[11px]">Direct Mobile / WhatsApp</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="0300 1234567"
                      className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-emerald-950 uppercase text-[11px]">Avatar Image URL</label>
                    <input
                      type="text"
                      value={editForm.avatarUrl}
                      onChange={(e) => setEditForm({ ...editForm, avatarUrl: e.target.value })}
                      placeholder="https://..."
                      className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Privacy checkboxes */}
                <div className="rounded-2xl bg-emerald-50/70 p-4 border border-emerald-100 space-y-2">
                  <p className="font-bold text-emerald-950">Consented Contact Sharing Preferences</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.sharePhone}
                      onChange={(e) => setEditForm({ ...editForm, sharePhone: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Share my phone number with accepted connections</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.shareEmail}
                      onChange={(e) => setEditForm({ ...editForm, shareEmail: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Share my email address with accepted connections</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="rounded-xl bg-emerald-700 px-5 py-2 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {saveLoading ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {/* Profile Activity Tabs */}
            <div className="mt-8 space-y-6">
              <div className="flex border-b border-emerald-200 bg-white rounded-2xl px-2 py-1.5 shadow-xs gap-1">
                {[
                  { id: "overview", label: "Overview & Credentials", icon: "badge" },
                  { id: "listings", label: `Marketplace Lots (${userListings.length})`, icon: "inventory_2" },
                  { id: "projects", label: `RFPs & Projects (${userProjects.length})`, icon: "work" },
                  { id: "clinic", label: `Clinical Insights (${userClinicPosts.length})`, icon: "medical_services" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as never)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                      activeTab === tab.id
                        ? "bg-emerald-700 text-white shadow-xs"
                        : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-950"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[17px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab 1: Overview */}
              {activeTab === "overview" && (
                <div className="grid gap-6 sm:grid-cols-3">
                  <div className="rounded-3xl border border-emerald-200/80 bg-white p-6 shadow-xs sm:col-span-2 space-y-4">
                    <h3 className="font-display text-base font-bold text-slate-900">About {profile.fullName}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {profile.bio || "No extended biography added."}
                    </p>

                    <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Operating Region</span>
                        <p className="font-semibold text-slate-900">{profile.location}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Account Role</span>
                        <p className="font-semibold text-slate-900 capitalize">{profile.userType}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-emerald-200/80 bg-white p-6 shadow-xs space-y-4">
                    <h3 className="font-display text-base font-bold text-slate-900">Trust &amp; Verification</h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                        <span className="font-semibold text-slate-800">Phone Verification</span>
                        <span className="text-emerald-700 font-bold">✓ Verified</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                        <span className="font-semibold text-slate-800">Identity Badge</span>
                        <span className="text-emerald-700 font-bold">{profile.isVerified ? "✓ Awarded" : "Member"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Marketplace Lots */}
              {activeTab === "listings" && (
                <div className="rounded-3xl border border-emerald-200/80 bg-white p-6 shadow-xs">
                  <h3 className="font-display text-base font-bold text-slate-900">Active Commercial Marketplace Lots</h3>
                  {userListings.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-400">No active produce or machinery listings published yet.</p>
                  ) : (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {userListings.map((l) => (
                        <div key={l.id} className="rounded-2xl border border-emerald-100 bg-[#F9FBF8] p-4 text-xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                                {l.city || "Pakistan"}
                              </span>
                              <span className="font-mono text-xs font-bold text-emerald-700">
                                ₨ {l.price.toLocaleString()}
                              </span>
                            </div>
                            <h4 className="mt-2 font-bold text-slate-900 text-sm">{l.title}</h4>
                          </div>
                          <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-end">
                            <Link to="/marketplace" className="text-xs font-bold text-emerald-700 hover:underline">
                              View in Marketplace →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Projects & RFPs */}
              {activeTab === "projects" && (
                <div className="rounded-3xl border border-emerald-200/80 bg-white p-6 shadow-xs">
                  <h3 className="font-display text-base font-bold text-slate-900">Open Project Tenders &amp; Sourcing RFPs</h3>
                  {userProjects.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-400">No open project briefs or procurement tenders.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {userProjects.map((p) => (
                        <div key={p.id} className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-xs flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{p.title}</h4>
                            <p className="text-blue-700 font-mono">
                              {p.budget_max ? `Budget: ₨ ${p.budget_max.toLocaleString()}` : "Open Budget"} · {p.city || "Pakistan"}
                            </p>
                          </div>
                          <Link to="/projects" className="rounded-xl bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800">
                            View RFP
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Clinic Insights */}
              {activeTab === "clinic" && (
                <div className="rounded-3xl border border-emerald-200/80 bg-white p-6 shadow-xs">
                  <h3 className="font-display text-base font-bold text-slate-900">Clinical Telehealth Cases &amp; Consultations</h3>
                  {userClinicPosts.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-400">No diagnostic inquiries on file.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {userClinicPosts.map((c) => (
                        <div key={c.id} className="rounded-2xl border border-slate-100 bg-[#F9FBF8] p-4 text-xs flex items-center justify-between">
                          <div>
                            <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                              {c.category}
                            </span>
                            <h4 className="mt-1 font-bold text-slate-900 text-sm">{c.title}</h4>
                          </div>
                          <span className="rounded-md bg-emerald-50 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-800 border border-emerald-200">
                            {c.status.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}

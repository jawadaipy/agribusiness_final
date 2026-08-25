/**
 * Member Profile Page — AgriBusiness Pakistan.
 * Redesigned with a modern light green & crisp white palette,
 * direct Product & Service listing creation, interactive role keywords,
 * familiar peer synergy networking, consented contact sharing, and
 * rich multi-category portfolio management.
 */
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import { CitySelect } from "@/components/shared/CitySelect";
import { uploadMedia } from "@/lib/storage";
import {
  fetchDirectoryWithKeywords,
  fetchMyKeywords,
  fetchConnectionPeerIds,
  saveProfileKeywords,
} from "@/lib/profile-enrichment";
import { suggestMatches, type MatchedProfile } from "@/lib/matching";
import { formatPKR } from "@/lib/format";
import type { AccountRole } from "@/lib/member";

export const Route = createFileRoute("/profile/$id")({
  head: () => ({
    meta: [
      { title: "Member Profile | AgriBusiness Pakistan" },
      { name: "description", content: "View verified agricultural member profile, products, services, and familiar network connections on AgriBusiness.pk." },
      { property: "og:title", content: "AgriBusiness Member Profile" },
      { property: "og:type", content: "profile" },
    ],
  }),
  component: ProfilePage,
});

type ProfileView = {
  id: string;
  fullName: string;
  userType: AccountRole;
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
  description: string | null;
  price: number | null;
  currency: string;
  city: string | null;
  location?: string | null;
  unit: string | null;
  quantity?: number | null;
  images?: string[] | null;
  status: string;
  created_at: string;
  category_id?: string | null;
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

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
};

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: "grains", name: "Wheat, Rice & Grains", slug: "grains" },
  { id: "cotton", name: "Cotton & Fibers", slug: "cotton" },
  { id: "fruits", name: "Citrus, Mango & Fruits", slug: "fruits" },
  { id: "vegetables", name: "Vegetables & Tubers", slug: "vegetables" },
  { id: "livestock", name: "Livestock, Dairy & Poultry", slug: "livestock" },
  { id: "solar", name: "Solar Tubewells & Energy", slug: "solar" },
  { id: "machinery", name: "Tractors & Farm Machinery", slug: "machinery" },
  { id: "seeds", name: "Hybrid Seeds & Fertilizers", slug: "seeds" },
  { id: "agronomy", name: "Agronomy & Soil Testing Services", slug: "agronomy" },
  { id: "vet", name: "Veterinary Advisory & Telehealth", slug: "vet" },
  { id: "drone", name: "Drone Spraying & Tech Services", slug: "drone" },
  { id: "storage", name: "Cold Storage & Logistics", slug: "storage" },
];

const DEFAULT_ROLE_THEME = {
  badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
  bg: "from-emerald-700 to-emerald-900",
  text: "text-emerald-700",
  icon: "agriculture",
  title: "Grower / Farm Producer",
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
  const [userKeywords, setUserKeywords] = useState<string[]>([]);
  const [editKeywordsInput, setEditKeywordsInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "listings" | "projects" | "clinic">("listings");
  const [listingFilter, setListingFilter] = useState<"all" | "products" | "services">("all");

  // Activity portfolios
  const [userListings, setUserListings] = useState<UserListing[]>([]);
  const [userProjects, setUserProjects] = useState<UserProject[]>([]);
  const [userClinicPosts, setUserClinicPosts] = useState<UserClinicPost[]>([]);

  // Connection & privacy states
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState | null>(null);
  const [connectionContact, setConnectionContact] = useState<ContactCard | null>(null);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionFeedback, setConnectionFeedback] = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState("");
  const [imgError, setImgError] = useState(false);

  // Synergy Recommendations
  const [synergyMatches, setSynergyMatches] = useState<MatchedProfile[]>([]);
  const [synergyLoading, setSynergyLoading] = useState(false);
  const [synergyRequested, setSynergyRequested] = useState<Record<string, boolean>>({});

  // Add Product / Service Modal State
  const [isAddListingOpen, setIsAddListingOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>(DEFAULT_CATEGORIES);
  const [listingSubmitting, setListingSubmitting] = useState(false);
  const [listingError, setListingError] = useState("");
  const [listingSuccess, setListingSuccess] = useState("");
  const [newListing, setNewListing] = useState({
    title: "",
    description: "",
    categoryId: "",
    listingKind: "product" as "product" | "service",
    price: "",
    unit: "per 40 kg (maund)",
    quantity: "",
    city: "",
    location: "",
    imageUrl: "",
  });
  const [pendingListingFile, setPendingListingFile] = useState<File | null>(null);

  const loadProfileData = async () => {
    setIsLoading(true);
    setImgError(false);
    setConnection(null);
    setConnectionContact(null);

    const { data: authData } = await supabase.auth.getUser();
    const curId = authData.user?.id || null;
    setCurrentUserId(curId);
    const isSelfRoute = id === "me" || id === "self";

    if (isSelfRoute && !curId) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }

    const effectiveId = isSelfRoute ? curId! : id;
    const owner = curId === effectiveId;
    setIsOwner(owner);

    // Fetch profile, private data, listings, projects, and keywords
    const [profileRes, privateRes, relationRes, listingsRes, projectsRes, clinicRes, categoriesRes] = await Promise.all([
      owner
        ? supabase.from("profiles").select("*").eq("id", effectiveId).maybeSingle()
        : supabase.from("directory_profiles").select("*").eq("id", effectiveId).maybeSingle(),
      owner
        ? supabase.from("profile_private").select("*").eq("profile_id", effectiveId).maybeSingle()
        : Promise.resolve({ data: null, error: null as never }),
      !owner && curId
        ? supabase
            .from("connection_requests")
            .select("id,requester_profile_id,recipient_profile_id,status")
            .or(`and(requester_profile_id.eq.${curId},recipient_profile_id.eq.${effectiveId}),and(requester_profile_id.eq.${effectiveId},recipient_profile_id.eq.${curId})`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null as never }),
      supabase
        .from("listings")
        .select("id,title,description,price,currency,city,location,unit,quantity,images,status,created_at,category_id")
        .eq("profile_id", effectiveId)
        .order("created_at", { ascending: false }),
      supabase.from("projects").select("id,title,budget_max,city,status,created_at").eq("profile_id", effectiveId).limit(10),
      supabase.from("problem_posts").select("id,title,category_id,is_resolved,created_at").eq("profile_id", effectiveId).limit(10),
      supabase.from("categories").select("id,name,slug").eq("is_active", true).order("sort_order", { ascending: true }),
    ]);

    if (!profileRes.data) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    const p = profileRes.data;
    const priv = privateRes?.data;
    const role = (p.user_type || "farmer") as AccountRole;

    const loaded: ProfileView = {
      id: p.id,
      fullName: p.full_name || p.display_name || "AgriBusiness Member",
      userType: role,
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
    setUserClinicPosts((clinicRes.data ?? []).map((c: { id: string; title: string; category_id: string; is_resolved: boolean; created_at: string }) => ({
      id: c.id,
      title: c.title,
      category: c.category_id || "General Farm Case",
      status: c.is_resolved ? "Resolved" : "Open In Clinic",
      created_at: c.created_at,
    })));

    if (categoriesRes.data && categoriesRes.data.length > 0) {
      setCategories(categoriesRes.data as CategoryOption[]);
    }

    // Load Keywords for this member
    const kw = await fetchMyKeywords(effectiveId, role);
    setUserKeywords(kw);
    setEditKeywordsInput(kw.join(", "));

    // Load Connection Status
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

    // Load Familiar / Synergy Matches
    void loadSynergySuggestions(loaded, kw);

    setIsLoading(false);
  };

  const loadSynergySuggestions = async (currentProfile: ProfileView, keywords: string[]) => {
    setSynergyLoading(true);
    try {
      const [directory, peerIds] = await Promise.all([
        fetchDirectoryWithKeywords(),
        fetchConnectionPeerIds(currentProfile.id),
      ]);

      if (!directory.error && directory.candidates.length > 0) {
        const matches = suggestMatches(
          {
            id: currentProfile.id,
            user_type: currentProfile.userType,
            city: currentProfile.city,
            keywords: keywords,
          },
          directory.candidates,
          peerIds,
          3,
        );
        setSynergyMatches(matches);
      }
    } catch {
      // Non-critical matching failure
    } finally {
      setSynergyLoading(false);
    }
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

      // Save updated keywords
      const parsedKeywords = editKeywordsInput
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
      await saveProfileKeywords(profile.id, profile.userType, parsedKeywords);
      setUserKeywords(parsedKeywords);

      setProfile(editForm);
      setIsEditing(false);
      setSaveFeedback("Profile and keywords updated successfully!");
      setTimeout(() => setSaveFeedback(""), 4000);
    } catch (err) {
      setSaveFeedback("Error saving profile: " + (err as Error).message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Create Product or Service Listing (Owner only)
  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !isOwner) return;
    if (!newListing.title.trim() || !newListing.price) {
      setListingError("Please provide a title and price.");
      return;
    }

    setListingSubmitting(true);
    setListingError("");
    setListingSuccess("");

    try {
      let finalImageUrl = newListing.imageUrl.trim() || null;

      if (pendingListingFile) {
        const uploadRes = await uploadMedia("listing-images", profile.id, pendingListingFile);
        if (uploadRes.url) {
          finalImageUrl = uploadRes.url;
        }
      }

      const priceNum = parseFloat(newListing.price);
      const qtyNum = newListing.quantity ? parseFloat(newListing.quantity) : null;
      const imagesArr = finalImageUrl ? [finalImageUrl] : [];

      const { data, error } = await supabase
        .from("listings")
        .insert({
          profile_id: profile.id,
          title: newListing.title.trim(),
          description: newListing.description.trim() || null,
          category_id: newListing.categoryId || null,
          price: isNaN(priceNum) ? 0 : priceNum,
          currency: "PKR",
          unit: newListing.unit || "per unit",
          quantity: qtyNum,
          city: newListing.city.trim() || profile.city || "Pakistan",
          location: newListing.location.trim() || profile.location || null,
          images: imagesArr,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setUserListings([data as UserListing, ...userListings]);
        setListingSuccess("✓ Product / Service listed successfully on your profile!");
        setNewListing({
          title: "",
          description: "",
          categoryId: "",
          listingKind: "product",
          price: "",
          unit: "per 40 kg (maund)",
          quantity: "",
          city: "",
          location: "",
          imageUrl: "",
        });
        setPendingListingFile(null);
        setTimeout(() => {
          setIsAddListingOpen(false);
          setListingSuccess("");
        }, 1200);
      }
    } catch (err) {
      setListingError("Failed to publish listing: " + (err as Error).message);
    } finally {
      setListingSubmitting(false);
    }
  };

  // Toggle listing status (active vs sold)
  const toggleListingStatus = async (item: UserListing) => {
    const nextStatus = item.status === "active" ? "sold" : "active";
    const { error } = await supabase.from("listings").update({ status: nextStatus }).eq("id", item.id);
    if (!error) {
      setUserListings(userListings.map((l) => (l.id === item.id ? { ...l, status: nextStatus } : l)));
    }
  };

  // Delete listing
  const handleDeleteListing = async (listingId: string) => {
    if (!confirm("Are you sure you want to remove this item from your profile?")) return;
    const { error } = await supabase.from("listings").delete().eq("id", listingId);
    if (!error) {
      setUserListings(userListings.filter((l) => l.id !== listingId));
    }
  };

  // Connect from Synergy recommendations
  const handleSynergyConnect = async (targetId: string) => {
    if (!currentUserId) {
      navigate({ to: "/onboarding" });
      return;
    }
    const { error } = await supabase
      .from("connection_requests")
      .insert({ requester_profile_id: currentUserId, recipient_profile_id: targetId, status: "pending" });
    if (!error || error.message.includes("duplicate")) {
      setSynergyRequested((prev) => ({ ...prev, [targetId]: true }));
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

  const handleAcceptConnection = async () => {
    if (!connection) return;
    setConnectionLoading(true);
    const { error } = await supabase
      .from("connection_requests")
      .update({ status: "accepted" })
      .eq("id", connection.id);
    if (!error) {
      setConnection({ ...connection, status: "accepted" });
      setConnectionFeedback("Connection accepted! Direct contact details are now exchanged.");
    }
    setConnectionLoading(false);
  };

  const handleDeclineConnection = async () => {
    if (!connection) return;
    setConnectionLoading(true);
    const { error } = await supabase
      .from("connection_requests")
      .update({ status: "declined" })
      .eq("id", connection.id);
    if (!error) {
      setConnection({ ...connection, status: "declined" });
      setConnectionFeedback("Connection request declined.");
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
    return ROLE_THEMES[r] ?? DEFAULT_ROLE_THEME;
  }, [profile?.userType]);

  const initials = profile?.fullName
    ? profile.fullName.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "AP";

  const filteredUserListings = useMemo(() => {
    if (listingFilter === "all") return userListings;
    if (listingFilter === "services") {
      return userListings.filter(
        (l) =>
          (l.unit && (l.unit.includes("consultation") || l.unit.includes("visit") || l.unit.includes("hour") || l.unit.includes("acre"))) ||
          (l.title && (l.title.toLowerCase().includes("service") || l.title.toLowerCase().includes("advisory") || l.title.toLowerCase().includes("testing") || l.title.toLowerCase().includes("spray"))),
      );
    }
    return userListings.filter(
      (l) =>
        !(
          (l.unit && (l.unit.includes("consultation") || l.unit.includes("visit") || l.unit.includes("hour"))) ||
          (l.title && (l.title.toLowerCase().includes("advisory") || l.title.toLowerCase().includes("consultation")))
        ),
    );
  }, [userListings, listingFilter]);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#F4F8F4] pt-20 pb-24 text-slate-800">
        {isLoading ? (
          <div className="mx-auto max-w-5xl px-4 py-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
            <p className="mt-3 text-xs font-semibold text-emerald-800">Loading verified member profile &amp; offerings…</p>
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
                  AgriBusiness.pk {profile.isVerified ? "Verified Member" : "Agricultural Member"}
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
                      <div className="absolute bottom-1 right-1 rounded-full bg-emerald-600 text-white p-1 shadow-xs border-2 border-white" title="Verified Trust Badge Awarded">
                        <span className="material-symbols-outlined text-[14px] font-bold block">verified</span>
                      </div>
                    )}
                  </div>

                  {/* Profile Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {isOwner ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsAddListingOpen(true)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:from-emerald-700 hover:to-emerald-800 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">add_box</span>
                          + List Product or Service
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsEditing(!isEditing)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900 transition hover:bg-emerald-100 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">{isEditing ? "close" : "edit"}</span>
                          {isEditing ? "Cancel" : "Edit Profile"}
                        </button>
                      </>
                    ) : (
                      <>
                        {connection?.status === "pending" && connection.requester_profile_id !== currentUserId ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleAcceptConnection}
                              disabled={connectionLoading}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-800 shadow-xs disabled:opacity-60 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                              Accept Request
                            </button>
                            <button
                              type="button"
                              onClick={handleDeclineConnection}
                              disabled={connectionLoading}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                              Decline
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleConnectionAction}
                            disabled={connectionLoading}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
                              connection?.status === "accepted"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : connection?.status === "pending"
                                ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
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
                              : "Connect & Request Contact"}
                          </button>
                        )}

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
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 cursor-pointer"
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
                        ✓ Verified Badge
                      </span>
                    )}
                  </p>

                  <p className="text-xs text-slate-700 pt-2 leading-relaxed max-w-3xl">
                    {profile.bio || "This agricultural member has not added a detailed biography yet."}
                  </p>

                  {/* Role Keywords Badges */}
                  {userKeywords.length > 0 && (
                    <div className="pt-3 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 mr-1">Specializations:</span>
                      {userKeywords.map((kw) => (
                        <Link
                          key={kw}
                          to="/search"
                          search={{ q: kw }}
                          className="rounded-lg bg-emerald-50 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
                        >
                          #{kw}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Connection Feedback Alert */}
                {connectionFeedback && (
                  <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">
                    {connectionFeedback}
                  </div>
                )}

                {/* Consented Contact Card Details */}
                {(isOwner || connectionContact) && (
                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-[#F8FAF7] p-4 text-xs">
                    <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                      <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-emerald-950">
                        <span className="material-symbols-outlined text-[16px] text-emerald-700">lock_open</span>
                        Consented Contact Details
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">Shared Privately Upon Mutual Consent</span>
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

            {/* Inline Profile & Keywords Editor (When isOwner & isEditing) */}
            {isOwner && isEditing && editForm && (
              <form onSubmit={handleSaveProfile} className="mt-6 rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm text-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-display text-base font-bold text-slate-900">Edit Your Public Profile &amp; Keywords</h3>
                  <p className="text-slate-500">Update your details, crops/services keywords, and contact sharing preferences.</p>
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
                    <label className="block font-bold text-emerald-950 uppercase text-[11px]">City / District</label>
                    <CitySelect
                      value={editForm.city}
                      onChange={(city) => setEditForm({ ...editForm, city })}
                      className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-emerald-950 uppercase text-[11px]">
                    Keywords &amp; Crops / Services / Commodities (comma separated)
                  </label>
                  <input
                    type="text"
                    value={editKeywordsInput}
                    onChange={(e) => setEditKeywordsInput(e.target.value)}
                    placeholder="e.g. Wheat, Basmati Rice, Solar Tubewell, Soil Testing, Citrus"
                    className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    These keywords help similar growers, buyers, and agronomists discover and connect with your profile.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-emerald-950 uppercase text-[11px]">Bio &amp; Agricultural Experience</label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    rows={3}
                    placeholder="Describe your acreage, crop specializations, advisory packages, or commercial offers..."
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
                    <span>Share my phone / WhatsApp with accepted connections</span>
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
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="rounded-xl bg-emerald-700 px-5 py-2 font-bold text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                  >
                    {saveLoading ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {/* Profile Activity Tabs */}
            <div className="mt-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200 bg-white rounded-2xl p-2 shadow-xs">
                <div className="flex gap-1 flex-wrap">
                  {[
                    { id: "listings", label: `Products & Services (${userListings.length})`, icon: "storefront" },
                    { id: "overview", label: "Overview & Credentials", icon: "badge" },
                    { id: "projects", label: `Tenders & RFPs (${userProjects.length})`, icon: "work" },
                    { id: "clinic", label: `Clinical Inquiries (${userClinicPosts.length})`, icon: "medical_services" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as never)}
                      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
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

                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setIsAddListingOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    + List Product or Service
                  </button>
                )}
              </div>

              {/* TAB 1: PRODUCTS & SERVICES PORTFOLIO */}
              {activeTab === "listings" && (
                <div className="rounded-3xl border border-emerald-200/80 bg-white p-6 shadow-xs space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="font-display text-lg font-bold text-slate-900">
                        {isOwner ? "Your Listed Products & Services" : `${profile.fullName}'s Products & Services`}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Active produce lots, agricultural machinery, farm inputs, and specialist consulting services
                      </p>
                    </div>

                    <div className="flex rounded-xl border border-emerald-200 bg-emerald-50 p-0.5 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setListingFilter("all")}
                        className={`rounded-lg px-3 py-1 transition cursor-pointer ${
                          listingFilter === "all" ? "bg-emerald-700 text-white shadow-xs" : "text-emerald-800 hover:text-emerald-950"
                        }`}
                      >
                        All ({userListings.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setListingFilter("products")}
                        className={`rounded-lg px-3 py-1 transition cursor-pointer ${
                          listingFilter === "products" ? "bg-emerald-700 text-white shadow-xs" : "text-emerald-800 hover:text-emerald-950"
                        }`}
                      >
                        Products &amp; Produce
                      </button>
                      <button
                        type="button"
                        onClick={() => setListingFilter("services")}
                        className={`rounded-lg px-3 py-1 transition cursor-pointer ${
                          listingFilter === "services" ? "bg-emerald-700 text-white shadow-xs" : "text-emerald-800 hover:text-emerald-950"
                        }`}
                      >
                        Services &amp; Advisory
                      </button>
                    </div>
                  </div>

                  {filteredUserListings.length === 0 ? (
                    <div className="py-12 text-center">
                      <span className="material-symbols-outlined text-4xl text-slate-300">inventory_2</span>
                      <h4 className="mt-2 font-bold text-slate-700 text-sm">No items listed in this category yet</h4>
                      <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                        {isOwner
                          ? "Showcase your crops, livestock, fertilizers, machinery, or advisory services directly on your public profile."
                          : "This member has not listed any commercial offerings in this category."}
                      </p>
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => setIsAddListingOpen(true)}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 shadow-xs cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">add_box</span>
                          Add Your First Listing
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredUserListings.map((item) => {
                        const img = item.images && item.images.length > 0 ? item.images[0] : null;
                        const isSold = item.status === "sold";
                        return (
                          <div
                            key={item.id}
                            className={`rounded-2xl border p-4 text-xs flex flex-col justify-between transition hover:shadow-md ${
                              isSold ? "border-slate-200 bg-slate-50/80 opacity-75" : "border-emerald-100 bg-[#F9FBF8]"
                            }`}
                          >
                            <div className="space-y-3">
                              {/* Listing Image */}
                              {img ? (
                                <div className="h-36 w-full rounded-xl overflow-hidden bg-slate-100 border border-emerald-100/60">
                                  <img src={img} alt={item.title} className="h-full w-full object-cover" />
                                </div>
                              ) : (
                                <div className="h-28 w-full rounded-xl bg-emerald-100/60 flex items-center justify-center text-emerald-800">
                                  <span className="material-symbols-outlined text-3xl">storefront</span>
                                </div>
                              )}

                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                                    {item.city || "Pakistan"}
                                  </span>
                                  <span className={`font-mono text-xs font-bold ${isSold ? "text-slate-500 line-through" : "text-emerald-700"}`}>
                                    {item.price !== null && item.price !== undefined ? formatPKR(item.price) : "Price on request"}
                                    {item.unit && <span className="text-[10px] font-normal text-slate-500"> / {item.unit}</span>}
                                  </span>
                                </div>

                                <h4 className="mt-2 font-bold text-slate-900 text-sm leading-snug">{item.title}</h4>
                                {item.description && (
                                  <p className="mt-1 line-clamp-2 text-slate-600 text-[11px] leading-relaxed">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Footer Controls */}
                            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                  isSold ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {isSold ? "Marked Sold" : "Active Available"}
                              </span>

                              {isOwner ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => toggleListingStatus(item)}
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                                    title="Toggle Sold / Active"
                                  >
                                    {isSold ? "Reactivate" : "Mark Sold"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteListing(item.id)}
                                    className="rounded-lg bg-rose-50 border border-rose-200 p-1 text-rose-700 hover:bg-rose-100 cursor-pointer"
                                    title="Remove listing"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                  </button>
                                </div>
                              ) : (
                                <Link
                                  to="/messages"
                                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                                >
                                  Inquire Item →
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: OVERVIEW & CREDENTIALS */}
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
                        <span className="font-semibold text-slate-800">Trust Badge</span>
                        <span className="text-emerald-700 font-bold">{profile.isVerified ? "✓ Awarded" : "Member"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PROJECTS & RFPS */}
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

              {/* TAB 4: CLINICAL INSIGHTS */}
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

              {/* FAMILIAR PEERS & SYNERGY NETWORK WIDGET */}
              <div className="rounded-3xl border border-emerald-200/80 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">
                      Familiar Peers &amp; Synergy Network
                    </h3>
                    <p className="text-xs text-slate-500">
                      Discovered members matching your crops, commodities, advisory specializations, and roles
                    </p>
                  </div>
                  <Link
                    to="/search"
                    search={{ q: userKeywords[0] || "" }}
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    Explore Directory →
                  </Link>
                </div>

                {synergyLoading ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
                    ))}
                  </div>
                ) : synergyMatches.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">
                    Add more keywords (crops, commodities, services) to discover matching peers across Pakistan.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {synergyMatches.map((match) => {
                      const matchInitials = (match.display_name || "M")
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase();
                      const isConnected = synergyRequested[match.id];

                      return (
                        <div
                          key={match.id}
                          className="rounded-2xl border border-emerald-100 bg-[#F9FBF8] p-4 text-xs flex flex-col justify-between space-y-3"
                        >
                          <div>
                            <div className="flex items-start gap-2.5">
                              <div className="h-9 w-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {matchInitials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <Link
                                  to="/profile/$id"
                                  params={{ id: match.id }}
                                  className="font-bold text-slate-900 hover:text-emerald-700 line-clamp-1"
                                >
                                  {match.display_name || "Agri Member"}
                                </Link>
                                <span className="text-[10px] uppercase font-bold text-emerald-800">
                                  {match.user_type} · {match.city || "Pakistan"}
                                </span>
                              </div>
                            </div>

                            {/* Synergy reasons */}
                            {match.reasons && match.reasons.length > 0 && (
                              <div className="mt-2.5 space-y-1">
                                {match.reasons.map((reason, idx) => (
                                  <p key={idx} className="flex items-center gap-1 text-[11px] text-slate-600">
                                    <span className="material-symbols-outlined text-[13px] text-emerald-600">check_circle</span>
                                    <span>{reason}</span>
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <Link
                              to="/profile/$id"
                              params={{ id: match.id }}
                              className="text-[11px] font-bold text-slate-600 hover:text-slate-900"
                            >
                              View Profile
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleSynergyConnect(match.id)}
                              disabled={isConnected}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                                isConnected
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs"
                              }`}
                            >
                              {isConnected ? "Requested ✓" : "Connect"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: ADD PRODUCT OR SERVICE LISTING (Owner Only) */}
      {isAddListingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-emerald-200 bg-white p-6 text-xs shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                  <span className="material-symbols-outlined text-[20px]">add_business</span>
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">List New Product or Service</h3>
                  <p className="text-[11px] text-slate-500">Showcase directly on your verified profile and national marketplace</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddListingOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {listingError && (
              <div className="rounded-xl bg-rose-50 p-3 text-rose-800 font-bold border border-rose-200">
                {listingError}
              </div>
            )}

            {listingSuccess && (
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-800 font-bold border border-emerald-200">
                {listingSuccess}
              </div>
            )}

            <form onSubmit={handleCreateListing} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-emerald-50 p-1">
                <button
                  type="button"
                  onClick={() => setNewListing({ ...newListing, listingKind: "product", unit: "per 40 kg (maund)" })}
                  className={`rounded-xl py-2 font-bold text-xs transition cursor-pointer ${
                    newListing.listingKind === "product" ? "bg-emerald-700 text-white shadow-xs" : "text-emerald-900 hover:bg-emerald-100"
                  }`}
                >
                  🌾 Produce &amp; Physical Product
                </button>
                <button
                  type="button"
                  onClick={() => setNewListing({ ...newListing, listingKind: "service", unit: "per acre" })}
                  className={`rounded-xl py-2 font-bold text-xs transition cursor-pointer ${
                    newListing.listingKind === "service" ? "bg-emerald-700 text-white shadow-xs" : "text-emerald-900 hover:bg-emerald-100"
                  }`}
                >
                  🩺 Advisory &amp; Technical Service
                </button>
              </div>

              <div>
                <label className="block font-bold text-emerald-950 uppercase text-[11px]">
                  {newListing.listingKind === "product" ? "Product / Lot Title *" : "Service / Package Title *"}
                </label>
                <input
                  type="text"
                  value={newListing.title}
                  onChange={(e) => setNewListing({ ...newListing, title: e.target.value })}
                  placeholder={
                    newListing.listingKind === "product"
                      ? "e.g. Super Basmati Rice 1121 Paddy (Grade A) or 15HP Solar Tubewell"
                      : "e.g. Comprehensive Soil Nutrients & PH Testing or Drone Spraying Service"
                  }
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-slate-900 outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-emerald-950 uppercase text-[11px]">Category</label>
                  <select
                    value={newListing.categoryId}
                    onChange={(e) => setNewListing({ ...newListing, categoryId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-slate-900 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-emerald-950 uppercase text-[11px]">City / Location</label>
                  <CitySelect
                    value={newListing.city || (profile ? profile.city : "")}
                    onChange={(city) => setNewListing({ ...newListing, city })}
                    className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-slate-900 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block font-bold text-emerald-950 uppercase text-[11px]">Price (PKR) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newListing.price}
                    onChange={(e) => setNewListing({ ...newListing, price: e.target.value })}
                    placeholder="e.g. 4500"
                    className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-slate-900 outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-emerald-950 uppercase text-[11px]">Pricing Unit</label>
                  <select
                    value={newListing.unit}
                    onChange={(e) => setNewListing({ ...newListing, unit: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-slate-900 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="per 40 kg (maund)">per 40 kg (maund)</option>
                    <option value="per kg">per kg</option>
                    <option value="per ton">per ton</option>
                    <option value="per acre">per acre</option>
                    <option value="per consultation">per consultation</option>
                    <option value="per visit">per farm visit</option>
                    <option value="per hour">per hour</option>
                    <option value="per unit">per unit</option>
                    <option value="per bag">per bag (50 kg)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-emerald-950 uppercase text-[11px]">
                    {newListing.listingKind === "product" ? "Available Quantity" : "Capacity"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newListing.quantity}
                    onChange={(e) => setNewListing({ ...newListing, quantity: e.target.value })}
                    placeholder="e.g. 200"
                    className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-slate-900 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-emerald-950 uppercase text-[11px]">Description &amp; Specifications</label>
                <textarea
                  value={newListing.description}
                  onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
                  rows={3}
                  placeholder="Detail moisture levels, seed purity, brand specifications, delivery options, or consulting methodology..."
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-slate-900 outline-none focus:border-emerald-500"
                />
              </div>

              {/* Media upload */}
              <div>
                <label className="block font-bold text-emerald-950 uppercase text-[11px]">Product / Service Image</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={newListing.imageUrl}
                    onChange={(e) => setNewListing({ ...newListing, imageUrl: e.target.value })}
                    placeholder="https://... or upload photo directly"
                    className="flex-1 rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-slate-900 outline-none focus:border-emerald-500"
                  />
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white transition hover:bg-emerald-800">
                    <span className="material-symbols-outlined text-[16px]">upload_file</span>
                    <span>{pendingListingFile ? "Selected" : "Upload"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setPendingListingFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                {pendingListingFile && (
                  <p className="mt-1 text-[11px] text-emerald-700 font-mono">
                    Ready to upload: {pendingListingFile.name}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddListingOpen(false)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={listingSubmitting}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-2.5 font-bold text-white hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {listingSubmitting ? "Publishing to Profile…" : "🚀 Publish to Profile & Marketplace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

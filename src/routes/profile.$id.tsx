/**
 * Secure public profile: public directory data for visitors and consented
 * contact sharing for accepted connections only. No public phone/email access.
 */
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { CitySelect } from "@/components/shared/CitySelect";

export const Route = createFileRoute("/profile/$id")({
  head: () => ({
    title: "Member Profile | AgriBusiness Pakistan",
    meta: [
      { name: "description", content: "View an AgriBusiness member's public professional profile." },
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
};

type ConnectionState = {
  id: string;
  requester_profile_id: string;
  recipient_profile_id: string;
  status: "pending" | "accepted" | "declined" | "blocked" | "withdrawn";
};

type ContactCard = { email: string | null; phone: string | null };

function ProfilePage() {
  const { id } = useParams({ from: "/profile/$id" });
  const navigate = useNavigate();
  const { isRTL } = useTranslation();
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [editForm, setEditForm] = useState<ProfileView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState("");
  const [connection, setConnection] = useState<ConnectionState | null>(null);
  const [connectionContact, setConnectionContact] = useState<ContactCard | null>(null);
  const [contactNotice, setContactNotice] = useState("");
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionFeedback, setConnectionFeedback] = useState("");
  const [imgError, setImgError] = useState(false);

  const loadProfile = async () => {
    setIsLoading(true);
    setError("");
    setImgError(false);
    setConnection(null);
    setConnectionContact(null);
    setContactNotice("");

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

    const profileResult = owner
      ? await supabase
          .from("profiles")
          .select("id,user_type,full_name,display_name,bio,avatar_url,city,province,location,is_verified")
          .eq("id", effectiveId)
          .maybeSingle()
      : await supabase
          .from("directory_profiles")
          .select("id,user_type,display_name,bio,avatar_url,city,province,location,is_verified")
          .eq("id", effectiveId)
          .maybeSingle();

    if (profileResult.error || !profileResult.data) {
      setError("This public profile is unavailable right now.");
      setProfile(null);
      setEditForm(null);
      setIsLoading(false);
      return;
    }

    // Owner-only private data loads in parallel with the connection check.
    const [privateResult, relationResult] = await Promise.all([
      owner
        ? supabase
            .from("profile_private")
            .select("phone,share_email_with_connections,share_phone_with_connections")
            .eq("profile_id", effectiveId)
            .maybeSingle()
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
    ]);

    let privatePhone = "";
    let shareEmail = false;
    let sharePhone = false;
    if (owner && !privateResult.error && privateResult.data) {
      privatePhone = privateResult.data.phone ?? "";
      shareEmail = privateResult.data.share_email_with_connections === true;
      sharePhone = privateResult.data.share_phone_with_connections === true;
    }

    const data = profileResult.data;
    const loaded: ProfileView = {
      id: data.id,
      fullName: data.display_name || ("full_name" in data ? data.full_name : null) || "Profile name not set",
      userType: data.user_type || "member",
      city: data.city || "",
      province: data.province || "",
      location: data.location || [data.city, data.province].filter(Boolean).join(", ") || "Location not set",
      phone: privatePhone,
      email: owner ? authData.user?.email ?? "" : "",
      bio: data.bio || "",
      isVerified: data.is_verified === true,
      avatarUrl: data.avatar_url || "",
      shareEmail,
      sharePhone,
    };
    setProfile(loaded);
    setEditForm(loaded);

    const relation = relationResult.data as ConnectionState | null;
    if (relation) {
      setConnection(relation);
      if (relation.status === "accepted") {
        const { data: contactData, error: contactError } = await supabase.rpc(
          "get_accepted_connection_contact",
          { p_other_profile_id: effectiveId },
        );
        const contact = Array.isArray(contactData) ? contactData[0] : contactData;
        if (contactError) {
          setContactNotice("You are connected. Shared contact details appear once both members have saved their sharing preferences.");
        } else {
          setConnectionContact(contact ? { email: contact.email ?? null, phone: contact.phone ?? null } : null);
        }
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile || !editForm || !isOwner) return;
    setSaveLoading(true);
    setSaveFeedback("");

    const profileResult = await supabase
      .from("profiles")
      .update({
        full_name: editForm.fullName.trim(),
        city: editForm.city.trim() || null,
        bio: editForm.bio.trim() || null,
        avatar_url: editForm.avatarUrl.trim() || null,
      })
      .eq("id", profile.id);

    const privateResult = await supabase
      .from("profile_private")
      .upsert(
        { profile_id: profile.id, email: profile.email, phone: editForm.phone.trim() || null },
        { onConflict: "profile_id" },
      );

    let preferencesError: { message: string } | null = null;
    if (!privateResult.error) {
      const preferencesResult = await supabase
        .from("profile_private")
        .update({
          share_email_with_connections: editForm.shareEmail,
          share_phone_with_connections: editForm.sharePhone,
        })
        .eq("profile_id", profile.id);
      if (preferencesResult.error && !preferencesResult.error.message.toLowerCase().includes("share_")) {
        preferencesError = preferencesResult.error;
      }
    }

    if (profileResult.error || privateResult.error || preferencesError) {
      setSaveFeedback(profileResult.error?.message || privateResult.error?.message || preferencesError?.message || "Profile could not be saved.");
      setSaveLoading(false);
      return;
    }

    const saved: ProfileView = {
      ...editForm,
      fullName: editForm.fullName.trim(),
      city: editForm.city.trim(),
      location: [editForm.city.trim(), editForm.province].filter(Boolean).join(", ") || "Location not set",
      bio: editForm.bio.trim(),
      phone: editForm.phone.trim(),
      avatarUrl: editForm.avatarUrl.trim(),
    };
    setProfile(saved);
    setEditForm(saved);
    setSaveFeedback("Profile and connection contact preferences saved securely.");
    setSaveLoading(false);
    setIsEditing(false);
  };

  const handleConnectionAction = async () => {
    if (!profile || isOwner || connectionLoading) return;
    setConnectionFeedback("");
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      navigate({ to: "/onboarding" });
      return;
    }
    setConnectionLoading(true);

    const iAmRequester = connection?.requester_profile_id === authData.user.id;
    if (connection?.status === "pending" && iAmRequester) {
      const { error: withdrawError } = await supabase
        .from("connection_requests")
        .update({ status: "withdrawn" })
        .eq("id", connection.id)
        .eq("requester_profile_id", authData.user.id);
      if (withdrawError) setConnectionFeedback(withdrawError.message);
      else {
        setConnection({ ...connection, status: "withdrawn" });
        setConnectionFeedback("Connection request withdrawn.");
      }
    } else if (!connection || connection.status === "withdrawn" || connection.status === "declined") {
      const { data, error: requestError } = await supabase
        .from("connection_requests")
        .insert({ requester_profile_id: authData.user.id, recipient_profile_id: profile.id, status: "pending" })
        .select("id,requester_profile_id,recipient_profile_id,status")
        .single();
      if (requestError) setConnectionFeedback(requestError.message);
      else {
        setConnection(data as ConnectionState);
        setConnectionFeedback("Connection request sent. The recipient can accept it from Dashboard → Connections.");
      }
    }
    setConnectionLoading(false);
  };

  const initials =
    profile?.fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "AB";
  const connectionTone =
    connectionFeedback.includes("sent") || connectionFeedback.includes("withdrawn")
      ? "border-primary/20 bg-primary/10 text-primary"
      : "border-error/25 bg-error/10 text-error";

  return (
    <div className={cn("min-h-screen bg-background", isRTL && "rtl")}>
      <Navbar />
      <main className="pb-14 pt-24">
        <div className="mx-auto max-w-6xl px-margin-mobile text-left md:px-margin-desktop">
          {isLoading ? (
            <ProfileSkeleton />
          ) : error || !profile ? (
            <ProfileUnavailable message={error || "This profile could not be loaded."} onRetry={() => void loadProfile()} />
          ) : (
            <div className="grid items-start gap-8 lg:grid-cols-12">
              {/* Main column */}
              <div className="space-y-6 lg:col-span-8">
                {/* Identity card */}
                <motion.section
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative overflow-hidden rounded-3xl border border-outline-variant/40 bg-white p-6 shadow-sm sm:p-8"
                >
                  <div className="relative z-10 flex flex-col items-start gap-6 sm:flex-row">
                    <div className="relative shrink-0">
                      <div className="h-28 w-28 overflow-hidden rounded-2xl border-2 border-white bg-surface-container-low shadow-lg sm:h-32 sm:w-32">
                        {profile.avatarUrl && !imgError ? (
                          <img src={profile.avatarUrl} alt={profile.fullName} className="h-full w-full object-cover" onError={() => setImgError(true)} />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-primary text-2xl font-bold text-white">{initials}</span>
                        )}
                      </div>
                      {profile.isVerified ? (
                        <span
                          title="Platform-verified profile"
                          aria-label="Platform-verified profile"
                          className="absolute -bottom-2 -right-2 flex items-center justify-center rounded-xl border-2 border-white bg-secondary p-1 text-on-secondary shadow"
                        >
                          <span className="material-symbols-outlined text-base font-black" aria-hidden="true">verified</span>
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">{profile.fullName}</h1>
                          <span className="mt-2 inline-flex rounded-md border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
                            {profile.userType}
                          </span>
                        </div>
                        {isOwner ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditing((value) => !value);
                              setSaveFeedback("");
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant/60 px-3.5 py-2 text-xs font-bold text-primary transition hover:bg-surface-container"
                          >
                            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{isEditing ? "visibility" : "edit"}</span>
                            {isEditing ? "View profile" : "Edit profile"}
                          </button>
                        ) : null}
                      </div>
                      <p className="text-sm font-medium text-on-surface-variant">{profile.location}</p>
                      <p className="mt-4 text-xs leading-5 text-on-surface-variant">
                        {profile.bio || "This member has not added a public biography yet."}
                      </p>
                    </div>
                  </div>
                </motion.section>

                {/* Details / editor */}
                {isEditing && editForm ? (
                  <ProfileEditor
                    editForm={editForm}
                    setEditForm={setEditForm}
                    saveLoading={saveLoading}
                    feedback={saveFeedback}
                    onSubmit={handleSaveProfile}
                    onCancel={() => {
                      setEditForm(profile);
                      setIsEditing(false);
                    }}
                  />
                ) : (
                  <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-3xl border border-outline-variant/40 bg-white p-6 shadow-sm sm:p-8"
                  >
                    <h2 className="font-display text-lg font-bold tracking-tight text-primary">Public profile information</h2>
                    <p className="mt-3 text-sm leading-6 text-on-surface-variant">{profile.bio || "No public biography has been added yet."}</p>
                    <div className="mt-6 grid gap-3 border-t border-outline-variant/30 pt-5 sm:grid-cols-2">
                      <InfoItem icon="location_on" label="Location" value={profile.location} />
                      <InfoItem icon="badge" label="Role" value={profile.userType} />
                      <InfoItem icon={profile.isVerified ? "verified_user" : "person"} label="Profile status" value={profile.isVerified ? "Platform verified" : "Member profile"} />
                    </div>
                  </motion.section>
                )}
              </div>

              {/* Sidebar */}
              <aside className="w-full shrink-0 space-y-5 self-start lg:sticky lg:top-20 lg:col-span-4">
                <ConnectionPanel
                  profile={profile}
                  isOwner={isOwner}
                  connection={connection}
                  contact={connectionContact}
                  contactNotice={contactNotice}
                  feedback={connectionFeedback}
                  feedbackClass={connectionTone}
                  loading={connectionLoading}
                  onAction={handleConnectionAction}
                />
                <section className="relative overflow-hidden rounded-2xl bg-primary p-5 text-white shadow-md">
                  <h3 className="relative z-10 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">privacy_tip</span>
                    Privacy by design
                  </h3>
                  <p className="relative z-10 mt-2 text-xs leading-relaxed text-white/80">
                    Public profiles never reveal phone or email. Accepted connections receive only the contact
                    methods each member has opted to share.
                  </p>
                </section>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ConnectionPanel({
  profile,
  isOwner,
  connection,
  contact,
  contactNotice,
  feedback,
  feedbackClass,
  loading,
  onAction,
}: {
  profile: ProfileView;
  isOwner: boolean;
  connection: ConnectionState | null;
  contact: ContactCard | null;
  contactNotice: string;
  feedback: string;
  feedbackClass: string;
  loading: boolean;
  onAction: () => Promise<void>;
}) {
  // Owner sees their own private contact settings
  if (isOwner) {
    return (
      <section className="rounded-3xl border border-outline-variant/40 bg-white p-6 text-left shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Private contact settings</p>
        <h2 className="mt-2 font-display text-xl text-primary">Your contact details</h2>
        <p className="mt-2 text-xs leading-5 text-on-surface-variant">
          Only you can see these by default. Edit your profile to choose which methods accepted connections may receive.
        </p>
        <div className="mt-5 space-y-3 border-t border-outline-variant/30 pt-4">
          {profile.email ? <InfoItem icon="mail" label="Email" value={profile.email} /> : null}
          {profile.phone ? <InfoItem icon="phone" label="Phone" value={profile.phone} /> : <p className="text-xs text-on-surface-variant">No private phone number saved.</p>}
        </div>
      </section>
    );
  }

  // Accepted: show shared contacts + quick chat + link to full conversation
  if (connection?.status === "accepted") {
    return (
      <section className="space-y-5 rounded-3xl border border-primary/25 bg-white p-6 text-left shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Connection accepted</p>
          <h2 className="mt-1 font-display text-xl text-primary">You are connected</h2>
          <p className="mt-1 text-xs leading-5 text-on-surface-variant">This member has accepted your connection.</p>
        </div>

        {contactNotice ? (
          <p className="rounded-xl border border-secondary/30 bg-secondary-container p-3 text-xs leading-5 text-on-secondary-container">{contactNotice}</p>
        ) : null}

        {(contact?.email || contact?.phone) && (
          <div className="space-y-2 border-t border-outline-variant/30 pt-3">
            {contact?.email ? <InfoItem icon="mail" label="Shared email" value={contact.email} /> : null}
            {contact?.phone ? <InfoItem icon="phone" label="Shared phone" value={contact.phone} /> : null}
          </div>
        )}

        <div className="border-t border-outline-variant/30 pt-4">
          <ProfileDirectChat targetProfileId={profile.id} targetName={profile.fullName} />
        </div>
      </section>
    );
  }

  // Pending — figure out which side of the request we are on
  if (connection?.status === "pending") {
    const iAmRecipient = connection.recipient_profile_id === profile.id;
    if (iAmRecipient) {
      return (
        <section className="rounded-3xl border border-outline-variant/40 bg-white p-6 text-left shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Connect safely</p>
          <h2 className="mt-2 font-display text-xl text-primary">Request received</h2>
          <p className="mt-2 text-xs leading-5 text-on-surface-variant">
            This member has requested to connect with you. Review, accept, or decline the request in your dashboard inbox.
          </p>
          <Link
            to="/dashboard"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-wider text-on-primary shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">group_add</span>
            Open connections inbox
          </Link>
        </section>
      );
    }
    return (
      <section className="rounded-3xl border border-outline-variant/40 bg-white p-6 text-left shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Connect safely</p>
        <h2 className="mt-2 font-display text-xl text-primary">Request sent</h2>
        <p className="mt-2 text-xs leading-5 text-on-surface-variant">
          The recipient can respond from Dashboard → Connections. Contact details remain private while the request is pending.
        </p>
        {feedback ? <p className={`mt-4 rounded-xl border p-3 text-xs leading-5 ${feedbackClass}`}>{feedback}</p> : null}
        <button
          type="button"
          onClick={() => void onAction()}
          disabled={loading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/60 py-3 text-xs font-bold uppercase tracking-wider text-primary disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">undo</span>
          {loading ? "Withdrawing…" : "Withdraw request"}
        </button>
      </section>
    );
  }

  // Terminal non-accepted states (declined / withdrawn / blocked)
  if (connection) {
    const canRetry = connection.status === "withdrawn" || connection.status === "declined";
    return (
      <section className="rounded-3xl border border-outline-variant/40 bg-white p-6 text-left shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Connect safely</p>
        <h2 className="mt-2 font-display text-xl text-primary">Connection request {connection.status}</h2>
        <p className="mt-2 text-xs leading-5 text-on-surface-variant">
          {canRetry ? "You can send a new request whenever you're ready." : "No contact details are available for this connection state."}
        </p>
        {feedback ? <p className={`mt-4 rounded-xl border p-3 text-xs leading-5 ${feedbackClass}`}>{feedback}</p> : null}
        {canRetry && (
          <button
            type="button"
            onClick={() => void onAction()}
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-wider text-on-primary shadow-md disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">person_add</span>
            {loading ? "Sending request…" : "Request connection again"}
          </button>
        )}
      </section>
    );
  }

  // No history — fresh request
  return (
    <section className="rounded-3xl border border-outline-variant/40 bg-white p-6 text-left shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Connect safely</p>
      <h2 className="mt-2 font-display text-xl text-primary">Request a connection</h2>
      <p className="mt-2 text-xs leading-5 text-on-surface-variant">
        Send a private request. The recipient receives it in their dashboard and controls whether to accept.
      </p>
      {feedback ? <p className={`mt-4 rounded-xl border p-3 text-xs leading-5 ${feedbackClass}`}>{feedback}</p> : null}
      <button
        type="button"
        onClick={() => void onAction()}
        disabled={loading}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-wider text-on-primary shadow-md disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">person_add</span>
        {loading ? "Sending request…" : "Request connection"}
      </button>
    </section>
  );
}

function ProfileDirectChat({ targetProfileId, targetName }: { targetProfileId: string; targetName: string }) {
  const [messages, setMessages] = useState<{ id: string; sender_profile_id: string; body: string; created_at: string }[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let alive = true;

    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id;
      if (!currentUserId || !alive) {
        setLoading(false);
        return;
      }
      setMyId(currentUserId);

      // Find or create thread
      const { data: threads } = await supabase
        .from("threads")
        .select("id,participant_ids")
        .contains("participant_ids", [currentUserId, targetProfileId]);

      let activeId = threads?.[0]?.id;
      if (!activeId) {
        const { data: newThread } = await supabase
          .from("threads")
          .insert({ participant_ids: [currentUserId, targetProfileId] })
          .select("id")
          .single();
        activeId = newThread?.id;
      }

      if (!alive) return;

      if (activeId) {
        setThreadId(activeId);
        const { data: msgs } = await supabase
          .from("messages")
          .select("id,sender_profile_id,body,created_at")
          .eq("thread_id", activeId)
          .order("created_at", { ascending: true })
          .limit(20);
        if (!alive) return;
        setMessages(msgs ?? []);
        setLoading(false);

        const channel = supabase
          .channel(`profile-chat:${activeId}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${activeId}` },
            (payload) => setMessages((prev) => [...prev, payload.new as (typeof prev)[0]]),
          )
          .subscribe();
        cleanup = () => {
          void supabase.removeChannel(channel);
        };
      } else {
        setLoading(false);
      }
    })();

    // The channel cleanup is registered once resolved — and always on unmount.
    return () => {
      alive = false;
      cleanup?.();
    };
  }, [targetProfileId]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !threadId || !myId || sending) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      thread_id: threadId,
      sender_profile_id: myId,
      body: text.trim(),
      message_type: "text",
    });
    if (error) {
      setSending(false);
      return; // keep the drafted text on failure
    }
    await supabase.from("threads").update({ last_message_at: new Date().toISOString() }).eq("id", threadId);
    setText("");
    setSending(false);
  };

  const firstName = targetName.split(" ")[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary">
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">chat</span> Direct message
        </span>
        <Link to="/messages" className="text-xs font-semibold text-primary hover:underline">
          Full conversation →
        </Link>
      </div>

      <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
        {loading ? (
          <p className="text-xs text-on-surface-variant/60">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <p className="py-2 text-center text-xs text-on-surface-variant/60">No messages yet. Say hello to {firstName}!</p>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_profile_id === myId;
            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-1.5 text-xs leading-4 shadow-2xs ${isMe ? "bg-primary text-on-primary" : "border border-outline-variant/40 bg-white text-primary"}`}>
                  <p>{m.body}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <label htmlFor="profile-chat-input" className="sr-only">Message {firstName}</label>
        <input
          id="profile-chat-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message ${firstName}…`}
          className="flex-1 rounded-xl border border-outline-variant/60 bg-white px-3 py-2 text-xs font-medium text-primary outline-none focus:border-primary"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={sending || !text.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary transition hover:bg-primary-container disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">send</span>
        </button>
      </form>
    </div>
  );
}

function ProfileEditor({
  editForm,
  setEditForm,
  saveLoading,
  feedback,
  onSubmit,
  onCancel,
}: {
  editForm: ProfileView;
  setEditForm: (value: ProfileView) => void;
  saveLoading: boolean;
  feedback: string;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState("");

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadFeedback("");
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!allowedTypes.includes(file.type)) {
      setUploadFeedback("Choose a JPEG, PNG, WebP, or AVIF image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadFeedback("Profile images must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "image";
    const objectPath = `${editForm.id}/avatar-${crypto.randomUUID()}.${extension}`;
    setUploading(true);
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(objectPath, file, { cacheControl: "3600", contentType: file.type, upsert: false });
    if (uploadError) {
      setUploadFeedback(uploadError.message);
      setUploading(false);
      event.target.value = "";
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(objectPath);
    setEditForm({ ...editForm, avatarUrl: data.publicUrl });
    setUploadFeedback("Image uploaded securely. Save profile changes to publish it on your profile.");
    setUploading(false);
    event.target.value = "";
  };

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-outline-variant/60 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 border-b border-outline-variant/50 pb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-secondary">Private account settings</span>
        <h2 className="font-display text-xl font-bold text-primary">Edit your profile</h2>
        <p className="mt-1 text-xs leading-5 text-on-surface-variant">
          Phone and email are private until you accept a connection and choose to share them.
        </p>
      </div>

      {feedback ? <p className="mb-4 rounded-xl border border-primary/25 bg-primary/10 p-3 text-xs text-primary">{feedback}</p> : null}

      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required>
          <input required value={editForm.fullName} onChange={(event) => setEditForm({ ...editForm, fullName: event.target.value })} />
        </Field>
        <Field label="City / district">
          <CitySelect value={editForm.city} onChange={(c) => setEditForm({ ...editForm, city: c })} />
        </Field>
        <Field label="Private phone">
          <input type="tel" value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} placeholder="Optional" />
        </Field>
        <Field label="Profile photo">
          <div className="mt-1 rounded-xl border border-outline bg-surface-container-low p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-xs font-bold text-on-primary">
                {editForm.avatarUrl ? (
                  <img src={editForm.avatarUrl} alt="Profile preview" className="h-full w-full object-cover" />
                ) : (
                  editForm.fullName
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase()
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-primary shadow-sm ring-1 ring-outline transition hover:bg-surface-container">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">upload</span>
                {uploading ? "Uploading…" : "Choose image"}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => void uploadAvatar(event)} disabled={uploading} className="sr-only" />
              </label>
            </div>
            <p className="mt-2 text-xs leading-4 text-on-surface-variant">JPEG, PNG, WebP, or AVIF · maximum 5 MB · saved in your private upload folder.</p>
            {uploadFeedback ? (
              <p className={`mt-2 text-xs leading-4 ${uploadFeedback.startsWith("Image uploaded") ? "text-primary" : "text-error"}`}>{uploadFeedback}</p>
            ) : null}
          </div>
        </Field>
        <Field label="Public biography" className="sm:col-span-2">
          <textarea rows={5} value={editForm.bio} onChange={(event) => setEditForm({ ...editForm, bio: event.target.value })} placeholder="Describe your role, experience, and areas of work." />
        </Field>
        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-outline bg-surface-container-low p-3 text-xs leading-5 text-on-surface-variant sm:col-span-2">
          <input type="checkbox" checked={editForm.shareEmail} onChange={(event) => setEditForm({ ...editForm, shareEmail: event.target.checked })} className="mt-0.5 h-4 w-4 accent-primary" />
          Share my email only with members whose connection requests I accept.
        </label>
        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-outline bg-surface-container-low p-3 text-xs leading-5 text-on-surface-variant sm:col-span-2">
          <input type="checkbox" checked={editForm.sharePhone} onChange={(event) => setEditForm({ ...editForm, sharePhone: event.target.checked })} className="mt-0.5 h-4 w-4 accent-primary" />
          Share my phone only with members whose connection requests I accept.
        </label>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onCancel} className="control-secondary rounded-xl px-5 py-2.5 text-xs font-bold">
            Cancel
          </button>
          <button disabled={saveLoading || uploading} className="rounded-xl bg-primary px-7 py-2.5 text-xs font-bold uppercase tracking-wider text-on-primary disabled:opacity-50">
            {saveLoading ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </motion.section>
  );
}

function Field({ label, required, className = "", children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={`block space-y-1 ${className}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </span>
      {children}
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="material-symbols-outlined mt-0.5 text-[17px] text-secondary" aria-hidden="true">{icon}</span>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/55">{label}</p>
        <p className="mt-0.5 font-semibold text-on-surface-variant">{value}</p>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse space-y-6">
      <div className="h-52 rounded-3xl bg-surface-container-low" />
      <div className="grid gap-6 lg:grid-cols-[1.7fr_0.8fr]">
        <div className="h-64 rounded-3xl bg-surface-container-low" />
        <div className="h-48 rounded-3xl bg-surface-container-low" />
      </div>
    </div>
  );
}

function ProfileUnavailable({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-error/25 bg-error/10 p-7 text-center">
      <span className="material-symbols-outlined text-4xl text-error" aria-hidden="true">lock</span>
      <h1 className="mt-3 font-display text-2xl text-primary">Profile unavailable</h1>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{message}</p>
      <button type="button" onClick={onRetry} className="mt-5 rounded-xl border border-outline-variant/60 bg-white px-4 py-3 text-xs font-bold text-primary">
        Try again
      </button>
    </div>
  );
}

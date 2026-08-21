/**
 * /notifications — Full notification list page.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedMember } from "@/lib/member";
import type { AppNotification } from "@/hooks/useNotifications";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    title: "Notifications | AgriBusiness Pakistan",
    meta: [{ name: "description", content: "Your activity notifications." }],
  }),
  component: NotificationsPage,
});

const ICON_MAP: Record<string, string> = {
  connection_request: "person_add",
  connection_accepted: "how_to_reg",
  proposal_received: "description",
  proposal_accepted: "task_alt",
  new_message: "chat",
  listing_enquiry: "storefront",
  trial_expiry: "timer",
  system: "info",
};

const COLOR_MAP: Record<string, string> = {
  connection_request: "bg-blue-100 text-blue-700",
  connection_accepted: "bg-emerald-100 text-emerald-700",
  proposal_received: "bg-violet-100 text-violet-700",
  proposal_accepted: "bg-green-100 text-green-700",
  new_message: "bg-sky-100 text-sky-700",
  listing_enquiry: "bg-amber-100 text-amber-700",
  trial_expiry: "bg-orange-100 text-orange-700",
  system: "bg-gray-100 text-gray-700",
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(dateStr).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    getAuthenticatedMember().then(({ profile }) => {
      if (profile) {
        setProfileId(profile.id);
        supabase
          .from("notifications")
          .select("id,type,title,body,is_read,created_at,action_url")
          .eq("profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(100)
          .then(({ data }) => {
            setNotifications((data ?? []) as AppNotification[]);
            setLoading(false);
            // Auto-mark all read after viewing
            void supabase
              .from("notifications")
              .update({ is_read: true })
              .eq("profile_id", profile.id)
              .eq("is_read", false);
          });
      } else {
        setLoading(false);
      }
    });
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-surface-container-low pt-24 pb-16">
        <div className="mx-auto max-w-2xl px-4">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-primary">Notifications</h1>
              <p className="mt-1 text-xs text-on-surface-variant">Your recent activity and alerts</p>
            </div>
            {profileId && notifications.some((n) => !n.is_read) && (
              <button
                type="button"
                onClick={async () => {
                  await supabase
                    .from("notifications")
                    .update({ is_read: true })
                    .eq("profile_id", profileId)
                    .eq("is_read", false);
                  setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
                }}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary transition hover:bg-primary-container"
              >
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-white" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-outline bg-white py-16 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30">notifications_none</span>
              <p className="font-display text-xl text-on-surface-variant">No notifications yet</p>
              <p className="text-xs text-on-surface-variant/60">When people connect with you or respond to your listings, you'll see it here.</p>
              <Link to="/search" className="mt-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold text-on-primary">
                Browse the network
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 rounded-2xl border p-4 transition ${!n.is_read ? "border-primary/20 bg-white shadow-sm" : "border-outline-variant/40 bg-white/60"}`}
                >
                  <span
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[18px] ${COLOR_MAP[n.type] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {ICON_MAP[n.type] ?? "notifications"}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-5 ${!n.is_read ? "font-bold text-primary" : "font-medium text-on-surface-variant"}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-1 text-xs leading-5 text-on-surface-variant/70">{n.body}</p>
                    )}
                    <p className="mt-1.5 text-[10px] font-semibold text-on-surface-variant/50">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read && (
                    <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

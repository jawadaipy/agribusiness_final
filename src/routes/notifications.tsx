/**
 * /notifications — Full notification list page.
 * Rows are actionable: clicking navigates via action_url and marks read.
 * Read state is explicit (no invisible auto-mark racing the button).
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedMember } from "@/lib/member";
import { timeAgo } from "@/lib/format";
import type { AppNotification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

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

/** Token-only palette: gold for people, green for success, primary for work items. */
const COLOR_MAP: Record<string, string> = {
  connection_request: "bg-secondary/15 text-on-secondary-container",
  connection_accepted: "bg-success/10 text-success",
  proposal_received: "bg-primary/10 text-primary",
  proposal_accepted: "bg-success/10 text-success",
  new_message: "bg-primary/10 text-primary",
  listing_enquiry: "bg-secondary/15 text-on-secondary-container",
  trial_expiry: "bg-error/10 text-error",
  system: "bg-surface-container text-on-surface-variant",
};

function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    getAuthenticatedMember().then(({ profile }) => {
      if (!alive) return;
      if (profile) {
        setProfileId(profile.id);
        supabase
          .from("notifications")
          .select("id,type,title,body,is_read,created_at,action_url")
          .eq("profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(100)
          .then(({ data }) => {
            if (!alive) return;
            setNotifications((data ?? []) as AppNotification[]);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    if (!profileId) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("profile_id", profileId)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const openNotification = (n: AppNotification) => {
    void markRead(n.id);
    if (n.action_url) {
      navigate({ to: n.action_url as never });
    }
  };

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
            {notifications.some((n) => !n.is_read) && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary transition hover:bg-primary-container"
              >
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 skeleton rounded-2xl bg-white" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-outline bg-white py-16 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30" aria-hidden="true">notifications_none</span>
              <p className="font-display text-xl text-on-surface-variant">No notifications yet</p>
              <p className="text-xs text-on-surface-variant/60">When people connect with you or respond to your listings, you'll see it here.</p>
              <Link to="/search" className="mt-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold text-on-primary">
                Browse the network
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openNotification(n)}
                  className={cn(
                    "flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition",
                    !n.is_read
                      ? "border-primary/20 bg-white shadow-sm hover:border-primary/40"
                      : "border-outline-variant/40 bg-white/60 hover:border-outline",
                  )}
                >
                  <span
                    className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", COLOR_MAP[n.type] ?? "bg-surface-container text-on-surface-variant")}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined text-[18px]">{ICON_MAP[n.type] ?? "notifications"}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm leading-5", !n.is_read ? "font-bold text-primary" : "font-medium text-on-surface-variant")}>
                      {n.title}
                    </span>
                    {n.body && (
                      <span className="mt-1 block text-xs leading-5 text-on-surface-variant/70">{n.body}</span>
                    )}
                    <span className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-on-surface-variant/50">
                      {timeAgo(n.created_at)}
                      {n.action_url && (
                        <span className="flex items-center gap-0.5 text-primary">
                          Open
                          <span className="material-symbols-outlined text-[12px]" aria-hidden="true">arrow_forward</span>
                        </span>
                      )}
                    </span>
                  </span>
                  {!n.is_read && (
                    <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

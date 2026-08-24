/**
 * NotificationBell — compact bell icon with badge for Navbar.
 * Shows a dropdown panel with the 10 most recent notifications.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { AppNotification } from "@/hooks/useNotifications";

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

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface Props {
  notifications: AppNotification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export function NotificationBell({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-outline-variant/50 text-on-surface-variant transition hover:border-primary/40 hover:bg-surface-container-low hover:text-primary"
      >
        <span className="material-symbols-outlined text-[20px]">
          {unreadCount > 0 ? "notifications_active" : "notifications"}
        </span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-error px-1 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-outline-variant/40 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-outline-variant/30 px-4 py-3">
            <h3 className="font-display text-sm font-bold text-primary">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-xs font-bold text-secondary hover:text-primary transition"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 divide-y divide-outline-variant/20 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <span className="material-symbols-outlined text-[32px] text-on-surface-variant/30">
                  notifications_none
                </span>
                <p className="text-xs text-on-surface-variant">No notifications yet.</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (!n.is_read) onMarkRead(n.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-surface-container-low ${!n.is_read ? "bg-primary/4" : ""}`}
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[15px] ${!n.is_read ? "bg-primary/12 text-primary" : "bg-surface-container text-on-surface-variant"}`}
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {ICON_MAP[n.type] ?? "notifications"}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs leading-5 ${!n.is_read ? "font-bold text-primary" : "font-medium text-on-surface-variant"}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-on-surface-variant/70">{n.body}</p>
                    )}
                    <p className="mt-1 text-xs font-semibold text-on-surface-variant/50">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read && (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-outline-variant/30 p-2">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-primary transition hover:bg-primary/8"
            >
              View all notifications
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * useNotifications — fetches unread notification count and recent notifications
 * for the current authenticated user. Returns live data via Supabase realtime.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
  action_url: string | null;
};

export function useNotifications(profileId: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id,type,title,body,is_read,created_at,action_url")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(30);
    const items = (data ?? []) as AppNotification[];
    setNotifications(items);
    setUnreadCount(items.filter((n) => !n.is_read).length);
    setLoading(false);
  }, [profileId]);

  const markAllRead = useCallback(async () => {
    if (!profileId) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("profile_id", profileId)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [profileId]);

  const markRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!profileId) return;
    const channel = supabase
      .channel(`notifications:${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${profileId}`,
        },
        (payload) => {
          const n = payload.new as AppNotification;
          setNotifications((prev) => [n, ...prev].slice(0, 30));
          if (!n.is_read) setUnreadCount((c) => c + 1);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profileId]);

  return { notifications, unreadCount, loading, markRead, markAllRead, reload: load };
}

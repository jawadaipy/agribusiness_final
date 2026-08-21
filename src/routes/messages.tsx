/**
 * /messages — In-app chat between accepted connections.
 * Shows thread list on the left and message view on the right.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedMember } from "@/lib/member";

export const Route = createFileRoute("/messages")({
  head: () => ({
    title: "Messages | AgriBusiness Pakistan",
    meta: [{ name: "description", content: "Your private messages and conversations." }],
  }),
  component: MessagesPage,
});

type Thread = {
  id: string;
  subject: string | null;
  participant_ids: string[];
  last_message_at: string;
  other_name?: string;
  other_avatar?: string | null;
  other_id?: string;
  last_message?: string;
};

type Message = {
  id: string;
  thread_id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
  sender_name?: string;
};

function timeLabel(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

function MessagesPage() {
  const [myProfile, setMyProfile] = useState<{ id: string; full_name: string | null } | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newContactId, setNewContactId] = useState("");
  const [connections, setConnections] = useState<{ id: string; name: string }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load profile + threads
  useEffect(() => {
    getAuthenticatedMember().then(async ({ profile }) => {
      if (!profile) { setLoading(false); return; }
      setMyProfile({ id: profile.id, full_name: profile.full_name });

      // Load accepted connections for new-chat dropdown
      const { data: connData } = await supabase
        .from("connection_requests")
        .select("requester_profile_id,recipient_profile_id")
        .or(`requester_profile_id.eq.${profile.id},recipient_profile_id.eq.${profile.id}`)
        .eq("status", "accepted");
      const otherIds = (connData ?? []).map((c) =>
        c.requester_profile_id === profile.id ? c.recipient_profile_id : c.requester_profile_id,
      );
      if (otherIds.length) {
        const { data: names } = await supabase
          .from("profiles")
          .select("id,full_name")
          .in("id", otherIds);
        setConnections((names ?? []).map((n) => ({ id: n.id as string, name: (n.full_name as string) ?? "Member" })));
      }

      // Load threads
      const { data: threadData } = await supabase
        .from("threads")
        .select("id,subject,participant_ids,last_message_at")
        .contains("participant_ids", [profile.id])
        .order("last_message_at", { ascending: false });

      if (!threadData?.length) { setLoading(false); return; }

      // Resolve other participant names
      const allOtherIds = threadData.flatMap((t) =>
        t.participant_ids.filter((pid: string) => pid !== profile.id),
      );
      const { data: pData } = await supabase
        .from("profiles")
        .select("id,full_name,avatar_url")
        .in("id", [...new Set(allOtherIds)]);
      const pMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      (pData ?? []).forEach((p) => { pMap[p.id as string] = { full_name: p.full_name as string | null, avatar_url: p.avatar_url as string | null }; });

      // Get last messages
      const threadIds = threadData.map((t) => t.id);
      const { data: lastMsgs } = await supabase
        .from("messages")
        .select("thread_id,body,created_at")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false });
      const lastMap: Record<string, string> = {};
      (lastMsgs ?? []).forEach((m) => { if (!lastMap[m.thread_id as string]) lastMap[m.thread_id as string] = m.body as string; });

      const enriched: Thread[] = threadData.map((t) => {
        const otherId = t.participant_ids.find((pid: string) => pid !== profile.id);
        return {
          ...t,
          other_id: otherId,
          other_name: otherId ? (pMap[otherId]?.full_name ?? "Member") : "Group",
          other_avatar: otherId ? pMap[otherId]?.avatar_url : null,
          last_message: lastMap[t.id],
        };
      });
      setThreads(enriched);
      setLoading(false);
    });
  }, []);

  // Load messages when thread changes
  useEffect(() => {
    if (!activeThread) return;
    supabase
      .from("messages")
      .select("id,thread_id,sender_profile_id,body,created_at")
      .eq("thread_id", activeThread.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data ?? []) as Message[]));

    const channel = supabase
      .channel(`msgs:${activeThread.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${activeThread.id}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message]),
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [activeThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!body.trim() || !activeThread || !myProfile) return;
    setSending(true);
    await supabase.from("messages").insert({
      thread_id: activeThread.id,
      sender_profile_id: myProfile.id,
      body: body.trim(),
      message_type: "text",
    });
    await supabase.from("threads").update({ last_message_at: new Date().toISOString() }).eq("id", activeThread.id);
    setBody("");
    setSending(false);
  };

  const startNewChat = async () => {
    if (!newContactId || !myProfile) return;
    // Check if thread already exists
    const existing = threads.find((t) => t.participant_ids.includes(newContactId));
    if (existing) { setActiveThread(existing); return; }
    const { data } = await supabase
      .from("threads")
      .insert({ participant_ids: [myProfile.id, newContactId] })
      .select()
      .single();
    if (data) {
      const contact = connections.find((c) => c.id === newContactId);
      const thread: Thread = { ...data as Thread, other_id: newContactId, other_name: contact?.name ?? "Member", other_avatar: null };
      setThreads((prev) => [thread, ...prev]);
      setActiveThread(thread);
    }
  };

  const inputClass = "w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-2 text-xs font-medium text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition";

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-0">
        <div className="mx-auto flex h-[calc(100vh-5rem)] max-w-6xl">
          {/* Sidebar */}
          <aside className="flex w-72 shrink-0 flex-col border-r border-outline-variant/30 bg-white">
            <div className="border-b border-outline-variant/30 p-4">
              <h1 className="font-display text-lg font-bold text-primary">Messages</h1>
              {connections.length > 0 && (
                <div className="mt-3 flex gap-2">
                  <select
                    value={newContactId}
                    onChange={(e) => setNewContactId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">New conversation…</option>
                    {connections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button
                    type="button"
                    disabled={!newContactId}
                    onClick={() => void startNewChat()}
                    className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/20">
              {loading ? (
                <div className="space-y-2 p-3">
                  {[1,2,3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-container-low" />)}
                </div>
              ) : threads.length === 0 ? (
                <div className="p-6 text-center">
                  <span className="material-symbols-outlined text-[36px] text-on-surface-variant/30">chat</span>
                  <p className="mt-2 text-xs text-on-surface-variant">No conversations yet. Start one with a connection above.</p>
                </div>
              ) : (
                threads.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveThread(t)}
                    className={`flex w-full items-start gap-3 p-4 text-left transition hover:bg-surface-container-low ${activeThread?.id === t.id ? "bg-primary/8" : ""}`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-[11px] font-bold text-primary overflow-hidden">
                      {t.other_avatar ? <img src={t.other_avatar} alt="" className="h-full w-full object-cover" /> : (t.other_name ?? "?").split(" ").map((w) => w[0]).slice(0,2).join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-primary">{t.other_name ?? t.subject ?? "Conversation"}</p>
                      {t.last_message && (
                        <p className="mt-0.5 truncate text-[10px] text-on-surface-variant">{t.last_message}</p>
                      )}
                    </div>
                    <p className="shrink-0 text-[9px] text-on-surface-variant/60">{timeLabel(t.last_message_at)}</p>
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* Chat panel */}
          <div className="flex flex-1 flex-col bg-surface-container-low/30">
            {activeThread ? (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-outline-variant/30 bg-white px-5 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-[11px] font-bold text-primary">
                    {(activeThread.other_name ?? "?").split(" ").map((w) => w[0]).slice(0,2).join("")}
                  </div>
                  <p className="font-display text-base font-bold text-primary">{activeThread.other_name}</p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 p-5">
                  {messages.map((m) => {
                    const isMe = m.sender_profile_id === myProfile?.id;
                    return (
                      <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-xs leading-5 shadow-sm ${isMe ? "bg-primary text-on-primary rounded-br-sm" : "bg-white text-primary border border-outline-variant/40 rounded-bl-sm"}`}>
                          <p>{m.body}</p>
                          <p className={`mt-1 text-[9px] ${isMe ? "text-on-primary/60" : "text-on-surface-variant/50"}`}>{timeLabel(m.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="border-t border-outline-variant/30 bg-white p-4">
                  <form
                    onSubmit={(e) => { e.preventDefault(); void sendMessage(); }}
                    className="flex items-end gap-2"
                  >
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }}}
                      rows={2}
                      placeholder="Type a message… (Enter to send)"
                      className={`${inputClass} resize-none`}
                    />
                    <button
                      type="submit"
                      disabled={sending || !body.trim()}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-[18px]">send</span>
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                <span className="material-symbols-outlined text-[56px] text-on-surface-variant/20">chat_bubble_outline</span>
                <p className="font-display text-xl text-on-surface-variant/50">Select a conversation</p>
                <p className="text-xs text-on-surface-variant/40">Choose a thread from the left or start a new one.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

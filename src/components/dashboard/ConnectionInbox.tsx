/**
 * Agribusiness brand system: Evergreen primary, Harvest Gold emphasis, Rice
 * Canvas surfaces, and Slate Leaf copy. Requests come only from Supabase RLS.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

type ConnectionStatus = "pending" | "accepted" | "declined" | "blocked" | "withdrawn";
type ConnectionRecord = {
  id: string;
  requester_profile_id: string;
  recipient_profile_id: string;
  note: string | null;
  status: ConnectionStatus;
  created_at: string;
};
type DirectoryProfile = {
  id: string;
  display_name: string | null;
  user_type: string | null;
  city: string | null;
  is_verified: boolean | null;
};

const statusStyle: Record<ConnectionStatus, string> = {
  pending: "bg-secondary-container text-on-secondary-container",
  accepted: "bg-primary/10 text-primary",
  declined: "bg-surface-container-high text-on-surface-variant",
  blocked: "bg-error/10 text-error",
  withdrawn: "bg-surface-container-high text-on-surface-variant",
};

export function ConnectionInbox({ profileId }: { profileId: string }) {
  const [incoming, setIncoming] = useState<ConnectionRecord[]>([]);
  const [outgoing, setOutgoing] = useState<ConnectionRecord[]>([]);
  const [people, setPeople] = useState<Map<string, DirectoryProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRequests = async () => {
    setLoading(true);
    setError("");
    const [incomingResult, outgoingResult] = await Promise.all([
      supabase
        .from("connection_requests")
        .select("id,requester_profile_id,recipient_profile_id,note,status,created_at")
        .eq("recipient_profile_id", profileId)
        .order("created_at", { ascending: false }),
      supabase
        .from("connection_requests")
        .select("id,requester_profile_id,recipient_profile_id,note,status,created_at")
        .eq("requester_profile_id", profileId)
        .order("created_at", { ascending: false }),
    ]);

    if (incomingResult.error || outgoingResult.error) {
      setError(incomingResult.error?.message || outgoingResult.error?.message || "Connection requests could not be loaded.");
      setLoading(false);
      return;
    }

    const incomingRows = (incomingResult.data ?? []) as ConnectionRecord[];
    const outgoingRows = (outgoingResult.data ?? []) as ConnectionRecord[];
    setIncoming(incomingRows);
    setOutgoing(outgoingRows);
    const ids = [...new Set([...incomingRows.map((item) => item.requester_profile_id), ...outgoingRows.map((item) => item.recipient_profile_id)])];
    if (ids.length) {
      const peopleResult = await supabase
        .from("directory_profiles")
        .select("id,display_name,user_type,city,is_verified")
        .in("id", ids);
      if (peopleResult.error) {
        setError("Requests loaded, but public sender identities require the safe directory view from Migration 09.");
      } else {
        setPeople(new Map(((peopleResult.data ?? []) as DirectoryProfile[]).map((person) => [person.id, person])));
      }
    } else {
      setPeople(new Map());
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadRequests();
  }, [profileId]);

  const pendingIncoming = useMemo(() => incoming.filter((request) => request.status === "pending"), [incoming]);

  const changeStatus = async (request: ConnectionRecord, status: ConnectionStatus) => {
    setActingId(request.id);
    setError("");
    setNotice("");
    const isRecipient = request.recipient_profile_id === profileId;
    const update = supabase
      .from("connection_requests")
      .update({ status })
      .eq("id", request.id)
      .eq(isRecipient ? "recipient_profile_id" : "requester_profile_id", profileId);
    const { error: updateError } = await update;
    if (updateError) {
      setError(updateError.message);
    } else {
      setNotice(status === "accepted" ? "Connection accepted. The requester can now see the decision in their dashboard." : status === "withdrawn" ? "Connection request withdrawn." : `Connection request ${status}.`);
      await loadRequests();
    }
    setActingId("");
  };

  const personCard = (request: ConnectionRecord, personId: string, direction: "incoming" | "outgoing") => {
    const person = people.get(personId);
    const name = person?.display_name || "AgriBusiness member";
    return <article key={request.id} className="rounded-2xl border border-outline-variant/45 bg-white p-4 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Link to="/profile/$id" params={{ id: personId }} className="font-display text-lg text-primary hover:text-primary-container">{name}</Link>{person?.is_verified ? <span className="material-symbols-outlined text-[16px] text-secondary" title="Platform verified">verified</span> : null}<span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${statusStyle[request.status]}`}>{request.status}</span></div><p className="mt-1 text-[11px] font-medium text-on-surface-variant">{person?.user_type || "Member"}{person?.city ? ` · ${person.city}` : ""} · {new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", year: "numeric" }).format(new Date(request.created_at))}</p>{request.note ? <p className="mt-3 rounded-xl bg-surface-container-low p-3 text-xs leading-5 text-on-surface-variant">{request.note}</p> : <p className="mt-3 text-xs italic text-on-surface-variant/70">No introduction note was included.</p>}</div>{direction === "incoming" && request.status === "pending" ? <div className="flex shrink-0 flex-wrap gap-2 sm:w-44 sm:justify-end"><button disabled={actingId === request.id} onClick={() => void changeStatus(request, "accepted")} className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-60">Accept</button><button disabled={actingId === request.id} onClick={() => void changeStatus(request, "declined")} className="rounded-xl border border-outline-variant/60 px-3 py-2 text-xs font-bold text-primary disabled:opacity-60">Decline</button><button disabled={actingId === request.id} onClick={() => void changeStatus(request, "blocked")} className="rounded-xl px-2 py-2 text-xs font-bold text-error disabled:opacity-60">Block</button></div> : direction === "outgoing" && request.status === "pending" ? <button disabled={actingId === request.id} onClick={() => void changeStatus(request, "withdrawn")} className="h-fit shrink-0 rounded-xl border border-outline-variant/60 px-3 py-2 text-xs font-bold text-primary disabled:opacity-60">Withdraw</button> : null}</div></article>;
  };

  if (loading) return <div className="rounded-2xl border border-outline-variant/45 bg-white p-5 text-xs text-on-surface-variant">Loading your private connection requests…</div>;

  return <section className="rounded-2xl border border-outline-variant/45 bg-surface-container-low p-5 md:p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-on-surface-variant/65">Private relationship workflow</p><h2 className="mt-1 font-display text-2xl text-primary">Connections</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-on-surface-variant">Requests are visible only to the sender and recipient. Contact details remain private until members decide how to continue.</p></div><button type="button" onClick={() => void loadRequests()} className="inline-flex items-center gap-1.5 text-xs font-bold text-primary"><span className="material-symbols-outlined text-[16px]">refresh</span>Refresh</button></div>{error ? <p className="mt-5 rounded-xl border border-error/25 bg-error/10 p-3 text-xs leading-5 text-error">{error}</p> : null}{notice ? <p className="mt-5 rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs leading-5 text-primary">{notice}</p> : null}<div className="mt-6 grid gap-6 xl:grid-cols-2"><div><div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-primary">Incoming requests</h3><span className="rounded-full bg-secondary-container px-2.5 py-1 text-[10px] font-bold text-on-secondary-container">{pendingIncoming.length} pending</span></div><div className="space-y-3">{incoming.length ? incoming.map((request) => personCard(request, request.requester_profile_id, "incoming")) : <EmptyRequestState label="No incoming requests" text="When another member asks to connect, it will appear here for your decision." />}</div></div><div><div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-primary">Sent requests</h3><span className="rounded-full bg-surface-container-high px-2.5 py-1 text-[10px] font-bold text-on-surface-variant">{outgoing.length} total</span></div><div className="space-y-3">{outgoing.length ? outgoing.map((request) => personCard(request, request.recipient_profile_id, "outgoing")) : <EmptyRequestState label="No sent requests" text="Discover relevant people and send a connection request from their public profile." />}</div></div></div></section>;
}

function EmptyRequestState({ label, text }: { label: string; text: string }) {
  return <div className="rounded-2xl border border-dashed border-outline-variant/60 bg-white p-5 text-center"><span className="material-symbols-outlined text-3xl text-primary/30">group_add</span><p className="mt-2 text-sm font-bold text-primary">{label}</p><p className="mt-1 text-xs leading-5 text-on-surface-variant">{text}</p></div>;
}

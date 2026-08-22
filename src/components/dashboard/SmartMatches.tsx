/**
 * "Suggested for you" panel: computes role-synergy matches against the real
 * member directory and sends consented connection requests inline.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { MemberProfile } from "@/lib/member";
import { supabase } from "@/lib/supabase";
import { suggestMatches, ROLE_LABELS, ROLE_ICONS, type MatchedProfile } from "@/lib/matching";
import { fetchDirectoryWithKeywords, fetchMyKeywords, fetchConnectionPeerIds } from "@/lib/profile-enrichment";

export function SmartMatches({ profile, limit = 4 }: { profile: MemberProfile; limit?: number }) {
  const [matches, setMatches] = useState<MatchedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [requested, setRequested] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);
    setUnavailable(false);
    const [directory, myKeywords, peerIds] = await Promise.all([
      fetchDirectoryWithKeywords(),
      fetchMyKeywords(profile.id, profile.user_type),
      fetchConnectionPeerIds(profile.id),
    ]);
    if (directory.error) {
      setUnavailable(true);
    } else {
      setMatches(
        suggestMatches(
          { id: profile.id, user_type: profile.user_type, city: profile.city, keywords: myKeywords },
          directory.candidates,
          peerIds,
          limit,
        ),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [profile.id]);

  const connect = async (targetId: string) => {
    setNotice("");
    const { error } = await supabase
      .from("connection_requests")
      .insert({ requester_profile_id: profile.id, recipient_profile_id: targetId, status: "pending" });
    if (error) {
      setNotice(error.message.includes("duplicate") ? "A connection request already exists with this member." : error.message);
      if (error.message.includes("duplicate")) setRequested((prev) => ({ ...prev, [targetId]: true }));
      return;
    }
    setRequested((prev) => ({ ...prev, [targetId]: true }));
    setNotice("Request sent — they can accept it from their dashboard.");
  };

  return (
    <section className="rounded-2xl border border-outline-variant/60 bg-white p-5 shadow-[0_10px_28px_rgba(15,81,50,0.06)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-on-surface-variant/65">Grow your network</p>
          <h2 className="mt-1 font-display text-xl text-primary">Suggested for you</h2>
        </div>
        <button type="button" onClick={() => void load()} className="rounded-lg p-1.5 text-on-surface-variant transition hover:bg-surface-container-low" aria-label="Refresh suggestions">
          <span className="material-symbols-outlined text-[18px]">refresh</span>
        </button>
      </div>

      {notice ? <p className="mt-3 rounded-xl bg-primary/10 px-3 py-2 text-[11px] leading-4 text-primary">{notice}</p> : null}

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-container-low" />
          ))}
        </div>
      ) : unavailable ? (
        <p className="mt-4 rounded-xl border border-dashed border-outline bg-surface-container-low p-3 text-[11px] leading-5 text-on-surface-variant">
          The member directory is not reachable right now. Suggestions will appear once the secure directory view is available.
        </p>
      ) : matches.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-outline bg-surface-container-low p-3 text-[11px] leading-5 text-on-surface-variant">
          No strong suggestions yet. Complete your profile fields — crops, commodities, services, or research interests — so the network can find people relevant to you.
        </p>
      ) : (
        <div className="mt-4 space-y-2.5">
          {matches.map((match) => {
            const name = match.display_name || "Member";
            const initials = name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
            const isRequested = requested[match.id];
            return (
              <div key={match.id} className="rounded-xl border border-outline-variant/50 bg-surface-container-low/60 p-3">
                <div className="flex items-start gap-3">
                  <Link to="/profile/$id" params={{ id: match.id }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-[11px] font-black text-on-primary">
                    {initials}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link to="/profile/$id" params={{ id: match.id }} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                      <span className="truncate">{name}</span>
                      {match.is_verified ? <span className="material-symbols-outlined text-[13px] text-secondary" title="Platform verified">verified</span> : null}
                    </Link>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-on-surface-variant">
                      <span className="material-symbols-outlined text-[12px]">{ROLE_ICONS[match.user_type]}</span>
                      {ROLE_LABELS[match.user_type]}
                    </p>
                    <ul className="mt-1.5 space-y-0.5">
                      {match.reasons.slice(0, 2).map((reason) => (
                        <li key={reason} className="flex items-start gap-1 text-[10px] leading-4 text-on-surface-variant">
                          <span className="material-symbols-outlined mt-px text-[11px] text-secondary">check_circle</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isRequested}
                  onClick={() => void connect(match.id)}
                  className={`mt-3 w-full rounded-xl py-2 text-[11px] font-bold transition ${
                    isRequested ? "border border-outline-variant/60 bg-white text-on-surface-variant" : "bg-primary text-on-primary hover:bg-primary-container"
                  }`}
                >
                  {isRequested ? "Request pending" : "Connect"}
                </button>
              </div>
            );
          })}
        </div>
      )}
      <Link to="/search" search={{ q: "" }} className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-outline-variant/70 py-2.5 text-[11px] font-bold text-primary transition hover:bg-surface-container-low">
        <span className="material-symbols-outlined text-[15px]">search</span>
        Browse the whole network
      </Link>
    </section>
  );
}

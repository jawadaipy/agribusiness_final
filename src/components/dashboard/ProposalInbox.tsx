/**
 * ProposalInbox — shows all proposals submitted to a project owner's projects.
 * Each proposal card shows the applicant's name, cover note, and quoted amount.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Link } from "@tanstack/react-router";

type Proposal = {
  id: string;
  project_id: string;
  project_title: string;
  cover_note: string;
  quoted_amount: number | null;
  created_at: string;
  profile: {
    id: string;
    full_name: string | null;
    user_type: string;
    city: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  } | null;
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function ProposalInbox({ profileId }: { profileId: string }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState("");
  const [projectTitles, setProjectTitles] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      // Get this user's projects first
      const { data: projects } = await supabase
        .from("projects")
        .select("id,title")
        .eq("profile_id", profileId)
        .eq("status", "open");

      const pts = (projects ?? []) as { id: string; title: string }[];
      setProjectTitles(pts);
      if (!pts.length) { setLoading(false); return; }

      const projectIds = pts.map((p) => p.id);

      const { data } = await supabase
        .from("project_proposals")
        .select("id,project_id,cover_note,quoted_amount,created_at,profile_id,profiles!project_proposals_profile_id_fkey(id,full_name,user_type,city,avatar_url,is_verified)")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false });

      const pTitleMap: Record<string, string> = {};
      pts.forEach((p) => { pTitleMap[p.id] = p.title; });

      const mapped = (data ?? []).map((row: Record<string, unknown>) => ({
        ...(row as object),
        project_title: pTitleMap[row["project_id"] as string] ?? "Project",
        profile: row["profiles"],
      })) as Proposal[];

      setProposals(mapped);
      setLoading(false);
    };
    void load();
  }, [profileId]);

  const filtered = projectFilter ? proposals.filter((p) => p.project_id === projectFilter) : proposals;

  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-container-low" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-display text-xl text-primary">Proposal inbox</h3>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
          {filtered.length} proposal{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {projectTitles.length > 1 && (
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="w-full rounded-xl border border-outline-variant/50 bg-white px-3 py-2 text-xs font-medium text-primary outline-none focus:border-primary"
        >
          <option value="">All projects</option>
          {projectTitles.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant/60 bg-surface-container-low p-8 text-center">
          <span className="material-symbols-outlined text-[36px] text-on-surface-variant/30">description</span>
          <p className="mt-2 text-xs text-on-surface-variant">
            {proposals.length === 0
              ? "No proposals received yet. Publish an open project to start receiving applications."
              : "No proposals match the selected project."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((proposal) => {
            const initials = (proposal.profile?.full_name ?? "?")
              .split(" ").filter(Boolean).slice(0,2).map((w) => w[0]).join("").toUpperCase();
            return (
              <article key={proposal.id} className="rounded-2xl border border-outline-variant/40 bg-white p-5">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-[12px] font-bold text-primary">
                    {proposal.profile?.avatar_url
                      ? <img src={proposal.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      : initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Applicant name + badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to="/profile/$id"
                        params={{ id: proposal.profile?.id ?? "" }}
                        className="text-sm font-bold text-primary hover:underline"
                      >
                        {proposal.profile?.full_name ?? "Applicant"}
                      </Link>
                      <span className="rounded-full bg-primary/8 px-2 py-0.5 text-xs font-bold uppercase text-primary">
                        {proposal.profile?.user_type}
                      </span>
                      {proposal.profile?.is_verified && (
                        <span className="flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                          <span className="material-symbols-outlined text-xs">verified</span> Verified
                        </span>
                      )}
                      {proposal.profile?.city && (
                        <span className="text-xs text-on-surface-variant">{proposal.profile.city}</span>
                      )}
                    </div>

                    {/* Project label */}
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                      For: <span className="font-semibold">{proposal.project_title}</span>
                      {" · "}{timeAgo(proposal.created_at)}
                    </p>

                    {/* Cover note */}
                    <p className="mt-3 text-xs leading-5 text-on-surface-variant">
                      {proposal.cover_note}
                    </p>

                    {/* Quote */}
                    {proposal.quoted_amount !== null && (
                      <p className="mt-2 text-sm font-bold text-primary">
                        Quoted: PKR {proposal.quoted_amount.toLocaleString("en-PK")}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="mt-3 flex gap-2">
                      <Link
                        to="/profile/$id"
                        params={{ id: proposal.profile?.id ?? "" }}
                        className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/60 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/8"
                      >
                        <span className="material-symbols-outlined text-[13px]">person</span>
                        View profile
                      </Link>
                      <Link
                        to="/messages"
                        className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-on-primary transition hover:bg-primary-container"
                      >
                        <span className="material-symbols-outlined text-[13px]">chat</span>
                        Message
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

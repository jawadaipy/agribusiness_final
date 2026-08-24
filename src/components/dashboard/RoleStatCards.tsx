/**
 * Live per-role workspace stats, computed from the member's real records.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { MemberProfile } from "@/lib/member";
import { supabase } from "@/lib/supabase";

type StatCard = { icon: string; label: string; value: number | null; to: string; hint?: string };

function Card({ stat }: { stat: StatCard }) {
  return (
    <Link
      to={stat.to}
      className="group flex items-center gap-4 rounded-2xl border border-outline-variant/60 bg-white p-4 shadow-[0_8px_22px_rgba(15,81,50,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,81,50,0.10)]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
        <span className="material-symbols-outlined text-[21px]">{stat.icon}</span>
      </span>
      <div className="min-w-0">
        <p className="font-display text-2xl leading-none text-primary">
          {stat.value === null ? <span className="inline-block h-6 w-8 animate-pulse rounded bg-surface-container-low align-middle" /> : stat.value}
        </p>
        <p className="mt-1 truncate text-xs font-bold uppercase tracking-[.1em] text-on-surface-variant">{stat.label}</p>
        {stat.hint ? <p className="mt-0.5 truncate text-xs text-on-surface-variant/70">{stat.hint}</p> : null}
      </div>
      <span className="material-symbols-outlined ml-auto text-[16px] text-on-surface-variant/40 transition-transform group-hover:translate-x-1">chevron_right</span>
    </Link>
  );
}

async function count(query: PromiseLike<{ count: number | null }>): Promise<number> {
  const { count } = await query;
  return count ?? 0;
}

export function RoleStatCards({ profile }: { profile: MemberProfile }) {
  const [stats, setStats] = useState<StatCard[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const connections = count(
        supabase
          .from("connection_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "accepted")
          .or(`requester_profile_id.eq.${profile.id},recipient_profile_id.eq.${profile.id}`),
      );
      const pending = count(
        supabase
          .from("connection_requests")
          .select("id", { count: "exact", head: true })
          .eq("recipient_profile_id", profile.id)
          .eq("status", "pending"),
      );
      const listings = count(
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("profile_id", profile.id).eq("status", "active"),
      );
      const myProjects = count(
        supabase.from("projects").select("id", { count: "exact", head: true }).eq("profile_id", profile.id),
      );
      const proposalsSent = count(
        supabase.from("project_proposals").select("id", { count: "exact", head: true }).eq("profile_id", profile.id),
      );
      const myPosts = count(
        supabase.from("problem_posts").select("id", { count: "exact", head: true }).eq("profile_id", profile.id),
      );
      const myComments = count(
        supabase.from("problem_comments").select("id", { count: "exact", head: true }).eq("profile_id", profile.id),
      );

      // proposals received across my projects (2-step: ids then count)
      const { data: myProjectIds } = await supabase.from("projects").select("id").eq("profile_id", profile.id).limit(100);
      const ids = (myProjectIds ?? []).map((row) => row.id);
      const proposalsReceived = ids.length
        ? count(supabase.from("project_proposals").select("id", { count: "exact", head: true }).in("project_id", ids))
        : Promise.resolve(0);

      const [c, p, l, pr, ps, mp, mc, prec] = await Promise.all([
        connections, pending, listings, myProjects, proposalsSent, myPosts, myComments, proposalsReceived,
      ]);
      if (cancelled) return;

      const base: StatCard[] = [
        { icon: "group_add", label: "Connections", value: c, to: "/dashboard" },
        { icon: "inbox", label: "Pending requests", value: p, to: "/dashboard" },
      ];
      const roleSpecific: StatCard[] =
        profile.user_type === "farmer"
          ? [
              { icon: "inventory_2", label: "Produce listings live", value: l, to: "/apps/agri-biz" },
              { icon: "edit_note", label: "Farm needs posted", value: pr, to: "/projects" },
            ]
          : profile.user_type === "buyer"
            ? [
                { icon: "shopping_cart", label: "Buying requirements", value: pr, to: "/projects" },
                { icon: "handshake", label: "Proposals received", value: prec, to: "/dashboard" },
              ]
            : profile.user_type === "consultant"
              ? [
                  { icon: "send", label: "Proposals submitted", value: ps, to: "/projects" },
                  { icon: "add_business", label: "Service listings live", value: l, to: "/apps/agri-biz" },
                ]
              : profile.user_type === "company"
                ? [
                    { icon: "campaign", label: "Opportunities posted", value: pr, to: "/projects" },
                    { icon: "handshake", label: "Proposals received", value: prec, to: "/dashboard" },
                  ]
                : [
                    { icon: "dynamic_feed", label: "Network posts shared", value: mp, to: "/feed" },
                    { icon: "chat_bubble", label: "Answers & comments", value: mc, to: "/feed" },
                  ];
      setStats([...base, ...roleSpecific]);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [profile.id, profile.user_type]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.length === 0
        ? [0, 1, 2, 3].map((i) => <div key={i} className="h-[76px] animate-pulse rounded-2xl bg-[#E3E1D5]" />)
        : stats.map((stat) => <Card key={stat.label} stat={stat} />)}
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { RoleWorkspace } from "@/components/dashboard/RoleWorkspace";
import { getAuthenticatedMember, type MemberProfile } from "@/lib/member";
import { supabase } from "@/lib/supabase";
import { PaywallGuard } from "@/components/shared/PaywallGuard";
import { SubscriptionBadge } from "@/components/shared/SubscriptionBadge";
import { isSubscriptionExpired } from "@/lib/payment";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "My Workspace | AgriBusiness Pakistan" },{ name: "description", content: "A role-specific AgriBusiness workspace." }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePending, setProfilePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMember = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getAuthenticatedMember();
    if (!result.user) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    if (result.error) setError(result.error);
    setProfile(result.profile);
    setProfilePending(!result.profile);
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    void loadMember();
  }, [loadMember]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#F4F8F4] p-8 pt-24">
        <div className="mx-auto max-w-5xl animate-pulse space-y-6">
          <div className="h-12 w-64 rounded-2xl bg-emerald-200/50" />
          <div className="h-44 rounded-3xl bg-white border border-emerald-100" />
          <div className="grid gap-5 md:grid-cols-3">
            <div className="h-32 rounded-3xl bg-white border border-emerald-100" />
            <div className="h-32 rounded-3xl bg-white border border-emerald-100" />
            <div className="h-32 rounded-3xl bg-white border border-emerald-100" />
          </div>
        </div>
      </div>
    );

  if (profile) {
    const expired = isSubscriptionExpired(profile);
    return (
      <div className="min-h-screen bg-[#F4F8F4]">
        {/* Subscription status bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-emerald-200/60 bg-white/95 backdrop-blur-lg px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="font-display text-sm font-bold text-emerald-900">My Workspace</span>
            <SubscriptionBadge profile={profile} />
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
          >
            Sign out
          </button>
        </div>

        {expired ? (
          <div className="flex min-h-[60vh] items-center justify-center p-8">
            <PaywallGuard profile={profile} actionLabel="access your workspace">
              <></>
            </PaywallGuard>
          </div>
        ) : (
          <RoleWorkspace profile={profile} onSignOut={signOut} />
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F8F4] p-5 text-slate-800">
      <div className="w-full max-w-lg rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
          <span className="material-symbols-outlined text-3xl">sync</span>
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">Setting up your workspace</h1>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          Your account is authenticated, and your secure role profile is synchronizing with the database.
        </p>
        {error && (
          <p className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void loadMember()}
            className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800"
          >
            Retry Profile Sync
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

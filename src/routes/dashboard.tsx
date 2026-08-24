import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { RoleWorkspace } from "@/components/dashboard/RoleWorkspace";
import { getAuthenticatedMember, type MemberProfile } from "@/lib/member";
import { supabase } from "@/lib/supabase";

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
      <div className="min-h-screen bg-background p-8 pt-24">
        <div className="mx-auto max-w-5xl animate-pulse space-y-6">
          <div className="h-14 w-72 rounded-xl bg-surface-container" />
          <div className="h-48 rounded-2xl bg-surface-container" />
          <div className="grid gap-5 md:grid-cols-3">
            <div className="h-36 rounded-2xl bg-surface-container" />
            <div className="h-36 rounded-2xl bg-surface-container" />
            <div className="h-36 rounded-2xl bg-surface-container" />
          </div>
        </div>
      </div>
    );

  if (profile) return <RoleWorkspace profile={profile} onSignOut={signOut} />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="w-full max-w-lg rounded-2xl border border-outline-variant bg-white p-7 text-center shadow-lg">
        <span className="material-symbols-outlined text-4xl text-secondary" aria-hidden="true">sync</span>
        <h1 className="mt-4 font-display text-3xl text-primary">Setting up your workspace</h1>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
          Your account is authenticated, but the secure profile record is not available yet. This is
          normally created automatically after signup. Please retry in a moment.
        </p>
        {error && (
          <p className="mt-4 rounded-xl bg-error/10 p-3 text-xs font-semibold text-error">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void loadMember()}
            className="rounded-xl bg-primary px-4 py-3 text-xs font-bold text-on-primary"
          >
            Retry profile setup
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-xl border border-outline-variant px-4 py-3 text-xs font-bold text-primary"
          >
            Sign out
          </button>
        </div>
        {profilePending && (
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant/60">
            Secure session · profiles are created server-side
          </p>
        )}
      </div>
    </div>
  );
}

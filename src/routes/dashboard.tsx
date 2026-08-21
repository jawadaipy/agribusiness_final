import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { RoleWorkspace } from "@/components/dashboard/RoleWorkspace";
import { getAuthenticatedMember, type MemberProfile } from "@/lib/member";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    title: "My Workspace | AgriBusiness Pakistan",
    meta: [{ name: "description", content: "A role-specific AgriBusiness workspace." }],
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
      <div className="min-h-screen bg-[#F4F2E9] p-8">
        <div className="mx-auto max-w-5xl animate-pulse space-y-6">
          <div className="h-14 w-72 rounded-xl bg-[#E3E1D5]" />
          <div className="h-48 rounded-2xl bg-[#E3E1D5]" />
          <div className="grid gap-5 md:grid-cols-3">
            <div className="h-36 rounded-2xl bg-[#E3E1D5]" />
            <div className="h-36 rounded-2xl bg-[#E3E1D5]" />
            <div className="h-36 rounded-2xl bg-[#E3E1D5]" />
          </div>
        </div>
      </div>
    );

  if (profile) return <RoleWorkspace profile={profile} onSignOut={signOut} />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F2E9] p-5">
      <div className="w-full max-w-lg rounded-2xl border border-[#DCD7C7] bg-[#FFFEF9] p-7 text-center shadow-[0_12px_35px_rgba(31,67,55,0.08)]">
        <span className="material-symbols-outlined text-4xl text-[#8A6713]">sync</span>
        <h1 className="mt-4 font-display text-3xl text-[#17352E]">Setting up your workspace</h1>
        <p className="mt-3 text-sm leading-6 text-[#6D7A71]">
          Your account is authenticated, but the secure profile record is not available yet. This is
          normally created automatically after signup. Please retry in a moment.
        </p>
        {error && (
          <p className="mt-4 rounded-xl bg-[#FBE8E2] p-3 text-xs font-semibold text-[#8A3D29]">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={() => void loadMember()}
            className="rounded-xl bg-[#153E35] px-4 py-3 text-xs font-bold text-white"
          >
            Retry profile setup
          </button>
          <button
            onClick={() => void signOut()}
            className="rounded-xl border border-[#D8D2BF] px-4 py-3 text-xs font-bold text-[#31564A]"
          >
            Sign out
          </button>
        </div>
        {profilePending && (
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#839086]">
            No local demo session is used
          </p>
        )}
      </div>
    </div>
  );
}

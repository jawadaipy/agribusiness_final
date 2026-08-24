/**
 * Admin Portal login. Credentials exist only in the browser form submission;
 * successful Supabase Auth alone is insufficient until profiles.user_type is admin.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getAuthFeedback } from "@/lib/auth-feedback";
import { getAuthenticatedPlatformProfile, recordSessionLogin } from "@/lib/member";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [{ title: "Admin Portal | AgriBusiness Pakistan" },{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const resolveExistingSession = async () => {
      const { user, profile } = await getAuthenticatedPlatformProfile();
      if (!mounted) return;
      if (user && profile?.user_type === "admin") {
        navigate({ to: "/admin", replace: true });
        return;
      }
      if (user) {
        await supabase.auth.signOut();
        if (mounted) setError("This account does not have Super Admin access. Sign in through the member portal instead.");
      }
      if (mounted) setChecking(false);
    };
    void resolveExistingSession();
    return () => { mounted = false; };
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) {
      setError(getAuthFeedback(authError.message).message);
      setLoading(false);
      return;
    }
    const { profile } = await getAuthenticatedPlatformProfile();
    if (profile?.user_type !== "admin") {
      await supabase.auth.signOut();
      setPassword("");
      setError("Authentication succeeded, but this account is not approved for Super Admin access.");
      setLoading(false);
      return;
    }
    recordSessionLogin();
    navigate({ to: "/admin", replace: true });
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl overflow-hidden rounded-3xl border border-outline-variant/60 bg-white shadow-[0_18px_48px_rgba(15,81,50,0.12)] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative overflow-hidden bg-primary p-8 text-on-primary sm:p-12">
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-2 font-display text-xl font-bold text-white"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary"><span className="material-symbols-outlined text-[20px]">admin_panel_settings</span></span>AgriBusiness</Link>
            <p className="mt-16 text-xs font-bold uppercase tracking-[0.18em] text-secondary-container">Restricted governance access</p>
            <h1 className="mt-3 max-w-md font-display text-4xl font-bold leading-tight">Super Admin Portal</h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/80">Platform governance, member moderation, advertising review, and audit operations are available only to provisioned administrators.</p>
          </div>
          <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-secondary/15 blur-3xl" />
        </section>
        <section className="flex items-center bg-surface-container-low p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-md">
            <Link to="/onboarding" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"><span className="material-symbols-outlined text-[16px]">arrow_back</span>Member sign in</Link>
            <p className="mt-10 text-xs font-bold uppercase tracking-[0.16em] text-secondary">Secure access</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-primary">Administrator sign in</h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">Enter the credentials assigned to your administrator account. Access is verified again against the database role.</p>
            {error ? <div className="mt-6 rounded-xl border border-error/25 bg-error/10 p-3 text-xs leading-5 text-error">{error}</div> : null}
            {checking ? <div className="mt-8 rounded-xl border border-outline-variant bg-white p-4 text-xs font-medium text-on-surface-variant">Checking existing secure session…</div> : <form onSubmit={handleSubmit} className="mt-8 space-y-5"><label className="block space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Administrator email</span><input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="w-full rounded-xl border border-outline-variant/60 bg-white px-4 py-3 text-sm font-medium text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label><label className="block space-y-1.5"><span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Password</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="w-full rounded-xl border border-outline-variant/60 bg-white px-4 py-3 text-sm font-medium text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label><button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-on-primary transition hover:bg-primary-container disabled:opacity-50"><span className="material-symbols-outlined text-[17px]" aria-hidden="true">lock</span>{loading ? "Verifying access…" : "Enter Super Admin portal"}</button></form>}
            <p className="mt-6 text-xs leading-5 text-on-surface-variant">Administrator accounts are provisioned privately. The standard member registration flow never creates an admin role.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

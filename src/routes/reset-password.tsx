/**
 * /reset-password — the landing page for the password-reset email link.
 * Supabase delivers the recovery session here; the member sets a new
 * password and is dropped into their workspace.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getAuthFeedback } from "@/lib/auth-feedback";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    title: "Reset Password | AgriBusiness Pakistan",
    meta: [{ name: "description", content: "Set a new password for your AgriBusiness account." }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [checking, setChecking] = useState(true);

  // The email link carries the recovery token; Supabase establishes the
  // session automatically via detectSessionInUrl. Wait for it.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) {
        setError("This reset link is invalid or has expired. Request a new one from the sign-in page.");
      }
      setChecking(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Choose a password of at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(getAuthFeedback(updateError.message).message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate({ to: "/dashboard", replace: true }), 1600);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="w-full max-w-md rounded-2xl border border-outline-variant/50 bg-white p-7 shadow-lg">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
            <span className="material-symbols-outlined text-[24px] text-secondary" aria-hidden="true">lock_reset</span>
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-primary">Set a new password</h1>
          <p className="mt-2 text-xs leading-5 text-on-surface-variant">
            Choose a strong password for your AgriBusiness account. You'll be signed in automatically.
          </p>
        </div>

        {error ? (
          <div className="mb-5 rounded-xl border border-error/25 bg-error/10 p-3.5 text-xs leading-5 text-error">
            {error}
            {error.includes("invalid or has expired") && (
              <button
                type="button"
                onClick={() => navigate({ to: "/onboarding" })}
                className="mt-3 block rounded-xl border border-error/30 bg-white px-4 py-2 font-bold"
              >
                Back to sign in
              </button>
            )}
          </div>
        ) : null}

        {done ? (
          <div className="rounded-xl border border-success/25 bg-success/10 p-5 text-center text-sm font-bold text-success">
            Password updated — taking you to your workspace…
          </div>
        ) : checking ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 text-xs font-medium text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">progress_activity</span>
            Verifying your reset link…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-3 text-sm font-medium text-primary outline-none transition focus:border-primary"
                placeholder="At least 6 characters"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-3 text-sm font-medium text-primary outline-none transition focus:border-primary"
                placeholder="Repeat the new password"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-wider text-on-primary shadow-md transition hover:bg-primary-container disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

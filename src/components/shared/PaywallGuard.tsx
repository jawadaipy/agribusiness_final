/**
 * PaywallGuard — wraps protected write-actions.
 * If the user's trial is expired and they have no active subscription,
 * shows an upgrade prompt instead of the children.
 * Read-only browsing (marketplace, rates, search) should NOT use this guard.
 */
import { Link } from "@tanstack/react-router";
import type { MemberProfile } from "@/lib/member";
import { isSubscriptionExpired, getTrialDaysRemaining, getPlanForRole } from "@/lib/payment";
import { formatPKR } from "@/lib/format";

interface PaywallGuardProps {
  profile: MemberProfile;
  children: React.ReactNode;
  /** Optional: customize the action description shown in the paywall */
  actionLabel?: string;
}

export function PaywallGuard({ profile, children, actionLabel }: PaywallGuardProps) {
  if (!isSubscriptionExpired(profile)) {
    return <>{children}</>;
  }

  const plan = getPlanForRole(profile.user_type);

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-amber-200 bg-gradient-to-br from-white to-amber-50/50 p-8 text-center shadow-lg">
      {/* Icon */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
        <span className="material-symbols-outlined text-[32px]">lock</span>
      </div>

      {/* Headline */}
      <h2 className="mt-5 font-display text-2xl font-bold text-slate-900">
        Your Free Trial Has Ended
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        {actionLabel
          ? `To ${actionLabel}, upgrade to a paid subscription.`
          : "Upgrade to a paid subscription to continue using all platform features."}
      </p>

      {/* Plan card */}
      <div className="mt-6 rounded-2xl border border-emerald-200 bg-white p-5 text-left shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              {plan.label} Plan
            </span>
            <p className="mt-1 font-display text-2xl font-bold text-slate-900">
              {formatPKR(plan.price)}
              <span className="text-sm font-medium text-slate-500">/month</span>
            </p>
          </div>
          <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
            <span className="material-symbols-outlined text-[24px]">verified</span>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {plan.features.slice(0, 4).map((feat) => (
            <li key={feat} className="flex items-center gap-2 text-xs text-slate-700">
              <span className="material-symbols-outlined text-emerald-500 text-[14px]">check_circle</span>
              {feat}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="mt-6 flex flex-col gap-3">
        <Link
          to="/pricing"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-emerald-800"
        >
          <span className="material-symbols-outlined text-[16px]">payment</span>
          Subscribe Now — {formatPKR(plan.price)}/mo
        </Link>
        <p className="text-xs text-slate-500">
          Pay securely with JazzCash or EasyPaisa
        </p>
      </div>
    </div>
  );
}

/**
 * SubscriptionBadge — compact status indicator for trial/subscription state.
 * Shows countdown during trial, "Active" for paid, or "Upgrade" for expired.
 */
import { Link } from "@tanstack/react-router";
import type { MemberProfile } from "@/lib/member";
import { getTrialDaysRemaining, isSubscriptionExpired } from "@/lib/payment";

interface SubscriptionBadgeProps {
  profile: MemberProfile;
  compact?: boolean;
}

export function SubscriptionBadge({ profile, compact }: SubscriptionBadgeProps) {
  const status = profile.subscription_status;
  const trialDays = getTrialDaysRemaining(profile);
  const expired = isSubscriptionExpired(profile);

  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
        <span className="material-symbols-outlined text-[13px]">verified</span>
        {compact ? "Pro" : "Subscription Active"}
      </span>
    );
  }

  if (status === 'trial' && trialDays > 0) {
    const urgency = trialDays <= 2;
    return (
      <Link
        to="/pricing"
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border transition hover:shadow-sm ${
          urgency
            ? "bg-amber-50 text-amber-800 border-amber-300 animate-pulse"
            : "bg-blue-50 text-blue-800 border-blue-200"
        }`}
      >
        <span className="material-symbols-outlined text-[13px]">schedule</span>
        {compact ? `${trialDays}d left` : `Trial: ${trialDays} day${trialDays !== 1 ? "s" : ""} left`}
      </Link>
    );
  }

  if (expired) {
    return (
      <Link
        to="/pricing"
        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-800 border border-rose-200 transition hover:bg-rose-100"
      >
        <span className="material-symbols-outlined text-[13px]">lock</span>
        {compact ? "Upgrade" : "Trial Expired — Upgrade"}
      </Link>
    );
  }

  return null;
}

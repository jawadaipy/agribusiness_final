/**
 * ProfileCompletenessBar — shows a % progress indicator and
 * a checklist of what the user still needs to fill in.
 */
import type { MemberProfile } from "@/lib/member";

const steps = [
  { key: "full_name", label: "Full name", weight: 20 },
  { key: "city", label: "City", weight: 15 },
  { key: "bio", label: "Bio / description", weight: 20 },
  { key: "avatar_url", label: "Profile photo", weight: 15 },
  { key: "phone", label: "Phone number", weight: 10 },
  { key: "website", label: "Website / portfolio link", weight: 10 },
  { key: "is_verified", label: "Account verified by admin", weight: 10 },
] as const;

function getColor(pct: number) {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-400";
  return "bg-red-400";
}

function getLabel(pct: number) {
  if (pct >= 90) return "Excellent — your profile will attract the most connections.";
  if (pct >= 70) return "Good — add a few more details to stand out.";
  if (pct >= 40) return "Getting started — complete your profile to build trust.";
  return "Low visibility — buyers and consultants will skip incomplete profiles.";
}

interface Props {
  profile: MemberProfile & {
    bio?: string | null;
    avatar_url?: string | null;
    phone?: string | null;
    website?: string | null;
  };
}

export function ProfileCompletenessBar({ profile }: Props) {
  const filled = steps.filter((s) => {
    const val = profile[s.key as keyof typeof profile];
    if (typeof val === "boolean") return val;
    return Boolean(val);
  });

  const pct = filled.reduce((acc, s) => acc + s.weight, 0);
  const missing = steps.filter((s) => !filled.includes(s));

  return (
    <div className="rounded-2xl border border-outline-variant/40 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-primary">Profile completeness</h3>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold text-white ${getColor(pct)}`}
        >
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-container-high">
        <div
          className={`h-full rounded-full transition-all duration-700 ${getColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 text-xs leading-4 text-on-surface-variant">{getLabel(pct)}</p>

      {/* Checklist */}
      {missing.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">
            Still missing
          </p>
          <ul className="space-y-1.5">
            {missing.map((s) => (
              <li key={s.key} className="flex items-center gap-2 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px] text-error/70">
                  radio_button_unchecked
                </span>
                {s.label}
                <span className="ml-auto text-xs font-bold text-on-surface-variant/50">
                  +{s.weight}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pct === 100 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2">
          <span className="material-symbols-outlined text-[18px] text-emerald-600">verified</span>
          <p className="text-xs font-bold text-emerald-700">Perfect profile — 100% complete!</p>
        </div>
      )}
    </div>
  );
}

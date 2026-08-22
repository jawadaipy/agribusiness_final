/**
 * Role-synergy matching engine: explains WHY two member roles belong in the
 * same network, then scores real directory profiles by role fit, location,
 * and keyword overlap (crops, commodities, services, research interests).
 */
import type { AccountRole } from "@/lib/member";

export type MatchCandidate = {
  id: string;
  user_type: AccountRole;
  display_name: string | null;
  city: string | null;
  province?: string | null;
  bio?: string | null;
  is_verified?: boolean;
  keywords?: string[];
};

export type MatchInput = {
  id: string;
  user_type: AccountRole;
  city: string | null;
  province?: string | null;
  keywords?: string[];
};

export type MatchedProfile = MatchCandidate & { score: number; reasons: string[] };

/**
 * What each pairing means commercially. Key format: `${myRole}>${theirRole}`.
 * Same-role pairs get a generic collaboration note.
 */
const SYNERGY: Record<string, string> = {
  "farmer>buyer": "Procures the commodities you grow",
  "buyer>farmer": "Grows the commodities you procure",
  "farmer>consultant": "Advises on your crops, soil, and livestock",
  "consultant>farmer": "Needs your advisory in the field",
  "farmer>company": "Supplies inputs, machinery, and buyback contracts",
  "company>farmer": "Is a potential contract-farming supplier",
  "buyer>company": "Processes, packs, and moves what you procure",
  "company>buyer": "Is a bulk off-taker for your products",
  "buyer>consultant": "Grades and inspects quality for your procurement",
  "consultant>buyer": "Needs quality and sourcing expertise",
  "company>consultant": "Delivers technical services you need",
  "consultant>company": "Hires consultants for field programs",
  "company>student": "Offers internships and research placements",
  "student>company": "Posts internships and graduate roles",
  "consultant>student": "Can supervise your field research",
  "student>consultant": "Seeks mentors and co-authors in your field",
  "student>farmer": "Hosts field trials and farm surveys",
  "farmer>student": "Runs trials and surveys you can join",
  "student>buyer": "Shares mandi and supply-chain research",
  "buyer>student": "Offers market research exposure",
};

export function synergyReason(myRole: AccountRole, theirRole: AccountRole): string | null {
  return SYNERGY[`${myRole}>${theirRole}`] ?? null;
}

const normalize = (value: string) => value.trim().toLowerCase();

function keywordOverlap(mine: string[] = [], theirs: string[] = []): string[] {
  const theirSet = theirs.map(normalize).filter(Boolean);
  const matches = new Set<string>();
  for (const raw of mine) {
    const m = normalize(raw);
    if (!m) continue;
    for (const t of theirSet) {
      if (!t) continue;
      if (m === t || m.includes(t) || t.includes(m)) {
        matches.add(raw.trim());
        break;
      }
    }
  }
  return Array.from(matches);
}

export function scoreMatch(me: MatchInput, candidate: MatchCandidate): MatchedProfile {
  const reasons: string[] = [];
  let score = 0;

  if (me.user_type !== candidate.user_type) {
    const synergy = synergyReason(me.user_type, candidate.user_type);
    if (synergy) {
      score += 40;
      reasons.push(synergy);
    } else {
      score += 12;
    }
  } else {
    score += 8;
    reasons.push("Same professional community");
  }

  if (me.city && candidate.city && me.city === candidate.city) {
    score += 18;
    reasons.push(`Based in ${candidate.city}`);
  } else if (me.province && candidate.province && me.province === candidate.province) {
    score += 8;
    reasons.push(`Active in ${candidate.province}`);
  }

  const overlap = keywordOverlap(me.keywords, candidate.keywords);
  if (overlap.length > 0) {
    score += Math.min(24, 8 * overlap.length);
    reasons.push(`Works with ${overlap.slice(0, 3).join(", ")}`);
  }

  if (candidate.is_verified) {
    score += 6;
  }

  return { ...candidate, score, reasons: reasons.slice(0, 3) };
}

/** Top N suggestions, excluding self and already-connected/pending ids. */
export function suggestMatches(
  me: MatchInput,
  candidates: MatchCandidate[],
  excludeIds: string[] = [],
  limit = 4,
): MatchedProfile[] {
  const excluded = new Set([me.id, ...excludeIds]);
  return candidates
    .filter((c) => !excluded.has(c.id))
    .map((c) => scoreMatch(me, c))
    .filter((c) => c.score > 20)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Match a member's keywords against listing/project text for sourcing/leads. */
export function textKeywordMatches(needles: string[] = [], haystack: (string | null | undefined)[] = []): string[] {
  const joined = haystack.filter(Boolean).join(" ").toLowerCase();
  return needles.filter((raw) => {
    const n = normalize(raw);
    return n.length > 2 && joined.includes(n);
  });
}

export const ROLE_LABELS: Record<AccountRole, string> = {
  farmer: "Farmer / Producer",
  buyer: "Buyer / Trader / Miller",
  consultant: "Consultant / Vet",
  company: "Enterprise / Supplier",
  student: "Student / Researcher",
};

export const ROLE_ICONS: Record<AccountRole, string> = {
  farmer: "agriculture",
  buyer: "shopping_cart",
  consultant: "workspace_premium",
  company: "domain",
  student: "school",
};

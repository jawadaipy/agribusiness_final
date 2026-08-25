/**
 * Directory enrichment: loads public profiles plus each role's keyword
 * fields (crops, commodities, services, research interests) so the matching
 * engine can compute real overlap. All queries tolerate missing role tables.
 */
import { supabase } from "@/lib/supabase";
import { isAccountRole, type AccountRole } from "@/lib/member";
import type { MatchCandidate } from "@/lib/matching";

export async function fetchDirectoryWithKeywords(): Promise<{ candidates: MatchCandidate[]; error: string | null }> {
  const { data, error } = await supabase
    .from("directory_profiles")
    .select("id,user_type,display_name,city,province,bio,is_verified")
    .limit(200);
  if (error) return { candidates: [], error: error.message };

  const keywordMap = await fetchRoleKeywordMap();
  const candidates: MatchCandidate[] = [];
  for (const row of data ?? []) {
    if (!isAccountRole(row.user_type)) continue;
    candidates.push({
      id: row.id,
      user_type: row.user_type as AccountRole,
      display_name: row.display_name,
      city: row.city ?? null,
      province: row.province ?? null,
      bio: row.bio ?? null,
      is_verified: row.is_verified === true,
      keywords: keywordMap.get(row.id) ?? [],
    });
  }
  return { candidates, error: null };
}

async function fetchRoleKeywordMap(): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  const add = (id: string | null | undefined, values: (string | null | undefined)[]) => {
    if (!id) return;
    const clean = (values ?? []).filter((v): v is string => Boolean(v && v.trim()));
    if (clean.length === 0) return;
    map.set(id, [...(map.get(id) ?? []), ...clean]);
  };

  const [farmers, buyers, consultants, students, orgs] = await Promise.all([
    supabase.from("farmer_profiles").select("profile_id,crops,livestock").limit(300),
    supabase.from("buyer_profiles").select("profile_id,commodities,grades").limit(300),
    supabase.from("consultant_profiles").select("profile_id,services,technologies").limit(300),
    supabase.from("student_profiles").select("profile_id,research_interests").limit(300),
    supabase.from("organizations").select("owner_profile_id,services,technologies").limit(300),
  ]);

  for (const row of (farmers.data ?? []) as Array<{ profile_id: string; crops: string[] | null; livestock: string[] | null }>) {
    add(row.profile_id, [...(row.crops ?? []), ...(row.livestock ?? [])]);
  }
  for (const row of (buyers.data ?? []) as Array<{ profile_id: string; commodities: string[] | null; grades: string[] | null }>) {
    add(row.profile_id, [...(row.commodities ?? []), ...(row.grades ?? [])]);
  }
  for (const row of (consultants.data ?? []) as Array<{ profile_id: string; services: string[] | null; technologies: string[] | null }>) {
    add(row.profile_id, [...(row.services ?? []), ...(row.technologies ?? [])]);
  }
  for (const row of (students.data ?? []) as Array<{ profile_id: string; research_interests: string[] | null }>) {
    add(row.profile_id, row.research_interests ?? []);
  }
  for (const row of (orgs.data ?? []) as Array<{ owner_profile_id: string | null; services: string[] | null; technologies: string[] | null }>) {
    add(row.owner_profile_id, [...(row.services ?? []), ...(row.technologies ?? [])]);
  }
  return map;
}

/** The signed-in member's own matching keywords from their role table. */
export async function fetchMyKeywords(profileId: string, role: AccountRole): Promise<string[]> {
  let query: PromiseLike<{ data: unknown }> | null = null;
  if (role === "farmer") {
    query = supabase.from("farmer_profiles").select("crops,livestock").eq("profile_id", profileId).maybeSingle();
  } else if (role === "buyer") {
    query = supabase.from("buyer_profiles").select("commodities,grades,procurement_regions").eq("profile_id", profileId).maybeSingle();
  } else if (role === "consultant") {
    query = supabase.from("consultant_profiles").select("services,technologies").eq("profile_id", profileId).maybeSingle();
  } else if (role === "student") {
    query = supabase.from("student_profiles").select("research_interests").eq("profile_id", profileId).maybeSingle();
  } else {
    query = supabase.from("organizations").select("services,technologies").eq("owner_profile_id", profileId).maybeSingle();
  }
  const { data } = await query;
  if (!data || typeof data !== "object") return [];
  return Object.values(data as Record<string, unknown>)
    .flat()
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

/** Peer ids with any connection-request history (to exclude from suggestions). */
export async function fetchConnectionPeerIds(profileId: string): Promise<string[]> {
  const { data } = await supabase
    .from("connection_requests")
    .select("requester_profile_id,recipient_profile_id")
    .or(`requester_profile_id.eq.${profileId},recipient_profile_id.eq.${profileId}`)
    .limit(300);
  const peers: string[] = [];
  for (const row of data ?? []) {
    if (row.requester_profile_id !== profileId) peers.push(row.requester_profile_id);
    if (row.recipient_profile_id !== profileId) peers.push(row.recipient_profile_id);
  }
  return peers;
}

/** Save role-specific keywords/tags for a profile. */
export async function saveProfileKeywords(
  profileId: string,
  role: AccountRole,
  keywords: string[],
): Promise<{ error: string | null }> {
  try {
    const clean = Array.from(
      new Set(keywords.map((k) => k.trim()).filter((k) => k.length > 0)),
    );

    if (role === "farmer") {
      await supabase
        .from("farmer_profiles")
        .upsert({ profile_id: profileId, crops: clean }, { onConflict: "profile_id" });
    } else if (role === "buyer") {
      await supabase
        .from("buyer_profiles")
        .upsert({ profile_id: profileId, commodities: clean }, { onConflict: "profile_id" });
    } else if (role === "consultant") {
      await supabase
        .from("consultant_profiles")
        .upsert({ profile_id: profileId, services: clean, technologies: clean }, { onConflict: "profile_id" });
    } else if (role === "student") {
      await supabase
        .from("student_profiles")
        .upsert({ profile_id: profileId, research_interests: clean }, { onConflict: "profile_id" });
    } else if (role === "company") {
      await supabase
        .from("organizations")
        .update({ services: clean, technologies: clean })
        .eq("owner_profile_id", profileId);
    }

    // Also update profile_keywords table
    if (clean.length > 0) {
      await supabase.from("profile_keywords").delete().eq("profile_id", profileId);
      const rows = clean.map((kw) => ({ profile_id: profileId, keyword: kw }));
      await supabase.from("profile_keywords").insert(rows);
    }

    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}


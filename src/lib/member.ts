import { supabase, type User } from "@/lib/supabase";

export const ACCOUNT_ROLES = ["student", "farmer", "buyer", "consultant", "company"] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];
export type PlatformRole = AccountRole | "admin";

export type MemberProfile = {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  user_type: AccountRole;
  city: string | null;
  primary_discipline?: string | null;
  trial_ends_at: string | null;
  subscription_status: string | null;
  is_verified: boolean;
  is_active: boolean;
};

export type PlatformProfile = Omit<MemberProfile, "user_type"> & { user_type: PlatformRole };

export function isAccountRole(value: unknown): value is AccountRole {
  return typeof value === "string" && ACCOUNT_ROLES.includes(value as AccountRole);
}

export function isPlatformRole(value: unknown): value is PlatformRole {
  return value === "admin" || isAccountRole(value);
}

/**
 * Resolve the current user from the local session first (no network round
 * trip); fall back to a server getUser() only when no session is cached.
 * All privileged checks still go through RLS-protected profile queries.
 */
async function currentUser(): Promise<User | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) return sessionData.session.user;
  const { data: authData } = await supabase.auth.getUser();
  return authData.user ?? null;
}

export async function getAuthenticatedPlatformProfile(): Promise<{
  user: User | null;
  profile: PlatformProfile | null;
  error: string | null;
}> {
  const user = await currentUser();
  if (!user) {
    return { user: null, profile: null, error: null };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,display_name,user_type,city,trial_ends_at,subscription_status,is_verified,is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return { user, profile: null, error: error.message };
  if (!data || !isPlatformRole(data.user_type)) return { user, profile: null, error: null };
  if (data.is_active === false) return { user, profile: null, error: "This account is inactive." };
  
  const platformProfile: PlatformProfile = {
    ...(data as PlatformProfile),
    primary_discipline: (user.user_metadata?.["primary_discipline"] as string) || null,
  };
  return { user, profile: platformProfile, error: null };
}

export async function getAuthenticatedMember(): Promise<{
  user: User | null;
  profile: MemberProfile | null;
  error: string | null;
}> {
  const user = await currentUser();
  if (!user) {
    return { user: null, profile: null, error: null };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,display_name,user_type,city,trial_ends_at,subscription_status,is_verified,is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return { user, profile: null, error: error.message };
  
  if (data && isAccountRole(data.user_type)) {
    if (data.is_active === false) return { user: user, profile: null, error: "This account is inactive." };
    const memberProfile: MemberProfile = {
      ...(data as MemberProfile),
      primary_discipline: (user.user_metadata?.["primary_discipline"] as string) || null,
    };
    return { user: user, profile: memberProfile, error: null };
  }

  // Fallback / Auto-initialization for newly created accounts
  const rawRole = (user.user_metadata?.["user_type"] as string) || "farmer";
  const role: AccountRole = isAccountRole(rawRole) ? rawRole : "farmer";
  const fullName = (user.user_metadata?.["full_name"] as string) || null;
  const city = (user.user_metadata?.["city"] as string) || null;

  try {
    const { data: inserted } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? "",
          full_name: fullName,
          display_name: fullName,
          user_type: role,
          city: city,
        },
        { onConflict: "id" },
      )
      .select("id,email,full_name,display_name,user_type,city,trial_ends_at,subscription_status,is_verified,is_active")
      .maybeSingle();

    if (inserted && isAccountRole(inserted.user_type)) {
      const memberProfile: MemberProfile = {
        ...(inserted as MemberProfile),
        primary_discipline: (user.user_metadata?.["primary_discipline"] as string) || null,
      };
      return { user: user, profile: memberProfile, error: null };
    }
  } catch {
    // If upsert encounters an RLS/network issue, return the metadata-backed member object
  }

  return {
    user: user,
    profile: {
      id: user.id,
      email: user.email ?? "",
      full_name: fullName,
      display_name: fullName,
      user_type: role,
      city: city,
      primary_discipline: (user.user_metadata?.["primary_discipline"] as string) || null,
      trial_ends_at: null,
      subscription_status: "Active",
      is_verified: false,
      is_active: true,
    },
    error: null,
  };
}

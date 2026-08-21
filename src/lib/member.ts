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

export async function getAuthenticatedPlatformProfile(): Promise<{
  user: User | null;
  profile: PlatformProfile | null;
  error: string | null;
}> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { user: null, profile: null, error: authError?.message || null };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,display_name,user_type,city,trial_ends_at,subscription_status,is_verified,is_active")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (error) return { user: authData.user, profile: null, error: error.message };
  if (!data || !isPlatformRole(data.user_type)) return { user: authData.user, profile: null, error: null };
  if (data.is_active === false) return { user: authData.user, profile: null, error: "This account is inactive." };
  return { user: authData.user, profile: data as PlatformProfile, error: null };
}

export async function getAuthenticatedMember(): Promise<{
  user: User | null;
  profile: MemberProfile | null;
  error: string | null;
}> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { user: null, profile: null, error: authError?.message || null };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,display_name,user_type,city,trial_ends_at,subscription_status,is_verified,is_active")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (error) return { user: authData.user, profile: null, error: error.message };
  
  if (data && isAccountRole(data.user_type)) {
    if (data.is_active === false) return { user: authData.user, profile: null, error: "This account is inactive." };
    return { user: authData.user, profile: data as MemberProfile, error: null };
  }

  // Fallback / Auto-initialization for newly created accounts
  const rawRole = (authData.user.user_metadata?.user_type as string) || "farmer";
  const role: AccountRole = isAccountRole(rawRole) ? rawRole : "farmer";
  const fullName = (authData.user.user_metadata?.full_name as string) || null;
  const city = (authData.user.user_metadata?.city as string) || null;

  try {
    const { data: inserted } = await supabase
      .from("profiles")
      .upsert(
        {
          id: authData.user.id,
          email: authData.user.email ?? "",
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
      return { user: authData.user, profile: inserted as MemberProfile, error: null };
    }
  } catch {
    // If upsert encounters an RLS/network issue, return the metadata-backed member object
  }

  return {
    user: authData.user,
    profile: {
      id: authData.user.id,
      email: authData.user.email ?? "",
      full_name: fullName,
      display_name: fullName,
      user_type: role,
      city: city,
      trial_ends_at: null,
      subscription_status: "Active",
      is_verified: false,
      is_active: true,
    },
    error: null,
  };
}

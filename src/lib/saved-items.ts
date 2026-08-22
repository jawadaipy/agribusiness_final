/**
 * Bookmarks over the existing saved_items table (profile_id + listing_id |
 * project_id, owner-scoped RLS). Hydration tolerates rows whose target has
 * since been removed or closed.
 */
import { supabase } from "@/lib/supabase";

export type SavedKind = "listing" | "project";

export type SavedListing = {
  id: string;
  title: string;
  price: number | null;
  unit: string | null;
  quantity: number | string | null;
  city: string | null;
  status: string;
};

export type SavedProject = {
  id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  city: string | null;
  status: string;
};

/** Ids the member has saved, for pre-filling Save buttons on list pages. */
export async function fetchSavedIds(profileId: string): Promise<{ listingIds: Set<string>; projectIds: Set<string>; error: string | null }> {
  const { data, error } = await supabase
    .from("saved_items")
    .select("listing_id,project_id")
    .eq("profile_id", profileId)
    .limit(300);
  if (error) return { listingIds: new Set(), projectIds: new Set(), error: error.message };
  const listingIds = new Set<string>();
  const projectIds = new Set<string>();
  for (const row of data ?? []) {
    if (row.listing_id) listingIds.add(row.listing_id);
    if (row.project_id) projectIds.add(row.project_id);
  }
  return { listingIds, projectIds, error: null };
}

/** Add or remove one bookmark. Returns the resulting state. */
export async function toggleSaved(profileId: string, kind: SavedKind, targetId: string): Promise<{ saved: boolean; error: string | null }> {
  const column = kind === "listing" ? "listing_id" : "project_id";
  const existing = await supabase
    .from("saved_items")
    .select("profile_id")
    .eq("profile_id", profileId)
    .eq(column, targetId)
    .maybeSingle();

  if (existing.error) return { saved: false, error: existing.error.message };

  if (existing.data) {
    const { error } = await supabase.from("saved_items").delete().eq("profile_id", profileId).eq(column, targetId);
    return { saved: false, error: error?.message ?? null };
  }

  const payload: { profile_id: string; listing_id?: string; project_id?: string } = { profile_id: profileId };
  if (kind === "listing") payload.listing_id = targetId;
  else payload.project_id = targetId;
  const { error } = await supabase.from("saved_items").insert(payload);
  return { saved: !error, error: error?.message ?? null };
}

/** Hydrated saved items for the dashboard panel. */
export async function fetchSavedItems(profileId: string): Promise<{ listings: SavedListing[]; projects: SavedProject[]; error: string | null }> {
  const { data, error } = await supabase
    .from("saved_items")
    .select("listing_id,project_id,created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { listings: [], projects: [], error: error.message };

  const listingIds = (data ?? []).map((r) => r.listing_id).filter((v): v is string => Boolean(v));
  const projectIds = (data ?? []).map((r) => r.project_id).filter((v): v is string => Boolean(v));

  const [listingsResult, projectsResult] = await Promise.all([
    listingIds.length
      ? supabase.from("listings").select("id,title,price,unit,quantity,city,status").in("id", listingIds)
      : Promise.resolve({ data: [], error: null as { message: string } | null }),
    projectIds.length
      ? supabase.from("projects").select("id,title,description,budget_min,budget_max,city,status").in("id", projectIds)
      : Promise.resolve({ data: [], error: null as { message: string } | null }),
  ]);

  return {
    listings: (listingsResult.data ?? []) as SavedListing[],
    projects: (projectsResult.data ?? []) as SavedProject[],
    error: listingsResult.error?.message ?? projectsResult.error?.message ?? null,
  };
}

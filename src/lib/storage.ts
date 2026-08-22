import { supabase } from "@/lib/supabase";

/**
 * Upload a member file to a Supabase storage bucket and return its public URL.
 * One implementation for feed photos, clinic evidence, and listing images.
 */
export async function uploadMedia(
  bucket: "problem-media" | "listing-images" | "avatars",
  profileId: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".jpg";
  const path = `${profileId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) return { url: null, error: error.message };
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

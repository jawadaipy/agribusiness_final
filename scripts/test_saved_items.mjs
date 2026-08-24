/** Verify saved_items works for a real authenticated user (RLS check). */
import { createClient } from "@supabase/supabase-js";

const URL = "https://yholetgmaexmcvupmwmn.supabase.co";
const ANON = "sb_publishable_Q7f-82AxY673B2CvzJxt5g_Xcki060E";
const SERVICE = process.argv[2];

const { data: auth, error: authError } = await createClient(URL, ANON).auth.signInWithPassword({
  email: "ali.hassan.farmer@agribiz.demo",
  password: "DemoAgri2026!",
});
if (authError || !auth.session) {
  console.error("login failed:", authError?.message);
  process.exit(1);
}
const user = createClient(URL, ANON, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${auth.session.access_token}` } } });

const { data: listing } = await user.from("listings").select("id").eq("status", "active").limit(1).maybeSingle();
const { data: project } = await user.from("projects").select("id").eq("status", "open").limit(1).maybeSingle();
console.log("targets:", { listing: listing?.id, project: project?.id });

const ins1 = await user.from("saved_items").insert({ profile_id: auth.user.id, listing_id: listing.id });
console.log("insert listing:", ins1.error?.message ?? "ok");
const ins2 = await user.from("saved_items").insert({ profile_id: auth.user.id, project_id: project.id });
console.log("insert project:", ins2.error?.message ?? "ok");

const sel = await user.from("saved_items").select("*");
console.log("select own:", sel.error?.message ?? `${sel.data.length} rows`);

const del = await user.from("saved_items").delete().eq("profile_id", auth.user.id);
console.log("delete own:", del.error?.message ?? "ok");
process.exit(0);

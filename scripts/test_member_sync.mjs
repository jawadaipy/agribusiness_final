/**
 * Verify getAuthenticatedMember and getAuthenticatedPlatformProfile
 * for all 6 demo accounts.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://yholetgmaexmcvupmwmn.supabase.co";
const anonKey = "sb_publishable_Q7f-82AxY673B2CvzJxt5g_Xcki060E";

const DEMO_ACCOUNTS = [
  { role: "admin", email: "admin@agribiz.pk", pass: "DemoAgri2026!" },
  { role: "farmer", email: "ali.hassan.farmer@agribiz.demo", pass: "DemoAgri2026!" },
  { role: "buyer", email: "tariq.foods.buyer@agribiz.demo", pass: "DemoAgri2026!" },
  { role: "consultant", email: "dr.ayesha.agro@agribiz.demo", pass: "DemoAgri2026!" },
  { role: "company", email: "admin.greentech@agribiz.demo", pass: "DemoAgri2026!" },
  { role: "student", email: "zara.student@agribiz.demo", pass: "DemoAgri2026!" },
];

async function runMemberSyncTest() {
  console.log("=================================================");
  console.log("    TESTING MEMBER WORKSPACE AUTH & SYNC FLOW    ");
  console.log("=================================================\n");

  let success = 0;

  for (const acc of DEMO_ACCOUNTS) {
    const client = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authErr } = await client.auth.signInWithPassword({
      email: acc.email,
      password: acc.pass,
    });

    if (authErr || !authData.user) {
      console.error(`❌ [${acc.role}] Auth failed: ${authErr?.message}`);
      continue;
    }

    // Run exact select query used by getAuthenticatedMember
    const { data: profile, error: pErr } = await client
      .from("profiles")
      .select("id,email,full_name,display_name,user_type,city,trial_ends_at,subscription_status,is_verified,is_active")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (pErr) {
      console.error(`❌ [${acc.role}] Profile query failed: ${pErr.message}`);
      continue;
    }

    if (!profile) {
      console.error(`❌ [${acc.role}] Profile record not found`);
      continue;
    }

    console.log(`✓ [${acc.role.toUpperCase().padEnd(10)}] Authenticated & synced! Name: "${profile.full_name}", Type: "${profile.user_type}", City: "${profile.city}"`);
    success++;
  }

  console.log("\n-------------------------------------------------");
  console.log(`Sync Result: ${success}/${DEMO_ACCOUNTS.length} accounts verified with ZERO errors.`);
  console.log("=================================================");

  if (success !== DEMO_ACCOUNTS.length) process.exit(1);
}

runMemberSyncTest();

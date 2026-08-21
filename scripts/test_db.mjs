import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.SUPABASE_URL || "https://yholetgmaexmcvupmwmn.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlob2xldGdtYWV4bWN2dXBtd21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjgwMDM4NiwiZXhwIjoyMTAyMzc2Mzg2fQ.534EcTXxGlymxRmN82IHhpZhiwa_J0w-Bpsam8lAdWE";

console.log("Connecting to Supabase at:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  try {
    // 1. Test basic connection
    console.log("Checking if categories table exists...");
    const { data: catData, error: catError } = await supabase.from("categories").select("*").limit(5);
    
    if (catError) {
      console.log("Categories check returned error (likely schema not yet created in remote DB):", catError.message);
      console.log("Testing auth admin...");
      const { data: users, error: userError } = await supabase.auth.admin.listUsers();
      if (userError) {
        console.error("Auth admin check failed:", userError);
      } else {
        console.log(`Auth service connected! Total registered users: ${users.users.length}`);
      }
    } else {
      console.log(`Success! Found ${catData.length} categories in the database.`);
      console.log(catData);
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

main();

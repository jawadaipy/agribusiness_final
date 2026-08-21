import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://yholetgmaexmcvupmwmn.supabase.co";
const anonKey = "sb_publishable_Q7f-82AxY673B2CvzJxt5g_Xcki060E";

const client = createClient(supabaseUrl, anonKey);

async function test() {
  const randomEmail = "farmer_pakistan_" + Math.floor(Math.random() * 100000) + "@gmail.com";
  console.log("Signing up with:", randomEmail);
  const { data, error } = await client.auth.signUp({
    email: randomEmail,
    password: "AgriPassword123!",
    options: {
      data: { full_name: "Tariq Mehmood", user_type: "farmer", city: "Faisalabad" }
    }
  });

  if (error) {
    console.error("Anon signup error:", error.message);
  } else {
    console.log("✓ SUCCESS! User created in Supabase with ID:", data.user?.id);
    console.log("Session:", data.session ? "Active session created" : "Requires email confirmation (or auto-confirm)");
  }
}

test();

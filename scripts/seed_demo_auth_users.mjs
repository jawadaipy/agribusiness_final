import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://yholetgmaexmcvupmwmn.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlob2xldGdtYWV4bWN2dXBtd21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjgwMDM4NiwiZXhwIjoyMTAyMzc2Mzg2fQ.534EcTXxGlymxRmN82IHhpZhiwa_J0w-Bpsam8lAdWE";

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const DEMO_PASSWORD = "DemoAgri2026!";

const demoUsers = [
  {
    email: "admin@agribiz.pk",
    fullName: "Platform Super Admin",
    displayName: "Super Admin",
    userType: "admin",
    city: "Islamabad",
    province: "Federal",
    isVerified: true
  },
  {
    email: "ali.hassan.farmer@agribiz.demo",
    fullName: "Ali Hassan",
    displayName: "Ali Hassan Farms",
    userType: "farmer",
    city: "Multan",
    province: "Punjab",
    isVerified: true
  },
  {
    email: "tariq.foods.buyer@agribiz.demo",
    fullName: "Tariq Mehmood",
    displayName: "Tariq Grain & Food Mills",
    userType: "buyer",
    city: "Lahore",
    province: "Punjab",
    isVerified: true
  },
  {
    email: "dr.ayesha.agro@agribiz.demo",
    fullName: "Dr. Ayesha Khan",
    displayName: "Dr. Ayesha Khan (PhD Agronomy)",
    userType: "consultant",
    city: "Faisalabad",
    province: "Punjab",
    isVerified: true
  },
  {
    email: "admin.greentech@agribiz.demo",
    fullName: "GreenTech Agri Systems",
    displayName: "GreenTech Agri Ltd",
    userType: "company",
    city: "Karachi",
    province: "Sindh",
    isVerified: true
  },
  {
    email: "zara.student@agribiz.demo",
    fullName: "Zara Fatima",
    displayName: "Zara Fatima (Agronomy Researcher)",
    userType: "student",
    city: "Faisalabad",
    province: "Punjab",
    isVerified: true
  }
];

async function seedAuthUsers() {
  console.log("=== PROVISIONING DEMO AUTH USERS IN SUPABASE ===");

  const { data: userList } = await supabase.auth.admin.listUsers();

  for (const user of demoUsers) {
    try {
      const existing = userList?.users?.find(u => u.email === user.email);
      let userId = existing?.id;

      if (!userId) {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: {
            full_name: user.fullName,
            display_name: user.displayName,
            user_type: user.userType,
            city: user.city,
            province: user.province
          }
        });

        if (authError) {
          console.error(`- Error creating ${user.email}:`, authError.message);
          continue;
        }
        userId = authData?.user?.id;
        console.log(`✓ Created Auth user: ${user.email} (ID: ${userId})`);
      } else {
        console.log(`- Auth user already exists: ${user.email} (ID: ${userId})`);
        // Update password to DEMO_PASSWORD to guarantee login
        await supabase.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD, email_confirm: true });
      }

      if (userId) {
        await upsertProfile(userId, user);
      }
    } catch (e) {
      console.error(`- Exception for ${user.email}:`, e.message);
    }
  }

  console.log("=== DEMO AUTH SEED COMPLETE ===");
}

async function upsertProfile(userId, user) {
  const { error: profError } = await supabase.from("profiles").upsert({
    id: userId,
    email: user.email,
    full_name: user.fullName,
    display_name: user.displayName,
    user_type: user.userType,
    city: user.city,
    province: user.province,
    is_verified: user.isVerified,
    is_active: true,
    bio: `${user.userType.toUpperCase()} account on AgriBusiness Pakistan.`
  }, { onConflict: "id" });

  if (profError) {
    console.error(`  - Profile upsert error for ${user.email}:`, profError.message);
  } else {
    console.log(`  ✓ Profile synced with user_type: ${user.userType}`);
  }
}

seedAuthUsers();

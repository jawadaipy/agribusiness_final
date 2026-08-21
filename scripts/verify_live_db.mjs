import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://yholetgmaexmcvupmwmn.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlob2xldGdtYWV4bWN2dXBtd21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjgwMDM4NiwiZXhwIjoyMTAyMzc2Mzg2fQ.534EcTXxGlymxRmN82IHhpZhiwa_J0w-Bpsam8lAdWE";

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log("=== VERIFYING LIVE SUPABASE DATABASE ===");
  
  // 1. Categories
  const { data: categories, error: catErr } = await supabase.from("categories").select("id, name, slug");
  if (catErr) console.error("Categories error:", catErr.message);
  else console.log(`✓ Categories: ${categories.length} rows found`);

  // 2. Profiles
  const { data: profiles, error: profErr } = await supabase.from("profiles").select("id, full_name, user_type, city");
  if (profErr) console.error("Profiles error:", profErr.message);
  else {
    console.log(`✓ Profiles: ${profiles.length} demo profiles found`);
    profiles.forEach(p => console.log(`   - ${p.full_name} (${p.user_type}) in ${p.city}`));
  }

  // 3. Listings
  const { data: listings, error: listErr } = await supabase.from("listings").select("id, title, price, currency");
  if (listErr) console.error("Listings error:", listErr.message);
  else {
    console.log(`✓ Listings: ${listings.length} marketplace listings found`);
    listings.forEach(l => console.log(`   - ${l.title} (₨ ${Number(l.price).toLocaleString()})`));
  }

  // 4. Projects
  const { data: projects, error: projErr } = await supabase.from("projects").select("id, title, budget_max");
  if (projErr) console.error("Projects error:", projErr.message);
  else {
    console.log(`✓ Projects: ${projects.length} project RFPs found`);
    projects.forEach(p => console.log(`   - ${p.title} (Budget: ₨ ${Number(p.budget_max).toLocaleString()})`));
  }

  // 5. Market Rates
  const { data: rates, error: rateErr } = await supabase.from("market_rates").select("commodity, modal_price, city");
  if (rateErr) console.error("Market rates error:", rateErr.message);
  else {
    console.log(`✓ Market Rates: ${rates.length} Mandi prices found`);
    rates.forEach(r => console.log(`   - ${r.commodity}: ₨ ${r.modal_price} in ${r.city}`));
  }

  // 6. Problem Posts
  const { data: problems, error: probErr } = await supabase.from("problem_posts").select("id, title, is_resolved");
  if (probErr) console.error("Problem posts error:", probErr.message);
  else {
    console.log(`✓ Plant & Animal Clinic: ${problems.length} clinical cases found`);
    problems.forEach(pr => console.log(`   - [${pr.is_resolved ? 'Resolved' : 'Open'}] ${pr.title}`));
  }
}

verify();

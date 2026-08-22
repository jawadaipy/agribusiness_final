/** One-time demo seeding: role profiles + network feed posts for the 5 demo accounts. */
import { createClient } from "@supabase/supabase-js";

const URL = "https://yholetgmaexmcvupmwmn.supabase.co";
const KEY = process.argv[2];
if (!KEY) {
  console.error("usage: node seed_feed_demo.mjs <service_key>");
  process.exit(1);
}
const supabase = createClient(URL, KEY);

const DEMO = {
  farmer: "ef4b3514-1d0b-4277-960f-7213e90581d6", // Ali Hassan, Multan
  buyer: "7769fdc8-27b7-4154-bc12-6a7a87fe4347", // Tariq Mehmood, Lahore
  consultant: "be5dafac-4117-4e7a-a831-42f1db8008f3", // Dr. Ayesha Khan, Faisalabad
  company: "2b4e7953-c2f7-47cb-a64a-1cc01fd74216", // GreenTech, Karachi
  student: "2cbb5f84-ee5c-4131-8f12-4ab9fe09cb48", // Zara Fatima, Faisalabad
};

async function main() {
  // 1. verify trigger created profile rows
  const { data: profiles } = await supabase.from("profiles").select("id,email,user_type,city").in("id", Object.values(DEMO));
  console.log("profiles:", profiles?.map((p) => `${p.user_type}:${p.email}`).join(" | "));
  if (!profiles || profiles.length === 0) throw new Error("demo profiles missing — trigger did not run");

  // 2. role detail rows (keywords power smart matching + intelligence panels)
  const upserts = await Promise.all([
    supabase.from("farmer_profiles").upsert({
      profile_id: DEMO.farmer, farm_name: "Hassan Farms", acreage: 45,
      crops: ["Wheat", "Rice", "Sugarcane", "Cotton"], livestock: ["Dairy cattle"],
      farm_location: "Burewala tehsil, Vehari",
    }, { onConflict: "profile_id" }),
    supabase.from("buyer_profiles").upsert({
      profile_id: DEMO.buyer, organization_name: "Tariq Foods (Pvt) Ltd",
      commodities: ["Wheat", "Maize", "Cotton"], grades: ["Grade A", "moisture below 12%"],
      procurement_regions: ["Multan", "Sargodha", "Lahore"], expected_volume: "500 MT monthly",
      logistics_notes: "Collection at factory godown, weighbridge on site.",
    }, { onConflict: "profile_id" }),
    supabase.from("consultant_profiles").upsert({
      profile_id: DEMO.consultant, degree: "PhD Agronomy", years_experience: 12,
      services: ["Soil testing", "Crop planning", "Irrigation design", "Pest management"],
      technologies: ["Drip irrigation", "GIS mapping"], availability: "Remote + Punjab field visits",
      rate_from_pkr: 25000,
    }, { onConflict: "profile_id" }),
    supabase.from("organizations").upsert({
      owner_profile_id: DEMO.company, legal_name: "GreenTech Agri Systems (Pvt) Ltd",
      display_name: "GreenTech Agri Systems", website: "https://greentech.pk",
      description: "Drip irrigation installs, certified seed supply, and farm mechanization services across Sindh and south Punjab.",
      services: ["Irrigation Systems", "Seed Supply", "Farm Machinery"], technologies: ["Drip irrigation", "Solar water pumps"],
      city: "Karachi", province: "Sindh",
    }, { onConflict: "owner_profile_id" }),
    supabase.from("student_profiles").upsert({
      profile_id: DEMO.student, institution: "University of Agriculture Faisalabad",
      programme: "BS Agronomy (Hons)", degree: "BSc", expected_graduation_at: "2027-06-30",
      research_interests: ["Soil health", "Precision agriculture", "Wheat yields"],
    }, { onConflict: "profile_id" }),
  ]);
  upserts.forEach((r, i) => console.log(`role row ${i}:`, r.error ? r.error.message : "ok"));

  // 3. network feed posts (tagged "network"; kind encoded in tags)
  const posts = [
    { profile_id: DEMO.farmer, title: "Wheat harvest wrapping up in Vehari — yields up after drip conversion", body: "Finished 30 acres of wheat this week. Acre yield came in around 48 maunds, up from 40 last season after we moved two fields to drip. Cleaning seed for storage now and planning cotton sowing for the Kharif window. Happy to share the water savings numbers with anyone considering the switch.", kind: "update" },
    { profile_id: DEMO.consultant, title: "Aphid pressure building on Punjab wheat — scout now, spray smart", body: "Field visits across Faisalabad and Jhang this week show aphid colonies above threshold on early-sown wheat. Scout twice weekly, check undersides of flag leaves, and avoid blanket sprays — targeted application at dusk protects beneficial insects. Bring your counts to a consultant before deciding dose.", kind: "update" },
    { profile_id: DEMO.buyer, title: "Procuring Grade A wheat, 500 MT, Lahore collection", body: "Tariq Foods is buying Grade A wheat, moisture below 12%, 500 MT this month at competitive rates. Collection at our Lahore godown with weighbridge. We prefer lot-wise testing before final rate confirmation. Verified producers from Multan, Sargodha, and Lahore belts are welcome to connect.", kind: "offer" },
    { profile_id: DEMO.student, title: "Looking for 3 wheat farms around Faisalabad for my thesis field trial", body: "My final-year research measures soil organic matter response under different residue management practices. I need three cooperating wheat farms within reach of Faisalabad for the coming season. Sampling is non-destructive and results are shared free with the host farm. Would love to hear from interested growers.", kind: "question" },
    { profile_id: DEMO.company, title: "GreenTech: subsidized drip packages for 10-acre blocks, Sindh & south Punjab", body: "We are assembling spring installation slots for 10-acre drip systems including filtration and pump adaptation. Financing guidance and post-install checks included. If you are weighing water savings against cost, connect and we will share the payback worksheet we built from last year's installs.", kind: "offer" },
    { profile_id: DEMO.farmer, title: "First milk chilling trial worked — advice needed on scaling", body: "Ran a 40-litre morning chilling trial with an ice-bank can before transport to the Vehari collection point. Somatic cell counts look better but I need advice on a budget chiller for 200 litres/day. Has anyone run solar direct chilling at this scale? Would appreciate field-tested suggestions rather than catalog specs.", kind: "question" },
  ];
  for (const post of posts) {
    const { data, error } = await supabase.from("problem_posts").insert({
      profile_id: post.profile_id, title: post.title, body: post.body,
      tags: ["network", `kind:${post.kind}`], view_count: Math.floor(Math.random() * 60) + 8,
    }).select("id").single();
    console.log("post:", error ? error.message : `ok ${data.id}`);
  }

  // 4. a couple of comments to make the feed feel alive
  const { data: allPosts } = await supabase.from("problem_posts").select("id,profile_id").contains("tags", ["network"]);
  const byTitle = async (needle) => (allPosts ?? []).find((p) => p.title.includes(needle));
  const aphid = await byTitle("Aphid");
  const chill = await byTitle("chilling");
  if (aphid) {
    await supabase.from("problem_comments").insert({ post_id: aphid.id, profile_id: DEMO.farmer, body: "Confirmed — my Vehari fields crossed threshold yesterday. Following the dusk-application advice, ladybird counts were high so I held the spray for two days and colonies dropped on their own." });
  }
  if (chill) {
    await supabase.from("problem_comments").insert({ post_id: chill.id, profile_id: DEMO.consultant, body: "For 200 L/day look at direct expansion chillers sized 1.5x your peak, and pair with a 3 kW solar array. Insulate the collection line — most losses happen before the can." });
  }
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

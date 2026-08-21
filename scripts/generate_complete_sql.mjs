import fs from "fs";
import path from "path";

const migrationsDir = "supabase/migrations";
const files = [
  "00_extensions.sql",
  "01_enums.sql",
  "02_core_schema.sql",
  "03_indexes.sql",
  "04_triggers.sql",
  "05_rls_policies.sql",
  "06_storage_buckets.sql",
  "07_functions.sql",
  "08_seed_categories.sql"
];

let fullSql = `-- ================================================================
-- AgriBusiness — Complete All-In-One Database Setup & Seed Script
-- Target: Supabase (PostgreSQL 15+)
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ================================================================

`;

for (const file of files) {
  const filePath = path.join(migrationsDir, file);
  if (fs.existsSync(filePath)) {
    fullSql += `\n-- ================================================================\n-- FILE: ${file}\n-- ================================================================\n\n`;
    fullSql += fs.readFileSync(filePath, "utf8") + "\n";
  }
}

// Add Demo Seed Data for profiles, listings, projects, problem posts, market rates
fullSql += `
-- ================================================================
-- 09: REAL PAKISTANI DEMO SEED DATA
-- Auth Users, Profiles, Market Listings, Projects, Clinical Problems & Mandi Rates
-- ================================================================

-- 1. Demo Auth Users in auth.users (so Foreign Keys are satisfied)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
(
  '00000000-0000-0000-0000-000000000000',
  '20000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'arshad.khan@agribiz.pk',
  '$2a$10$abcdefghijklmnopqrstuu',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Dr. Arshad Khan","user_type":"consultant"}',
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000000',
  '20000000-0000-0000-0000-000000000002',
  'authenticated',
  'authenticated',
  'info@agritech.pk',
  '$2a$10$abcdefghijklmnopqrstuu',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"AgriTech Solutions Ltd","user_type":"company"}',
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000003',
  'authenticated',
  'authenticated',
  'bilal.farms@agribiz.pk',
  '$2a$10$abcdefghijklmnopqrstuu',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Malik Bilal Hayat","user_type":"farmer"}',
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000004',
  'authenticated',
  'authenticated',
  'vet.faizan@agribiz.pk',
  '$2a$10$abcdefghijklmnopqrstuu',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Dr. Faizan Tariq (DVM)","user_type":"consultant"}',
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000005',
  '20000000-0000-0000-0000-000000000005',
  'authenticated',
  'authenticated',
  'zainab.engr@agribiz.pk',
  '$2a$10$abcdefghijklmnopqrstuu',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Engr. Zainab Ali","user_type":"student"}',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Demo Profiles
INSERT INTO public.profiles (
  id, email, user_type, full_name, display_name, bio, location, city, province, phone, is_verified, rating, rating_count, subscription_status
) VALUES
(
  '20000000-0000-0000-0000-000000000001',
  'arshad.khan@agribiz.pk',
  'consultant',
  'Dr. Arshad Khan',
  'Dr. Arshad Agronomy',
  'Senior Agronomist & Soil Nutritionist. 15+ years advising wheat and cotton growers across Multan and Faisalabad.',
  'Faisalabad, Punjab',
  'Faisalabad',
  'Punjab',
  '+923001234567',
  true,
  4.9,
  124,
  'active'
),
(
  '20000000-0000-0000-0000-000000000002',
  'info@agritech.pk',
  'company',
  'AgriTech Solutions Ltd',
  'AgriTech Pakistan',
  'Leading distributor of certified hybrid seeds, drip irrigation kits, and bio-fertilizers across Pakistan.',
  'Karachi, Sindh',
  'Karachi',
  'Sindh',
  '+923331234567',
  true,
  4.8,
  89,
  'active'
),
(
  '20000000-0000-0000-0000-000000000003',
  'bilal.farms@agribiz.pk',
  'farmer',
  'Malik Bilal Hayat',
  'Bilal Farm Estates',
  'Progressive citrus and wheat farmer managing 250 acres in Sargodha. Specializing in Kinnow exports.',
  'Sargodha, Punjab',
  'Sargodha',
  'Punjab',
  '+923451234567',
  true,
  4.7,
  42,
  'active'
),
(
  '20000000-0000-0000-0000-000000000004',
  'vet.faizan@agribiz.pk',
  'consultant',
  'Dr. Faizan Tariq (DVM)',
  'Dr. Faizan Livestock Vet',
  'Veterinary Specialist for Dairy Cattle and Buffaloes. 10 years experience in herd vaccination and nutrition.',
  'Sahiwal, Punjab',
  'Sahiwal',
  'Punjab',
  '+923121234567',
  true,
  5.0,
  96,
  'active'
),
(
  '20000000-0000-0000-0000-000000000005',
  'zainab.engr@agribiz.pk',
  'student',
  'Engr. Zainab Ali',
  'Zainab AgriEng',
  'Graduate agricultural engineer from UAF specializing in solar-powered tubewells and CAD irrigation blueprints.',
  'Lahore, Punjab',
  'Lahore',
  'Punjab',
  '+923211234567',
  false,
  4.8,
  18,
  'trial'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  location = EXCLUDED.location,
  city = EXCLUDED.city,
  province = EXCLUDED.province,
  phone = EXCLUDED.phone,
  is_verified = EXCLUDED.is_verified,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count;

-- 3. Demo Listings
INSERT INTO public.listings (
  id, profile_id, category_id, title, description, price, currency, unit, quantity, location, city, province, is_featured, images, status
) VALUES
(
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  'Certified Akbar-2019 Wheat Grain (50 Metric Tons)',
  'Top quality harvest from Sargodha. Cleaned, moisture-tested below 10%, ready for immediate mill delivery or bulk storage.',
  4200.00,
  'PKR',
  'per 40kg bag (Maund)',
  1250,
  'Sargodha, Punjab',
  'Sargodha',
  'Punjab',
  true,
  ARRAY['https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&q=80&auto=format&fit=crop'],
  'active'
),
(
  '30000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000004',
  'High-Efficiency Drip Irrigation Pipe System (10-Acre Pack)',
  'Complete drip irrigation kit including main header pipes, lateral drip lines, venturi fertilizer injector, and screen filters. 3-year manufacturer warranty.',
  185000.00,
  'PKR',
  'complete 10-acre system',
  5,
  'Lahore, Punjab',
  'Lahore',
  'Punjab',
  true,
  ARRAY['https://images.unsplash.com/photo-1592982537447-6f296d9ccbd3?w=600&q=80&auto=format&fit=crop'],
  'active'
),
(
  '30000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000005',
  'Solar Tubewell Pump System 15HP with Tier-1 Panels',
  'Complete solar pumping solution for deep boreholes. Includes 15HP submersible motor, VFD inverter drive, and 24x 580W mono-perc solar panels.',
  980000.00,
  'PKR',
  'per full setup',
  3,
  'Multan, Punjab',
  'Multan',
  'Punjab',
  true,
  ARRAY['https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&q=80&auto=format&fit=crop'],
  'active'
),
(
  '30000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  'Super Basmati Rice (Paddy) 2025/2026 Season',
  'Aromatic extra-long grain paddy from Sheikhupura tract. Minimum broken percentage, export compliant.',
  6800.00,
  'PKR',
  'per 40kg',
  800,
  'Sheikhupura, Punjab',
  'Sheikhupura',
  'Punjab',
  false,
  ARRAY['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80&auto=format&fit=crop'],
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Demo Projects & RFPs
INSERT INTO public.projects (
  id, profile_id, category_id, title, description, budget_min, budget_max, currency, location, city, status, required_skills
) VALUES
(
  '40000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000006',
  'Consultant Needed for 50-Acre Citrus Drip Irrigation Design',
  'Looking for an experienced irrigation engineer to perform hydrological survey and design a pressure-compensated drip network for high-density kinnow trees.',
  40000.00,
  60000.00,
  'PKR',
  'Sargodha, Punjab',
  'Sargodha',
  'open',
  ARRAY['Drip Irrigation', 'CAD Layout', 'Water Testing', 'Pumping Calculations']
),
(
  '40000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  'Wheat Harvest Machinery Rental — 3 Combine Harvesters Required',
  'Need 3 tracked or wheeled combine harvesters for 15-day contract harvesting starting mid-April in Multan division.',
  100000.00,
  150000.00,
  'PKR',
  'Multan, Punjab',
  'Multan',
  'open',
  ARRAY['Combine Harvester', 'Wheat Harvest', 'Operator Included']
),
(
  '40000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000006',
  'Soil Chemistry & NPK Testing for 100-Acre Cotton Rotation',
  'Require comprehensive laboratory soil profile tests (pH, EC, Organic Matter, Available NPK, Micronutrients Zn/B).',
  15000.00,
  25000.00,
  'PKR',
  'Rahim Yar Khan, Punjab',
  'Rahim Yar Khan',
  'open',
  ARRAY['Soil Testing', 'Agronomy Report', 'Fertilizer Recommendation']
)
ON CONFLICT (id) DO NOTHING;

-- 5. Demo Problem Posts (Clinical Q&A)
INSERT INTO public.problem_posts (
  id, profile_id, title, body, tags, is_resolved, view_count
) VALUES
(
  '50000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000003',
  'Yellowing of lower leaves and curled edges on tomato crops',
  'Observed widespread yellowing of lower tomato leaves across 4 acres in Faisalabad. Soil moisture is normal. What pesticide or fertilizer adjustment is recommended?',
  ARRAY['Tomato', 'Leaf Yellowing', 'Nutrient Deficiency', 'Pest'],
  true,
  248
),
(
  '50000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000003',
  'Sudden drop in daily milk yield in Nili-Ravi buffalo herd',
  'Over the past 5 days, average daily milk yield dropped by 25% across 18 milking buffaloes. Feeds include green fodder (Lucerne) and concentrate mix.',
  ARRAY['Dairy', 'Buffalo', 'Milk Yield', 'Livestock Health'],
  false,
  180
)
ON CONFLICT (id) DO NOTHING;

-- 6. Demo Market Rates (Pakistani Mandis)
INSERT INTO public.market_rates (
  commodity, market, city, province, min_price, max_price, modal_price, unit, trend, rate_date
) VALUES
('Wheat (گندم)', 'Grain Market Multan', 'Multan', 'Punjab', 4150.00, 4250.00, 4200.00, '40 kg (Maund)', 'up', CURRENT_DATE),
('Super Basmati Rice (چاول)', 'Ghalla Mandi Faisalabad', 'Faisalabad', 'Punjab', 6700.00, 6950.00, 6850.00, '40 kg (Maund)', 'up', CURRENT_DATE),
('Cotton Phutti (کپاس)', 'Mandi Rahim Yar Khan', 'Rahim Yar Khan', 'Punjab', 8100.00, 8450.00, 8300.00, '40 kg (Maund)', 'down', CURRENT_DATE),
('Sugarcane (گنا)', 'Sargodha Sugar Zone', 'Sargodha', 'Punjab', 425.00, 450.00, 440.00, '40 kg (Maund)', 'stable', CURRENT_DATE),
('Maize / Corn (مکئی)', 'Sahiwal Grain Hub', 'Sahiwal', 'Punjab', 2850.00, 3050.00, 2950.00, '40 kg (Maund)', 'up', CURRENT_DATE),
('Urea Fertilizer (کھاد)', 'National Fertilizer Depot', 'Lahore', 'Punjab', 4850.00, 5100.00, 4950.00, '50 kg Bag', 'stable', CURRENT_DATE),
('DAP Fertilizer (ڈی اے پی)', 'Port Qasim Terminal', 'Karachi', 'Sindh', 12200.00, 12600.00, 12400.00, '50 kg Bag', 'up', CURRENT_DATE)
ON CONFLICT (commodity, COALESCE(market, ''), rate_date) DO NOTHING;
`;

fs.writeFileSync("supabase/COMPLETE_DATABASE_SETUP.sql", fullSql);
console.log("Successfully generated supabase/COMPLETE_DATABASE_SETUP.sql (Size: " + fullSql.length + " bytes)");

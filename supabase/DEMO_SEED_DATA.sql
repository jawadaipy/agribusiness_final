-- ================================================================
-- AgriBusiness Pakistan — Rich Demo Seed Data
-- Run this in Supabase SQL Editor → New Query
-- NOTE: This uses INSERT ... ON CONFLICT DO NOTHING so it is safe
--       to run multiple times. Profiles are linked to real auth.users
--       IDs below — replace them with your actual user UUIDs if you
--       want the demo users to be able to log in.
-- ================================================================
-- HOW TO USE:
--   1. Go to Supabase → Authentication → Users → Add User
--      Create 8 demo users with the emails below.
--   2. Copy the generated UUIDs back into this script replacing the
--      placeholder values that look like 'FARMER_1_UUID_HERE'.
--   3. Run this entire script in SQL Editor.
-- ================================================================

-- ----------------------------------------------------------------
-- 0. HELPERS — generate stable demo UUIDs
-- ----------------------------------------------------------------
DO $$
BEGIN
  -- These are stable UUIDs used throughout this seed.
  -- Replace with real auth.users IDs if you create real accounts.
  RAISE NOTICE 'Running AgriBusiness demo seed…';
END $$;

-- ================================================================
-- 1. PROFILES — one per demo user
--    user_type options: farmer | buyer | consultant | student | company
-- ================================================================

INSERT INTO public.profiles (
  id, email, user_type, full_name, display_name, bio,
  city, province, location,
  is_verified, is_active, subscription_status,
  rating, rating_count, avatar_url
) VALUES

-- ── Farmer 1 ─────────────────────────────────────────────────────
(
  'a1000000-0000-0000-0000-000000000001',
  'ali.hassan.farmer@agribiz.demo',
  'farmer',
  'Ali Hassan',
  'Ali Hassan',
  'Third-generation wheat and maize farmer from Sargodha with 22 years of experience. I manage 45 acres of irrigated land and produce Grade-A certified wheat. I specialize in precision irrigation using modern drip systems and have collaborated with NARC on soil health improvement projects. Passionate about sustainable agriculture and helping fellow farmers adopt better techniques.',
  'Sargodha', 'Punjab', 'Sargodha, Punjab',
  true, true, 'active',
  4.8, 32,
  'https://api.dicebear.com/7.x/avataaars/svg?seed=AliHassan&backgroundColor=b6e3f4'
),

-- ── Farmer 2 ─────────────────────────────────────────────────────
(
  'a2000000-0000-0000-0000-000000000002',
  'fatima.malik.farmer@agribiz.demo',
  'farmer',
  'Fatima Malik',
  'Fatima Malik',
  'Progressive mango and citrus orchard owner from Multan with 15 years of experience. Managing 60+ acres of Chaunsa and Sindhri orchards that export to the UAE and Saudi Arabia. I employ 40 seasonal workers and use solar-powered cold storage. Advocate for women in agriculture and rural entrepreneurship.',
  'Multan', 'Punjab', 'Multan, Punjab',
  true, true, 'active',
  4.6, 18,
  'https://api.dicebear.com/7.x/avataaars/svg?seed=FatimaMalik&backgroundColor=ffd5dc'
),

-- ── Buyer / Trader ────────────────────────────────────────────────
(
  'b1000000-0000-0000-0000-000000000003',
  'tariq.foods.buyer@agribiz.demo',
  'buyer',
  'Tariq Mahmood',
  'Tariq Foods & Exports',
  'CEO of Tariq Foods & Exports, a mid-size commodity trading house established in 1998. We procure wheat, rice, maize, and pulses directly from farmers and supply to flour mills, food processors, and export agents across Pakistan. Annual volume exceeds 25,000 MT. We offer spot and forward purchase contracts and provide farmers with market-rate transparency.',
  'Faisalabad', 'Punjab', 'Faisalabad, Punjab',
  true, true, 'active',
  4.5, 27,
  'https://api.dicebear.com/7.x/avataaars/svg?seed=TariqFoods&backgroundColor=c0aede'
),

-- ── Consultant 1 — Agronomist ────────────────────────────────────
(
  'c1000000-0000-0000-0000-000000000004',
  'dr.ayesha.agro@agribiz.demo',
  'consultant',
  'Dr. Ayesha Noor',
  'Dr. Ayesha Noor — Agronomist',
  'PhD Agronomy (University of Agriculture Faisalabad, 2014). 12 years of post-doctoral field consultancy experience across Punjab and Sindh. Areas of expertise: soil fertility management, cotton and sugarcane agronomy, integrated pest management, and precision agriculture using satellite imagery. Published 18 peer-reviewed papers and trained 500+ extension workers through PARC and provincial agriculture departments.',
  'Lahore', 'Punjab', 'Lahore, Punjab',
  true, true, 'active',
  4.9, 45,
  'https://api.dicebear.com/7.x/avataaars/svg?seed=DrAyesha&backgroundColor=d1f4e0'
),

-- ── Consultant 2 — Irrigation / Water Expert ─────────────────────
(
  'c2000000-0000-0000-0000-000000000005',
  'imran.water.consultant@agribiz.demo',
  'consultant',
  'Imran Qureshi',
  'Imran Qureshi — Water & Irrigation Engineer',
  'Chartered Civil Engineer (PEC) with 17 years of experience in agricultural water management, canal irrigation system design, and drip/sprinkler installation for large farms. Worked with WAPDA, World Bank-funded NWRMP, and the International Water Management Institute (IWMI). Specializes in low-cost solar-powered pumping solutions and water-use-efficiency audits for farms above 25 acres.',
  'Islamabad', 'ICT', 'Islamabad',
  true, true, 'active',
  4.7, 22,
  'https://api.dicebear.com/7.x/avataaars/svg?seed=ImranQureshi&backgroundColor=fde68a'
),

-- ── Consultant 3 — Veterinarian ──────────────────────────────────
(
  'c3000000-0000-0000-0000-000000000006',
  'dr.hassan.vet@agribiz.demo',
  'consultant',
  'Dr. Hassan Raza',
  'Dr. Hassan Raza — Livestock & Veterinary Consultant',
  'BVSc & AH (UAF, 2009), MS Animal Nutrition (2012). 14 years of veterinary practice specializing in dairy herd health, buffalo reproduction, poultry disease management, and small ruminant nutrition. Certified by the Pakistan Veterinary Medical Council. Offers farm visits within 200 km of Rawalpindi and remote tele-consultations nationwide. Passionate about reducing antibiotic overuse in Pakistani livestock farms.',
  'Rawalpindi', 'Punjab', 'Rawalpindi, Punjab',
  true, true, 'active',
  4.8, 38,
  'https://api.dicebear.com/7.x/avataaars/svg?seed=DrHassanVet&backgroundColor=fca5a5'
),

-- ── Student / Researcher ─────────────────────────────────────────
(
  's1000000-0000-0000-0000-000000000007',
  'zara.student@agribiz.demo',
  'student',
  'Zara Iqbal',
  'Zara Iqbal',
  'Final-year BS Agriculture (Hons) student at University of Agriculture Faisalabad, majoring in Plant Breeding & Genetics. My thesis focuses on drought-tolerant wheat varieties for semi-arid regions of Balochistan. I am actively seeking internship opportunities with seed companies, research institutes, and progressive farms. Published one conference paper at the Pakistan Society of Agronomy annual conference 2025.',
  'Faisalabad', 'Punjab', 'Faisalabad, Punjab',
  false, true, 'trial',
  NULL, 0,
  'https://api.dicebear.com/7.x/avataaars/svg?seed=ZaraIqbal&backgroundColor=a7f3d0'
),

-- ── Company ───────────────────────────────────────────────────────
(
  'o1000000-0000-0000-0000-000000000008',
  'admin.greentech@agribiz.demo',
  'company',
  'GreenTech Agri Solutions',
  'GreenTech Agri Solutions',
  'Islamabad-based agri-tech company providing precision farming tools, drone-based crop monitoring, IoT soil sensors, and satellite-assisted irrigation advisory services across Pakistan. Founded in 2018. Deployed 200+ drone spray systems and 500+ soil sensor kits. Partners include USAID, CIMMYT, and the Punjab Agriculture Department. We are actively hiring agronomists and field engineers.',
  'Islamabad', 'ICT', 'Islamabad, ICT',
  true, true, 'active',
  4.6, 14,
  'https://api.dicebear.com/7.x/avataaars/svg?seed=GreenTech&backgroundColor=86efac'
)

ON CONFLICT (id) DO UPDATE SET
  display_name       = EXCLUDED.display_name,
  bio                = EXCLUDED.bio,
  city               = EXCLUDED.city,
  is_verified        = EXCLUDED.is_verified,
  subscription_status= EXCLUDED.subscription_status,
  rating             = EXCLUDED.rating,
  rating_count       = EXCLUDED.rating_count,
  avatar_url         = EXCLUDED.avatar_url;

-- ================================================================
-- 2. ROLE-SPECIFIC PROFILES
-- ================================================================

-- ── Farmer profiles ───────────────────────────────────────────────
INSERT INTO public.farmer_profiles (
  profile_id, farm_name, acreage, crops, livestock, farm_location
) VALUES
(
  'a1000000-0000-0000-0000-000000000001',
  'Hassan Agro Farm',
  45,
  ARRAY['Wheat', 'Maize', 'Sunflower', 'Berseem'],
  ARRAY['Buffalo (12 head)', 'Dairy cattle (8 head)'],
  'Bhalwal Tehsil, Sargodha District, Punjab'
),
(
  'a2000000-0000-0000-0000-000000000002',
  'Malik Orchard Estate',
  62,
  ARRAY['Chaunsa Mango', 'Sindhri Mango', 'Kinnow', 'Malta Orange'],
  NULL,
  'Shujabad Road, Multan District, Punjab'
)
ON CONFLICT (profile_id) DO UPDATE SET
  farm_name     = EXCLUDED.farm_name,
  acreage       = EXCLUDED.acreage,
  crops         = EXCLUDED.crops,
  livestock     = EXCLUDED.livestock,
  farm_location = EXCLUDED.farm_location;

-- ── Buyer profiles ────────────────────────────────────────────────
INSERT INTO public.buyer_profiles (
  profile_id, organization_name, commodities, grades,
  procurement_regions, expected_volume, logistics_notes
) VALUES
(
  'b1000000-0000-0000-0000-000000000003',
  'Tariq Foods & Exports (Pvt) Ltd',
  ARRAY['Wheat', 'Rice (Basmati)', 'Maize', 'Moong Dal', 'Masoor Dal'],
  ARRAY['Grade A', 'Export Quality', 'Moisture ≤12%', 'Aflatoxin tested'],
  ARRAY['Faisalabad', 'Lahore', 'Sargodha', 'Multan', 'Sahiwal'],
  '20,000–30,000 MT annually across all commodities',
  'We operate our own fleet of 12 trucks and 2 weighbridges in Faisalabad. Spot payment within 3 days of delivery. Forward purchase contracts available for the next crop cycle. Preferred bagging: 50kg PP bags.'
)
ON CONFLICT (profile_id) DO UPDATE SET
  organization_name   = EXCLUDED.organization_name,
  commodities         = EXCLUDED.commodities,
  expected_volume     = EXCLUDED.expected_volume,
  logistics_notes     = EXCLUDED.logistics_notes;

-- ── Consultant profiles ───────────────────────────────────────────
INSERT INTO public.consultant_profiles (
  profile_id, degree, years_experience, services,
  technologies, availability, rate_from_pkr
) VALUES
(
  'c1000000-0000-0000-0000-000000000004',
  'PhD Agronomy, UAF',
  12,
  ARRAY['Soil Fertility Audits', 'Cotton Agronomy', 'Sugarcane Agronomy', 'IPM Planning',
        'Precision Agriculture Advisory', 'Crop Rotation Planning', 'Fertilizer Optimization',
        'Extension Worker Training', 'Research Collaboration'],
  ARRAY['NDVI Satellite Analysis', 'Soil N-P-K Testing', 'GPS Field Mapping',
        'Drone Imagery Interpretation', 'DSSAT Crop Modelling'],
  'Available for farm visits in Punjab. Remote advisory nationwide. Minimum 4-hour engagement.',
  25000
),
(
  'c2000000-0000-0000-0000-000000000005',
  'BE Civil Engineering (PEC Chartered)',
  17,
  ARRAY['Drip Irrigation Design', 'Sprinkler System Installation', 'Canal Lining & Rehabilitation',
        'Solar Pump Feasibility', 'Water-Use Efficiency Audit', 'Borehole Siting',
        'Rain-fed Agriculture Planning'],
  ARRAY['AutoCAD Civil 3D', 'HydroCAD', 'ArcGIS Water', 'Solar PV Sizing Software',
        'Remote Sensing (Sentinel-2)'],
  'Field visits KPK, Punjab, ICT. Remote consultations for Sindh and Balochistan.',
  35000
),
(
  'c3000000-0000-0000-0000-000000000006',
  'BVSc & AH + MS Animal Nutrition',
  14,
  ARRAY['Dairy Herd Health Management', 'Buffalo Reproduction & AI', 'Poultry Disease Diagnosis',
        'Sheep & Goat Nutrition Plans', 'Vaccination Programs', 'Feed Formulation',
        'Tele-Consultation (Video)', 'Farm Bio-Security Audits'],
  ARRAY['Metabolic Profiling', 'Ultrasound Pregnancy Diagnosis', 'ELISA Serology',
        'Herd Record Software (DairyComp)', 'Nutritional Balancing Software'],
  'Farm visits within 200 km of Rawalpindi/Islamabad. Tele-consultations nationwide 24/7.',
  15000
)
ON CONFLICT (profile_id) DO UPDATE SET
  degree           = EXCLUDED.degree,
  years_experience = EXCLUDED.years_experience,
  services         = EXCLUDED.services,
  technologies     = EXCLUDED.technologies,
  availability     = EXCLUDED.availability,
  rate_from_pkr    = EXCLUDED.rate_from_pkr;

-- ── Student profiles ──────────────────────────────────────────────
INSERT INTO public.student_profiles (
  profile_id, institution, programme, degree,
  expected_graduation_at, research_interests, portfolio_url
) VALUES
(
  's1000000-0000-0000-0000-000000000007',
  'University of Agriculture Faisalabad (UAF)',
  'Plant Breeding & Genetics',
  'BS Agriculture (Hons)',
  '2026-06-30',
  ARRAY['Drought-Tolerant Wheat Breeding', 'Marker-Assisted Selection',
        'Semi-Arid Cropping Systems', 'Seed Quality Analysis',
        'Bioinformatics for Plant Genomics'],
  'https://zaraiqbal.academia.edu'
)
ON CONFLICT (profile_id) DO UPDATE SET
  institution            = EXCLUDED.institution,
  programme              = EXCLUDED.programme,
  research_interests     = EXCLUDED.research_interests,
  portfolio_url          = EXCLUDED.portfolio_url;

-- ── Organization ──────────────────────────────────────────────────
INSERT INTO public.organizations (
  id, owner_profile_id, legal_name, display_name,
  registration_no, website, description,
  services, technologies, city, province
) VALUES
(
  'e1000000-0000-0000-0000-000000000009',
  'o1000000-0000-0000-0000-000000000008',
  'GreenTech Agri Solutions (Pvt) Ltd',
  'GreenTech Agri Solutions',
  'SECP-0045678',
  'https://greentechagri.pk',
  'Pakistan''s leading precision agriculture technology company, providing end-to-end smart farming solutions from satellite advisory to drone-based crop protection.',
  ARRAY['Drone Crop Spraying', 'Soil IoT Sensors', 'Satellite Crop Monitoring',
        'Smart Irrigation Control', 'Agri Data Analytics', 'Field Engineering Services',
        'Farmer Training Programs'],
  ARRAY['DJI Agriculture Drones', 'LoRaWAN Sensor Networks', 'Sentinel-2 Satellite Imagery',
        'NDVI/NDRE Analysis Platform', 'AWS IoT Core', 'Python ML Pipelines'],
  'Islamabad', 'ICT'
)
ON CONFLICT (id) DO UPDATE SET
  display_name  = EXCLUDED.display_name,
  description   = EXCLUDED.description,
  services      = EXCLUDED.services,
  technologies  = EXCLUDED.technologies;

-- ================================================================
-- 3. MARKETPLACE LISTINGS
-- ================================================================

INSERT INTO public.listings (
  id, profile_id, title, description,
  price, unit, quantity,
  location, city, province, status
) VALUES

-- Farmer Ali Hassan listings
(
  'f1000000-0000-0000-0000-000000000010',
  'a1000000-0000-0000-0000-000000000001',
  'Grade-A Wheat 2026 Harvest — 500 MT Available',
  'NARC-certified Grade-A wheat from our 45-acre farm in Sargodha. Moisture ≤12%, protein content 12.5%, free from aflatoxin (tested). Packed in 50kg PP bags or available in bulk. Field-to-weighbridge transport available. Ready for June 2026 delivery.',
  5800, 'per 40kg bag', 12500,
  'Hassan Agro Farm, Bhalwal Tehsil', 'Sargodha', 'Punjab', 'active'
),
(
  'f1000000-0000-0000-0000-000000000011',
  'a1000000-0000-0000-0000-000000000001',
  'Fresh Berseem (Egyptian Clover) — Cut & Carry or Delivery',
  'High-quality Berseem available from October through March. Ideal for dairy and buffalo feed. 2–3 cuttings available this season. Minimum order 1 trolley (approx 4 MT). We deliver within 25 km of Sargodha.',
  1200, 'per trolley load (≈4 MT)', 80,
  'Hassan Agro Farm, Sargodha', 'Sargodha', 'Punjab', 'active'
),

-- Farmer Fatima listings
(
  'f2000000-0000-0000-0000-000000000012',
  'a2000000-0000-0000-0000-000000000002',
  'Chaunsa Mango — Export Grade, UAE & KSA Cleared',
  'Malik Orchard Estate offers Chaunsa mangoes from our 62-acre certified orchard. Export-grade fruit: uniform size (250–350g), zero pesticide residue (tested by Lahore lab), pre-cooled in our on-farm cold storage. Minimum order 5 MT. Fumigation & phytosanitary certificate included. Delivery to Multan port or by refrigerated truck nationwide.',
  320, 'per kg', 80000,
  'Malik Orchard Estate, Shujabad Road', 'Multan', 'Punjab', 'active'
),
(
  'f2000000-0000-0000-0000-000000000013',
  'a2000000-0000-0000-0000-000000000002',
  'Kinnow Mandarin — On-Tree / Harvested, December Season',
  'Premium Kinnow from 15-acre block. Brix 12–14, no decay, hand-picked. Available December through February. On-tree price negotiable for large buyers. Minimum harvest order 10 MT. Cold storage available for up to 30 days post-harvest.',
  85, 'per kg', 150000,
  'Malik Orchard Estate, Multan', 'Multan', 'Punjab', 'active'
),

-- Consultant services listings
(
  'f3000000-0000-0000-0000-000000000014',
  'c1000000-0000-0000-0000-000000000004',
  'Comprehensive Soil Fertility Audit & Fertilizer Prescription',
  'Full-day soil sampling visit (up to 30 acres), laboratory NPK + micronutrient analysis, satellite NDVI assessment, and a written fertilizer prescription report with cost-benefit breakdown. Report delivered within 7 working days. Follow-up call included. Serving all of Punjab.',
  18000, 'per farm visit', 50,
  'Serving all of Punjab', 'Lahore', 'Punjab', 'active'
),
(
  'f3000000-0000-0000-0000-000000000015',
  'c2000000-0000-0000-0000-000000000005',
  'Solar Drip Irrigation System Design & Supervision',
  'Complete feasibility, design, tender preparation, and site supervision for solar-powered drip irrigation projects from 5 to 500 acres. Covers pump sizing, filter station design, lateral pipe layout, automation, and training of farm staff. World Bank-compliant documentation available. Sites in Punjab and KPK.',
  45000, 'per project (design phase)', 20,
  'Punjab & KPK field visits', 'Islamabad', 'ICT', 'active'
),
(
  'f3000000-0000-0000-0000-000000000016',
  'c3000000-0000-0000-0000-000000000006',
  'Dairy Herd Health Program — Monthly Retainer',
  'Monthly herd visit, vaccination schedule management, milk quality monitoring, metabolic disease prevention, and 24/7 tele-support for your dairy operation. Covers up to 50 animals. Feed ration balancing included. Serving farms within 200 km of Rawalpindi.',
  25000, 'per month', 15,
  'Within 200 km of Rawalpindi', 'Rawalpindi', 'Punjab', 'active'
)

ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- 4. PROJECTS / RFPS
-- ================================================================

INSERT INTO public.projects (
  id, profile_id, title, description,
  budget_min, budget_max, currency,
  deadline, required_skills,
  location, city, is_remote, status
) VALUES

-- Buyer RFP
(
  'p1000000-0000-0000-0000-000000000020',
  'b1000000-0000-0000-0000-000000000003',
  'Wheat Procurement — 5,000 MT, Grade A, Punjab Origins',
  'Tariq Foods is seeking reliable wheat farmers and aggregators to supply 5,000 MT of Grade-A wheat for the 2026 Rabi season. Requirements: moisture ≤12%, protein ≥12%, aflatoxin tested, clean from weeds and foreign material. We offer spot payment within 3 business days of delivery at our Faisalabad weighbridge. Packaging: 50kg PP bags or bulk. Interested parties: please state your available volume, farm location, and expected price range.',
  540000000, 600000000, 'PKR',
  '2026-07-31',
  ARRAY['Wheat farming', 'Grain quality grading', 'Supply reliability'],
  'Faisalabad Weighbridge, Punjab', 'Faisalabad', false, 'open'
),

-- Company RFP
(
  'p2000000-0000-0000-0000-000000000021',
  'o1000000-0000-0000-0000-000000000008',
  'Field Agronomist — Punjab (3-Month Project)',
  'GreenTech Agri Solutions is hiring a contract Field Agronomist to support drone-spraying operations across 12 client farms in central Punjab (Faisalabad, Jhang, Sargodha belt). Responsibilities include pre-spray crop scouting, pest-threshold reports, spray-plan approvals, and post-spray efficacy evaluations. Remote reporting to Islamabad HQ. Vehicle allowance + per diem included.',
  180000, 250000, 'PKR',
  '2026-09-30',
  ARRAY['Agronomy', 'Crop Scouting', 'Pest Management', 'Drone Operations', 'Field Reporting'],
  'Central Punjab field visits', 'Faisalabad', false, 'open'
),

-- Farmer project
(
  'p3000000-0000-0000-0000-000000000022',
  'a1000000-0000-0000-0000-000000000001',
  'Soil Health Consultant Needed — 45-Acre Farm, Sargodha',
  'Looking for a qualified agronomist to conduct a full soil fertility audit on my wheat-maize farm in Sargodha. Need: soil sampling, NPK + micronutrient analysis, NDVI assessment, and a written fertilizer prescription. Prefer someone with Punjab field experience. Budget is flexible for the right expert.',
  15000, 30000, 'PKR',
  '2026-06-15',
  ARRAY['Agronomy', 'Soil Science', 'Fertilizer Management', 'Punjab experience'],
  'Bhalwal Tehsil, Sargodha', 'Sargodha', false, 'open'
)

ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- 5. PROBLEM POSTS (Farmer Q&A Forum)
-- ================================================================

INSERT INTO public.problem_posts (
  id, profile_id, title, body, tags, is_resolved
) VALUES
(
  'q1000000-0000-0000-0000-000000000030',
  'a1000000-0000-0000-0000-000000000001',
  'Yellow rust outbreak in my wheat crop — what fungicide should I use?',
  'I am seeing classic yellow rust symptoms on my wheat crop (Sargodha, Punjab). Yellow-orange powdery stripes along the leaves, started 5 days ago. Variety is Zincol-2016, 85 days from sowing. Temperature has been cool and humid this week. I have Propiconazole 25% EC available. Is this the right fungicide and what rate should I apply? Should I wait or spray immediately?',
  ARRAY['yellow rust', 'wheat', 'fungicide', 'Punjab', 'Zincol-2016'],
  false
),
(
  'q2000000-0000-0000-0000-000000000031',
  'a2000000-0000-0000-0000-000000000002',
  'How do I improve fruit size uniformity in Chaunsa mango?',
  'My Chaunsa orchard (60 acres, 18-year-old trees) is showing high size variability this season — some fruits are hitting export grade (250g+) but about 30% are small (under 180g). I have been using urea and DAP as usual. Is there a specific micronutrient or growth regulator protocol that helps improve uniformity? Any pruning tips welcome too.',
  ARRAY['mango', 'Chaunsa', 'fruit size', 'micronutrients', 'Multan'],
  false
),
(
  'q3000000-0000-0000-0000-000000000032',
  's1000000-0000-0000-0000-000000000007',
  'Which statistical software is best for RCBD analysis in plant breeding trials?',
  'I am designing my thesis trial (drought-tolerant wheat lines, RCBD with 3 replications, 20 genotypes). My supervisor suggested R + agricolae package but a lab-mate is using SPSS and another uses GenStat. Which combination of software + approach gives the most publication-ready ANOVA output for Pakistan Journal of Botany? Any template or code snippet would be hugely helpful.',
  ARRAY['plant breeding', 'RCBD', 'statistics', 'R', 'wheat trials'],
  false
)

ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- 6. PROBLEM COMMENTS (Answers from experts)
-- ================================================================

INSERT INTO public.problem_comments (
  id, post_id, profile_id, body, is_solution
) VALUES
(
  'r1000000-0000-0000-0000-000000000040',
  'q1000000-0000-0000-0000-000000000030',
  'c1000000-0000-0000-0000-000000000004',
  'This is a classic early-stage yellow rust infection (Puccinia striiformis). Yes, Propiconazole 25% EC is effective — apply at 0.5 ml/L water with a good wetting agent (Triton X or similar) using a high-volume sprayer. Spray in the evening or early morning. Given the cool humid conditions you describe, I would spray immediately rather than wait. If the infection has spread beyond 5% of tillers, consider mixing with Tebuconazole for broader activity. Monitor for a second flush in 10–12 days and consider a follow-up spray. Also check if Zincol is the predominant variety on neighbouring fields — rust spreads fast in uniform stands.',
  true
),
(
  'r2000000-0000-0000-0000-000000000041',
  'q2000000-0000-0000-0000-000000000031',
  'c1000000-0000-0000-0000-000000000004',
  'Size variability in mature Chaunsa orchards is often linked to: (1) Boron and Zinc deficiency — apply Borax 2 g/L + ZnSO4 0.3% as foliar spray at fruit set and repeat 3 weeks later. (2) Irregular irrigation during cell division stage (first 6 weeks after fruit set) — ensure even soil moisture at 50–70% field capacity. (3) Poor thinning — if you have not thinned clusters this season, keep it in mind for next year (remove weak fruitlets to 1–2 per panicle). (4) Canopy light distribution — large old trees often have shaded inner branches that produce small fruit. A light pruning after harvest can help. On growth regulators: NAA at 20 ppm at pea stage can help but must be timed precisely — wrong timing causes excessive drop.',
  false
)

ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- 7. ORGANIZATION MEMBERS
-- ================================================================

INSERT INTO public.organization_members (
  organization_id, profile_id, member_role
) VALUES
(
  'e1000000-0000-0000-0000-000000000009',
  'o1000000-0000-0000-0000-000000000008',
  'owner'
)
ON CONFLICT (organization_id, profile_id) DO NOTHING;

-- ================================================================
-- DONE
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ AgriBusiness demo seed completed successfully.';
  RAISE NOTICE '   8 profiles | 3 farmer/buyer/consultant profiles | 7 listings | 3 projects | 3 forum posts | 2 expert answers';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: The profile IDs used here are stable demo UUIDs.';
  RAISE NOTICE '   They do NOT correspond to real auth.users rows.';
  RAISE NOTICE '   To create login-capable demo accounts:';
  RAISE NOTICE '   1. Go to Supabase → Authentication → Users → Add User';
  RAISE NOTICE '   2. For each email below set the UUID shown here:';
  RAISE NOTICE '      ali.hassan.farmer@agribiz.demo  → a1000000-0000-0000-0000-000000000001';
  RAISE NOTICE '      fatima.malik.farmer@agribiz.demo → a2000000-0000-0000-0000-000000000002';
  RAISE NOTICE '      tariq.foods.buyer@agribiz.demo  → b1000000-0000-0000-0000-000000000003';
  RAISE NOTICE '      dr.ayesha.agro@agribiz.demo     → c1000000-0000-0000-0000-000000000004';
  RAISE NOTICE '      imran.water.consultant@agribiz.demo → c2000000-0000-0000-0000-000000000005';
  RAISE NOTICE '      dr.hassan.vet@agribiz.demo      → c3000000-0000-0000-0000-000000000006';
  RAISE NOTICE '      zara.student@agribiz.demo        → s1000000-0000-0000-0000-000000000007';
  RAISE NOTICE '      admin.greentech@agribiz.demo     → o1000000-0000-0000-0000-000000000008';
  RAISE NOTICE '   3. Password for all: DemoAgri2026!';
END $$;

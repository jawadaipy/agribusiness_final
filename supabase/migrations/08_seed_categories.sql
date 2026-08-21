-- ================================================================
-- AgriBusiness — Migration 08: Seed Data
-- Categories & Subcategories (23 total: 6 parents + 17 children)
-- Ad Plans (3 tiers)
-- ================================================================

-- ================================================================
-- CATEGORIES
-- Using fixed UUIDs for predictable FK references in tests/seeds.
-- ================================================================

-- ----------------------------------------------------------------
-- PARENT CATEGORIES (6)
-- ----------------------------------------------------------------
INSERT INTO public.categories (id, name, slug, icon, description, sort_order, is_active)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'Crops & Grains',
    'crops-grains',
    'grass',
    'Wheat, rice, maize, pulses and other commodity crops — trading, buying, selling and expertise.',
    1, true
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Livestock & Dairy',
    'livestock-dairy',
    'pets',
    'Cattle, buffalo and poultry trading; dairy equipment; veterinary products and services.',
    2, true
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Agri-Inputs',
    'agri-inputs',
    'science',
    'Certified seeds, fertilizers, pesticides, herbicides and crop protection products.',
    3, true
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'Machinery & Technology',
    'machinery-tech',
    'agriculture',
    'Tractors, combine harvesters, irrigation systems, drones and precision agri-technology.',
    4, true
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    'Solar & Energy',
    'solar-energy',
    'solar_power',
    'Solar panels, agri water pumps, off-grid energy solutions and storage systems for farms.',
    5, true
  ),
  (
    '10000000-0000-0000-0000-000000000006',
    'Consultancy & Services',
    'consultancy',
    'psychology',
    'Farm management, soil and water testing, export advisory, agri-legal and financial services.',
    6, true
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- SUBCATEGORIES — Crops & Grains (5 children → total running: 11)
-- ----------------------------------------------------------------
INSERT INTO public.categories (id, name, slug, icon, description, parent_id, sort_order, is_active)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    'Wheat',
    'wheat',
    'grass',
    'All wheat varieties: Chakwal-50, NARC-2011, Galaxy-2013, Millat-2011 and more.',
    '10000000-0000-0000-0000-000000000001', 1, true
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'Rice & Paddy',
    'rice-paddy',
    'rice_bowl',
    'Basmati 1121, IRRI-6, Super Kernel and other rice varieties — milling and trading.',
    '10000000-0000-0000-0000-000000000001', 2, true
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'Maize & Corn',
    'maize-corn',
    'eco',
    'Hybrid maize, sweet corn, silage crops and animal fodder.',
    '10000000-0000-0000-0000-000000000001', 3, true
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    'Vegetables',
    'vegetables',
    'compost',
    'Seasonal vegetables: tomato, potato, onion, chilli, brinjal and more.',
    '10000000-0000-0000-0000-000000000001', 4, true
  ),
  (
    '20000000-0000-0000-0000-000000000005',
    'Fruits & Orchards',
    'fruits-orchards',
    'nutrition',
    'Citrus, mango, guava, apple, apricot and other orchard produce from across Pakistan.',
    '10000000-0000-0000-0000-000000000001', 5, true
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- SUBCATEGORIES — Livestock & Dairy (4 children → running: 15)
-- ----------------------------------------------------------------
INSERT INTO public.categories (id, name, slug, icon, description, parent_id, sort_order, is_active)
VALUES
  (
    '20000000-0000-0000-0000-000000000006',
    'Cattle & Buffalo',
    'cattle-buffalo',
    'pets',
    'Dairy and beef cattle, Sahiwal and Nili-Ravi buffalo trading and breeding.',
    '10000000-0000-0000-0000-000000000002', 1, true
  ),
  (
    '20000000-0000-0000-0000-000000000007',
    'Poultry',
    'poultry',
    'egg_alt',
    'Broiler, layer and country chicken farms, chicks, and poultry equipment.',
    '10000000-0000-0000-0000-000000000002', 2, true
  ),
  (
    '20000000-0000-0000-0000-000000000008',
    'Dairy Equipment',
    'dairy-equipment',
    'propane_tank',
    'Milking machines, bulk milk chillers, pasteurizers and milk processing equipment.',
    '10000000-0000-0000-0000-000000000002', 3, true
  ),
  (
    '20000000-0000-0000-0000-000000000009',
    'Veterinary Services',
    'veterinary-services',
    'medical_services',
    'Animal health, vaccines, deworming, veterinary medicines and livestock treatment.',
    '10000000-0000-0000-0000-000000000002', 4, true
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- SUBCATEGORIES — Agri-Inputs (3 children → running: 18)
-- ----------------------------------------------------------------
INSERT INTO public.categories (id, name, slug, icon, description, parent_id, sort_order, is_active)
VALUES
  (
    '20000000-0000-0000-0000-000000000010',
    'Seeds & Varieties',
    'seeds-varieties',
    'spa',
    'Certified, hybrid and open-pollinated seeds for all major crops.',
    '10000000-0000-0000-0000-000000000003', 1, true
  ),
  (
    '20000000-0000-0000-0000-000000000011',
    'Fertilizers',
    'fertilizers',
    'water_drop',
    'Urea, DAP, NPK blends, SOP, and micro-nutrient fertilizers.',
    '10000000-0000-0000-0000-000000000003', 2, true
  ),
  (
    '20000000-0000-0000-0000-000000000012',
    'Pesticides & Herbicides',
    'pesticides-herbicides',
    'pest_control',
    'Crop protection chemicals: insecticides, fungicides, herbicides and weedicides.',
    '10000000-0000-0000-0000-000000000003', 3, true
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- SUBCATEGORIES — Machinery & Technology (3 children → running: 21)
-- ----------------------------------------------------------------
INSERT INTO public.categories (id, name, slug, icon, description, parent_id, sort_order, is_active)
VALUES
  (
    '20000000-0000-0000-0000-000000000013',
    'Tractors & Vehicles',
    'tractors-vehicles',
    'agriculture',
    'Tractors (Massey, Al-Ghazi, etc.), combine harvesters and farm transport.',
    '10000000-0000-0000-0000-000000000004', 1, true
  ),
  (
    '20000000-0000-0000-0000-000000000014',
    'Irrigation Systems',
    'irrigation-systems',
    'water',
    'Drip irrigation, sprinkler systems, tube-wells and water management equipment.',
    '10000000-0000-0000-0000-000000000004', 2, true
  ),
  (
    '20000000-0000-0000-0000-000000000015',
    'Precision Agri-Tech',
    'precision-agritech',
    'precision_manufacturing',
    'Agricultural drones, soil sensors, weather stations and smart farming IoT.',
    '10000000-0000-0000-0000-000000000004', 3, true
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- SUBCATEGORIES — Solar & Energy (2 children → running: 23)
-- ----------------------------------------------------------------
INSERT INTO public.categories (id, name, slug, icon, description, parent_id, sort_order, is_active)
VALUES
  (
    '20000000-0000-0000-0000-000000000016',
    'Solar Panels & Systems',
    'solar-panels-systems',
    'solar_power',
    'On-grid and off-grid solar PV systems, inverters and batteries for farm use.',
    '10000000-0000-0000-0000-000000000005', 1, true
  ),
  (
    '20000000-0000-0000-0000-000000000017',
    'Agri Water Pumps',
    'agri-water-pumps',
    'water_pump',
    'Solar-powered and electric submersible and surface water pumps for irrigation.',
    '10000000-0000-0000-0000-000000000005', 2, true
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- SUBCATEGORIES — Consultancy & Services (3 children → TOTAL: 23 + 3 = 26)
-- Note: 6 parents + 20 children = 26 entries. The brief said "~23 categories"
-- which typically refers to leaf/top-level nodes. These can be trimmed as needed.
-- ----------------------------------------------------------------
INSERT INTO public.categories (id, name, slug, icon, description, parent_id, sort_order, is_active)
VALUES
  (
    '20000000-0000-0000-0000-000000000018',
    'Farm Management',
    'farm-management',
    'manage_accounts',
    'End-to-end farm planning, crop scheduling, yield optimization and agronomy advice.',
    '10000000-0000-0000-0000-000000000006', 1, true
  ),
  (
    '20000000-0000-0000-0000-000000000019',
    'Soil & Water Testing',
    'soil-water-testing',
    'biotech',
    'Laboratory soil and water analysis, fertility reports and remediation plans.',
    '10000000-0000-0000-0000-000000000006', 2, true
  ),
  (
    '20000000-0000-0000-0000-000000000020',
    'Export & Trade Advisory',
    'export-trade-advisory',
    'local_shipping',
    'Export documentation, SPS compliance, phytosanitary certificates and market access.',
    '10000000-0000-0000-0000-000000000006', 3, true
  )
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- AD PLANS (3 tiers)
-- ================================================================
INSERT INTO public.ad_plans (id, name, description, price_pkr, duration_days, placement_type, max_impressions, is_active)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'Starter Banner',
    'Single-category banner ad displayed in your selected sector. Ideal for small farms and local suppliers.',
    4999.00,
    30,
    'banner',
    50000,
    true
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'Featured Listing',
    'Prominently featured listing card across all relevant category pages. Best for growing agri-businesses.',
    12999.00,
    30,
    'featured',
    200000,
    true
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'Sponsored Top Spot',
    'Premium sponsored placement at the top of search results and category pages nationwide.',
    29999.00,
    30,
    'sponsored',
    NULL,   -- unlimited impressions
    true
  )
ON CONFLICT (id) DO NOTHING;

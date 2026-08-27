-- ================================================================
-- Migration 16: Livestock & Poultry Mandi Rates
-- Adds authentic Pakistani wholesale rates for:
--   * Chicken  — Broiler Live, Broiler Farm, Desi Murgh
--   * Beef     — Live Cattle, Boneless, With Bone, Qurbani Grade
--   * Eggs     — Farm White, Farm Brown, Desi, Hatching
-- ================================================================

DELETE FROM public.market_rates WHERE source = 'demo-seed-livestock';

INSERT INTO public.market_rates
  (commodity, variety, unit, price, min_price, max_price, modal_price, trend, market, city, province, source, rate_date, recorded_at)
VALUES
  -- CHICKEN: Broiler Live Weight
  ('Broiler Chicken (Live)', 'Live Weight',  'per kg', 395, 385, 410, 395, 'up',     'Lahore Murgi Mandi',          'Lahore',     'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Broiler Chicken (Live)', 'Live Weight',  'per kg', 380, 370, 395, 380, NULL,     'Lahore Murgi Mandi',          'Lahore',     'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Broiler Chicken (Live)', 'Live Weight',  'per kg', 390, 380, 405, 390, 'up',     'Faisalabad Poultry Market',   'Faisalabad', 'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Broiler Chicken (Live)', 'Live Weight',  'per kg', 375, 365, 390, 375, NULL,     'Faisalabad Poultry Market',   'Faisalabad', 'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Broiler Chicken (Live)', 'Live Weight',  'per kg', 400, 390, 415, 400, 'stable', 'Multan Murgi Mandi',          'Multan',     'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Broiler Chicken (Live)', 'Live Weight',  'per kg', 400, 390, 415, 400, NULL,     'Multan Murgi Mandi',          'Multan',     'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Broiler Chicken (Live)', 'Live Weight',  'per kg', 405, 395, 420, 405, 'up',     'Rawalpindi Poultry Market',   'Rawalpindi', 'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Broiler Chicken (Live)', 'Live Weight',  'per kg', 390, 380, 405, 390, NULL,     'Rawalpindi Poultry Market',   'Rawalpindi', 'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Broiler Chicken (Live)', 'Live Weight',  'per kg', 415, 405, 430, 415, 'up',     'Karachi Murgi Market',        'Karachi',    'Sindh',   'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Broiler Chicken (Live)', 'Live Weight',  'per kg', 400, 390, 415, 400, NULL,     'Karachi Murgi Market',        'Karachi',    'Sindh',   'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Broiler Chicken (Live)', 'Live Weight',  'per kg', 398, 388, 413, 398, 'stable', 'Peshawar Murgi Mandi',        'Peshawar',   'KPK',     'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Broiler Chicken (Live)', 'Live Weight',  'per kg', 398, 388, 413, 398, NULL,     'Peshawar Murgi Mandi',        'Peshawar',   'KPK',     'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),

  -- CHICKEN: Farm Dressed
  ('Broiler Chicken (Farm)', 'Dressed / Cleaned', 'per kg', 520, 505, 540, 520, 'up',     'Lahore Murgi Mandi',          'Lahore',     'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Broiler Chicken (Farm)', 'Dressed / Cleaned', 'per kg', 500, 485, 520, 500, NULL,     'Lahore Murgi Mandi',          'Lahore',     'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Broiler Chicken (Farm)', 'Dressed / Cleaned', 'per kg', 510, 495, 530, 510, 'stable', 'Faisalabad Poultry Market',   'Faisalabad', 'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Broiler Chicken (Farm)', 'Dressed / Cleaned', 'per kg', 510, 495, 530, 510, NULL,     'Faisalabad Poultry Market',   'Faisalabad', 'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Broiler Chicken (Farm)', 'Dressed / Cleaned', 'per kg', 530, 515, 550, 530, 'up',     'Karachi Murgi Market',        'Karachi',    'Sindh',   'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Broiler Chicken (Farm)', 'Dressed / Cleaned', 'per kg', 510, 495, 530, 510, NULL,     'Karachi Murgi Market',        'Karachi',    'Sindh',   'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Broiler Chicken (Farm)', 'Dressed / Cleaned', 'per kg', 525, 510, 545, 525, 'up',     'Islamabad Poultry Market',    'Islamabad',  'Federal', 'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Broiler Chicken (Farm)', 'Dressed / Cleaned', 'per kg', 505, 490, 525, 505, NULL,     'Islamabad Poultry Market',    'Islamabad',  'Federal', 'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),

  -- CHICKEN: Desi Murgh
  ('Desi Murgh (Country Chicken)', 'Live Weight', 'per kg', 850, 800, 900, 850, 'up',     'Lahore Murgi Mandi',          'Lahore',     'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Desi Murgh (Country Chicken)', 'Live Weight', 'per kg', 820, 780, 865, 820, NULL,     'Lahore Murgi Mandi',          'Lahore',     'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Desi Murgh (Country Chicken)', 'Live Weight', 'per kg', 875, 825, 930, 875, 'up',     'Faisalabad Poultry Market',   'Faisalabad', 'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Desi Murgh (Country Chicken)', 'Live Weight', 'per kg', 845, 800, 895, 845, NULL,     'Faisalabad Poultry Market',   'Faisalabad', 'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Desi Murgh (Country Chicken)', 'Live Weight', 'per kg', 900, 850, 950, 900, 'stable', 'Karachi Murgi Market',        'Karachi',    'Sindh',   'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Desi Murgh (Country Chicken)', 'Live Weight', 'per kg', 900, 850, 950, 900, NULL,     'Karachi Murgi Market',        'Karachi',    'Sindh',   'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Desi Murgh (Country Chicken)', 'Live Weight', 'per kg', 880, 830, 940, 880, 'up',     'Peshawar Murgi Mandi',        'Peshawar',   'KPK',     'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Desi Murgh (Country Chicken)', 'Live Weight', 'per kg', 850, 800, 905, 850, NULL,     'Peshawar Murgi Mandi',        'Peshawar',   'KPK',     'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),

  -- BEEF: Live Cattle
  ('Beef Cattle (Live)',  'Crossbred / Local',  '40 kg (Maund)', 28000, 26500, 29500, 28000, 'up',     'Lahore Cattle Market',      'Lahore',     'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Beef Cattle (Live)',  'Crossbred / Local',  '40 kg (Maund)', 27000, 25500, 28500, 27000, NULL,     'Lahore Cattle Market',      'Lahore',     'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Beef Cattle (Live)',  'Crossbred / Local',  '40 kg (Maund)', 27500, 26000, 29000, 27500, 'stable', 'Faisalabad Cattle Market',  'Faisalabad', 'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Beef Cattle (Live)',  'Crossbred / Local',  '40 kg (Maund)', 27500, 26000, 29000, 27500, NULL,     'Faisalabad Cattle Market',  'Faisalabad', 'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Beef Cattle (Live)',  'Crossbred / Local',  '40 kg (Maund)', 29000, 27500, 30500, 29000, 'up',     'Multan Cattle Market',      'Multan',     'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Beef Cattle (Live)',  'Crossbred / Local',  '40 kg (Maund)', 28000, 26500, 29500, 28000, NULL,     'Multan Cattle Market',      'Multan',     'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Beef Cattle (Live)',  'Crossbred / Local',  '40 kg (Maund)', 30000, 28500, 31500, 30000, 'up',     'Karachi Cattle Colony',     'Karachi',    'Sindh',   'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Beef Cattle (Live)',  'Crossbred / Local',  '40 kg (Maund)', 28800, 27300, 30300, 28800, NULL,     'Karachi Cattle Colony',     'Karachi',    'Sindh',   'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Beef Cattle (Live)',  'Crossbred / Local',  '40 kg (Maund)', 27000, 25500, 28500, 27000, 'down',   'Peshawar Cattle Market',    'Peshawar',   'KPK',     'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Beef Cattle (Live)',  'Crossbred / Local',  '40 kg (Maund)', 27500, 26000, 29000, 27500, NULL,     'Peshawar Cattle Market',    'Peshawar',   'KPK',     'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),

  -- BEEF: Boneless
  ('Beef (Boneless)',     'Fresh Boneless',     'per kg', 1100, 1050, 1150, 1100, 'up',     'Lahore Meat Market',        'Lahore',     'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Beef (Boneless)',     'Fresh Boneless',     'per kg', 1060, 1010, 1110, 1060, NULL,     'Lahore Meat Market',        'Lahore',     'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Beef (Boneless)',     'Fresh Boneless',     'per kg', 1080, 1030, 1130, 1080, 'stable', 'Faisalabad Meat Market',    'Faisalabad', 'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Beef (Boneless)',     'Fresh Boneless',     'per kg', 1080, 1030, 1130, 1080, NULL,     'Faisalabad Meat Market',    'Faisalabad', 'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Beef (Boneless)',     'Fresh Boneless',     'per kg', 1150, 1100, 1200, 1150, 'up',     'Karachi Meat Market',       'Karachi',    'Sindh',   'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Beef (Boneless)',     'Fresh Boneless',     'per kg', 1110, 1060, 1160, 1110, NULL,     'Karachi Meat Market',       'Karachi',    'Sindh',   'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Beef (Boneless)',     'Fresh Boneless',     'per kg', 1120, 1070, 1170, 1120, 'up',     'Islamabad Meat Market',     'Islamabad',  'Federal', 'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Beef (Boneless)',     'Fresh Boneless',     'per kg', 1085, 1035, 1135, 1085, NULL,     'Islamabad Meat Market',     'Islamabad',  'Federal', 'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),

  -- BEEF: With Bone
  ('Beef (With Bone)',    'Mixed / Hada Gosht', 'per kg', 850, 800, 900, 850, 'up',     'Lahore Meat Market',        'Lahore',     'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Beef (With Bone)',    'Mixed / Hada Gosht', 'per kg', 820, 775, 870, 820, NULL,     'Lahore Meat Market',        'Lahore',     'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Beef (With Bone)',    'Mixed / Hada Gosht', 'per kg', 840, 790, 890, 840, 'stable', 'Faisalabad Meat Market',    'Faisalabad', 'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Beef (With Bone)',    'Mixed / Hada Gosht', 'per kg', 840, 790, 890, 840, NULL,     'Faisalabad Meat Market',    'Faisalabad', 'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Beef (With Bone)',    'Mixed / Hada Gosht', 'per kg', 900, 850, 950, 900, 'up',     'Karachi Meat Market',       'Karachi',    'Sindh',   'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Beef (With Bone)',    'Mixed / Hada Gosht', 'per kg', 870, 820, 920, 870, NULL,     'Karachi Meat Market',       'Karachi',    'Sindh',   'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Beef (With Bone)',    'Mixed / Hada Gosht', 'per kg', 870, 820, 920, 870, 'down',   'Peshawar Meat Market',      'Peshawar',   'KPK',     'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Beef (With Bone)',    'Mixed / Hada Gosht', 'per kg', 890, 840, 940, 890, NULL,     'Peshawar Meat Market',      'Peshawar',   'KPK',     'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),

  -- BEEF: Qurbani Premium
  ('Beef Qurbani (Premium)', 'Cow / Wanda Grade', 'per head', 120000, 100000, 150000, 120000, 'up',   'Lahore Cattle Market',    'Lahore',  'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Beef Qurbani (Premium)', 'Cow / Wanda Grade', 'per head', 110000, 90000,  140000, 110000, NULL,   'Lahore Cattle Market',    'Lahore',  'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Beef Qurbani (Premium)', 'Cow / Wanda Grade', 'per head', 130000, 110000, 160000, 130000, 'up',   'Karachi Cattle Colony',   'Karachi', 'Sindh',   'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Beef Qurbani (Premium)', 'Cow / Wanda Grade', 'per head', 120000, 100000, 150000, 120000, NULL,   'Karachi Cattle Colony',   'Karachi', 'Sindh',   'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),

  -- EGGS: Farm White
  ('Eggs (Farm White)',   'Grade A White',      'per dozen', 185, 178, 195, 185, 'up',     'Lahore Egg Market',         'Lahore',     'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Eggs (Farm White)',   'Grade A White',      'per dozen', 175, 168, 185, 175, NULL,     'Lahore Egg Market',         'Lahore',     'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Eggs (Farm White)',   'Grade A White',      'per dozen', 182, 175, 192, 182, 'stable', 'Faisalabad Egg Market',     'Faisalabad', 'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Eggs (Farm White)',   'Grade A White',      'per dozen', 182, 175, 192, 182, NULL,     'Faisalabad Egg Market',     'Faisalabad', 'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Eggs (Farm White)',   'Grade A White',      'per dozen', 190, 183, 200, 190, 'up',     'Karachi Egg Market',        'Karachi',    'Sindh',   'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Eggs (Farm White)',   'Grade A White',      'per dozen', 180, 173, 190, 180, NULL,     'Karachi Egg Market',        'Karachi',    'Sindh',   'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Eggs (Farm White)',   'Grade A White',      'per dozen', 187, 180, 197, 187, 'up',     'Rawalpindi Egg Market',     'Rawalpindi', 'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Eggs (Farm White)',   'Grade A White',      'per dozen', 178, 171, 188, 178, NULL,     'Rawalpindi Egg Market',     'Rawalpindi', 'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Eggs (Farm White)',   'Grade A White',      'per dozen', 183, 176, 193, 183, 'stable', 'Peshawar Egg Market',       'Peshawar',   'KPK',     'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Eggs (Farm White)',   'Grade A White',      'per dozen', 183, 176, 193, 183, NULL,     'Peshawar Egg Market',       'Peshawar',   'KPK',     'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),

  -- EGGS: Farm Brown
  ('Eggs (Farm Brown)',   'Grade A Brown',      'per dozen', 200, 192, 210, 200, 'up',     'Lahore Egg Market',         'Lahore',     'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Eggs (Farm Brown)',   'Grade A Brown',      'per dozen', 190, 182, 200, 190, NULL,     'Lahore Egg Market',         'Lahore',     'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Eggs (Farm Brown)',   'Grade A Brown',      'per dozen', 195, 187, 205, 195, 'stable', 'Faisalabad Egg Market',     'Faisalabad', 'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Eggs (Farm Brown)',   'Grade A Brown',      'per dozen', 195, 187, 205, 195, NULL,     'Faisalabad Egg Market',     'Faisalabad', 'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Eggs (Farm Brown)',   'Grade A Brown',      'per dozen', 205, 197, 215, 205, 'up',     'Karachi Egg Market',        'Karachi',    'Sindh',   'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Eggs (Farm Brown)',   'Grade A Brown',      'per dozen', 195, 187, 205, 195, NULL,     'Karachi Egg Market',        'Karachi',    'Sindh',   'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),

  -- EGGS: Desi
  ('Eggs (Desi)',         'Country / Desi',     'per dozen', 380, 350, 420, 380, 'up',     'Lahore Egg Market',         'Lahore',     'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Eggs (Desi)',         'Country / Desi',     'per dozen', 360, 330, 400, 360, NULL,     'Lahore Egg Market',         'Lahore',     'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Eggs (Desi)',         'Country / Desi',     'per dozen', 400, 370, 440, 400, 'up',     'Karachi Egg Market',        'Karachi',    'Sindh',   'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Eggs (Desi)',         'Country / Desi',     'per dozen', 380, 350, 420, 380, NULL,     'Karachi Egg Market',        'Karachi',    'Sindh',   'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Eggs (Desi)',         'Country / Desi',     'per dozen', 390, 360, 430, 390, 'stable', 'Faisalabad Egg Market',     'Faisalabad', 'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Eggs (Desi)',         'Country / Desi',     'per dozen', 390, 360, 430, 390, NULL,     'Faisalabad Egg Market',     'Faisalabad', 'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Eggs (Desi)',         'Country / Desi',     'per dozen', 410, 380, 450, 410, 'up',     'Peshawar Egg Market',       'Peshawar',   'KPK',     'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Eggs (Desi)',         'Country / Desi',     'per dozen', 395, 365, 435, 395, NULL,     'Peshawar Egg Market',       'Peshawar',   'KPK',     'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),

  -- EGGS: Hatching / Fertile
  ('Eggs (Hatching)',     'Fertile / Hatchery', 'per dozen', 145, 135, 158, 145, 'up',     'Lahore Poultry Hub',        'Lahore',     'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Eggs (Hatching)',     'Fertile / Hatchery', 'per dozen', 138, 128, 151, 138, NULL,     'Lahore Poultry Hub',        'Lahore',     'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Eggs (Hatching)',     'Fertile / Hatchery', 'per dozen', 148, 138, 160, 148, 'stable', 'Faisalabad Poultry Hub',    'Faisalabad', 'Punjab',  'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Eggs (Hatching)',     'Fertile / Hatchery', 'per dozen', 148, 138, 160, 148, NULL,     'Faisalabad Poultry Hub',    'Faisalabad', 'Punjab',  'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours'),
  ('Eggs (Hatching)',     'Fertile / Hatchery', 'per dozen', 155, 145, 168, 155, 'up',     'Karachi Poultry Hub',       'Karachi',    'Sindh',   'demo-seed-livestock', CURRENT_DATE,      now() - interval '6 hours'),
  ('Eggs (Hatching)',     'Fertile / Hatchery', 'per dozen', 147, 137, 160, 147, NULL,     'Karachi Poultry Hub',       'Karachi',    'Sindh',   'demo-seed-livestock', CURRENT_DATE - 1, now() - interval '30 hours');

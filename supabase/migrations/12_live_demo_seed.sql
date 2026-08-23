-- ================================================================
-- AgriBusiness Pakistan — Migration 12
-- Schema fixes (messages columns, notifications.action_url,
-- newsletter capture) + rich demo seed so every surface looks live.
--
-- Safe to run multiple times: schema steps are guarded, and demo
-- rows are removed-then-reinserted by fixed primary keys / source tag.
-- Run in Supabase SQL Editor → New query.
-- ================================================================

-- ----------------------------------------------------------------
-- PART 1a. MESSAGES — align column names with the shipped frontend
-- The schema shipped sender_id / type; the app writes
-- sender_profile_id / message_type. Rename idempotently.
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_profile_id'
  ) THEN
    ALTER TABLE public.messages RENAME COLUMN sender_id TO sender_profile_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'message_type'
  ) THEN
    ALTER TABLE public.messages RENAME COLUMN type TO message_type;
  END IF;
END $$;

-- Recreate the message-notification trigger against the new columns.
CREATE OR REPLACE FUNCTION public.fn_notify_message_participants()
RETURNS TRIGGER AS $$
DECLARE
  participants UUID[];
BEGIN
  SELECT participant_ids INTO participants
  FROM public.threads
  WHERE id = NEW.thread_id;

  FOREACH participant IN ARRAY participants LOOP
    CONTINUE WHEN participant = NEW.sender_profile_id;
    INSERT INTO public.notifications (
      profile_id, type, title, body, action_url, metadata
    ) VALUES (
      participant,
      'new_message',
      'New Message',
      LEFT(COALESCE(NEW.body, 'Sent an attachment'), 120),
      '/messages',
      jsonb_build_object(
        'thread_id', NEW.thread_id,
        'sender_id', NEW.sender_profile_id,
        'message_type', NEW.message_type
      )
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_message_participants();

DROP POLICY IF EXISTS "messages:insert:participants" ON public.messages;
CREATE POLICY "messages:insert:participants"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_profile_id
    AND public.is_thread_participant(thread_id)
  );

-- ----------------------------------------------------------------
-- PART 1b. NOTIFICATIONS — action_url deep links + richer types
-- ----------------------------------------------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS action_url TEXT;

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'connection_request';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'connection_accepted';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'proposal_received';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'proposal_accepted';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'listing_enquiry';

-- ----------------------------------------------------------------
-- PART 1c. NEWSLETTER — footer subscription capture (insert-only)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter:insert:anon" ON public.newsletter_subscribers;
CREATE POLICY "newsletter:insert:anon"
  ON public.newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ================================================================
-- PART 2. MARKET RATES — two days of board data across six mandis
-- (powers the Exchange Board, RateTicker, feed sidebar, /rates).
-- Real day-over-day deltas so change % is computed, never faked.
-- ================================================================
DELETE FROM public.market_rates WHERE source = 'demo-seed';

INSERT INTO public.market_rates
  (commodity, variety, unit, price, min_price, max_price, modal_price, trend, market, city, province, source, rate_date, recorded_at)
VALUES
  -- Wheat
  ('Wheat', 'Galaxy / Akbar', '40 kg (Maund)', 4380, 4320, 4440, 4380, 'up',    'Lahore Grain Market',    'Lahore',     'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Wheat', 'Galaxy / Akbar', '40 kg (Maund)', 4310, 4250, 4370, 4310, NULL,    'Lahore Grain Market',    'Lahore',     'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Wheat', 'Sehar',          '40 kg (Maund)', 4320, 4260, 4380, 4320, 'up',    'Jhang Road Mandi',       'Faisalabad', 'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Wheat', 'Sehar',          '40 kg (Maund)', 4265, 4210, 4320, 4265, NULL,    'Jhang Road Mandi',       'Faisalabad', 'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Wheat', 'Akbar',          '40 kg (Maund)', 4350, 4290, 4410, 4350, 'down',  'Multan Grain Market',    'Multan',     'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Wheat', 'Akbar',          '40 kg (Maund)', 4405, 4350, 4460, 4405, NULL,    'Multan Grain Market',    'Multan',     'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Wheat', 'Sehar',          '40 kg (Maund)', 4300, 4240, 4360, 4300, 'stable','Sargodha Mandi',         'Sargodha',   'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Wheat', 'Sehar',          '40 kg (Maund)', 4300, 4240, 4360, 4300, NULL,    'Sargodha Mandi',         'Sargodha',   'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Wheat', 'Fareed',         '40 kg (Maund)', 4280, 4220, 4340, 4280, 'up',    'Sahiwal Mandi',          'Sahiwal',    'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Wheat', 'Fareed',         '40 kg (Maund)', 4220, 4170, 4270, 4220, NULL,    'Sahiwal Mandi',          'Sahiwal',    'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Wheat', 'Galaxy',         '40 kg (Maund)', 4450, 4390, 4510, 4450, 'up',    'Karachi Subzi Mandi',    'Karachi',    'Sindh',   'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Wheat', 'Galaxy',         '40 kg (Maund)', 4380, 4320, 4440, 4380, NULL,    'Karachi Subzi Mandi',    'Karachi',    'Sindh',   'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  -- Super Basmati
  ('Super Basmati', '1121 A-grade', '40 kg (Maund)', 9800, 9700, 9900, 9800, 'up',   'Lahore Rice Market',  'Lahore',     'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Super Basmati', '1121 A-grade', '40 kg (Maund)', 9720, 9620, 9820, 9720, NULL,   'Lahore Rice Market',  'Lahore',     'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Super Basmati', '1121 Steam',  '40 kg (Maund)', 9650, 9550, 9750, 9650, 'down', 'Rice Market Kammoke','Faisalabad', 'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Super Basmati', '1121 Steam',  '40 kg (Maund)', 9725, 9625, 9825, 9725, NULL,   'Rice Market Kammoke','Faisalabad', 'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Super Basmati', 'Kainat',      '40 kg (Maund)', 9700, 9600, 9800, 9700, 'up',   'Multan Grain Market','Multan',     'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Super Basmati', 'Kainat',      '40 kg (Maund)', 9620, 9520, 9720, 9620, NULL,   'Multan Grain Market','Multan',     'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Super Basmati', '1121 A-grade','40 kg (Maund)', 9550, 9450, 9650, 9550, 'up',   'Sargodha Mandi',     'Sargodha',   'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Super Basmati', '1121 A-grade','40 kg (Maund)', 9480, 9380, 9580, 9480, NULL,   'Sargodha Mandi',     'Sargodha',   'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Super Basmati', '1121 Steam',  '40 kg (Maund)', 9500, 9400, 9600, 9500, 'stable','Sahiwal Mandi',    'Sahiwal',    'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Super Basmati', '1121 Steam',  '40 kg (Maund)', 9500, 9400, 9600, 9500, NULL,   'Sahiwal Mandi',      'Sahiwal',    'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Super Basmati', '1121 A-grade','40 kg (Maund)', 9900, 9800, 10000, 9900, 'up',  'Karachi Rice Market','Karachi',   'Sindh',   'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Super Basmati', '1121 A-grade','40 kg (Maund)', 9810, 9710, 9910, 9810, NULL,   'Karachi Rice Market','Karachi',   'Sindh',   'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  -- Cotton Phutti
  ('Cotton Phutti', 'Bt-131', '40 kg (Maund)', 8700, 8600, 8800, 8700, 'up',    'Lahore Cotton Market',   'Lahore',     'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Cotton Phutti', 'Bt-131', '40 kg (Maund)', 8625, 8525, 8725, 8625, NULL,    'Lahore Cotton Market',   'Lahore',     'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Cotton Phutti', 'Bt-131', '40 kg (Maund)', 8600, 8500, 8700, 8600, 'down',  'Faisalabad Kutchery',    'Faisalabad', 'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Cotton Phutti', 'Bt-131', '40 kg (Maund)', 8680, 8580, 8780, 8680, NULL,    'Faisalabad Kutchery',    'Faisalabad', 'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Cotton Phutti', 'Bt-131', '40 kg (Maund)', 8750, 8650, 8850, 8750, 'up',    'Multan Cotton Market',   'Multan',     'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Cotton Phutti', 'Bt-131', '40 kg (Maund)', 8660, 8560, 8760, 8660, NULL,    'Multan Cotton Market',   'Multan',     'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Cotton Phutti', 'CRIS-508','40 kg (Maund)', 8650, 8550, 8750, 8650, 'up',    'Rahim Yar Khan Mandi',   'Sargodha',   'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Cotton Phutti', 'CRIS-508','40 kg (Maund)', 8570, 8470, 8670, 8570, NULL,    'Rahim Yar Khan Mandi',   'Sargodha',   'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Cotton Phutti', 'Bt-131', '40 kg (Maund)', 8550, 8450, 8650, 8550, 'stable','Sahiwal Mandi',          'Sahiwal',    'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Cotton Phutti', 'Bt-131', '40 kg (Maund)', 8550, 8450, 8650, 8550, NULL,    'Sahiwal Mandi',          'Sahiwal',    'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Cotton Phutti', 'Bt-343', '40 kg (Maund)', 8900, 8800, 9000, 8900, 'up',    'Karachi Cotton Exchange','Karachi',   'Sindh',   'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Cotton Phutti', 'Bt-343', '40 kg (Maund)', 8790, 8690, 8890, 8790, NULL,    'Karachi Cotton Exchange','Karachi',   'Sindh',   'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  -- Maize
  ('Maize', 'Yellow Dent', '40 kg (Maund)', 3250, 3190, 3310, 3250, 'up',      'Lahore Grain Market',    'Lahore',     'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Maize', 'Yellow Dent', '40 kg (Maund)', 3185, 3125, 3245, 3185, NULL,      'Lahore Grain Market',    'Lahore',     'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Maize', 'Yellow Dent', '40 kg (Maund)', 3180, 3120, 3240, 3180, 'up',      'Faisalabad Mandi',       'Faisalabad', 'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Maize', 'Yellow Dent', '40 kg (Maund)', 3125, 3065, 3185, 3125, NULL,      'Faisalabad Mandi',       'Faisalabad', 'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Maize', 'Yellow Dent', '40 kg (Maund)', 3200, 3140, 3260, 3200, 'stable',  'Multan Grain Market',    'Multan',     'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Maize', 'Yellow Dent', '40 kg (Maund)', 3200, 3140, 3260, 3200, NULL,      'Multan Grain Market',    'Multan',     'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Maize', 'Yellow Dent', '40 kg (Maund)', 3150, 3090, 3210, 3150, 'up',      'Sargodha Mandi',         'Sargodha',   'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Maize', 'Yellow Dent', '40 kg (Maund)', 3080, 3020, 3140, 3080, NULL,      'Sargodha Mandi',         'Sargodha',   'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Maize', 'Yellow Dent', '40 kg (Maund)', 3120, 3060, 3180, 3120, 'down',    'Sahiwal Mandi',          'Sahiwal',    'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Maize', 'Yellow Dent', '40 kg (Maund)', 3165, 3105, 3225, 3165, NULL,      'Sahiwal Mandi',          'Sahiwal',    'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Maize', 'Yellow Dent', '40 kg (Maund)', 3300, 3240, 3360, 3300, 'up',      'Karachi Subzi Mandi',    'Karachi',    'Sindh',   'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Maize', 'Yellow Dent', '40 kg (Maund)', 3230, 3170, 3290, 3230, NULL,      'Karachi Subzi Mandi',    'Karachi',    'Sindh',   'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  -- Sugarcane
  ('Sugarcane', 'CPF-249', '40 kg', 450, 430, 470, 450, 'up',     'Lahore Sugar Belt',      'Lahore',     'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Sugarcane', 'CPF-249', '40 kg', 442, 422, 462, 442, NULL,     'Lahore Sugar Belt',      'Lahore',     'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Sugarcane', 'CPF-249', '40 kg', 445, 425, 465, 445, 'down',   'Faisalabad Sugar Zone',  'Faisalabad', 'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Sugarcane', 'CPF-249', '40 kg', 452, 432, 472, 452, NULL,     'Faisalabad Sugar Zone',  'Faisalabad', 'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Sugarcane', 'CPF-249', '40 kg', 455, 435, 475, 455, 'up',     'Multan Sugar Belt',      'Multan',     'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Sugarcane', 'CPF-249', '40 kg', 447, 427, 467, 447, NULL,     'Multan Sugar Belt',      'Multan',     'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Sugarcane', 'HSF-240', '40 kg', 448, 428, 468, 448, 'up',     'Sargodha Sugar Zone',    'Sargodha',   'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Sugarcane', 'HSF-240', '40 kg', 440, 420, 460, 440, NULL,     'Sargodha Sugar Zone',    'Sargodha',   'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Sugarcane', 'CPF-249', '40 kg', 442, 422, 462, 442, 'stable', 'Sahiwal Sugar Belt',     'Sahiwal',    'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Sugarcane', 'CPF-249', '40 kg', 442, 422, 462, 442, NULL,     'Sahiwal Sugar Belt',     'Sahiwal',    'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Sugarcane', 'CPF-249', '40 kg', 460, 440, 480, 460, 'up',     'Karachi Sugar Market',   'Karachi',    'Sindh',   'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Sugarcane', 'CPF-249', '40 kg', 450, 430, 470, 450, NULL,     'Karachi Sugar Market',   'Karachi',    'Sindh',   'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  -- Urea (50kg bag)
  ('Urea', 'Sona DAP Blend', '50kg bag', 4850, 4800, 4900, 4850, 'stable',  'Lahore Input Market',  'Lahore',     'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Urea', 'Sona DAP Blend', '50kg bag', 4850, 4800, 4900, 4850, NULL,      'Lahore Input Market',  'Lahore',     'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Urea', 'Engro Fertilizer','50kg bag', 4800, 4750, 4850, 4800, 'up',     'Faisalabad Input Bazar','Faisalabad', 'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Urea', 'Engro Fertilizer','50kg bag', 4740, 4690, 4790, 4740, NULL,     'Faisalabad Input Bazar','Faisalabad', 'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Urea', 'Fatima Fert',    '50kg bag', 4900, 4850, 4950, 4900, 'down',    'Multan Input Market',  'Multan',     'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Urea', 'Fatima Fert',    '50kg bag', 4960, 4910, 5010, 4960, NULL,      'Multan Input Market',  'Multan',     'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Urea', 'Engro Fertilizer','50kg bag', 4780, 4730, 4830, 4780, 'up',     'Sargodha Input Market','Sargodha',   'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Urea', 'Engro Fertilizer','50kg bag', 4725, 4675, 4775, 4725, NULL,     'Sargodha Input Market','Sargodha',   'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Urea', 'Fatima Fert',    '50kg bag', 4750, 4700, 4800, 4750, 'stable',  'Sahiwal Input Bazar',  'Sahiwal',    'Punjab',  'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Urea', 'Fatima Fert',    '50kg bag', 4750, 4700, 4800, 4750, NULL,      'Sahiwal Input Bazar',  'Sahiwal',    'Punjab',  'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours'),
  ('Urea', 'FFC Sona',       '50kg bag', 4950, 4900, 5000, 4950, 'up',      'Karachi Input Market', 'Karachi',    'Sindh',   'demo-seed', CURRENT_DATE,      now() - interval '7 hours'),
  ('Urea', 'FFC Sona',       '50kg bag', 4870, 4820, 4920, 4870, NULL,      'Karachi Input Market', 'Karachi',    'Sindh',   'demo-seed', CURRENT_DATE - 1, now() - interval '31 hours');

-- ================================================================
-- PART 3. PROFILES — six more members across the five roles
-- (extends the eight in DEMO_SEED_DATA.sql)
-- ================================================================
INSERT INTO public.profiles (
  id, email, user_type, full_name, display_name, bio,
  city, province, location,
  is_verified, is_active, subscription_status,
  rating, rating_count, avatar_url
) VALUES
  (
    'a3000000-0000-0000-0000-000000000050',
    'muhammad.aslam.farmer@agribiz.demo',
    'farmer',
    'Muhammad Aslam Chaudhry',
    'Muhammad Aslam Chaudhry',
    'Cotton and wheat grower from Bahawalpur managing 85 acres of canal-irrigated land. Third-generation farmer, early adopter of Bt cotton varieties and IPM practices. Supplies ginning factories across south Punjab and mentors young growers in the tehsil.',
    'Bahawalpur', 'Punjab', 'Bahawalpur, Punjab',
    true, true, 'active',
    4.7, 41,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=AslamChaudhry&backgroundColor=c0aede'
  ),
  (
    'a4000000-0000-0000-0000-000000000051',
    'sana.baloch.farmer@agribiz.demo',
    'farmer',
    'Sana Baloch',
    'Sana Baloch — Aseel Dates Grower',
    'Aseel date and chili grower from Hyderabad, Sindh. Managing a 40-acre family orchard with drip irrigation and running a small grading-and-packing shed that supplies Karachi exporters. Focused on post-harvest quality and organic inputs.',
    'Hyderabad', 'Sindh', 'Hyderabad, Sindh',
    true, true, 'active',
    4.5, 16,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=SanaBaloch&backgroundColor=ffd5dc'
  ),
  (
    'b2000000-0000-0000-0000-000000000052',
    'kamran.sheikh.buyer@agribiz.demo',
    'buyer',
    'Kamran Sheikh',
    'Sheikh Rice Exports',
    'Rice trading and export house in Karachi. We procure Super Basmati and IRRI-6 paddy directly from growers in Punjab and Sindh, mill at partner units in Hafizabad, and export to the Gulf and UK. Volume: 4,000+ MT per year. Spot and forward contracts both welcome.',
    'Karachi', 'Sindh', 'Karachi, Sindh',
    true, true, 'active',
    4.6, 33,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=KamranSheikh&backgroundColor=b6e3f4'
  ),
  (
    'c4000000-0000-0000-0000-000000000053',
    'dr.faisal.entomology@agribiz.demo',
    'consultant',
    'Dr. Faisal Mehmood',
    'Dr. Faisal Mehmood — Entomologist',
    'PhD Entomology (UAF, 2016). IPM specialist working across the cotton belt with 9 years of field experience in whitefly, pink bollworm, and thrips management. Designs scouting programs, pheromone-trap networks, and pesticide-reduction plans for farms above 50 acres.',
    'Multan', 'Punjab', 'Multan, Punjab',
    true, true, 'active',
    4.8, 52,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=DrFaisal&backgroundColor=d1f4e0'
  ),
  (
    's2000000-0000-0000-0000-000000000054',
    'hira.naveed.student@agribiz.demo',
    'student',
    'Hira Naveed',
    'Hira Naveed',
    'MSc Horticulture student at the University of Agriculture Faisalabad. Research focus: post-harvest shelf-life extension in mangoes using modified-atmosphere packaging. Looking for farm trials, internship opportunities, and data-collection collaborations.',
    'Faisalabad', 'Punjab', 'Faisalabad, Punjab',
    false, true, 'trial',
    NULL, 0,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=HiraNaveed&backgroundColor=fde68a'
  ),
  (
    'o2000000-0000-0000-0000-000000000055',
    'ops@greentech-agri.demo',
    'company',
    'GreenTech Agri Solutions',
    'GreenTech Agri Solutions',
    'Lahore-based agri-engineering company (est. 2014). We design and install solar tubewells, drip and sprinkler systems, and low-cost cold rooms for farms and cooperatives. 380+ installations across Punjab and KP. Registered with PSEB and PSQCA.',
    'Lahore', 'Punjab', 'Lahore, Punjab',
    true, true, 'active',
    4.7, 88,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=GreenTechAgri&backgroundColor=c0aede'
  )
ON CONFLICT (id) DO NOTHING;

-- Role detail rows (power keyword matching and SmartMatches)
INSERT INTO public.farmer_profiles (profile_id, farm_name, acreage, crops, livestock, farm_location) VALUES
  ('a3000000-0000-0000-0000-000000000050', 'Chaudhry Farms', 85, ARRAY['Cotton', 'Wheat', 'Sugarcane'], ARRAY['Buffalo', 'Cattle'], 'Bahawalpur'),
  ('a4000000-0000-0000-0000-000000000051', 'Baloch Date Orchards', 40, ARRAY['Dates', 'Chili', 'Rice'], ARRAY[], 'Hyderabad')
ON CONFLICT (profile_id) DO NOTHING;

INSERT INTO public.buyer_profiles (profile_id, organization_name, commodities, grades, procurement_regions, expected_volume) VALUES
  ('b2000000-0000-0000-0000-000000000052', 'Sheikh Rice Exports', ARRAY['Super Basmati', 'IRRI-6', 'Wheat'], ARRAY['A-Grade', 'Steam', 'Sortex Clean'], ARRAY['Punjab', 'Sindh'], '4,000+ MT per year')
ON CONFLICT (profile_id) DO NOTHING;

INSERT INTO public.consultant_profiles (profile_id, degree, years_experience, services, technologies, availability, rate_from_pkr, credential_status) VALUES
  ('c4000000-0000-0000-0000-000000000053', 'PhD Entomology', 9, ARRAY['IPM Program Design', 'Cotton Pest Scouting', 'Pesticide Resistance Management'], ARRAY['Pheromone Traps', 'Drone Spraying', 'Degree-day Modeling'], 'Mon–Sat, field visits within 150 km of Multan', 15000, 'verified')
ON CONFLICT (profile_id) DO NOTHING;

INSERT INTO public.student_profiles (profile_id, institution, programme, degree, research_interests) VALUES
  ('s2000000-0000-0000-0000-000000000054', 'University of Agriculture Faisalabad', 'MSc Horticulture', 'MSc', ARRAY['Post-harvest Technology', 'Mango Value Chain', 'Modified Atmosphere Packaging'])
ON CONFLICT (profile_id) DO NOTHING;

INSERT INTO public.organizations (owner_profile_id, legal_name, display_name, website, description, services, technologies, city, province, is_verified, is_active) VALUES
  ('o2000000-0000-0000-0000-000000000055', 'GreenTech Agri Solutions (Pvt) Ltd', 'GreenTech Agri Solutions', 'https://greentech-agri.example.pk',
   'Solar irrigation and post-harvest engineering firm serving farms and cooperatives across Pakistan.',
   ARRAY['Solar Tubewell Installation', 'Drip Irrigation Design', 'Cold Room Construction', 'Farm Energy Audits'],
   ARRAY['Solar PV', 'Drip Systems', 'Vapor-compression Cooling'],
   'Lahore', 'Punjab', true, true)
ON CONFLICT DO NOTHING;

-- ================================================================
-- PART 4. LISTINGS — a full board across categories
-- ================================================================
INSERT INTO public.listings
  (id, profile_id, category_id, title, description, price, unit, quantity, city, location, status, is_featured, view_count, created_at)
VALUES
  ('f4000000-0000-0000-0000-000000000060', 'a1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Certified Wheat Seed (Akbar-19) — 50 Tons Available',
   'Certified and lab-tested Akbar-19 wheat seed from our Sargodha farm. Germination 92%, purity 98%. Phytosanitary certificate and seed-lab report available. Bulk rates for orders above 10 tons.',
   9600, '40 kg (Maund)', 2000, 'Sargodha', 'Bhalwal, Sargodha', 'active', true, 214, now() - interval '2 days'),

  ('f4000000-0000-0000-0000-000000000061', 'a2000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
   'Chaunsa Mango — Export Grade A, 1,200 Crates',
   'Sun-orchard Chaunsa from Multan, grade-A export quality, hot-water treated and packed per 5kg crate. Harvest window starts next week. Can arrange reefer transport to Karachi port.',
   850, 'per crate', 1200, 'Multan', 'Shujabad, Multan', 'active', true, 340, now() - interval '1 day'),

  ('f4000000-0000-0000-0000-000000000062', 'a3000000-0000-0000-0000-000000000050', '10000000-0000-0000-0000-000000000001',
   'Bt Cotton Phutti (Bt-131) — 800 Maunds, Clean Picking',
   'First picking of Bt-131 phutti, hand-picked clean, moisture under 8%. Located 18 km from Bahawalpur ginning factories. Weighment at buyer’s choice of scale.',
   8750, '40 kg (Maund)', 800, 'Bahawalpur', 'Hasilpur Road, Bahawalpur', 'active', false, 129, now() - interval '3 days'),

  ('f4000000-0000-0000-0000-000000000063', 'a4000000-0000-0000-0000-000000000051', '10000000-0000-0000-0000-000000000001',
   'Aseel Dates — Premium Dhakkan Grade, 3 Tons',
   'Sun-ripened Aseel dates from Hyderabad, Dhakkan grade, hand-graded and packed in 10kg food-grade boxes. Pesticide-residue test report available on request.',
   1250, 'per kg', 3000, 'Hyderabad', 'Tando Allahyar Road', 'active', false, 88, now() - interval '5 days'),

  ('f4000000-0000-0000-0000-000000000064', 'b2000000-0000-0000-0000-000000000052', '10000000-0000-0000-0000-000000000001',
   'WANTED: Super Basmati Paddy — 200 MT, Spot Purchase',
   'Buying Super Basmati 1121 paddy for export milling. A-grade, moisture below 13%. Weighment and payment at farm gate or Hafizabad mill, buyer’s choice. Rate negotiable above 9,600 per maund for quality lots.',
   9600, '40 kg (Maund)', 5000, 'Karachi', 'Procurement across Punjab & Sindh', 'active', false, 201, now() - interval '1 day'),

  ('f4000000-0000-0000-0000-000000000065', 'o2000000-0000-0000-0000-000000000055', '10000000-0000-0000-0000-000000000006',
   'Drip Irrigation System — Design + Installation Service',
   'Complete drip system design and installation for 1–100 acres: hydraulic design, filtration, fertigation tank, and commissioning. Free site survey within 100 km of Lahore. Two-year workmanship warranty.',
   65000, 'per acre', 500, 'Lahore', 'Serving Punjab & KP', 'active', true, 415, now() - interval '4 days'),

  ('f4000000-0000-0000-0000-000000000066', 'o2000000-0000-0000-0000-000000000055', '10000000-0000-0000-0000-000000000003',
   'NPK Compound Fertilizer (20-20-20) — Water Soluble',
   'Fully water-soluble NPK 20-20-20 for fertigation and foliar application. 25kg bags, imported, EC and heavy-metal test reports available. Wholesale rates for dealers and cooperatives.',
   12800, 'per 25kg bag', 900, 'Lahore', 'Delivery across Pakistan', 'active', false, 156, now() - interval '6 days'),

  ('f4000000-0000-0000-0000-000000000067', 'a1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004',
   'Massey Ferguson 240 Tractor (2019) — 2,900 Hours',
   'Well-maintained MF-240, 50 HP, 2,900 recorded hours, original engine, new tyres all around. Complete service history. Rawalpindi registration, documents clear.',
   2450000, 'per unit', 1, 'Sargodha', 'Bhalwal, Sargodha', 'active', false, 522, now() - interval '8 days'),

  ('f4000000-0000-0000-0000-000000000068', 'a3000000-0000-0000-0000-000000000050', '10000000-0000-0000-0000-000000000002',
   'Nili-Ravi Buffalo Heifers — 3 Head, Vaccinated',
   'Three Nili-Ravi heifers, 24–30 months, vaccinated (FMD, HS), dewormed, from a closed herd. Expected first lactation 8–10 litres. Vet inspection welcome before purchase.',
   385000, 'per head', 3, 'Bahawalpur', 'Hasilpur Road', 'active', false, 173, now() - interval '2 days'),

  ('f4000000-0000-0000-0000-000000000069', 'o2000000-0000-0000-0000-000000000055', '10000000-0000-0000-0000-000000000005',
   '7.5 HP Solar Tubewell System — Complete Kit',
   'Complete solar pumping kit: 7.5 HP submersible pump, 10 kW panels, inverter, structure, and installation. Draws 1,200+ gallons/hour at 150 ft head. Five-year pump warranty.',
   310000, 'per system', 5, 'Lahore', 'Installation across Pakistan', 'active', true, 389, now() - interval '3 days')
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- PART 5. PROJECTS — a live RFP board
-- ================================================================
INSERT INTO public.projects
  (id, profile_id, category_id, title, description, budget_min, budget_max, deadline, required_skills, location, city, status, created_at)
VALUES
  ('p4000000-0000-0000-0000-000000000070', 'o2000000-0000-0000-0000-000000000055', '10000000-0000-0000-0000-000000000005',
   'Solar Tubewell Conversion — 30-Acre Farm, Jhang',
   'Convert an existing diesel tubewell (12 CUSEC) to solar for a 30-acre farm near Jhang. Requires site survey, hydraulic load calculation, panel-inverter sizing, and turnkey installation with a 2-year maintenance plan. Water table at 120 ft.',
   800000, 1200000, (CURRENT_DATE + 20), ARRAY['Solar Sizing', 'Pump Hydraulics', 'Installation', 'O&M Planning'], 'Jhang, Punjab', 'Jhang', 'open', now() - interval '4 days'),

  ('p4000000-0000-0000-0000-000000000071', 'a1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003',
   'Soil & Water Testing Programme — 200-Acre Cooperative, Depalpur',
   'Our 22-member grower group needs composite soil sampling (macro + micro nutrients, pH, EC, OM) and tubewell water testing for 200 acres. Deliverable: fertility maps per field and a union-wide fertiliser recommendation plan.',
   150000, 250000, (CURRENT_DATE + 14), ARRAY['Soil Sampling', 'Lab Analysis', 'Fertility Mapping'], 'Depalpur, Punjab', 'Depalpur', 'open', now() - interval '6 days'),

  ('p4000000-0000-0000-0000-000000000072', 'a3000000-0000-0000-0000-000000000050', '10000000-0000-0000-0000-000000000003',
   'IPM Programme for 300-Acre Cotton Cluster — Bahawalpur',
   'Design and run an integrated pest management programme for a 300-acre cotton cluster: weekly scouting protocol, pheromone-trap network for pink bollworm, economic-threshold spray advisories, and end-of-season resistance report.',
   300000, 450000, (CURRENT_DATE + 25), ARRAY['IPM', 'Entomology', 'Scouting Protocols', 'Pheromone Traps'], 'Bahawalpur, Punjab', 'Bahawalpur', 'open', now() - interval '2 days'),

  ('p4000000-0000-0000-0000-000000000073', 'a4000000-0000-0000-0000-000000000051', '10000000-0000-0000-0000-000000000006',
   'Cold Storage Feasibility Study — 200-Ton Date Store, Hyderabad',
   'Feasibility study for a 200-ton date cold store: load calculation, CA vs NA storage comparison for Aseel dates, CAPEX/OPEX model with 5-year cash flows, and vendor shortlist. Report within 6 weeks.',
   200000, 400000, (CURRENT_DATE + 30), ARRAY['Cold Chain', 'Feasibility Study', 'Post-harvest', 'Financial Modelling'], 'Hyderabad, Sindh', 'Hyderabad', 'open', now() - interval '9 days'),

  ('p4000000-0000-0000-0000-000000000074', 'b2000000-0000-0000-0000-000000000052', '10000000-0000-0000-0000-000000000006',
   'Export Documentation Compliance Audit — Basmati EU Shipment',
   'Audit and prepare export documentation pack for a 40-ft Super Basmati shipment to the EU: SPS compliance, phytosanitary certificate workflow, pesticide MRL declarations, traceability records, and labelling review against EU 2023 regs.',
   120000, 180000, (CURRENT_DATE + 10), ARRAY['Export Documentation', 'SPS Compliance', 'EU Regulations', 'Basmati Trade'], 'Karachi, Sindh', 'Karachi', 'open', now() - interval '3 days'),

  ('p4000000-0000-0000-0000-000000000075', 'o2000000-0000-0000-0000-000000000055', NULL,
   'Farm-Data Dashboard Pilot — 5 Progressive Farms',
   'Pilot project to digitise 5 farms: yield, input, and irrigation records into a dashboard with satellite NDVI overlays. Looking for an agri-data consultant to design the data model, train farm staff, and run the 3-month pilot.',
   500000, 900000, (CURRENT_DATE + 18), ARRAY['Agri Data', 'Dashboard Design', 'NDVI', 'On-farm Training'], 'Remote + Punjab visits', 'Lahore', 'open', now() - interval '5 days'),

  ('p4000000-0000-0000-0000-000000000076', 'a3000000-0000-0000-0000-000000000050', '10000000-0000-0000-0000-000000000002',
   'Dairy Herd Nutrition Audit — 60 Nili-Ravi Buffaloes',
   'Full nutrition audit for a 60-head buffalo dairy: fodder availability mapping, ration balancing for 8–10 litre lactation targets, mineral programme, and body-condition scoring schedule. Deliverable: 12-month feeding calendar.',
   180000, 260000, (CURRENT_DATE + 12), ARRAY['Animal Nutrition', 'Ration Balancing', 'Dairy Management'], 'Bahawalpur, Punjab', 'Bahawalpur', 'open', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- PART 6. NETWORK FEED + CLINIC CASES
-- ================================================================
INSERT INTO public.problem_posts
  (id, profile_id, title, body, tags, media_urls, is_resolved, view_count, created_at)
VALUES
  ('q4000000-0000-0000-0000-000000000080', 'a1000000-0000-0000-0000-000000000001',
   'Wheat harvest wrapped: 42 maunds per acre on the late-sown block',
   'Finished harvesting the last 12 acres yesterday. The Akbar-19 block sown after November 20 averaged 42 maunds/acre against 38 last season — the seed-rate reduction and one extra irrigation at tillering clearly paid off. Detailed numbers in the comments if anyone wants them.',
   ARRAY['network','kind:update'], NULL, false, 96, now() - interval '20 hours'),

  ('q4000000-0000-0000-0000-000000000081', 'c1000000-0000-0000-0000-000000000004',
   'Reminder: soil sampling before your Basmati nursery matters more than seed rate',
   'Seeing three fields this week where growers spent on premium seed but skipped a Rs 4,000 soil test. Phosphorus was the limiting factor in all three — no seed variety fixes that. Sample at 6-inch depth, 12 cores per field, before fertiliser decisions. Happy to answer sampling questions here.',
   ARRAY['network','kind:update'], NULL, false, 183, now() - interval '2 days'),

  ('q4000000-0000-0000-0000-000000000082', 'a3000000-0000-0000-0000-000000000050',
   'First Bt-131 picking done — 8,750/maund at Hasilpur road ginneries',
   'Clean hand-picked phutti weighed in at 8,750 per maund today, up 90 from last week. Ginneries on Hasilpur Road are paying spot cash. If you are holding second picking, the weather window looks dry for the next 6 days.',
   ARRAY['network','kind:update'], NULL, false, 141, now() - interval '1 day'),

  ('q4000000-0000-0000-0000-000000000083', 'a2000000-0000-0000-0000-000000000002',
   'Asking the network: solar cold room vs reefer rental for Chaunsa season?',
   'We expect about 1,200 crates this season. A 10-ton solar cold room quotes around 28 lakh built; reefer rental in season runs roughly 9,000/day. Has anyone here run the numbers for a 6-week window? Trying to decide before the harvest starts next week.',
   ARRAY['network','kind:question'], NULL, false, 208, now() - interval '16 hours'),

  ('q4000000-0000-0000-0000-000000000084', 'c3000000-0000-0000-0000-000000000006',
   'Heat stress in buffaloes: the wallowing tank is not optional this month',
   'Three farm calls this week for dropped milk (30%+) that traced back to heat stress, not disease. If your buffaloes do not have wallowing access or shade between 11am–4pm, milk drops are physiological. Cold-water showers twice daily recover 2–3 litres within 48 hours.',
   ARRAY['network','kind:question'], NULL, false, 174, now() - interval '3 days'),

  ('q4000000-0000-0000-0000-000000000085', 'a4000000-0000-0000-0000-000000000051',
   'Milestone: our Aseel dates passed the EU pesticide-residue panel first time',
   'After two seasons of switching to IPM-compatible sprays and keeping spray diaries, our Dhakkan-grade Aseel dates cleared the full EU MRL panel with all 14 parameters well under limits. The discipline was expensive; the market access is worth it. Happy to share our spray calendar.',
   ARRAY['network','kind:achievement'], NULL, false, 322, now() - interval '4 days'),

  ('q4000000-0000-0000-0000-000000000086', 'b2000000-0000-0000-0000-000000000052',
   'Offering: forward purchase contracts for Super Basmati at sowing time',
   'For the coming season we are piloting forward contracts with 10 growers: agreed base price at sowing, quality premium at delivery, and 30% advance on signing. Objective is stable acreage for our EU programme. DM if you grow 1121 in Hafizabad or Kamilia belt.',
   ARRAY['network','kind:offer'], NULL, false, 265, now() - interval '5 days'),

  ('q4000000-0000-0000-0000-000000000087', 's2000000-0000-0000-0000-000000000054',
   'Field data request: mango orchard spray records for post-harvest research',
   'For my MSc thesis on shelf-life extension in Chaunsa, I am looking for orchards willing to share this season’s spray records and allow pre-harvest fruit sampling (2 trees per orchard, non-destructive). Results and shelf-life data shared back with every participating grower.',
   ARRAY['network','kind:question'], NULL, false, 118, now() - interval '8 hours'),

  -- Clinic cases (untagged — appear in Plant/Animal clinics)
  ('q4000000-0000-0000-0000-000000000088', 'a1000000-0000-0000-0000-000000000001',
   'Yellowing lower leaves with brown tips — wheat, 8 acres, Sargodha',
   'Lower leaves yellowing from the tips inward over the past 10 days, patchy distribution across the field, worse in the low-lying corner. Crop is 65 days old, Akbar-19. Last spray was a broadleaf herbicide five weeks ago. Soil is clay-loam, irrigated 12 days ago.',
   ARRAY['Wheat','Yellowing'], NULL, false, 143, now() - interval '2 days'),

  ('q4000000-0000-0000-0000-000000000089', 'a3000000-0000-0000-0000-000000000050',
   'Pink bollworm damage rising in second picking — Bt cotton, Bahawalpur',
   'Finding 2–3 larvae per 25 bolls in the second picking, up from almost none in the first. Rosette flowers visible in patches. Field is Bt-131, sown mid-May. Neighbours report the same. Do I spray now or hold to the threshold?',
   ARRAY['Cotton','Pink Bollworm'], NULL, false, 187, now() - interval '1 day'),

  ('q4000000-0000-0000-0000-000000000090', 'a4000000-0000-0000-0000-000000000051',
   'Black spots on Aseel date fronds — spreading after the rains',
   'Small black lesions on the fronds and fruit stalks, appearing about a week after the late rains. Some bunches are drying from the tip. Orchard is 18 years old, flood-irrigated. No fungicide applied this season.',
   ARRAY['Dates','Fungal'], NULL, false, 92, now() - interval '3 days'),

  ('q4000000-0000-0000-0000-000000000091', 'a3000000-0000-0000-0000-000000000050',
   'Nili-Ravi heifer off feed with mild bloat — urgent advice needed',
   'One 26-month heifer off feed since morning, left flank visibly distended, no rumen movement felt, temperature 101.2°F. She got fresh lucerne plus concentrate this morning, which is routine. Paddocked near the buffalo shed. What should I do before the vet arrives (he is 3 hours out)?',
   ARRAY['Dairy Cattle','Bloat'], NULL, false, 156, now() - interval '9 hours'),

  ('q4000000-0000-0000-0000-000000000092', 'a2000000-0000-0000-0000-000000000002',
   'Mango hopper damage on flowering panicles — Chaunsa, Multan',
   'Hopper nymphs clustering on the panicles, some panicle burn already. Orchard is at 60% flowering. Last year we lost roughly 15% of the set to hoppers. Need a spray recommendation compatible with bees since two hives sit at the orchard edge.',
   ARRAY['Mango','Hoppers'], NULL, false, 134, now() - interval '4 days')
ON CONFLICT (id) DO NOTHING;

-- Clinic + feed comments
INSERT INTO public.problem_comments (id, post_id, profile_id, body, is_solution, upvotes, created_at) VALUES
  ('r4000000-0000-0000-0000-000000000093', 'q4000000-0000-0000-0000-000000000088', 'c1000000-0000-0000-0000-000000000004',
   'The pattern — lower leaves first, worse in low corners — points to nitrogen deficiency amplified by temporary waterlogging in the patchy areas rather than herbicide carry-over (that would show as generalized purpling/stunting). Top-dress 25–30 kg urea per acre on the affected block and re-irrigate lightly; expect recovery colour within 10 days. If the low corner stays wet, cut a drainage notch before the next irrigation.', true, 24, now() - interval '2 days' + interval '5 hours'),

  ('r4000000-0000-0000-0000-000000000094', 'q4000000-0000-0000-0000-000000000089', 'c4000000-0000-0000-0000-000000000053',
   'Two–three larvae per 25 bolls is right at the economic threshold for second picking. Do not blanket-spray yet: install pheromone traps at 5 per acre tonight, and re-check Tuesday. If counts hold above 8 moths per trap per night or boll damage crosses 10%, spray a recommended chemistry in the evening and rotate modes of action. I can send you the scouting sheet — connect with me here.', true, 31, now() - interval '1 day' + interval '4 hours'),

  ('r4000000-0000-0000-0000-000000000091', 'c3000000-0000-0000-0000-000000000006',
   'Until the vet arrives: remove all feed, walk her slowly for 10 minutes every half hour, and give 250–500 ml of plain vegetable oil or a commercial anti-bloat drench if you have it. Do NOT drench fluid forcefully with her head raised — aspiration risk. If the distension is on the LEFT it is likely ruminal; a hard distension on the lower RIGHT could be abomasal and is a genuine emergency.', true, 28, now() - interval '8 hours'),

  ('r4000000-0000-0000-0000-000000000090', 'c1000000-0000-0000-0000-000000000004',
   'That sounds like Graphiola leaf spot or early Diplodia — both flourish after rain on flood-irrigated date palms. Sanitation first: remove and burn the worst fronds. A copper-oxychloride spray at label rate on dry fronds will check the spread; improve basin drainage so humidity does not sit in the canopy overnight.', true, 19, now() - interval '3 days' + interval '6 hours'),

  ('r4000000-0000-0000-0000-000000000083', 'o2000000-0000-0000-0000-000000000055',
   'Ran these numbers for two clients last season: for a 6-week window with 1,200 crates, reefer rental lands near 3.7–4 lakh total versus 28 lakh capex for the solar room. The room wins only if you use it 4+ months a year (dates + mango + veg) or charge neighbours for storage. Happy to share the spreadsheet — connect with me.', false, 22, now() - interval '15 hours'),

  ('r4000000-0000-0000-0000-000000000080', 'a3000000-0000-0000-0000-000000000050',
   '42 maunds on late sowing is strong work. Please do share the numbers — particularly your seed rate and the tillering-irrigation date, I coach growers in Bahawalpur who would benefit.', false, 9, now() - interval '19 hours')
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- PART 7. CONNECTIONS, THREADS, PROPOSALS, NOTIFICATIONS, SAVES
-- ================================================================
INSERT INTO public.connection_requests (id, requester_profile_id, recipient_profile_id, note, status, created_at) VALUES
  ('10000000-0000-0000-0000-000000000101', 'a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004',
   'Dr. Ayesha, I would value your advice on our cooperative’s soil programme this season.', 'accepted', now() - interval '12 days'),
  ('10000000-0000-0000-0000-000000000102', 'a3000000-0000-0000-0000-000000000050', 'c4000000-0000-0000-0000-000000000053',
   'Dr. Faisal, we spoke at the Multan IPM workshop — would like to discuss the 300-acre cluster programme.', 'accepted', now() - interval '9 days'),
  ('10000000-0000-0000-0000-000000000103', 'b2000000-0000-0000-0000-000000000052', 'a1000000-0000-0000-0000-000000000001',
   'Ali sahib, we buy Basmati and wheat in your belt — opening a connection for the coming season.', 'pending', now() - interval '2 days'),
  ('10000000-0000-0000-0000-000000000104', 'a2000000-0000-0000-0000-000000000002', 'o2000000-0000-0000-0000-000000000055',
   'Need your cold-room quotation advice for mango season — saw your feasibility work.', 'pending', now() - interval '1 day'),
  ('10000000-0000-0000-0000-000000000105', 'a1000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000052',
   'Interested in your forward-contract pilot for our cooperative members.', 'pending', now() - interval '6 hours'),
  ('10000000-0000-0000-0000-000000000106', 's2000000-0000-0000-0000-000000000054', 'a2000000-0000-0000-0000-000000000002',
   'Fatima apa, requesting connection for my mango post-harvest research — sampling request posted on the feed.', 'pending', now() - interval '7 hours')
ON CONFLICT (id) DO NOTHING;

-- Threads + messages (uses the renamed sender_profile_id columns)
INSERT INTO public.threads (id, participant_ids, subject, last_message_at, created_at) VALUES
  ('11000000-0000-0000-0000-000000000110', ARRAY['a1000000-0000-0000-0000-000000000001'::uuid, 'c1000000-0000-0000-0000-000000000004'::uuid], 'Soil programme 2026', now() - interval '3 hours', now() - interval '12 days'),
  ('11000000-0000-0000-0000-000000000111', ARRAY['a3000000-0000-0000-0000-000000000050'::uuid, 'c4000000-0000-0000-0000-000000000053'::uuid], 'Cotton cluster IPM', now() - interval '26 hours', now() - interval '9 days'),
  ('11000000-0000-0000-0000-000000000112', ARRAY['b2000000-0000-0000-0000-000000000052'::uuid, 'o2000000-0000-0000-0000-000000000055'::uuid], 'Cold chain for export logistics', now() - interval '2 days', now() - interval '6 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.messages (id, thread_id, sender_profile_id, body, message_type, is_read, created_at) VALUES
  ('12000000-0000-0000-0000-000000000120', '11000000-0000-0000-0000-000000000110', 'a1000000-0000-0000-0000-000000000001',
   'Dr. Ayesha, salaam. The cooperative has approved the sampling budget — when can your team start Depalpur?', 'text', true, now() - interval '11 days'),
  ('12000000-0000-0000-0000-000000000121', '11000000-0000-0000-0000-000000000110', 'c1000000-0000-0000-0000-000000000004',
   'Walaikum salaam. My team can begin Monday. Please share the field map with the 22 member boundaries marked — composite samples go per field, not per member.', 'text', true, now() - interval '11 days' + interval '2 hours'),
  ('12000000-0000-0000-0000-000000000122', '11000000-0000-0000-0000-000000000110', 'a1000000-0000-0000-0000-000000000001',
   'Map attached in the group file — 200 acres across 22 fields. Two fields were sunflower last year; flag those separately please.', 'text', true, now() - interval '5 days'),
  ('12000000-0000-0000-0000-000000000123', '11000000-0000-0000-0000-000000000110', 'c1000000-0000-0000-0000-000000000004',
   'Noted — sunflower history changes the boron recommendation. Draft fertility maps by Thursday; we can review the fertiliser plan on a call after that.', 'text', false, now() - interval '3 hours'),

  ('12000000-0000-0000-0000-000000000124', '11000000-0000-0000-0000-000000000111', 'a3000000-0000-0000-0000-000000000050',
   'Dr. Faisal, second picking larval counts are up — 2 to 3 per 25 bolls. RFP for the cluster programme is live on the platform.', 'text', true, now() - interval '2 days'),
  ('12000000-0000-0000-0000-000000000125', '11000000-0000-0000-0000-000000000111', 'c4000000-0000-0000-0000-000000000053',
   'Seen — I replied on the case thread too. Get pheromone traps in tonight; I will submit the proposal for the 300-acre programme before Friday.', 'text', true, now() - interval '26 hours'),

  ('12000000-0000-0000-0000-000000000126', '11000000-0000-0000-0000-000000000112', 'b2000000-0000-0000-0000-000000000052',
   'Salaam — we need 40-ft reefer pre-cooling at the farm gate for the EU Basmati lots. Does GreenTech assemble pre-cool rooms?', 'text', true, now() - interval '6 days'),
  ('12000000-0000-0000-0000-000000000127', '11000000-0000-0000-0000-000000000112', 'o2000000-0000-0000-0000-000000000055',
   'We do — 10 and 20-ton pre-cool rooms with humidity control, commissioned in 3 weeks. Sending the spec sheet; a site visit in Karachi can be arranged next week.', 'text', true, now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- Consultant proposals on the live RFP board
INSERT INTO public.project_proposals (id, project_id, profile_id, cover_note, quoted_amount, status, created_at) VALUES
  ('13000000-0000-0000-0000-000000000130', 'p4000000-0000-0000-0000-000000000070', 'c2000000-0000-0000-0000-000000000005',
   '17 years in agricultural water engineering including 40+ diesel-to-solar conversions in the Jhang-Toba Tek Singh belt. My proposal covers a two-visit site survey, hydraulic load calc for the 12 CUSEC duty, 13 kW array sizing with 25% headroom, and turnkey commissioning with a 2-year O&M schedule. My previous Jhang conversion (11 CUSEC, 130 ft) is drawing at 96% of projected output after 14 months — reference available.',
   980000, 'pending', now() - interval '3 days'),
  ('13000000-0000-0000-0000-000000000131', 'p4000000-0000-0000-0000-000000000072', 'c4000000-0000-0000-0000-000000000053',
   'IPM specialist across the south-Punjab cotton belt — I currently run scouting networks on 1,400 acres around Hasilpur and Rahim Yar Khan. For your 300-acre cluster: weekly scouting rota with 2 trained scouts, pheromone-trap network (5/acre), ETL-based advisories within 12 hours of each scout round, and a season-end resistance report with spray-diary audit. My Bt-131 clients averaged 1.8 sprays last season against the area norm of 4+.',
   385000, 'shortlisted', now() - interval '1 day'),
  ('13000000-0000-0000-0000-000000000132', 'p4000000-0000-0000-0000-000000000073', 'c1000000-0000-0000-0000-000000000004',
   'I led the design of two 150+ ton date cold stores in Khairpur and can deliver your feasibility in 5 weeks: CA vs NA trial data for Aseel, load modelling for a 200-ton store, vendor shortlist with landed costs, and a 5-year cash-flow model at three price scenarios. Site visit in Hyderabad in week 1 included.',
   300000, 'pending', now() - interval '2 days'),
  ('13000000-0000-0000-0000-000000000133', 'p4000000-0000-0000-0000-000000000074', 'c2000000-0000-0000-0000-000000000005',
   'Handled EU-bound Basmati documentation for three export houses since 2019 — 60+ shipments with zero MRL rejections. The audit covers the full pack: SPS workflow, phytosanitary traceability to farm lots, MRL declarations against EU 2023 limits, and labelling review. I work with your Karachi clearing agent directly to pre-clear the file before vessel booking.',
   145000, 'pending', now() - interval '2 days'),
  ('13000000-0000-0000-0000-000000000134', 'p4000000-0000-0000-0000-000000000076', 'c3000000-0000-0000-0000-000000000006',
   'Dairy nutrition practice focused on Nili-Ravi herds 40–120 head. Full audit: fodder mapping across seasons, ration balancing for the 8–10 litre window using your own fodder analysis (I bring the sampling kits), mineral programme, and BCS schedule with pictorial guides for your herder. Twelve-month feeding calendar delivered in Urdu and English.',
   220000, 'pending', now() - interval '18 hours')
ON CONFLICT (id) DO NOTHING;

-- Notifications for the primary demo member (deep-linked via action_url)
INSERT INTO public.notifications (id, profile_id, type, title, body, action_url, is_read, metadata, created_at) VALUES
  ('14000000-0000-0000-0000-000000000140', 'a1000000-0000-0000-0000-000000000001', 'new_message',
   'New Message', 'Dr. Ayesha Noor: Draft fertility maps by Thursday; we can review the…', '/messages', false,
   '{"thread_id":"11000000-0000-0000-0000-000000000110"}'::jsonb, now() - interval '3 hours'),
  ('14000000-0000-0000-0000-000000000141', 'a1000000-0000-0000-0000-000000000001', 'problem_reply',
   'New reply on your post', 'Dr. Ayesha Noor replied to your wheat yellowing case in the Plant Clinic.', '/apps/plant-clinic', false,
   '{"post_id":"q4000000-0000-0000-0000-000000000088"}'::jsonb, now() - interval '2 days'),
  ('14000000-0000-0000-0000-000000000142', 'a1000000-0000-0000-0000-000000000001', 'system',
   'Connection request received', 'Sheikh Rice Exports wants to connect with you for the coming season.', '/profile/b2000000-0000-0000-0000-000000000052', false,
   '{}'::jsonb, now() - interval '2 days'),
  ('14000000-0000-0000-0000-000000000143', 'a1000000-0000-0000-0000-000000000001', 'system',
   'Proposal received on your RFP', 'Your soil-testing RFP received interest — open the project to review.', '/projects/p4000000-0000-0000-0000-000000000071', true,
   '{"project_id":"p4000000-0000-0000-0000-000000000071"}'::jsonb, now() - interval '5 days'),
  ('14000000-0000-0000-0000-000000000144', 'a1000000-0000-0000-0000-000000000001', 'problem_reply',
   'Your post is getting attention', 'GreenTech Agri Solutions replied to your cold-room question.', '/feed', true,
   '{"post_id":"q4000000-0000-0000-0000-000000000083"}'::jsonb, now() - interval '15 hours'),
  ('14000000-0000-0000-0000-000000000145', 'a1000000-0000-0000-0000-000000000001', 'system',
   'Mandi board updated', 'Wheat at Sargodha held at Rs 4,300/40kg today; Urea up 1% in Faisalabad.', '/rates', true,
   '{}'::jsonb, now() - interval '7 hours')
ON CONFLICT (id) DO NOTHING;

-- A few saved items for the primary demo member
INSERT INTO public.saved_items (profile_id, listing_id, project_id, created_at) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000065', NULL, now() - interval '2 days'),
  ('a1000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000069', NULL, now() - interval '3 days'),
  ('a1000000-0000-0000-0000-000000000001', NULL, 'p4000000-0000-0000-0000-000000000070', now() - interval '1 day')
ON CONFLICT DO NOTHING;

-- ================================================================
-- Done. Suggested demo login (create in Authentication → Users and
-- map the profile row to that auth UUID if you want to sign in as
-- the primary demo member):
--   ali.hassan.farmer@agribiz.demo  →  profile a1000000-…-0001
-- ================================================================

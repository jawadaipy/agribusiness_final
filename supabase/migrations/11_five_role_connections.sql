-- ============================================================================
-- AgriBusiness — Migration 11: Five Roles & Consented Connection Contact
-- Apply after 09_role_dashboard_security.sql and 10_production_governance.sql.
-- ============================================================================

-- Buyer represents Buyer, Trader, and Miller in a single accountable role.
ALTER TYPE public.user_type ADD VALUE IF NOT EXISTS 'buyer';

-- ---------------------------------------------------------------------------
-- 1. Buyer/Trader/Miller profile
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.buyer_profiles (
  profile_id          UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_name   TEXT,
  commodities         TEXT[] NOT NULL DEFAULT '{}',
  grades              TEXT[] NOT NULL DEFAULT '{}',
  procurement_regions TEXT[] NOT NULL DEFAULT '{}',
  expected_volume     TEXT,
  logistics_notes     TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.buyer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer_profiles:select:own_or_admin" ON public.buyer_profiles FOR SELECT
  USING (auth.uid() = profile_id OR public.get_my_role()::text = 'admin');
CREATE POLICY "buyer_profiles:write:self" ON public.buyer_profiles FOR ALL
  USING (auth.uid() = profile_id OR public.get_my_role()::text = 'admin')
  WITH CHECK ((auth.uid() = profile_id AND public.get_my_role()::text = 'buyer') OR public.get_my_role()::text = 'admin');

-- ---------------------------------------------------------------------------
-- 2. Private, explicit contact-sharing preferences.
-- Existing members remain private by default. A member must opt in on profile
-- settings before their method is returned to an accepted connection.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profile_private
  ADD COLUMN IF NOT EXISTS share_email_with_connections BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_phone_with_connections BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_accepted_connection_contact(p_other_profile_id UUID)
RETURNS TABLE(email TEXT, phone TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR p_other_profile_id IS NULL OR p_other_profile_id = auth.uid() THEN
    RAISE EXCEPTION 'A distinct authenticated connection is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.connection_requests
    WHERE status = 'accepted'
      AND (
        (requester_profile_id = auth.uid() AND recipient_profile_id = p_other_profile_id)
        OR (recipient_profile_id = auth.uid() AND requester_profile_id = p_other_profile_id)
      )
  ) THEN
    RAISE EXCEPTION 'An accepted connection is required to request contact details';
  END IF;

  RETURN QUERY
  SELECT
    CASE WHEN pp.share_email_with_connections THEN pp.email ELSE NULL END,
    CASE WHEN pp.share_phone_with_connections THEN pp.phone ELSE NULL END
  FROM public.profile_private pp
  WHERE pp.profile_id = p_other_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_accepted_connection_contact(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_accepted_connection_contact(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Buyer is valid at signup and receives a private role-detail row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  requested_type TEXT;
  safe_type public.user_type;
  requested_keywords JSONB;
BEGIN
  requested_type := NEW.raw_user_meta_data ->> 'user_type';
  safe_type := CASE
    WHEN requested_type IN ('student', 'company', 'consultant', 'farmer', 'buyer')
      THEN requested_type::public.user_type
    ELSE 'farmer'::public.user_type
  END;

  INSERT INTO public.profiles (id, email, full_name, user_type, city, trial_ends_at, subscription_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    safe_type,
    NULLIF(NEW.raw_user_meta_data ->> 'city', ''),
    now() + INTERVAL '7 days',
    'trial'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profile_private (profile_id, email, phone)
  VALUES (NEW.id, NEW.email, NULLIF(NEW.raw_user_meta_data ->> 'phone', ''))
  ON CONFLICT (profile_id) DO UPDATE
  SET email = EXCLUDED.email, phone = EXCLUDED.phone, updated_at = now();

  IF safe_type::text = 'student' THEN
    INSERT INTO public.student_profiles (profile_id, research_interests) VALUES (NEW.id, ARRAY[]::TEXT[]) ON CONFLICT (profile_id) DO NOTHING;
  ELSIF safe_type::text = 'farmer' THEN
    INSERT INTO public.farmer_profiles (profile_id, crops) VALUES (NEW.id, ARRAY[]::TEXT[]) ON CONFLICT (profile_id) DO NOTHING;
  ELSIF safe_type::text = 'buyer' THEN
    INSERT INTO public.buyer_profiles (profile_id, commodities) VALUES (NEW.id, ARRAY[]::TEXT[]) ON CONFLICT (profile_id) DO NOTHING;
  ELSIF safe_type::text = 'consultant' THEN
    INSERT INTO public.consultant_profiles (profile_id, services) VALUES (NEW.id, ARRAY[]::TEXT[]) ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  requested_keywords := CASE WHEN jsonb_typeof(NEW.raw_user_meta_data -> 'keywords') = 'array' THEN NEW.raw_user_meta_data -> 'keywords' ELSE '[]'::jsonb END;
  INSERT INTO public.profile_keywords (profile_id, keyword)
  SELECT NEW.id, keyword FROM jsonb_array_elements_text(requested_keywords) AS keyword
  WHERE char_length(keyword) BETWEEN 1 AND 100
  ON CONFLICT (profile_id, keyword) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Buyer is allowed to publish procurement requirements, but cannot publish
-- producer/company/consultant marketplace offers.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "projects:insert:farmer_or_company" ON public.projects;
CREATE POLICY "projects:insert:farmer_buyer_or_company" ON public.projects FOR INSERT
  WITH CHECK (
    auth.uid() = profile_id
    AND public.get_my_role()::text IN ('farmer', 'buyer', 'company')
    AND status = 'open'
  );

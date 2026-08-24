-- ============================================================================
-- AgriBusiness — Migration 14: Role-aware onboarding and sector targeting
-- Persists the information collected during signup into the correct profile
-- surface, so new accounts are useful to search, matching and ad delivery.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_discipline TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_primary_discipline
  ON public.profiles(primary_discipline)
  WHERE is_active = true;

-- The directory deliberately contains no private contact or billing data.
CREATE OR REPLACE VIEW public.directory_profiles AS
SELECT
  id, user_type, COALESCE(display_name, full_name, 'AgriBusiness Member') AS display_name,
  bio, avatar_url, city, province, location, website, primary_discipline,
  is_verified, rating, rating_count
FROM public.profiles
WHERE is_active = true;

GRANT SELECT ON public.directory_profiles TO anon, authenticated;

-- Replace the signup trigger with a version that validates all client metadata
-- and initializes exactly one role-specific profile. The metadata remains only
-- an input: authority, trial dates, verification and moderation stay server-managed.
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  requested_type TEXT;
  safe_type public.user_type;
  requested_keywords JSONB;
  role_profile JSONB;
  tag_values TEXT[];
BEGIN
  requested_type := NEW.raw_user_meta_data ->> 'user_type';
  safe_type := CASE
    WHEN requested_type IN ('student', 'company', 'consultant', 'farmer', 'buyer')
      THEN requested_type::public.user_type
    ELSE 'farmer'::public.user_type
  END;
  requested_keywords := CASE WHEN jsonb_typeof(NEW.raw_user_meta_data -> 'keywords') = 'array'
    THEN NEW.raw_user_meta_data -> 'keywords' ELSE '[]'::jsonb END;
  role_profile := CASE WHEN jsonb_typeof(NEW.raw_user_meta_data -> 'role_profile') = 'object'
    THEN NEW.raw_user_meta_data -> 'role_profile' ELSE '{}'::jsonb END;
  tag_values := ARRAY(
    SELECT value FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(role_profile -> 'tags') = 'array' THEN role_profile -> 'tags' ELSE '[]'::jsonb END) AS value
    WHERE char_length(value) BETWEEN 1 AND 100
  );

  INSERT INTO public.profiles (id, email, full_name, user_type, city, primary_discipline, trial_ends_at, subscription_status)
  VALUES (
    NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), safe_type,
    NULLIF(NEW.raw_user_meta_data ->> 'city', ''), NULLIF(NEW.raw_user_meta_data ->> 'primary_discipline', ''),
    now() + INTERVAL '7 days', 'trial'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profile_private (profile_id, email, phone)
  VALUES (NEW.id, NEW.email, NULLIF(NEW.raw_user_meta_data ->> 'phone', ''))
  ON CONFLICT (profile_id) DO UPDATE SET email = EXCLUDED.email, phone = EXCLUDED.phone, updated_at = now();

  IF safe_type::text = 'student' THEN
    INSERT INTO public.student_profiles (profile_id, institution, programme, research_interests)
    VALUES (NEW.id, NULLIF(role_profile ->> 'first', ''), NULLIF(role_profile ->> 'second', ''), tag_values)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF safe_type::text = 'farmer' THEN
    INSERT INTO public.farmer_profiles (profile_id, farm_name, crops)
    VALUES (NEW.id, NULLIF(role_profile ->> 'first', ''), tag_values)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF safe_type::text = 'buyer' THEN
    INSERT INTO public.buyer_profiles (profile_id, organization_name, expected_volume, commodities)
    VALUES (NEW.id, NULLIF(role_profile ->> 'first', ''), NULLIF(role_profile ->> 'second', ''), tag_values)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF safe_type::text = 'consultant' THEN
    INSERT INTO public.consultant_profiles (profile_id, degree, years_experience, services, technologies)
    VALUES (
      NEW.id, NULLIF(role_profile ->> 'first', ''),
      CASE WHEN (role_profile ->> 'second') ~ '^\\d+$' THEN (role_profile ->> 'second')::INTEGER ELSE NULL END,
      tag_values, tag_values
    ) ON CONFLICT (profile_id) DO NOTHING;
  ELSIF safe_type::text = 'company' THEN
    INSERT INTO public.organizations (owner_profile_id, legal_name, registration_no, services, technologies, city)
    VALUES (
      NEW.id, COALESCE(NULLIF(role_profile ->> 'first', ''), COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'AgriBusiness Company')),
      NULLIF(role_profile ->> 'second', ''), tag_values, tag_values, NULLIF(NEW.raw_user_meta_data ->> 'city', '')
    ) ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.profile_keywords (profile_id, keyword)
  SELECT NEW.id, keyword FROM jsonb_array_elements_text(requested_keywords) AS keyword
  WHERE char_length(keyword) BETWEEN 1 AND 100
  ON CONFLICT (profile_id, keyword) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Explicit annual plan; monthly plans already exist. Weekly delivery rotation
-- remains automated by rotate_ads() and is independent of plan duration.
INSERT INTO public.ad_plans (id, name, description, price_pkr, duration_days, placement_type, max_impressions, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000004', 'Annual Sponsored Presence',
  'A full-year category and location-targeted sponsored placement with weekly rotation and admin approval.',
  249999.00, 365, 'sponsored', NULL, true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, price_pkr = EXCLUDED.price_pkr,
  duration_days = EXCLUDED.duration_days, placement_type = EXCLUDED.placement_type,
  max_impressions = EXCLUDED.max_impressions, is_active = EXCLUDED.is_active;

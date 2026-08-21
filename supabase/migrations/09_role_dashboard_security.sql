-- ================================================================
-- AgriBusiness — Migration 09: Role Dashboard Security & Data Model
-- New migration only: do not edit previously applied migrations.
-- Apply first in a staging Supabase project, then run the test plan.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Normalize the dashboard role contract and add role-detail types
-- ----------------------------------------------------------------
UPDATE public.profiles SET user_type = 'company' WHERE user_type = 'org';

DO $$
BEGIN
  CREATE TYPE public.organization_member_role AS ENUM ('owner', 'manager', 'editor', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.proposal_status AS ENUM ('pending', 'shortlisted', 'rejected', 'accepted', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.connection_status AS ENUM ('pending', 'accepted', 'declined', 'blocked', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------
-- 2. Separate private profile data from the public directory surface
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_private (
  profile_id  UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.profile_private (profile_id, email, phone)
SELECT id, email, phone FROM public.profiles
ON CONFLICT (profile_id) DO UPDATE
SET email = EXCLUDED.email, phone = EXCLUDED.phone, updated_at = now();

ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_private:select:own_or_admin" ON public.profile_private;
CREATE POLICY "profile_private:select:own_or_admin"
  ON public.profile_private FOR SELECT
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "profile_private:update:own_or_admin" ON public.profile_private;
CREATE POLICY "profile_private:update:own_or_admin"
  ON public.profile_private FOR UPDATE
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin')
  WITH CHECK (auth.uid() = profile_id OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "profile_private:insert:self_or_admin" ON public.profile_private;
CREATE POLICY "profile_private:insert:self_or_admin"
  ON public.profile_private FOR INSERT
  WITH CHECK (auth.uid() = profile_id OR public.get_my_role() = 'admin');

-- Public pages use this view instead of public.profiles. It intentionally
-- excludes email, phone, subscription, trial, active-state, and internal data.
CREATE OR REPLACE VIEW public.directory_profiles AS
SELECT
  id,
  user_type,
  COALESCE(display_name, full_name, 'AgriBusiness Member') AS display_name,
  bio,
  avatar_url,
  city,
  province,
  location,
  website,
  is_verified,
  rating,
  rating_count
FROM public.profiles
WHERE is_active = true;

GRANT SELECT ON public.directory_profiles TO anon, authenticated;

DROP POLICY IF EXISTS "profiles:select:public" ON public.profiles;
DROP POLICY IF EXISTS "profiles:select:own_or_admin" ON public.profiles;
CREATE POLICY "profiles:select:own_or_admin"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.get_my_role() = 'admin');

-- ----------------------------------------------------------------
-- 3. Prevent members from modifying authorization and billing fields
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_system_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF auth.uid() = OLD.id AND COALESCE(public.get_my_role()::text, '') <> 'admin' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.user_type IS DISTINCT FROM OLD.user_type
       OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
       OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.rating_count IS DISTINCT FROM OLD.rating_count THEN
      RAISE EXCEPTION 'System-managed profile fields cannot be changed by a member';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_system_fields ON public.profiles;
CREATE TRIGGER trg_guard_profile_system_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_system_fields();

DROP POLICY IF EXISTS "profiles:update:self_or_admin" ON public.profiles;
CREATE POLICY "profiles:update:self_or_admin"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.get_my_role() = 'admin')
  WITH CHECK (auth.uid() = id OR public.get_my_role() = 'admin');

-- ----------------------------------------------------------------
-- 4. Role-detail tables and real dashboard workflow entities
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_profiles (
  profile_id             UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution            TEXT,
  programme              TEXT,
  degree                 TEXT,
  expected_graduation_at DATE,
  research_interests     TEXT[] NOT NULL DEFAULT '{}',
  portfolio_url          TEXT,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.farmer_profiles (
  profile_id        UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  farm_name         TEXT,
  acreage           NUMERIC(12,2) CHECK (acreage IS NULL OR acreage >= 0),
  crops             TEXT[] NOT NULL DEFAULT '{}',
  livestock         TEXT[] NOT NULL DEFAULT '{}',
  farm_location     TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.consultant_profiles (
  profile_id        UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  degree            TEXT,
  years_experience  INTEGER CHECK (years_experience IS NULL OR years_experience >= 0),
  services          TEXT[] NOT NULL DEFAULT '{}',
  technologies      TEXT[] NOT NULL DEFAULT '{}',
  availability      TEXT,
  rate_from_pkr     NUMERIC(12,2) CHECK (rate_from_pkr IS NULL OR rate_from_pkr >= 0),
  credential_status TEXT NOT NULL DEFAULT 'unverified' CHECK (credential_status IN ('unverified', 'pending', 'verified', 'rejected')),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organizations (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_profile_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  legal_name         TEXT NOT NULL,
  display_name       TEXT,
  registration_no    TEXT,
  website            TEXT,
  description        TEXT,
  services           TEXT[] NOT NULL DEFAULT '{}',
  technologies       TEXT[] NOT NULL DEFAULT '{}',
  city               TEXT,
  province           TEXT,
  is_verified        BOOLEAN NOT NULL DEFAULT false,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_role     public.organization_member_role NOT NULL DEFAULT 'viewer',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.project_proposals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cover_note    TEXT NOT NULL CHECK (char_length(cover_note) BETWEEN 20 AND 5000),
  quoted_amount NUMERIC(15,2) CHECK (quoted_amount IS NULL OR quoted_amount >= 0),
  status        public.proposal_status NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.connection_requests (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note                 TEXT CHECK (char_length(note) <= 1000),
  status               public.connection_status NOT NULL DEFAULT 'pending',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT connection_not_self CHECK (requester_profile_id <> recipient_profile_id),
  UNIQUE (requester_profile_id, recipient_profile_id)
);

CREATE TABLE IF NOT EXISTS public.saved_items (
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id  UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT saved_item_has_one_target CHECK ((listing_id IS NOT NULL)::int + (project_id IS NOT NULL)::int = 1),
  UNIQUE NULLS NOT DISTINCT (profile_id, listing_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations(owner_profile_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_profile ON public.organization_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_project_proposals_project ON public.project_proposals(project_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connection_requests_recipient ON public.connection_requests(recipient_profile_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_items_profile ON public.saved_items(profile_id, created_at DESC);

-- ----------------------------------------------------------------
-- 5. RLS for role-detail and dashboard workflow tables
-- ----------------------------------------------------------------
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_owner(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = p_organization_id AND owner_profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND profile_id = auth.uid()
  );
$$;

CREATE POLICY "student_profiles:select:own_or_admin" ON public.student_profiles FOR SELECT
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin');
CREATE POLICY "student_profiles:write:self" ON public.student_profiles FOR ALL
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin')
  WITH CHECK ((auth.uid() = profile_id AND public.get_my_role() = 'student') OR public.get_my_role() = 'admin');

CREATE POLICY "farmer_profiles:select:own_or_admin" ON public.farmer_profiles FOR SELECT
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin');
CREATE POLICY "farmer_profiles:write:self" ON public.farmer_profiles FOR ALL
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin')
  WITH CHECK ((auth.uid() = profile_id AND public.get_my_role() = 'farmer') OR public.get_my_role() = 'admin');

CREATE POLICY "consultant_profiles:select:own_or_admin" ON public.consultant_profiles FOR SELECT
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin');
CREATE POLICY "consultant_profiles:write:self" ON public.consultant_profiles FOR ALL
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin')
  WITH CHECK ((auth.uid() = profile_id AND public.get_my_role() = 'consultant') OR public.get_my_role() = 'admin');

CREATE POLICY "organizations:select:public_active" ON public.organizations FOR SELECT
  USING (is_active = true OR public.is_org_owner(id) OR public.get_my_role() = 'admin');
CREATE POLICY "organizations:insert:company_owner" ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_profile_id AND public.get_my_role() = 'company');
CREATE POLICY "organizations:update:owner_or_admin" ON public.organizations FOR UPDATE
  USING (public.is_org_owner(id) OR public.get_my_role() = 'admin')
  WITH CHECK (public.is_org_owner(id) OR public.get_my_role() = 'admin');

CREATE POLICY "organization_members:select:member_owner_or_admin" ON public.organization_members FOR SELECT
  USING (profile_id = auth.uid() OR public.is_org_owner(organization_id) OR public.get_my_role() = 'admin');
CREATE POLICY "organization_members:insert:owner_or_admin" ON public.organization_members FOR INSERT
  WITH CHECK (public.is_org_owner(organization_id) OR public.get_my_role() = 'admin');
CREATE POLICY "organization_members:update:owner_or_admin" ON public.organization_members FOR UPDATE
  USING (public.is_org_owner(organization_id) OR public.get_my_role() = 'admin')
  WITH CHECK (public.is_org_owner(organization_id) OR public.get_my_role() = 'admin');
CREATE POLICY "organization_members:delete:owner_or_admin" ON public.organization_members FOR DELETE
  USING (public.is_org_owner(organization_id) OR public.get_my_role() = 'admin');

CREATE POLICY "project_proposals:select:proposer_project_owner_or_admin" ON public.project_proposals FOR SELECT
  USING (profile_id = auth.uid() OR public.is_project_owner(project_id) OR public.get_my_role() = 'admin');
CREATE POLICY "project_proposals:insert:consultant_self" ON public.project_proposals FOR INSERT
  WITH CHECK (profile_id = auth.uid() AND public.get_my_role() = 'consultant');
CREATE POLICY "project_proposals:update:proposer_or_project_owner" ON public.project_proposals FOR UPDATE
  USING ((profile_id = auth.uid() AND status = 'pending') OR public.is_project_owner(project_id) OR public.get_my_role() = 'admin')
  WITH CHECK ((profile_id = auth.uid() AND status IN ('pending', 'withdrawn')) OR public.is_project_owner(project_id) OR public.get_my_role() = 'admin');

CREATE POLICY "connections:select:parties_or_admin" ON public.connection_requests FOR SELECT
  USING (auth.uid() IN (requester_profile_id, recipient_profile_id) OR public.get_my_role() = 'admin');
CREATE POLICY "connections:insert:requester" ON public.connection_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_profile_id AND status = 'pending');
CREATE POLICY "connections:update:recipient_or_requester" ON public.connection_requests FOR UPDATE
  USING (auth.uid() IN (requester_profile_id, recipient_profile_id) OR public.get_my_role() = 'admin')
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (auth.uid() = requester_profile_id AND status = 'withdrawn')
    OR (auth.uid() = recipient_profile_id AND status IN ('accepted', 'declined', 'blocked'))
  );

CREATE POLICY "saved_items:select:own" ON public.saved_items FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "saved_items:insert:own" ON public.saved_items FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "saved_items:delete:own" ON public.saved_items FOR DELETE USING (auth.uid() = profile_id);

-- ----------------------------------------------------------------
-- 6. Restrict published content and client-controlled financial state
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "listings:select:public" ON public.listings;
CREATE POLICY "listings:select:active_or_owner_or_admin" ON public.listings FOR SELECT
  USING (status = 'active' OR auth.uid() = profile_id OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "listings:insert:owner" ON public.listings;
CREATE POLICY "listings:insert:producer_company_or_consultant" ON public.listings FOR INSERT
  WITH CHECK (
    auth.uid() = profile_id
    AND public.get_my_role() IN ('farmer', 'company', 'consultant')
    AND status IN ('draft', 'active')
    AND is_featured = false
    AND view_count = 0
  );

CREATE OR REPLACE FUNCTION public.guard_listing_member_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF auth.uid() = OLD.profile_id AND COALESCE(public.get_my_role()::text, '') <> 'admin' THEN
    IF NEW.profile_id IS DISTINCT FROM OLD.profile_id
       OR NEW.is_featured IS DISTINCT FROM OLD.is_featured
       OR NEW.view_count IS DISTINCT FROM OLD.view_count THEN
      RAISE EXCEPTION 'Listing ownership and promotion fields are system-managed';
    END IF;

    IF NEW.status NOT IN ('draft', 'active', 'sold') THEN
      RAISE EXCEPTION 'Members may only set a listing to draft, active, or sold';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_listing_member_fields ON public.listings;
CREATE TRIGGER trg_guard_listing_member_fields
BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.guard_listing_member_fields();

DROP POLICY IF EXISTS "classifieds:select:public" ON public.classifieds;
CREATE POLICY "classifieds:select:active_or_owner_or_admin" ON public.classifieds FOR SELECT
  USING (status = 'active' OR auth.uid() = profile_id OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "projects:select:public" ON public.projects;
CREATE POLICY "projects:select:open_or_owner_or_admin" ON public.projects FOR SELECT
  USING (status = 'open' OR auth.uid() = profile_id OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "projects:insert:owner" ON public.projects;
CREATE POLICY "projects:insert:farmer_or_company" ON public.projects FOR INSERT
  WITH CHECK (
    auth.uid() = profile_id
    AND public.get_my_role() IN ('farmer', 'company')
    AND status = 'open'
  );

DROP POLICY IF EXISTS "profile_keywords:select:public" ON public.profile_keywords;
CREATE POLICY "profile_keywords:select:own_or_admin" ON public.profile_keywords FOR SELECT
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "subscriptions:insert:own" ON public.subscriptions;
DROP POLICY IF EXISTS "payments:insert:own" ON public.payments;

DROP POLICY IF EXISTS "ads:insert:owner" ON public.ads;
CREATE POLICY "ads:insert:pending_owner" ON public.ads FOR INSERT
  WITH CHECK (
    auth.uid() = profile_id
    AND status = 'pending'
    AND starts_at IS NULL
    AND ends_at IS NULL
    AND rotation_order IS NULL
    AND impression_count = 0
    AND click_count = 0
    AND rejection_reason IS NULL
  );

CREATE OR REPLACE FUNCTION public.guard_ad_member_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF auth.uid() = OLD.profile_id AND COALESCE(public.get_my_role()::text, '') <> 'admin' THEN
    IF NEW.profile_id IS DISTINCT FROM OLD.profile_id
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
       OR NEW.ends_at IS DISTINCT FROM OLD.ends_at
       OR NEW.rotation_order IS DISTINCT FROM OLD.rotation_order
       OR NEW.impression_count IS DISTINCT FROM OLD.impression_count
       OR NEW.click_count IS DISTINCT FROM OLD.click_count
       OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
      RAISE EXCEPTION 'Campaign moderation and delivery fields are system-managed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_ad_member_fields ON public.ads;
CREATE TRIGGER trg_guard_ad_member_fields
BEFORE UPDATE ON public.ads
FOR EACH ROW EXECUTE FUNCTION public.guard_ad_member_fields();

-- Restrict direct table reads of raw matching inputs, but retain the safe
-- match_profiles RPC output for authenticated clients.
REVOKE EXECUTE ON FUNCTION public.match_profiles(vector, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_profiles(vector, text, integer, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_trials() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rotate_ads() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_trials() TO service_role;
GRANT EXECUTE ON FUNCTION public.rotate_ads() TO service_role;

-- ----------------------------------------------------------------
-- 7. Narrow direct reads of private storage objects
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "problem_media:select:authenticated" ON storage.objects;
CREATE POLICY "problem_media:select:owner_or_admin" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'problem-media'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.get_my_role() = 'admin')
  );

DROP POLICY IF EXISTS "chat_attachments:select:authenticated" ON storage.objects;
CREATE POLICY "chat_attachments:select:owner_or_admin" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-attachments'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.get_my_role() = 'admin')
  );

-- Conversation recipients should receive signed URLs from an Edge Function
-- after it verifies is_thread_participant(thread_id). Do not expose bucket-wide
-- authenticated SELECT access.

-- ----------------------------------------------------------------
-- 8. Upgrade the signup trigger to persist safe role and profile metadata
-- ----------------------------------------------------------------
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
    WHEN requested_type IN ('student', 'company', 'consultant', 'farmer')
    THEN requested_type::public.user_type
    ELSE 'farmer'::public.user_type
  END;

  INSERT INTO public.profiles (
    id, email, full_name, user_type, city, trial_ends_at, subscription_status
  ) VALUES (
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

  IF safe_type = 'student' THEN
    INSERT INTO public.student_profiles (profile_id, research_interests)
    VALUES (NEW.id, ARRAY[]::TEXT[]) ON CONFLICT (profile_id) DO NOTHING;
  ELSIF safe_type = 'farmer' THEN
    INSERT INTO public.farmer_profiles (profile_id, crops)
    VALUES (NEW.id, ARRAY[]::TEXT[]) ON CONFLICT (profile_id) DO NOTHING;
  ELSIF safe_type = 'consultant' THEN
    INSERT INTO public.consultant_profiles (profile_id, services)
    VALUES (NEW.id, ARRAY[]::TEXT[]) ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  requested_keywords := CASE
    WHEN jsonb_typeof(NEW.raw_user_meta_data -> 'keywords') = 'array'
      THEN NEW.raw_user_meta_data -> 'keywords'
    ELSE '[]'::jsonb
  END;

  INSERT INTO public.profile_keywords (profile_id, keyword)
  SELECT NEW.id, keyword
  FROM jsonb_array_elements_text(requested_keywords) AS keyword
  WHERE char_length(keyword) BETWEEN 1 AND 100
  ON CONFLICT (profile_id, keyword) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------
-- 9. Dashboard query indexes
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_directory_profiles_role_location
  ON public.profiles(user_type, city, province)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_student_profiles_interests ON public.student_profiles USING GIN(research_interests);
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_crops ON public.farmer_profiles USING GIN(crops);
CREATE INDEX IF NOT EXISTS idx_consultant_profiles_services ON public.consultant_profiles USING GIN(services);

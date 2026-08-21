-- ================================================================
-- AgriBusiness — Feature Migrations
-- Run this AFTER the main COMPLETE_DATABASE_SETUP.sql
-- Add these tables if they don't yet exist in your Supabase project.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. NOTIFICATIONS TABLE
--    Stores in-app alerts per profile (connection requests, proposals, etc.)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id   UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type         TEXT         NOT NULL DEFAULT 'system',
  title        TEXT         NOT NULL,
  body         TEXT,
  action_url   TEXT,
  is_read      BOOLEAN      NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_profile_id
  ON public.notifications (profile_id, created_at DESC);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users see own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY IF NOT EXISTS "Users update own notifications (mark read)"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = profile_id);

-- Service role can insert (for Edge Functions and triggers)
CREATE POLICY IF NOT EXISTS "Service role inserts notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- ----------------------------------------------------------------
-- 2. RATINGS & REVIEWS TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ratings (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id     UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id      UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating          SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review          TEXT,
  context         TEXT,        -- 'connection', 'listing', 'project'
  reference_id    UUID,        -- ID of the listing/project that prompted the review
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (reviewer_id, subject_id, context, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_subject_id ON public.ratings (subject_id);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can read ratings"
  ON public.ratings FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Logged-in users can submit ratings"
  ON public.ratings FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- Trigger: update profiles.rating & profiles.rating_count when a rating is added/updated
CREATE OR REPLACE FUNCTION update_profile_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET
    rating       = (SELECT ROUND(AVG(rating)::numeric, 2) FROM public.ratings WHERE subject_id = NEW.subject_id),
    rating_count = (SELECT COUNT(*)                       FROM public.ratings WHERE subject_id = NEW.subject_id)
  WHERE id = NEW.subject_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_profile_rating ON public.ratings;
CREATE TRIGGER trg_update_profile_rating
  AFTER INSERT OR UPDATE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION update_profile_rating();

-- ----------------------------------------------------------------
-- 3. SERVICES column on listings and projects
--    (already added by the app if you ran the seed; this is idempotent)
-- ----------------------------------------------------------------
ALTER TABLE public.listings  ADD COLUMN IF NOT EXISTS services TEXT[];
ALTER TABLE public.projects  ADD COLUMN IF NOT EXISTS services TEXT[];

-- ----------------------------------------------------------------
-- 4. STATUS = 'draft' support
--    The listing_status and project_status ENUMs need 'draft'
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'draft'
      AND enumtypid = 'public.listing_status'::regtype
  ) THEN
    ALTER TYPE public.listing_status ADD VALUE 'draft';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'draft'
      AND enumtypid = 'public.project_status'::regtype
  ) THEN
    ALTER TYPE public.project_status ADD VALUE 'draft';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 5. TRIGGER — auto-notify on new connection request
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_connection_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO public.notifications (profile_id, type, title, body, action_url)
    VALUES (
      NEW.recipient_profile_id,
      'connection_request',
      'New connection request',
      (SELECT full_name FROM public.profiles WHERE id = NEW.requester_profile_id) || ' wants to connect with you.',
      '/dashboard'
    );
  ELSIF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO public.notifications (profile_id, type, title, body, action_url)
    VALUES (
      NEW.requester_profile_id,
      'connection_accepted',
      'Connection accepted!',
      (SELECT full_name FROM public.profiles WHERE id = NEW.recipient_profile_id) || ' accepted your connection request.',
      '/messages'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_connection ON public.connection_requests;
CREATE TRIGGER trg_notify_connection
  AFTER INSERT OR UPDATE ON public.connection_requests
  FOR EACH ROW EXECUTE FUNCTION notify_connection_request();

-- ----------------------------------------------------------------
-- 6. TRIGGER — auto-notify on new proposal
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_new_proposal()
RETURNS TRIGGER AS $$
DECLARE
  project_owner UUID;
  project_title TEXT;
  applicant_name TEXT;
BEGIN
  SELECT profile_id, title INTO project_owner, project_title
  FROM public.projects WHERE id = NEW.project_id;

  SELECT full_name INTO applicant_name
  FROM public.profiles WHERE id = NEW.profile_id;

  INSERT INTO public.notifications (profile_id, type, title, body, action_url)
  VALUES (
    project_owner,
    'proposal_received',
    'New proposal received',
    applicant_name || ' submitted a proposal for: ' || project_title,
    '/dashboard'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_proposal ON public.project_proposals;
CREATE TRIGGER trg_notify_proposal
  AFTER INSERT ON public.project_proposals
  FOR EACH ROW EXECUTE FUNCTION notify_new_proposal();

-- ================================================================
-- DONE
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Feature migrations applied.';
  RAISE NOTICE '   Tables: notifications, ratings';
  RAISE NOTICE '   Columns: listings.services, projects.services';
  RAISE NOTICE '   ENUMs: listing_status draft, project_status draft';
  RAISE NOTICE '   Triggers: connection notifications, proposal notifications, rating aggregation';
END $$;

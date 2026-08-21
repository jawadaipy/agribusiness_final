-- ================================================================
-- AgriBusiness — Migration 04: Triggers
-- ================================================================

-- ----------------------------------------------------------------
-- HELPER: updated_at auto-stamp
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to every table that has an updated_at column
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'listings', 'classifieds', 'problem_posts',
    'problem_comments', 'projects', 'ads', 'subscriptions', 'payments'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------
-- AUTH HOOK: create profile row on signup
--
-- Called by: trigger on auth.users INSERT
-- Reads user_type from raw_user_meta_data (client-supplied at signup).
-- Explicitly blocks 'admin' self-registration — falls back to 'farmer'.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER                   -- runs as the function owner, bypasses RLS
SET search_path = public AS $$
DECLARE
  requested_type TEXT;
  safe_type      user_type;
BEGIN
  requested_type := NEW.raw_user_meta_data ->> 'user_type';

  -- Whitelist: only non-admin values are accepted from the client
  safe_type := CASE
    WHEN requested_type IN ('student', 'company', 'consultant', 'farmer', 'org')
    THEN requested_type::user_type
    ELSE 'farmer'::user_type
  END;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    user_type,
    trial_ends_at,
    subscription_status
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    safe_type,
    now() + INTERVAL '7 days',
    'trial'
  )
  ON CONFLICT (id) DO NOTHING;   -- idempotent if called more than once

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_handle_new_user();

-- ----------------------------------------------------------------
-- MESSAGES: update thread.last_message_at on new message
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_update_thread_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.threads
  SET last_message_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_thread_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_thread_last_message();

-- ----------------------------------------------------------------
-- MESSAGES: notify all participants except the sender
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_notify_message_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  participant UUID;
  participants UUID[];
BEGIN
  SELECT participant_ids INTO participants
  FROM public.threads
  WHERE id = NEW.thread_id;

  FOREACH participant IN ARRAY participants LOOP
    CONTINUE WHEN participant = NEW.sender_id;
    INSERT INTO public.notifications (
      profile_id, type, title, body, metadata
    ) VALUES (
      participant,
      'new_message',
      'New Message',
      LEFT(COALESCE(NEW.body, 'Sent an attachment'), 120),
      jsonb_build_object(
        'thread_id', NEW.thread_id,
        'sender_id', NEW.sender_id,
        'message_type', NEW.type
      )
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_message_participants();

-- ----------------------------------------------------------------
-- PROBLEM COMMENTS: notify post author of new reply
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_notify_problem_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  post_author UUID;
BEGIN
  SELECT profile_id INTO post_author
  FROM public.problem_posts
  WHERE id = NEW.post_id;

  -- Don't notify if the author replies to their own post
  IF post_author IS DISTINCT FROM NEW.profile_id THEN
    INSERT INTO public.notifications (
      profile_id, type, title, body, metadata
    ) VALUES (
      post_author,
      'problem_reply',
      CASE WHEN NEW.is_solution THEN 'Solution Posted on Your Problem'
           ELSE 'New Reply on Your Problem Post' END,
      LEFT(NEW.body, 150),
      jsonb_build_object(
        'post_id', NEW.post_id,
        'comment_id', NEW.id,
        'is_solution', NEW.is_solution
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_problem_reply
  AFTER INSERT ON public.problem_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_problem_reply();

-- ----------------------------------------------------------------
-- LISTINGS: auto-expire when expires_at is reached
--   (done in ad-rotation-cron; this trigger handles status sync
--    if a listing is manually set past its expiry)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_expire_listing_if_past_date()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < now()
     AND NEW.status = 'active' THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_listing_auto_expire
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_expire_listing_if_past_date();

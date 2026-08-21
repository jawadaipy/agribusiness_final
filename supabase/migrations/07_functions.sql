-- ================================================================
-- AgriBusiness — Migration 07: SQL Functions + pg_cron Jobs
-- ================================================================

-- ================================================================
-- SEMANTIC + KEYWORD SEARCH: match_profiles()
--
-- Accepts an optional OpenAI embedding vector and/or a text string.
-- Scoring:
--   cosine_score  = 1 - cosine_distance (pgvector)
--   keyword_score = fraction of profile's keywords matching query_text
--   combined_score = 0.4 * keyword_score + 0.6 * cosine_score
--
-- Falls back gracefully to keyword-only scoring when no embedding
-- is supplied (e.g., OpenAI unavailable).
-- ================================================================
CREATE OR REPLACE FUNCTION public.match_profiles(
  query_embedding  VECTOR(1536)  DEFAULT NULL,
  query_text       TEXT          DEFAULT '',
  match_count      INTEGER       DEFAULT 10,
  filter_location  TEXT          DEFAULT NULL
)
RETURNS TABLE (
  profile_id       UUID,
  full_name        TEXT,
  user_type        user_type,
  location         TEXT,
  avatar_url       TEXT,
  matched_keywords TEXT[],
  cosine_score     DOUBLE PRECISION,
  keyword_score    DOUBLE PRECISION,
  combined_score   DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  use_vector BOOLEAN := query_embedding IS NOT NULL;
BEGIN
  RETURN QUERY
  WITH kw_agg AS (
    -- One row per profile: aggregate all keyword data
    SELECT
      pk.profile_id,
      -- Keywords matching the text query
      array_agg(pk.keyword ORDER BY pk.keyword)
        FILTER (WHERE query_text <> '' AND pk.keyword ILIKE '%' || query_text || '%')
        AS matched_kws,
      -- Text-match score: fraction of this profile's keywords that match
      COUNT(pk.keyword) FILTER (
        WHERE query_text <> '' AND pk.keyword ILIKE '%' || query_text || '%'
      )::double precision
        / NULLIF(COUNT(*)::double precision, 0)
        AS kw_score,
      -- Cosine similarity: best match across all keyword embeddings
      CASE
        WHEN use_vector AND pk.embedding IS NOT NULL
          THEN MAX(1.0 - (pk.embedding <=> query_embedding))
        ELSE 0.0
      END AS cos_score
    FROM public.profile_keywords pk
    GROUP BY pk.profile_id
  ),
  scored AS (
    SELECT
      ka.profile_id,
      COALESCE(ka.matched_kws, ARRAY[]::TEXT[]) AS matched_kws,
      ka.cos_score,
      ka.kw_score,
      CASE
        WHEN use_vector
          THEN (0.4 * COALESCE(ka.kw_score, 0) + 0.6 * COALESCE(ka.cos_score, 0))
        ELSE COALESCE(ka.kw_score, 0)
      END AS c_score
    FROM kw_agg ka
    WHERE
      -- Must have at least some relevance signal
      (query_text <> '' AND ka.kw_score > 0)
      OR (use_vector AND ka.cos_score > 0.45)
  )
  SELECT
    p.id                                                     AS profile_id,
    p.full_name,
    p.user_type,
    COALESCE(p.city || ', ' || p.province, p.location, '')  AS location,
    p.avatar_url,
    s.matched_kws,
    s.cos_score,
    s.kw_score,
    s.c_score
  FROM scored s
  JOIN public.profiles p ON p.id = s.profile_id
  WHERE
    p.is_active = true
    AND (
      filter_location IS NULL
      OR p.city     ILIKE '%' || filter_location || '%'
      OR p.province ILIKE '%' || filter_location || '%'
    )
  ORDER BY s.c_score DESC, p.rating DESC NULLS LAST
  LIMIT match_count;
END;
$$;

-- ================================================================
-- TRIAL EXPIRY: expire_trials()
--
-- Used by trial-expiry-cron Edge Function.
-- Atomically updates profiles and inserts notifications.
-- Returns the number of accounts expired.
-- ================================================================
CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  expired_count INTEGER := 0;
BEGIN
  WITH expired AS (
    UPDATE public.profiles
    SET subscription_status = 'expired'
    WHERE
      subscription_status = 'trial'
      AND trial_ends_at < now()
      -- Don't expire if they already have an active paid subscription
      AND NOT EXISTS (
        SELECT 1 FROM public.subscriptions s
        WHERE s.profile_id = profiles.id
          AND s.status = 'active'
          AND (s.current_period_end IS NULL OR s.current_period_end > now())
      )
    RETURNING id
  )
  INSERT INTO public.notifications (profile_id, type, title, body, metadata)
  SELECT
    e.id,
    'trial_expiry',
    'Your Free Trial Has Ended',
    'Your 7-day AgriBusiness trial has expired. Upgrade to a paid plan to unlock all features and keep growing your agri-business.',
    '{}'::jsonb
  FROM expired e;

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- ================================================================
-- AD ROTATION: rotate_ads()
--
-- Used by ad-rotation-cron Edge Function (runs weekly).
-- 1. Marks approved ads whose ends_at has passed as 'expired'.
-- 2. Shuffles rotation_order within each category+location pool.
-- ================================================================
CREATE OR REPLACE FUNCTION public.rotate_ads()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  -- Step 1: expire ads that have passed their end date
  UPDATE public.ads
  SET
    status     = 'expired',
    updated_at = now()
  WHERE
    status = 'approved'
    AND ends_at IS NOT NULL
    AND ends_at < now();

  -- Step 2: randomly reorder active ads per (category, location) pool
  WITH pool AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY
          COALESCE(category_id::text, '__all__'),
          COALESCE(target_location, '__all__')
        ORDER BY random()
      ) AS new_order
    FROM public.ads
    WHERE status = 'approved'
      AND (ends_at IS NULL OR ends_at >= now())
  )
  UPDATE public.ads a
  SET
    rotation_order = p.new_order,
    updated_at     = now()
  FROM pool p
  WHERE a.id = p.id;
END;
$$;

-- ================================================================
-- pg_cron SCHEDULED JOBS
--
-- Requires pg_cron and pg_net extensions (enabled in 00_extensions).
-- The cron jobs call Edge Functions via HTTP so that Deno runtime
-- code runs (API fetches, complex logic).
--
-- SETUP REQUIRED: Before running this block, set these Postgres
-- runtime settings (e.g., in Supabase Dashboard → SQL Editor):
--
--   ALTER DATABASE postgres
--     SET app.settings.supabase_url = 'https://<ref>.supabase.co';
--   ALTER DATABASE postgres
--     SET app.settings.cron_secret = '<your-CRON_SECRET>';
--
-- ================================================================

-- Daily trial expiry at 02:00 UTC
SELECT cron.schedule(
  'agri-trial-expiry',
  '0 2 * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.settings.supabase_url')
                 || '/functions/v1/trial-expiry-cron',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'),
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Daily commodity rates ingestion at 06:00 UTC
SELECT cron.schedule(
  'agri-market-rates',
  '0 6 * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.settings.supabase_url')
                 || '/functions/v1/market-rates-cron',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'),
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Weekly ad rotation on Sundays at 00:00 UTC
SELECT cron.schedule(
  'agri-ad-rotation',
  '0 0 * * 0',
  $$
    SELECT net.http_post(
      url     := current_setting('app.settings.supabase_url')
                 || '/functions/v1/ad-rotation-cron',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'),
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $$
);

-- ================================================================
-- AgriBusiness — Complete All-In-One Database Setup & Seed Script
-- Target: Supabase (PostgreSQL 15+)
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ================================================================


-- ================================================================
-- FILE: 00_extensions.sql
-- ================================================================

-- ================================================================
-- AgriBusiness — Migration 00: Extensions
-- Run once per database (idempotent)
-- ================================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vector similarity search (pgvector)
CREATE EXTENSION IF NOT EXISTS "vector";

-- HTTP requests from Postgres (for pg_cron → Edge Functions)
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Scheduled jobs
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Accent-insensitive text search (Urdu/Roman Urdu support)
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Full-text search dictionary (used by tsvector indexes)
CREATE TEXT SEARCH CONFIGURATION agri_english (COPY = english);
ALTER TEXT SEARCH CONFIGURATION agri_english
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, english_stem;


-- ================================================================
-- FILE: 01_enums.sql
-- ================================================================

-- ================================================================
-- AgriBusiness — Migration 01: ENUM Types
-- All domain-specific enumerated types used across the schema
-- ================================================================

-- User portal types (admin is provisioned manually, never via public signup)
CREATE TYPE user_type AS ENUM (
  'student',
  'company',
  'consultant',
  'farmer',
  'org',
  'admin'
);

-- Billing / subscription lifecycle
CREATE TYPE subscription_status AS ENUM (
  'trial',
  'active',
  'expired',
  'cancelled'
);

-- Marketplace listing lifecycle
CREATE TYPE listing_status AS ENUM (
  'draft',
  'active',
  'sold',
  'expired'
);

-- Consulting / freelance project lifecycle
CREATE TYPE project_status AS ENUM (
  'open',
  'in_progress',
  'completed',
  'cancelled'
);

-- Advertisement moderation states
CREATE TYPE ad_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'expired'
);

-- Payment transaction states
CREATE TYPE payment_status AS ENUM (
  'pending',
  'completed',
  'failed',
  'refunded'
);

-- Supported payment gateways
CREATE TYPE payment_gateway AS ENUM (
  'stripe',       -- international cards / IBAN
  'jazzcash'      -- Pakistan PKR mobile wallet + local cards
);

-- Chat message content types
CREATE TYPE message_type AS ENUM (
  'text',
  'image',
  'audio',
  'video',
  'file'
);

-- In-app notification categories
CREATE TYPE notification_type AS ENUM (
  'trial_expiry',
  'ad_approved',
  'ad_rejected',
  'new_message',
  'problem_reply',
  'payment_success',
  'payment_failed',
  'system'
);


-- ================================================================
-- FILE: 02_core_schema.sql
-- ================================================================

-- ================================================================
-- AgriBusiness — Migration 02: Core Schema (15 Tables)
-- Depends on: 00_extensions, 01_enums
-- ================================================================

-- ----------------------------------------------------------------
-- 1. PROFILES
--    One row per auth.users entry. Created by DB trigger on signup.
-- ----------------------------------------------------------------
CREATE TABLE public.profiles (
  id                   UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                TEXT         NOT NULL,
  user_type            user_type    NOT NULL DEFAULT 'farmer',
  full_name            TEXT,
  display_name         TEXT,
  bio                  TEXT,
  avatar_url           TEXT,
  phone                TEXT,
  -- Location fields (granular for search/matching)
  location             TEXT,          -- free-form display string
  city                 TEXT,
  province             TEXT,
  country              TEXT         NOT NULL DEFAULT 'Pakistan',
  website              TEXT,
  -- Billing / subscription
  trial_ends_at        TIMESTAMPTZ  NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  subscription_status  subscription_status NOT NULL DEFAULT 'trial',
  -- Trust & moderation
  is_verified          BOOLEAN      NOT NULL DEFAULT false,
  is_active            BOOLEAN      NOT NULL DEFAULT true,
  -- Aggregate reputation (updated by trigger / Edge Function)
  rating               NUMERIC(3,2) CHECK (rating BETWEEN 0 AND 5),
  rating_count         INTEGER      NOT NULL DEFAULT 0,
  -- Timestamps
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 2. CATEGORIES (self-referencing for parent/child hierarchy)
-- ----------------------------------------------------------------
CREATE TABLE public.categories (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT    NOT NULL,
  slug        TEXT    NOT NULL UNIQUE,
  icon        TEXT,                   -- Material Symbols icon name
  description TEXT,
  parent_id   UUID    REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 3. LISTINGS
--    Full marketplace listings (products, services, land, etc.)
-- ----------------------------------------------------------------
CREATE TABLE public.listings (
  id          UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID           NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID           REFERENCES public.categories(id) ON DELETE SET NULL,
  title       TEXT           NOT NULL CHECK (char_length(title) BETWEEN 3 AND 255),
  description TEXT,
  price       NUMERIC(15,2)  CHECK (price >= 0),
  currency    TEXT           NOT NULL DEFAULT 'PKR',
  unit        TEXT,                   -- 'per kg', 'per ton', 'per acre', 'per unit'
  quantity    NUMERIC(15,2),
  location    TEXT,
  city        TEXT,
  province    TEXT,
  images      TEXT[],                -- array of Supabase Storage URLs
  status      listing_status NOT NULL DEFAULT 'active',
  is_featured BOOLEAN        NOT NULL DEFAULT false,
  view_count  INTEGER        NOT NULL DEFAULT 0,
  -- Full-text search vector (auto-computed, GIN indexed in 03_indexes)
  search_vec  TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' || coalesce(description, '')
    )
  ) STORED,
  expires_at  TIMESTAMPTZ    DEFAULT (now() + INTERVAL '90 days'),
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 4. CLASSIFIEDS
--    Short-form buy/sell classified ads (lighter than listings)
-- ----------------------------------------------------------------
CREATE TABLE public.classifieds (
  id              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID           NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id     UUID           REFERENCES public.categories(id) ON DELETE SET NULL,
  title           TEXT           NOT NULL CHECK (char_length(title) BETWEEN 3 AND 255),
  description     TEXT,
  price           NUMERIC(15,2)  CHECK (price >= 0),
  currency        TEXT           NOT NULL DEFAULT 'PKR',
  is_negotiable   BOOLEAN        NOT NULL DEFAULT false,
  media_urls      TEXT[],
  location        TEXT,
  city            TEXT,
  status          listing_status NOT NULL DEFAULT 'active',
  expires_at      TIMESTAMPTZ    DEFAULT (now() + INTERVAL '30 days'),
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 5. PROBLEM POSTS (farmer problem / Q&A forum)
-- ----------------------------------------------------------------
CREATE TABLE public.problem_posts (
  id                  UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id          UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id         UUID    REFERENCES public.categories(id) ON DELETE SET NULL,
  title               TEXT    NOT NULL CHECK (char_length(title) BETWEEN 5 AND 500),
  body                TEXT    NOT NULL,
  media_urls          TEXT[], -- image / audio / video via problem-media bucket
  tags                TEXT[],
  is_resolved         BOOLEAN NOT NULL DEFAULT false,
  resolved_comment_id UUID,   -- FK added after problem_comments (circular ref)
  view_count          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 6. PROBLEM COMMENTS
-- ----------------------------------------------------------------
CREATE TABLE public.problem_comments (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID    NOT NULL REFERENCES public.problem_posts(id) ON DELETE CASCADE,
  profile_id  UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body        TEXT    NOT NULL,
  media_urls  TEXT[],
  is_solution BOOLEAN NOT NULL DEFAULT false,
  upvotes     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Now close the circular FK (DEFERRABLE avoids deadlocks on mutual insert)
ALTER TABLE public.problem_posts
  ADD CONSTRAINT fk_resolved_comment
  FOREIGN KEY (resolved_comment_id)
  REFERENCES public.problem_comments(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- ----------------------------------------------------------------
-- 7. PROJECTS (freelance / consulting project board)
-- ----------------------------------------------------------------
CREATE TABLE public.projects (
  id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id       UUID           NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id      UUID           REFERENCES public.categories(id) ON DELETE SET NULL,
  title            TEXT           NOT NULL CHECK (char_length(title) BETWEEN 5 AND 500),
  description      TEXT           NOT NULL,
  budget_min       NUMERIC(15,2)  CHECK (budget_min >= 0),
  budget_max       NUMERIC(15,2)  CHECK (budget_max >= 0),
  currency         TEXT           NOT NULL DEFAULT 'PKR',
  deadline         DATE,
  required_skills  TEXT[],
  location         TEXT,
  city             TEXT,
  is_remote        BOOLEAN        NOT NULL DEFAULT false,
  status           project_status NOT NULL DEFAULT 'open',
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  CONSTRAINT budget_range_valid CHECK (
    budget_min IS NULL OR budget_max IS NULL OR budget_max >= budget_min
  )
);

-- ----------------------------------------------------------------
-- 8. THREADS (chat conversation containers)
-- ----------------------------------------------------------------
CREATE TABLE public.threads (
  id               UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_ids  UUID[]  NOT NULL,           -- GIN indexed for fast membership check
  subject          TEXT,
  listing_id       UUID    REFERENCES public.listings(id) ON DELETE SET NULL,
  project_id       UUID    REFERENCES public.projects(id) ON DELETE SET NULL,
  last_message_at  TIMESTAMPTZ DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 9. MESSAGES
-- ----------------------------------------------------------------
CREATE TABLE public.messages (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id      UUID         NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  sender_id      UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body           TEXT,
  type           message_type NOT NULL DEFAULT 'text',
  attachment_url TEXT,        -- Supabase Storage URL (chat-attachments bucket)
  is_read        BOOLEAN      NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT message_has_content CHECK (
    body IS NOT NULL OR attachment_url IS NOT NULL
  )
);

-- ----------------------------------------------------------------
-- 10. AD PLANS (pricing tiers for advertisements)
-- ----------------------------------------------------------------
CREATE TABLE public.ad_plans (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT          NOT NULL UNIQUE,
  description     TEXT,
  price_pkr       NUMERIC(10,2) NOT NULL CHECK (price_pkr >= 0),
  duration_days   INTEGER       NOT NULL CHECK (duration_days > 0),
  placement_type  TEXT          NOT NULL,  -- 'banner','featured','sidebar','sponsored'
  max_impressions INTEGER,                 -- NULL = unlimited
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 11. ADS (paid advertisement campaigns)
-- ----------------------------------------------------------------
CREATE TABLE public.ads (
  id               UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id       UUID      NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ad_plan_id       UUID      REFERENCES public.ad_plans(id) ON DELETE SET NULL,
  category_id      UUID      REFERENCES public.categories(id) ON DELETE SET NULL,
  title            TEXT      NOT NULL,
  body             TEXT,
  creative_url     TEXT,     -- Supabase Storage URL (ad-creatives bucket)
  target_url       TEXT,     -- Click-through destination
  target_location  TEXT,     -- City/province targeting
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  status           ad_status NOT NULL DEFAULT 'pending',
  rotation_order   INTEGER,  -- Recomputed weekly by ad-rotation-cron
  impression_count INTEGER   NOT NULL DEFAULT 0,
  click_count      INTEGER   NOT NULL DEFAULT 0,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ad_dates_valid CHECK (
    ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at
  )
);

-- ----------------------------------------------------------------
-- 12. MARKET RATES (daily commodity price ingestion)
-- ----------------------------------------------------------------
CREATE TABLE public.market_rates (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  commodity   TEXT          NOT NULL,
  variety     TEXT,
  unit        TEXT          NOT NULL DEFAULT 'per_kg',
  price       NUMERIC(15,4) NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency    TEXT          NOT NULL DEFAULT 'PKR',
  market      TEXT,         -- Market / mandi name (e.g., "Lahore Mandi")
  city        TEXT,
  province    TEXT,
  min_price   NUMERIC(15,2),
  max_price   NUMERIC(15,2),
  modal_price NUMERIC(15,2),
  trend       TEXT          DEFAULT 'stable',
  source      TEXT          NOT NULL DEFAULT 'kisanmandi',
  rate_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
  recorded_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 13. PROFILE KEYWORDS + EMBEDDINGS
--    Each row = one keyword tag for a profile, with its OpenAI vector
-- ----------------------------------------------------------------
CREATE TABLE public.profile_keywords (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  keyword     TEXT    NOT NULL CHECK (char_length(keyword) BETWEEN 1 AND 100),
  embedding   VECTOR(1536),  -- OpenAI text-embedding-3-small output
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, keyword)
);

-- ----------------------------------------------------------------
-- 14. SUBSCRIPTIONS (billing records)
-- ----------------------------------------------------------------
CREATE TABLE public.subscriptions (
  id                    UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id            UUID                NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_name             TEXT                NOT NULL,
  status                subscription_status NOT NULL DEFAULT 'trial',
  gateway               payment_gateway,
  gateway_sub_id        TEXT                UNIQUE,  -- Stripe subscription ID / JazzCash ref
  gateway_customer_id   TEXT,                        -- Stripe customer ID
  amount                NUMERIC(10,2)       CHECK (amount >= 0),
  currency              TEXT                DEFAULT 'PKR',
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ         NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ         NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 15. PAYMENTS (individual payment transactions)
-- ----------------------------------------------------------------
CREATE TABLE public.payments (
  id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id        UUID            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id   UUID            REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  ad_id             UUID            REFERENCES public.ads(id) ON DELETE SET NULL,
  amount            NUMERIC(10,2)   NOT NULL CHECK (amount >= 0),
  currency          TEXT            NOT NULL DEFAULT 'PKR',
  gateway           payment_gateway NOT NULL,
  gateway_payment_id TEXT           UNIQUE,   -- Stripe PaymentIntent ID / JazzCash TxnRefNo
  status            payment_status  NOT NULL DEFAULT 'pending',
  description       TEXT,
  metadata          JSONB           NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 16. ADMIN AUDIT LOG (append-only, no client writes)
-- ----------------------------------------------------------------
CREATE TABLE public.admin_audit_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id    UUID,
  old_val      JSONB,
  new_val      JSONB,
  ip_address   INET,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 17. NOTIFICATIONS (in-app only; push/email is a follow-on)
-- ----------------------------------------------------------------
CREATE TABLE public.notifications (
  id         UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID              NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       notification_type NOT NULL DEFAULT 'system',
  title      TEXT              NOT NULL,
  body       TEXT,
  is_read    BOOLEAN           NOT NULL DEFAULT false,
  metadata   JSONB             NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ       NOT NULL DEFAULT now()
);


-- ================================================================
-- FILE: 03_indexes.sql
-- ================================================================

-- ================================================================
-- AgriBusiness — Migration 03: Indexes
-- Covers: B-tree, GIN (FTS + array), HNSW (vector), composite
-- ================================================================

-- ----------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------
CREATE INDEX idx_profiles_user_type
  ON public.profiles(user_type);

CREATE INDEX idx_profiles_location
  ON public.profiles(city, province);

CREATE INDEX idx_profiles_subscription
  ON public.profiles(subscription_status, trial_ends_at)
  WHERE subscription_status IN ('trial', 'active');

CREATE INDEX idx_profiles_active
  ON public.profiles(is_active, user_type);

-- ----------------------------------------------------------------
-- CATEGORIES
-- ----------------------------------------------------------------
CREATE INDEX idx_categories_parent_id
  ON public.categories(parent_id);

CREATE INDEX idx_categories_active
  ON public.categories(is_active, sort_order);

-- slug is already UNIQUE (primary lookup path)

-- ----------------------------------------------------------------
-- LISTINGS
-- ----------------------------------------------------------------
CREATE INDEX idx_listings_profile_id
  ON public.listings(profile_id);

CREATE INDEX idx_listings_category_id
  ON public.listings(category_id);

CREATE INDEX idx_listings_status
  ON public.listings(status)
  WHERE status = 'active';

CREATE INDEX idx_listings_location
  ON public.listings(city, province);

CREATE INDEX idx_listings_search_vec
  ON public.listings USING GIN(search_vec);

CREATE INDEX idx_listings_price
  ON public.listings(price, currency)
  WHERE status = 'active';

CREATE INDEX idx_listings_created_at
  ON public.listings(created_at DESC);

CREATE INDEX idx_listings_expires_at
  ON public.listings(expires_at)
  WHERE status = 'active';

-- ----------------------------------------------------------------
-- CLASSIFIEDS
-- ----------------------------------------------------------------
CREATE INDEX idx_classifieds_profile_id
  ON public.classifieds(profile_id);

CREATE INDEX idx_classifieds_category_id
  ON public.classifieds(category_id);

CREATE INDEX idx_classifieds_status
  ON public.classifieds(status)
  WHERE status = 'active';

CREATE INDEX idx_classifieds_created_at
  ON public.classifieds(created_at DESC);

-- ----------------------------------------------------------------
-- PROBLEM POSTS
-- ----------------------------------------------------------------
CREATE INDEX idx_problem_posts_profile_id
  ON public.problem_posts(profile_id);

CREATE INDEX idx_problem_posts_category_id
  ON public.problem_posts(category_id);

CREATE INDEX idx_problem_posts_resolved
  ON public.problem_posts(is_resolved, created_at DESC);

CREATE INDEX idx_problem_posts_tags
  ON public.problem_posts USING GIN(tags);

-- ----------------------------------------------------------------
-- PROBLEM COMMENTS
-- ----------------------------------------------------------------
CREATE INDEX idx_problem_comments_post_id
  ON public.problem_comments(post_id, created_at);

CREATE INDEX idx_problem_comments_profile_id
  ON public.problem_comments(profile_id);

-- ----------------------------------------------------------------
-- PROJECTS
-- ----------------------------------------------------------------
CREATE INDEX idx_projects_profile_id
  ON public.projects(profile_id);

CREATE INDEX idx_projects_category_id
  ON public.projects(category_id);

CREATE INDEX idx_projects_status
  ON public.projects(status)
  WHERE status = 'open';

CREATE INDEX idx_projects_skills
  ON public.projects USING GIN(required_skills);

CREATE INDEX idx_projects_location
  ON public.projects(city);

-- ----------------------------------------------------------------
-- THREADS
-- ----------------------------------------------------------------
-- GIN index for fast UUID array membership lookups
CREATE INDEX idx_threads_participant_ids
  ON public.threads USING GIN(participant_ids);

CREATE INDEX idx_threads_last_message_at
  ON public.threads(last_message_at DESC);

-- ----------------------------------------------------------------
-- MESSAGES
-- ----------------------------------------------------------------
CREATE INDEX idx_messages_thread_id
  ON public.messages(thread_id, created_at);

CREATE INDEX idx_messages_sender_id
  ON public.messages(sender_id);

CREATE INDEX idx_messages_unread
  ON public.messages(thread_id, is_read)
  WHERE is_read = false;

-- ----------------------------------------------------------------
-- ADS
-- ----------------------------------------------------------------
-- The hot path for the "approved, in-window" public SELECT
CREATE INDEX idx_ads_approved_window
  ON public.ads(status, starts_at, ends_at)
  WHERE status = 'approved';

CREATE INDEX idx_ads_profile_id
  ON public.ads(profile_id);

-- For weighted rotation delivery per category + location
CREATE INDEX idx_ads_rotation
  ON public.ads(category_id, target_location, rotation_order)
  WHERE status = 'approved';

-- ----------------------------------------------------------------
-- MARKET RATES
-- ----------------------------------------------------------------
-- Unique daily rate per commodity + market + rate_date
CREATE UNIQUE INDEX idx_market_rates_unique_daily
  ON public.market_rates(commodity, COALESCE(market, ''), rate_date);

CREATE INDEX idx_market_rates_commodity
  ON public.market_rates(commodity, recorded_at DESC);

CREATE INDEX idx_market_rates_province
  ON public.market_rates(province, recorded_at DESC);

-- ----------------------------------------------------------------
-- PROFILE KEYWORDS — HNSW vector index (cosine distance)
-- m=16, ef_construction=64 are good defaults for <1M rows
-- ----------------------------------------------------------------
CREATE INDEX idx_profile_keywords_embedding
  ON public.profile_keywords
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_profile_keywords_profile_id
  ON public.profile_keywords(profile_id);

-- ----------------------------------------------------------------
-- SUBSCRIPTIONS
-- ----------------------------------------------------------------
CREATE INDEX idx_subscriptions_profile_id
  ON public.subscriptions(profile_id);

CREATE INDEX idx_subscriptions_status
  ON public.subscriptions(status);

CREATE INDEX idx_subscriptions_period_end
  ON public.subscriptions(current_period_end)
  WHERE status = 'active';

-- ----------------------------------------------------------------
-- PAYMENTS
-- ----------------------------------------------------------------
CREATE INDEX idx_payments_profile_id
  ON public.payments(profile_id, created_at DESC);

CREATE INDEX idx_payments_status
  ON public.payments(status);

-- ----------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------
CREATE INDEX idx_notifications_profile_unread
  ON public.notifications(profile_id, is_read, created_at DESC);

-- ----------------------------------------------------------------
-- ADMIN AUDIT LOG
-- ----------------------------------------------------------------
CREATE INDEX idx_audit_log_admin_id
  ON public.admin_audit_log(admin_id, created_at DESC);

CREATE INDEX idx_audit_log_target
  ON public.admin_audit_log(target_table, target_id);


-- ================================================================
-- FILE: 04_triggers.sql
-- ================================================================

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


-- ================================================================
-- FILE: 05_rls_policies.sql
-- ================================================================

-- ================================================================
-- AgriBusiness — Migration 05: Row Level Security Policies
-- Principle: every table has RLS enabled; service role bypasses all.
-- Role is ALWAYS read server-side via get_my_role(); never trusted
-- from client JWT claims.
-- ================================================================

-- ----------------------------------------------------------------
-- HELPER FUNCTIONS
-- ----------------------------------------------------------------

-- Returns the authenticated user's role by querying profiles directly.
-- STABLE + SECURITY DEFINER: one lookup per transaction, cached.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public AS $$
  SELECT user_type
  FROM public.profiles
  WHERE id = auth.uid()
$$;

-- Returns true if the current user is a participant in a thread.
CREATE OR REPLACE FUNCTION public.is_thread_participant(p_thread_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.threads
    WHERE id = p_thread_id
      AND auth.uid() = ANY(participant_ids)
  )
$$;

-- ----------------------------------------------------------------
-- ENABLE RLS ON ALL TABLES
-- ----------------------------------------------------------------
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classifieds        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_plans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_rates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_keywords   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- PROFILES
-- ================================================================
CREATE POLICY "profiles:select:public"
  ON public.profiles FOR SELECT
  USING (true);

-- Only the newly-created user can insert their own profile row
-- (the DB trigger runs as SECURITY DEFINER and bypasses RLS)
CREATE POLICY "profiles:insert:self"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles:update:self_or_admin"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.get_my_role() = 'admin');

CREATE POLICY "profiles:delete:admin"
  ON public.profiles FOR DELETE
  USING (public.get_my_role() = 'admin');

-- ================================================================
-- CATEGORIES
-- ================================================================
CREATE POLICY "categories:select:public_active"
  ON public.categories FOR SELECT
  USING (is_active = true OR public.get_my_role() = 'admin');

CREATE POLICY "categories:insert:admin"
  ON public.categories FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "categories:update:admin"
  ON public.categories FOR UPDATE
  USING (public.get_my_role() = 'admin');

CREATE POLICY "categories:delete:admin"
  ON public.categories FOR DELETE
  USING (public.get_my_role() = 'admin');

-- ================================================================
-- LISTINGS
-- ================================================================
CREATE POLICY "listings:select:public"
  ON public.listings FOR SELECT
  USING (true);

CREATE POLICY "listings:insert:owner"
  ON public.listings FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "listings:update:owner_or_admin"
  ON public.listings FOR UPDATE
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin');

CREATE POLICY "listings:delete:owner_or_admin"
  ON public.listings FOR DELETE
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin');

-- ================================================================
-- CLASSIFIEDS
-- ================================================================
CREATE POLICY "classifieds:select:public"
  ON public.classifieds FOR SELECT
  USING (true);

CREATE POLICY "classifieds:insert:owner"
  ON public.classifieds FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "classifieds:update:owner_or_admin"
  ON public.classifieds FOR UPDATE
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin');

CREATE POLICY "classifieds:delete:owner_or_admin"
  ON public.classifieds FOR DELETE
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin');

-- ================================================================
-- PROBLEM POSTS
-- ================================================================
CREATE POLICY "problem_posts:select:public"
  ON public.problem_posts FOR SELECT
  USING (true);

CREATE POLICY "problem_posts:insert:owner"
  ON public.problem_posts FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "problem_posts:update:owner_or_admin"
  ON public.problem_posts FOR UPDATE
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin');

CREATE POLICY "problem_posts:delete:owner_or_admin"
  ON public.problem_posts FOR DELETE
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin');

-- ================================================================
-- PROBLEM COMMENTS
-- ================================================================
CREATE POLICY "problem_comments:select:public"
  ON public.problem_comments FOR SELECT
  USING (true);

CREATE POLICY "problem_comments:insert:owner"
  ON public.problem_comments FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "problem_comments:update:owner_or_admin"
  ON public.problem_comments FOR UPDATE
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin');

CREATE POLICY "problem_comments:delete:owner_or_admin"
  ON public.problem_comments FOR DELETE
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin');

-- ================================================================
-- PROJECTS
-- ================================================================
CREATE POLICY "projects:select:public"
  ON public.projects FOR SELECT
  USING (true);

CREATE POLICY "projects:insert:owner"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "projects:update:owner_or_admin"
  ON public.projects FOR UPDATE
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin');

CREATE POLICY "projects:delete:owner_or_admin"
  ON public.projects FOR DELETE
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin');

-- ================================================================
-- THREADS  (only participants can see/create)
-- ================================================================
CREATE POLICY "threads:select:participants"
  ON public.threads FOR SELECT
  USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "threads:insert:authenticated_participant"
  ON public.threads FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = ANY(participant_ids)
  );

-- Admin can view/manage all threads
CREATE POLICY "threads:all:admin"
  ON public.threads FOR ALL
  USING (public.get_my_role() = 'admin');

-- ================================================================
-- MESSAGES  (only thread participants can read/write)
-- ================================================================
CREATE POLICY "messages:select:participants"
  ON public.messages FOR SELECT
  USING (public.is_thread_participant(thread_id));

CREATE POLICY "messages:insert:participants"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_thread_participant(thread_id)
  );

-- Admin override
CREATE POLICY "messages:all:admin"
  ON public.messages FOR ALL
  USING (public.get_my_role() = 'admin');

-- ================================================================
-- ADS
-- ================================================================
-- Public can only see approved ads within the active time window.
-- The ad owner can always see their own ads (any status).
CREATE POLICY "ads:select:approved_public_or_owner"
  ON public.ads FOR SELECT
  USING (
    (status = 'approved' AND starts_at <= now() AND ends_at >= now())
    OR auth.uid() = profile_id
    OR public.get_my_role() = 'admin'
  );

-- Any authenticated user may submit an ad; status defaults to 'pending'
CREATE POLICY "ads:insert:owner"
  ON public.ads FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Only admin may change status (approve/reject/expire)
CREATE POLICY "ads:update:admin"
  ON public.ads FOR UPDATE
  USING (public.get_my_role() = 'admin');

CREATE POLICY "ads:delete:admin"
  ON public.ads FOR DELETE
  USING (public.get_my_role() = 'admin');

-- ================================================================
-- AD PLANS (read-only for everyone, managed by admin)
-- ================================================================
CREATE POLICY "ad_plans:select:public_active"
  ON public.ad_plans FOR SELECT
  USING (is_active = true OR public.get_my_role() = 'admin');

CREATE POLICY "ad_plans:insert:admin"
  ON public.ad_plans FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "ad_plans:update:admin"
  ON public.ad_plans FOR UPDATE
  USING (public.get_my_role() = 'admin');

CREATE POLICY "ad_plans:delete:admin"
  ON public.ad_plans FOR DELETE
  USING (public.get_my_role() = 'admin');

-- ================================================================
-- MARKET RATES (global public read; writes via service role only)
-- ================================================================
CREATE POLICY "market_rates:select:public"
  ON public.market_rates FOR SELECT
  USING (true);

-- Direct INSERT from admin dashboard; cron uses service role (bypasses RLS)
CREATE POLICY "market_rates:insert:admin"
  ON public.market_rates FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "market_rates:update:admin"
  ON public.market_rates FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- ================================================================
-- PROFILE KEYWORDS
-- ================================================================
CREATE POLICY "profile_keywords:select:public"
  ON public.profile_keywords FOR SELECT
  USING (true);

CREATE POLICY "profile_keywords:insert:owner"
  ON public.profile_keywords FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "profile_keywords:update:owner_or_admin"
  ON public.profile_keywords FOR UPDATE
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin');

CREATE POLICY "profile_keywords:delete:owner_or_admin"
  ON public.profile_keywords FOR DELETE
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin');

-- ================================================================
-- SUBSCRIPTIONS
-- ================================================================
CREATE POLICY "subscriptions:select:own_or_admin"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin');

-- Users can initiate their own subscription (trial creation)
CREATE POLICY "subscriptions:insert:own"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Updates only via webhook Edge Functions (service role) or admin
CREATE POLICY "subscriptions:update:admin"
  ON public.subscriptions FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- ================================================================
-- PAYMENTS
-- ================================================================
CREATE POLICY "payments:select:own_or_admin"
  ON public.payments FOR SELECT
  USING (auth.uid() = profile_id OR public.get_my_role() = 'admin');

CREATE POLICY "payments:insert:own"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Updates only via webhook Edge Functions (service role) or admin
CREATE POLICY "payments:update:admin"
  ON public.payments FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- ================================================================
-- ADMIN AUDIT LOG (append-only, admin-only visibility)
-- ================================================================
CREATE POLICY "audit_log:select:admin"
  ON public.admin_audit_log FOR SELECT
  USING (public.get_my_role() = 'admin');

-- Direct inserts from admin dashboard (Edge Functions use service role)
CREATE POLICY "audit_log:insert:admin"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

-- Audit log is immutable — no UPDATE or DELETE policies

-- ================================================================
-- NOTIFICATIONS
-- ================================================================
CREATE POLICY "notifications:select:own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = profile_id);

-- Only mark-as-read updates are allowed by owner
CREATE POLICY "notifications:update:own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = profile_id);

-- Inserts happen via SECURITY DEFINER triggers and service role only
-- No direct client INSERT; this policy exists for admin dashboard use
CREATE POLICY "notifications:insert:admin"
  ON public.notifications FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');


-- ================================================================
-- FILE: 06_storage_buckets.sql
-- ================================================================

-- ================================================================
-- AgriBusiness — Migration 06: Storage Buckets & Policies
-- ================================================================
-- Buckets are created via the storage schema (idempotent ON CONFLICT).
-- File-size limits are in bytes; MIME arrays are enforced at bucket level.
-- Per-MIME size enforcement for problem-media is done in storage policies below.
-- ================================================================

-- ----------------------------------------------------------------
-- BUCKET DEFINITIONS
-- ----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  -- Public: profile photos. 5 MB max. Images only.
  (
    'avatars',
    'avatars',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
  ),
  -- Public: listing product images. 5 MB max.
  (
    'listing-images',
    'listing-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  -- Private (auth required): mixed media for problem posts.
  -- Bucket limit = 50 MB (video cap); per-type sub-limits enforced in policies.
  (
    'problem-media',
    'problem-media',
    false,
    52428800,
    ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif',
      'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'
    ]
  ),
  -- Private: chat file attachments. 50 MB max. Any MIME.
  (
    'chat-attachments',
    'chat-attachments',
    false,
    52428800,
    NULL   -- any MIME allowed for chat
  ),
  -- Public: ad creative images. 5 MB max.
  (
    'ad-creatives',
    'ad-creatives',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
  )
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- STORAGE RLS POLICIES
-- Convention: files are stored as {user_id}/{filename}
--   so (storage.foldername(name))[1] = user's UUID
-- ================================================================

-- ----------------------------------------------------------------
-- AVATARS
-- ----------------------------------------------------------------
CREATE POLICY "avatars:select:public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars:insert:own_folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars:update:own_folder"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars:delete:own_folder_or_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.get_my_role() = 'admin'
    )
  );

-- ----------------------------------------------------------------
-- LISTING IMAGES
-- ----------------------------------------------------------------
CREATE POLICY "listing_images:select:public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

CREATE POLICY "listing_images:insert:own_folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "listing_images:delete:own_folder_or_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listing-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.get_my_role() = 'admin'
    )
  );

-- ----------------------------------------------------------------
-- PROBLEM MEDIA  (auth-only read; size sub-limits by MIME group)
-- Images ≤5 MB | Audio ≤10 MB | Video ≤50 MB
-- The bucket limit (50 MB) acts as the outer cap.
-- Per-type limits are enforced via metadata->>'size' checks.
-- Note: Supabase Storage populates metadata on upload so this
--       comparison is reliable server-side.
-- ----------------------------------------------------------------
CREATE POLICY "problem_media:select:authenticated"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'problem-media'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "problem_media:insert:own_folder_with_size_limits"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'problem-media'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (
      -- Images: ≤ 5 MB
      (
        (metadata->>'mimetype' LIKE 'image/%')
        AND (metadata->>'size')::bigint <= 5242880
      )
      OR
      -- Audio: ≤ 10 MB
      (
        (metadata->>'mimetype' LIKE 'audio/%')
        AND (metadata->>'size')::bigint <= 10485760
      )
      OR
      -- Video: ≤ 50 MB
      (
        (metadata->>'mimetype' LIKE 'video/%')
        AND (metadata->>'size')::bigint <= 52428800
      )
    )
  );

CREATE POLICY "problem_media:delete:own_folder_or_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'problem-media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.get_my_role() = 'admin'
    )
  );

-- ----------------------------------------------------------------
-- CHAT ATTACHMENTS
-- ----------------------------------------------------------------
CREATE POLICY "chat_attachments:select:authenticated"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "chat_attachments:insert:own_folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "chat_attachments:delete:own_folder_or_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.get_my_role() = 'admin'
    )
  );

-- ----------------------------------------------------------------
-- AD CREATIVES
-- ----------------------------------------------------------------
CREATE POLICY "ad_creatives:select:public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ad-creatives');

CREATE POLICY "ad_creatives:insert:own_folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ad-creatives'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "ad_creatives:delete:own_folder_or_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ad-creatives'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.get_my_role() = 'admin'
    )
  );


-- ================================================================
-- FILE: 07_functions.sql
-- ================================================================

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


-- ================================================================
-- FILE: 08_seed_categories.sql
-- ================================================================

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


-- ================================================================
-- 09: REAL PAKISTANI DEMO SEED DATA
-- Auth Users, Profiles, Market Listings, Projects, Clinical Problems & Mandi Rates
-- ================================================================

-- 1. Demo Auth Users in auth.users (so Foreign Keys are satisfied)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
(
  '00000000-0000-0000-0000-000000000000',
  '20000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'arshad.khan@agribiz.pk',
  '$2a$10$abcdefghijklmnopqrstuu',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Dr. Arshad Khan","user_type":"consultant"}',
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000000',
  '20000000-0000-0000-0000-000000000002',
  'authenticated',
  'authenticated',
  'info@agritech.pk',
  '$2a$10$abcdefghijklmnopqrstuu',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"AgriTech Solutions Ltd","user_type":"company"}',
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000003',
  'authenticated',
  'authenticated',
  'bilal.farms@agribiz.pk',
  '$2a$10$abcdefghijklmnopqrstuu',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Malik Bilal Hayat","user_type":"farmer"}',
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000004',
  'authenticated',
  'authenticated',
  'vet.faizan@agribiz.pk',
  '$2a$10$abcdefghijklmnopqrstuu',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Dr. Faizan Tariq (DVM)","user_type":"consultant"}',
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000005',
  '20000000-0000-0000-0000-000000000005',
  'authenticated',
  'authenticated',
  'zainab.engr@agribiz.pk',
  '$2a$10$abcdefghijklmnopqrstuu',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Engr. Zainab Ali","user_type":"student"}',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Demo Profiles
INSERT INTO public.profiles (
  id, email, user_type, full_name, display_name, bio, location, city, province, phone, is_verified, rating, rating_count, subscription_status
) VALUES
(
  '20000000-0000-0000-0000-000000000001',
  'arshad.khan@agribiz.pk',
  'consultant',
  'Dr. Arshad Khan',
  'Dr. Arshad Agronomy',
  'Senior Agronomist & Soil Nutritionist. 15+ years advising wheat and cotton growers across Multan and Faisalabad.',
  'Faisalabad, Punjab',
  'Faisalabad',
  'Punjab',
  '+923001234567',
  true,
  4.9,
  124,
  'active'
),
(
  '20000000-0000-0000-0000-000000000002',
  'info@agritech.pk',
  'company',
  'AgriTech Solutions Ltd',
  'AgriTech Pakistan',
  'Leading distributor of certified hybrid seeds, drip irrigation kits, and bio-fertilizers across Pakistan.',
  'Karachi, Sindh',
  'Karachi',
  'Sindh',
  '+923331234567',
  true,
  4.8,
  89,
  'active'
),
(
  '20000000-0000-0000-0000-000000000003',
  'bilal.farms@agribiz.pk',
  'farmer',
  'Malik Bilal Hayat',
  'Bilal Farm Estates',
  'Progressive citrus and wheat farmer managing 250 acres in Sargodha. Specializing in Kinnow exports.',
  'Sargodha, Punjab',
  'Sargodha',
  'Punjab',
  '+923451234567',
  true,
  4.7,
  42,
  'active'
),
(
  '20000000-0000-0000-0000-000000000004',
  'vet.faizan@agribiz.pk',
  'consultant',
  'Dr. Faizan Tariq (DVM)',
  'Dr. Faizan Livestock Vet',
  'Veterinary Specialist for Dairy Cattle and Buffaloes. 10 years experience in herd vaccination and nutrition.',
  'Sahiwal, Punjab',
  'Sahiwal',
  'Punjab',
  '+923121234567',
  true,
  5.0,
  96,
  'active'
),
(
  '20000000-0000-0000-0000-000000000005',
  'zainab.engr@agribiz.pk',
  'student',
  'Engr. Zainab Ali',
  'Zainab AgriEng',
  'Graduate agricultural engineer from UAF specializing in solar-powered tubewells and CAD irrigation blueprints.',
  'Lahore, Punjab',
  'Lahore',
  'Punjab',
  '+923211234567',
  false,
  4.8,
  18,
  'trial'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  location = EXCLUDED.location,
  city = EXCLUDED.city,
  province = EXCLUDED.province,
  phone = EXCLUDED.phone,
  is_verified = EXCLUDED.is_verified,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count;

-- 3. Demo Listings
INSERT INTO public.listings (
  id, profile_id, category_id, title, description, price, currency, unit, quantity, location, city, province, is_featured, images, status
) VALUES
(
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  'Certified Akbar-2019 Wheat Grain (50 Metric Tons)',
  'Top quality harvest from Sargodha. Cleaned, moisture-tested below 10%, ready for immediate mill delivery or bulk storage.',
  4200.00,
  'PKR',
  'per 40kg bag (Maund)',
  1250,
  'Sargodha, Punjab',
  'Sargodha',
  'Punjab',
  true,
  ARRAY['https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&q=80&auto=format&fit=crop'],
  'active'
),
(
  '30000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000004',
  'High-Efficiency Drip Irrigation Pipe System (10-Acre Pack)',
  'Complete drip irrigation kit including main header pipes, lateral drip lines, venturi fertilizer injector, and screen filters. 3-year manufacturer warranty.',
  185000.00,
  'PKR',
  'complete 10-acre system',
  5,
  'Lahore, Punjab',
  'Lahore',
  'Punjab',
  true,
  ARRAY['https://images.unsplash.com/photo-1592982537447-6f296d9ccbd3?w=600&q=80&auto=format&fit=crop'],
  'active'
),
(
  '30000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000005',
  'Solar Tubewell Pump System 15HP with Tier-1 Panels',
  'Complete solar pumping solution for deep boreholes. Includes 15HP submersible motor, VFD inverter drive, and 24x 580W mono-perc solar panels.',
  980000.00,
  'PKR',
  'per full setup',
  3,
  'Multan, Punjab',
  'Multan',
  'Punjab',
  true,
  ARRAY['https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&q=80&auto=format&fit=crop'],
  'active'
),
(
  '30000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  'Super Basmati Rice (Paddy) 2025/2026 Season',
  'Aromatic extra-long grain paddy from Sheikhupura tract. Minimum broken percentage, export compliant.',
  6800.00,
  'PKR',
  'per 40kg',
  800,
  'Sheikhupura, Punjab',
  'Sheikhupura',
  'Punjab',
  false,
  ARRAY['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80&auto=format&fit=crop'],
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Demo Projects & RFPs
INSERT INTO public.projects (
  id, profile_id, category_id, title, description, budget_min, budget_max, currency, location, city, status, required_skills
) VALUES
(
  '40000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000006',
  'Consultant Needed for 50-Acre Citrus Drip Irrigation Design',
  'Looking for an experienced irrigation engineer to perform hydrological survey and design a pressure-compensated drip network for high-density kinnow trees.',
  40000.00,
  60000.00,
  'PKR',
  'Sargodha, Punjab',
  'Sargodha',
  'open',
  ARRAY['Drip Irrigation', 'CAD Layout', 'Water Testing', 'Pumping Calculations']
),
(
  '40000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  'Wheat Harvest Machinery Rental — 3 Combine Harvesters Required',
  'Need 3 tracked or wheeled combine harvesters for 15-day contract harvesting starting mid-April in Multan division.',
  100000.00,
  150000.00,
  'PKR',
  'Multan, Punjab',
  'Multan',
  'open',
  ARRAY['Combine Harvester', 'Wheat Harvest', 'Operator Included']
),
(
  '40000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000006',
  'Soil Chemistry & NPK Testing for 100-Acre Cotton Rotation',
  'Require comprehensive laboratory soil profile tests (pH, EC, Organic Matter, Available NPK, Micronutrients Zn/B).',
  15000.00,
  25000.00,
  'PKR',
  'Rahim Yar Khan, Punjab',
  'Rahim Yar Khan',
  'open',
  ARRAY['Soil Testing', 'Agronomy Report', 'Fertilizer Recommendation']
)
ON CONFLICT (id) DO NOTHING;

-- 5. Demo Problem Posts (Clinical Q&A)
INSERT INTO public.problem_posts (
  id, profile_id, title, body, tags, is_resolved, view_count
) VALUES
(
  '50000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000003',
  'Yellowing of lower leaves and curled edges on tomato crops',
  'Observed widespread yellowing of lower tomato leaves across 4 acres in Faisalabad. Soil moisture is normal. What pesticide or fertilizer adjustment is recommended?',
  ARRAY['Tomato', 'Leaf Yellowing', 'Nutrient Deficiency', 'Pest'],
  true,
  248
),
(
  '50000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000003',
  'Sudden drop in daily milk yield in Nili-Ravi buffalo herd',
  'Over the past 5 days, average daily milk yield dropped by 25% across 18 milking buffaloes. Feeds include green fodder (Lucerne) and concentrate mix.',
  ARRAY['Dairy', 'Buffalo', 'Milk Yield', 'Livestock Health'],
  false,
  180
)
ON CONFLICT (id) DO NOTHING;

-- 6. Demo Market Rates (Pakistani Mandis)
INSERT INTO public.market_rates (
  commodity, market, city, province, min_price, max_price, modal_price, unit, trend, rate_date
) VALUES
('Wheat (گندم)', 'Grain Market Multan', 'Multan', 'Punjab', 4150.00, 4250.00, 4200.00, '40 kg (Maund)', 'up', CURRENT_DATE),
('Super Basmati Rice (چاول)', 'Ghalla Mandi Faisalabad', 'Faisalabad', 'Punjab', 6700.00, 6950.00, 6850.00, '40 kg (Maund)', 'up', CURRENT_DATE),
('Cotton Phutti (کپاس)', 'Mandi Rahim Yar Khan', 'Rahim Yar Khan', 'Punjab', 8100.00, 8450.00, 8300.00, '40 kg (Maund)', 'down', CURRENT_DATE),
('Sugarcane (گنا)', 'Sargodha Sugar Zone', 'Sargodha', 'Punjab', 425.00, 450.00, 440.00, '40 kg (Maund)', 'stable', CURRENT_DATE),
('Maize / Corn (مکئی)', 'Sahiwal Grain Hub', 'Sahiwal', 'Punjab', 2850.00, 3050.00, 2950.00, '40 kg (Maund)', 'up', CURRENT_DATE),
('Urea Fertilizer (کھاد)', 'National Fertilizer Depot', 'Lahore', 'Punjab', 4850.00, 5100.00, 4950.00, '50 kg Bag', 'stable', CURRENT_DATE),
('DAP Fertilizer (ڈی اے پی)', 'Port Qasim Terminal', 'Karachi', 'Sindh', 12200.00, 12600.00, 12400.00, '50 kg Bag', 'up', CURRENT_DATE)
ON CONFLICT (commodity, COALESCE(market, ''), rate_date) DO NOTHING;

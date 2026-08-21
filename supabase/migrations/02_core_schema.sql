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

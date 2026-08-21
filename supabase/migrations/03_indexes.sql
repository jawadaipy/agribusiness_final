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

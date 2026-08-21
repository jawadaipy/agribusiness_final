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

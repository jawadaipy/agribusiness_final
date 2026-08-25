-- ================================================================
-- AgriBusiness — Migration 15: Payment System Upgrade
-- Adds EasyPaisa gateway, buyer role, subscription plans with
-- Standard (PKR 1,500/mo) and Enterprise (PKR 4,500/mo) tiers.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Add 'easypaisa' to payment_gateway enum
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'easypaisa'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_gateway'))
  THEN
    ALTER TYPE payment_gateway ADD VALUE 'easypaisa';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 2. Add 'buyer' to user_type enum (keeping 'org' for backward compat)
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'buyer'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_type'))
  THEN
    ALTER TYPE user_type ADD VALUE 'buyer';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 3. Subscription Plans table — defines pricing tiers
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id          UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT           NOT NULL UNIQUE,
  label       TEXT           NOT NULL,
  price_pkr   NUMERIC(10,2) NOT NULL CHECK (price_pkr >= 0),
  trial_days  INTEGER        NOT NULL DEFAULT 7,
  features    TEXT[]         NOT NULL DEFAULT '{}',
  for_roles   TEXT[]         NOT NULL,
  is_active   BOOLEAN        NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 4. Seed the two subscription plans
-- ----------------------------------------------------------------
INSERT INTO public.subscription_plans (name, label, price_pkr, trial_days, features, for_roles)
VALUES
  (
    'standard',
    'Normal User Plan',
    1500.00,
    14,
    ARRAY[
      'Publish products & services',
      'Post RFPs & requirements',
      'Access plant & animal clinic',
      'Network feed & updates',
      'Marketplace browsing & listing',
      'WhatsApp connect with sellers',
      'Smart matching & directory',
      'Mandi rate intelligence'
    ],
    ARRAY['farmer', 'buyer', 'consultant', 'student']
  ),
  (
    'enterprise',
    'Enterprise & Company Plan',
    4500.00,
    14,
    ARRAY[
      'Everything in Standard plan',
      'Priority listing placement',
      'Corporate ad studio & campaigns',
      'Unlimited product catalog',
      'B2B tender & contract system',
      'Advanced analytics dashboard',
      'Dedicated account support',
      'Corporate verification badge'
    ],
    ARRAY['company']
  )
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------
-- 5. Add plan_id reference to profiles
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'plan_id'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN plan_id UUID REFERENCES public.subscription_plans(id);
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 6. RLS for subscription_plans (publicly readable, admin writable)
-- ----------------------------------------------------------------
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plans_public_read" ON public.subscription_plans;
CREATE POLICY "subscription_plans_public_read" ON public.subscription_plans
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "subscription_plans_admin_manage" ON public.subscription_plans;
CREATE POLICY "subscription_plans_admin_manage" ON public.subscription_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- ----------------------------------------------------------------
-- 7. Update expire_trials() to support variable trial durations
-- ----------------------------------------------------------------
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
    'Your AgriBusiness trial has expired. Subscribe to unlock all features — plans start from PKR 1,500/month. Pay with JazzCash or EasyPaisa.',
    jsonb_build_object('action_url', '/pricing')
  FROM expired e;

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

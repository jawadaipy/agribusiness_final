-- ================================================================
-- AgriBusiness Pakistan — Migration 13
-- Sponsored placements: public impression/click tracking (SECURITY
-- DEFINER RPC, no client write access to ads rows) + two platform
-- demo creatives so the ad slots render immediately.
-- Safe to run multiple times.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Ad event tracking — anon-safe, increments only, never mutates
--    moderation fields.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.track_ad_event(p_ad_id UUID, p_event TEXT)
RETURNS void AS $$
BEGIN
  IF p_event = 'impression' THEN
    UPDATE public.ads SET impression_count = impression_count + 1 WHERE id = p_ad_id;
  ELSIF p_event = 'click' THEN
    UPDATE public.ads SET click_count = click_count + 1 WHERE id = p_ad_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.track_ad_event(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_ad_event(UUID, TEXT) TO anon, authenticated;

-- ----------------------------------------------------------------
-- 2. Platform demo ads (approved, dated window) — advertiser is the
--    demo company profile from migration 12. Replace or expire from
--    the admin Ads console at any time.
-- ----------------------------------------------------------------
INSERT INTO public.ads
  (id, profile_id, title, body, creative_url, target_url, starts_at, ends_at, status, rotation_order)
VALUES
  (
    '15000000-0000-0000-0000-000000000151',
    'o2000000-0000-0000-0000-000000000055',
    'GreenTech Solar Tubewells — Cut Your Diesel Bill by 70%',
    'Complete 7.5–15 HP solar pumping systems, installed in 3 weeks across Punjab and KP. Free site survey for AgriBusiness members.',
    'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&q=80&auto=format&fit=crop',
    '/apps/agri-biz',
    now() - interval '1 day',
    now() + interval '90 days',
    'approved',
    1
  ),
  (
    '15000000-0000-0000-0000-000000000152',
    'o2000000-0000-0000-0000-000000000055',
    'Mandi Rates Dashboard — Free for Every Member',
    'Live commodity boards across six mandis with honest day-over-day change. Wheat, basmati, cotton, maize, sugarcane, urea.',
    'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=1200&q=80&auto=format&fit=crop',
    '/rates',
    now() - interval '1 day',
    now() + interval '90 days',
    'approved',
    2
  )
ON CONFLICT (id) DO NOTHING;

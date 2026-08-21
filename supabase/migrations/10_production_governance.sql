-- ============================================================================
-- AgriBusiness — Migration 10: Production Governance & Connection Delivery
-- Apply only after 09_role_dashboard_security.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Role helper for administration. Public signup never creates this role.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT public.get_my_role() = 'admin';
$$;

-- ---------------------------------------------------------------------------
-- 2. Connection delivery: private in-app notifications are created by the
-- database, not the browser. The request table RLS remains party-only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_connection_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  requester_name TEXT;
BEGIN
  SELECT COALESCE(display_name, full_name, 'An AgriBusiness member')
  INTO requester_name
  FROM public.profiles
  WHERE id = NEW.requester_profile_id;

  INSERT INTO public.notifications (profile_id, type, title, body, metadata)
  VALUES (
    NEW.recipient_profile_id,
    'system',
    'New connection request',
    requester_name || ' would like to connect with you.',
    jsonb_build_object(
      'kind', 'connection_request',
      'connection_request_id', NEW.id,
      'requester_profile_id', NEW.requester_profile_id,
      'route', '/dashboard'
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_connection_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  recipient_name TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.status NOT IN ('accepted', 'declined', 'blocked') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, full_name, 'The recipient')
  INTO recipient_name
  FROM public.profiles
  WHERE id = NEW.recipient_profile_id;

  INSERT INTO public.notifications (profile_id, type, title, body, metadata)
  VALUES (
    NEW.requester_profile_id,
    'system',
    CASE WHEN NEW.status = 'accepted' THEN 'Connection request accepted' ELSE 'Connection request updated' END,
    CASE
      WHEN NEW.status = 'accepted' THEN recipient_name || ' accepted your connection request.'
      WHEN NEW.status = 'declined' THEN recipient_name || ' declined your connection request.'
      ELSE recipient_name || ' blocked your connection request.'
    END,
    jsonb_build_object(
      'kind', 'connection_decision',
      'connection_request_id', NEW.id,
      'recipient_profile_id', NEW.recipient_profile_id,
      'status', NEW.status,
      'route', '/dashboard'
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_connection_request ON public.connection_requests;
CREATE TRIGGER trg_notify_connection_request
AFTER INSERT ON public.connection_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_connection_request();

DROP TRIGGER IF EXISTS trg_notify_connection_decision ON public.connection_requests;
CREATE TRIGGER trg_notify_connection_decision
AFTER UPDATE OF status ON public.connection_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_connection_decision();

-- ---------------------------------------------------------------------------
-- 3. Audited Super Admin functions. Browser clients cannot directly perform
-- platform moderation; all administered actions receive immutable audit rows.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles:update:self_or_admin" ON public.profiles;
CREATE POLICY "profiles:update:self_non_system_fields"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "ads:update:admin" ON public.ads;

CREATE OR REPLACE FUNCTION public.super_admin_set_member_moderation(
  p_profile_id UUID,
  p_is_active BOOLEAN,
  p_is_verified BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  previous_profile JSONB;
  updated_profile JSONB;
  target_role public.user_type;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Super Admin access is required';
  END IF;
  IF p_profile_id = auth.uid() THEN
    RAISE EXCEPTION 'A Super Admin cannot change their own active or verified state here';
  END IF;

  SELECT to_jsonb(p), p.user_type INTO previous_profile, target_role
  FROM public.profiles p WHERE p.id = p_profile_id FOR UPDATE;
  IF previous_profile IS NULL THEN
    RAISE EXCEPTION 'Member profile not found';
  END IF;
  IF target_role = 'admin' THEN
    RAISE EXCEPTION 'Super Admin accounts require an out-of-band governance process';
  END IF;

  UPDATE public.profiles
  SET is_active = p_is_active, is_verified = p_is_verified, updated_at = now()
  WHERE id = p_profile_id;

  SELECT to_jsonb(p) INTO updated_profile FROM public.profiles p WHERE p.id = p_profile_id;
  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, old_val, new_val)
  VALUES (auth.uid(), 'member_moderation_updated', 'profiles', p_profile_id, previous_profile, updated_profile);
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_moderate_ad(
  p_ad_id UUID,
  p_status public.ad_status,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  previous_ad JSONB;
  updated_ad JSONB;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Super Admin access is required';
  END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Only approved or rejected are valid Super Admin decisions';
  END IF;
  IF p_status = 'rejected' AND NULLIF(trim(COALESCE(p_rejection_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'A rejection reason is required';
  END IF;

  SELECT to_jsonb(a) INTO previous_ad FROM public.ads a WHERE a.id = p_ad_id FOR UPDATE;
  IF previous_ad IS NULL THEN
    RAISE EXCEPTION 'Advertisement not found';
  END IF;

  UPDATE public.ads
  SET status = p_status,
      rejection_reason = CASE WHEN p_status = 'rejected' THEN trim(p_rejection_reason) ELSE NULL END,
      starts_at = CASE WHEN p_status = 'approved' AND starts_at IS NULL THEN now() ELSE starts_at END,
      updated_at = now()
  WHERE id = p_ad_id;

  SELECT to_jsonb(a) INTO updated_ad FROM public.ads a WHERE a.id = p_ad_id;
  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, old_val, new_val)
  VALUES (auth.uid(), 'advertisement_moderated', 'ads', p_ad_id, previous_ad, updated_ad);
END;
$$;

REVOKE ALL ON FUNCTION public.super_admin_set_member_moderation(UUID, BOOLEAN, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.super_admin_moderate_ad(UUID, public.ad_status, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.super_admin_set_member_moderation(UUID, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_moderate_ad(UUID, public.ad_status, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.super_admin_set_category_state(
  p_category_id UUID,
  p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  previous_category JSONB;
  updated_category JSONB;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Super Admin access is required';
  END IF;

  SELECT to_jsonb(c) INTO previous_category FROM public.categories c WHERE c.id = p_category_id FOR UPDATE;
  IF previous_category IS NULL THEN
    RAISE EXCEPTION 'Category not found';
  END IF;

  UPDATE public.categories SET is_active = p_is_active WHERE id = p_category_id;
  SELECT to_jsonb(c) INTO updated_category FROM public.categories c WHERE c.id = p_category_id;
  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, old_val, new_val)
  VALUES (auth.uid(), 'category_state_updated', 'categories', p_category_id, previous_category, updated_category);
END;
$$;

REVOKE ALL ON FUNCTION public.super_admin_set_category_state(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.super_admin_set_category_state(UUID, BOOLEAN) TO authenticated;

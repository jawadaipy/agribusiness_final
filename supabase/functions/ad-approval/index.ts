/**
 * ad-approval Edge Function
 *
 * POST /functions/v1/ad-approval
 * Authorization: Bearer <admin-jwt>
 *
 * Request body:
 *   { ad_id: string, action: 'approve' | 'reject', rejection_reason?: string }
 *
 * Flow:
 *   1. Verify caller is admin (server-side role check)
 *   2. Update ad status
 *   3. Write admin_audit_log entry
 *   4. Notify the advertiser
 *
 * ENV VARS REQUIRED:
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return respond({ error: 'Authorization required' }, 401)

    // ----------------------------------------------------------------
    // Verify caller identity and admin role
    // ----------------------------------------------------------------
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return respond({ error: 'Invalid token' }, 401)

    // Service-role client for all writes (bypasses RLS on purpose — admin action)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Server-side role check — never trust client JWT claims
    const { data: caller, error: roleErr } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (roleErr || caller?.user_type !== 'admin') {
      return respond({ error: 'Forbidden: admin access required' }, 403)
    }

    // ----------------------------------------------------------------
    // Parse and validate request
    // ----------------------------------------------------------------
    const { ad_id, action, rejection_reason } = await req.json()

    if (!ad_id) return respond({ error: '"ad_id" is required' }, 400)
    if (!['approve', 'reject'].includes(action)) {
      return respond({ error: '"action" must be "approve" or "reject"' }, 400)
    }

    // ----------------------------------------------------------------
    // Fetch current ad state (for audit log diff)
    // ----------------------------------------------------------------
    const { data: oldAd, error: fetchErr } = await supabase
      .from('ads')
      .select('*')
      .eq('id', ad_id)
      .single()

    if (fetchErr || !oldAd) return respond({ error: 'Ad not found' }, 404)

    if (!['pending', 'rejected'].includes(oldAd.status)) {
      return respond(
        { error: `Cannot ${action} an ad with status "${oldAd.status}"` },
        409,
      )
    }

    // ----------------------------------------------------------------
    // Apply status update
    // ----------------------------------------------------------------
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    const updatePayload: Record<string, unknown> = { status: newStatus }

    if (newStatus === 'approved') {
      // Set default window if not provided
      updatePayload.rejection_reason = null
      if (!oldAd.starts_at) {
        updatePayload.starts_at = new Date().toISOString()
      }
      if (!oldAd.ends_at) {
        // Default to plan duration if available
        if (oldAd.ad_plan_id) {
          const { data: plan } = await supabase
            .from('ad_plans')
            .select('duration_days')
            .eq('id', oldAd.ad_plan_id)
            .single()
          if (plan) {
            const end = new Date()
            end.setDate(end.getDate() + plan.duration_days)
            updatePayload.ends_at = end.toISOString()
          }
        }
      }
    } else {
      updatePayload.rejection_reason = rejection_reason ?? null
    }

    const { data: updatedAd, error: updateErr } = await supabase
      .from('ads')
      .update(updatePayload)
      .eq('id', ad_id)
      .select()
      .single()

    if (updateErr) throw new Error(updateErr.message)

    // ----------------------------------------------------------------
    // Write audit log entry
    // ----------------------------------------------------------------
    await supabase.from('admin_audit_log').insert({
      admin_id: user.id,
      action: `ad_${action}`,
      target_table: 'ads',
      target_id: ad_id,
      old_val: oldAd,
      new_val: updatedAd,
    })

    // ----------------------------------------------------------------
    // Notify advertiser
    // ----------------------------------------------------------------
    const notifTitle = action === 'approve' ? '🎉 Ad Approved!' : 'Ad Rejected'
    const notifBody =
      action === 'approve'
        ? `Your ad "${oldAd.title}" has been approved and is now live on AgriBusiness.`
        : `Your ad "${oldAd.title}" was not approved. ${rejection_reason ? `Reason: ${rejection_reason}` : 'Please review and resubmit.'}`

    await supabase.from('notifications').insert({
      profile_id: oldAd.profile_id,
      type: action === 'approve' ? 'ad_approved' : 'ad_rejected',
      title: notifTitle,
      body: notifBody,
      metadata: { ad_id, action },
    })

    return respond({ success: true, ad: updatedAd })
  } catch (err) {
    console.error('ad-approval error:', err)
    return respond({ error: (err as Error).message }, 500)
  }
})

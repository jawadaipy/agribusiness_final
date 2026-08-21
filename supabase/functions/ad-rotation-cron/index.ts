/**
 * ad-rotation-cron Edge Function
 *
 * Called weekly on Sundays at 00:00 UTC by pg_cron (see 07_functions.sql).
 * Delegates to the rotate_ads() SQL function which:
 *   1. Sets status = 'expired' for approved ads whose ends_at has passed
 *   2. Randomises rotation_order within each (category, location) ad pool
 *
 * ENV VARS REQUIRED:
 *   CRON_SECRET
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization') ?? ''
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    console.warn('ad-rotation-cron: unauthorized attempt')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const { error } = await supabase.rpc('rotate_ads')

    if (error) {
      console.error('rotate_ads() error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    // Count remaining active ads after rotation (informational)
    const { count } = await supabase
      .from('ads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')

    const result = {
      ok: true,
      active_ads_after_rotation: count ?? 0,
      ran_at: new Date().toISOString(),
    }

    console.log('ad-rotation-cron completed:', result)
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('ad-rotation-cron unexpected error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 })
  }
})

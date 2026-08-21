/**
 * trial-expiry-cron Edge Function
 *
 * Called daily at 02:00 UTC by pg_cron (see 07_functions.sql).
 * Delegates to the expire_trials() SQL function which atomically:
 *   1. Flips subscription_status from 'trial' → 'expired' for qualifying profiles
 *   2. Inserts an in-app notification for each expired profile
 *
 * Security: validated by CRON_SECRET bearer token.
 *
 * ENV VARS REQUIRED:
 *   CRON_SECRET               — shared secret set in pg_cron job config
 *   SUPABASE_URL              — auto-injected
 *   SUPABASE_SERVICE_ROLE_KEY — auto-injected
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  // ----------------------------------------------------------------
  // Validate cron secret (prevent public invocation)
  // ----------------------------------------------------------------
  const authHeader = req.headers.get('Authorization') ?? ''
  const expectedToken = `Bearer ${Deno.env.get('CRON_SECRET')}`

  if (authHeader !== expectedToken) {
    console.warn('trial-expiry-cron: unauthorized attempt')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const { data: expiredCount, error } = await supabase.rpc('expire_trials')

    if (error) {
      console.error('expire_trials() error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    const result = {
      ok: true,
      expired_count: expiredCount,
      ran_at: new Date().toISOString(),
    }

    console.log('trial-expiry-cron completed:', result)
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('trial-expiry-cron unexpected error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 })
  }
})

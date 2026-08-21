/**
 * on-signup Edge Function (alternative to DB trigger)
 *
 * This is the Auth Hook version — configure in Supabase Dashboard:
 *   Authentication → Hooks → "After user creation" → point to this function URL.
 *
 * The primary implementation lives in 04_triggers.sql (fn_handle_new_user).
 * Use this Edge Function if you need additional logic on signup
 * (e.g., sending a welcome email, Slack notification, CRM sync).
 *
 * ENV VARS REQUIRED:
 *   SUPABASE_URL              — auto-injected by Supabase runtime
 *   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase runtime
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Supabase Auth Hooks send a POST with { type, event, user }
    const payload = await req.json()
    const { type, user } = payload

    if (type !== 'signup' || !user) {
      return new Response(JSON.stringify({ message: 'Not a signup event' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const requestedType = user.user_metadata?.user_type as string | undefined
    const ALLOWED_TYPES = ['student', 'company', 'consultant', 'farmer', 'org']
    const safeType = ALLOWED_TYPES.includes(requestedType ?? '')
      ? requestedType!
      : 'farmer'

    // Upsert profile (DB trigger may have already created it)
    const { error } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email ?? '',
        full_name: user.user_metadata?.full_name ?? '',
        user_type: safeType,
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        subscription_status: 'trial',
      },
      { onConflict: 'id', ignoreDuplicates: false },
    )

    if (error) {
      console.error('on-signup profile upsert error:', error)
      // Return 200 to avoid Supabase auth hook retry loops
      return new Response(JSON.stringify({ error: error.message }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ----------------------------------------------------------------
    // EXTEND HERE: welcome email, CRM, Slack notification, etc.
    // ----------------------------------------------------------------

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('on-signup unexpected error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 200, // 200 to avoid retry loop
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

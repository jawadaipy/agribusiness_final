/**
 * match-suggestions Edge Function
 *
 * POST /functions/v1/match-suggestions
 * Authorization: Bearer <user-jwt>  (authenticated)
 *
 * Given a problem_post or profile, returns top-N similar profiles.
 *
 * Request body:
 *   { source_type: 'problem_post' | 'profile', source_id: string, limit?: number }
 *
 * Flow:
 *   1. Load source entity (problem_post or profile keywords)
 *   2. Build a composite text from title/body/keywords
 *   3. Generate embedding via OpenAI
 *   4. Call match_profiles() SQL function
 *   5. Return ranked suggestions, excluding the source profile itself
 *
 * ENV VARS REQUIRED:
 *   OPENAI_API_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings'
const EMBED_MODEL = 'text-embedding-3-small'

async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) return null

  const res = await fetch(OPENAI_EMBED_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  })
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`)
  const json = await res.json()
  return json.data[0].embedding as number[]
}

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

    // Require authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return respond({ error: 'Authorization header required' }, 401)

    const { source_type, source_id, limit = 5 } = await req.json()

    if (!source_type || !source_id) {
      return respond({ error: '"source_type" and "source_id" are required' }, 400)
    }
    if (!['problem_post', 'profile'].includes(source_type)) {
      return respond({ error: '"source_type" must be "problem_post" or "profile"' }, 400)
    }

    const clampedLimit = Math.min(Math.max(Number(limit) || 5, 1), 20)

    // Use service role for data reads (bypasses RLS for cross-user matching)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Also verify the requesting user exists
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return respond({ error: 'Invalid or expired token' }, 401)

    // ----------------------------------------------------------------
    // Build query text + location from source entity
    // ----------------------------------------------------------------
    let queryText = ''
    let location: string | null = null
    let excludeProfileId: string | null = null

    if (source_type === 'problem_post') {
      const { data: post, error } = await supabase
        .from('problem_posts')
        .select('title, body, profile_id, profiles(city, province)')
        .eq('id', source_id)
        .single()

      if (error || !post) return respond({ error: 'Problem post not found' }, 404)

      queryText = `${post.title} ${post.body}`
      // @ts-ignore: nested select typing
      const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
      location = profile?.city ?? null
      excludeProfileId = post.profile_id
    } else {
      // source_type === 'profile'
      const [{ data: keywords }, { data: profile }] = await Promise.all([
        supabase
          .from('profile_keywords')
          .select('keyword')
          .eq('profile_id', source_id),
        supabase
          .from('profiles')
          .select('city, bio')
          .eq('id', source_id)
          .single(),
      ])

      if (!profile) return respond({ error: 'Profile not found' }, 404)

      queryText = [
        ...(keywords ?? []).map((k: { keyword: string }) => k.keyword),
        profile.bio ?? '',
      ]
        .filter(Boolean)
        .join(' ')

      location = profile.city ?? null
      excludeProfileId = source_id
    }

    if (!queryText.trim()) {
      return respond({ suggestions: [], meta: { source_type, source_id } })
    }

    // ----------------------------------------------------------------
    // Generate embedding (graceful fallback to keyword-only)
    // ----------------------------------------------------------------
    let embedding: number[] | null = null
    try {
      embedding = await generateEmbedding(queryText.slice(0, 2000)) // token limit safety
    } catch (e) {
      console.warn('Embedding generation failed, using keyword-only match:', e)
    }

    // ----------------------------------------------------------------
    // Call match_profiles and exclude the source profile itself
    // ----------------------------------------------------------------
    const { data: matches, error: matchErr } = await supabase.rpc('match_profiles', {
      query_embedding: embedding,
      query_text: queryText.slice(0, 500),
      match_count: clampedLimit + 1, // fetch one extra to account for self-exclusion
      filter_location: location,
    })

    if (matchErr) throw new Error(matchErr.message)

    const suggestions = (matches ?? [])
      .filter((m: { profile_id: string }) => m.profile_id !== excludeProfileId)
      .slice(0, clampedLimit)

    return respond({
      suggestions,
      meta: {
        source_type,
        source_id,
        query_length: queryText.length,
        location,
        used_vector: embedding !== null,
      },
    })
  } catch (err) {
    console.error('match-suggestions error:', err)
    return respond({ error: (err as Error).message }, 500)
  }
})

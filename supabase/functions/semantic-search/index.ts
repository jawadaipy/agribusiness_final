/**
 * semantic-search Edge Function
 *
 * POST /functions/v1/semantic-search
 *
 * Request body:
 *   { query: string, limit?: number, location?: string }
 *
 * Flow:
 *   1. Generate OpenAI text-embedding-3-small vector for the query
 *   2. Call match_profiles() SQL function (hybrid vector + keyword)
 *   3. Return ranked profile results
 *
 * ENV VARS REQUIRED:
 *   OPENAI_API_KEY            — for embedding generation
 *   SUPABASE_URL              — auto-injected
 *   SUPABASE_SERVICE_ROLE_KEY — auto-injected
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings'
const EMBED_MODEL = 'text-embedding-3-small'

async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch(OPENAI_EMBED_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenAI embedding error ${res.status}: ${body}`)
  }

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

    const { query, limit = 10, location } = await req.json()

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return respond({ error: '"query" is required and must be a non-empty string' }, 400)
    }

    const clampedLimit = Math.min(Math.max(Number(limit) || 10, 1), 50)

    // Try to get embedding; fall back to keyword-only if OpenAI key is missing
    let embedding: number[] | null = null
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (openaiKey) {
      try {
        embedding = await generateEmbedding(query.trim())
      } catch (embErr) {
        console.warn('Embedding generation failed, falling back to keyword-only:', embErr)
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data, error } = await supabase.rpc('match_profiles', {
      query_embedding: embedding,       // NULL triggers keyword-only mode in SQL
      query_text: query.trim(),
      match_count: clampedLimit,
      filter_location: location ?? null,
    })

    if (error) throw new Error(error.message)

    return respond({
      results: data ?? [],
      meta: {
        query,
        limit: clampedLimit,
        location: location ?? null,
        used_vector: embedding !== null,
      },
    })
  } catch (err) {
    console.error('semantic-search error:', err)
    return respond({ error: (err as Error).message }, 500)
  }
})

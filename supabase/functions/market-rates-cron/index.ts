/**
 * market-rates-cron Edge Function
 *
 * Called daily at 06:00 UTC by pg_cron (see 07_functions.sql).
 * Fetches today's commodity/agri prices from KisanMandi/APTMA API
 * and upserts them into the market_rates table.
 *
 * Data Source: KisanMandi (kisanmandi.com)
 *   - Pakistan's leading agricultural market information portal
 *   - Covers ~50+ commodities across Punjab, Sindh, KPK, Balochistan
 *   - API endpoint: contact kisanmandi.com for commercial API access
 *   - Alternative: Pakistan Mercantile Exchange (PMEX) for futures prices
 *   - Alternative: FAO GIEWS (https://fpma.apps.fao.org) — free, no key needed
 *     for international benchmark prices
 *
 * ⚠ PLACEHOLDER: The fetchRatesFromKisanMandi() function below is a
 *   stub with the correct interface. Replace the API call URL and
 *   response mapping with the actual KisanMandi API contract once
 *   you have API access credentials.
 *
 * ENV VARS REQUIRED:
 *   KISANMANDI_API_KEY        — from kisanmandi.com developer portal
 *   KISANMANDI_API_URL        — e.g. https://api.kisanmandi.com/v1/rates/today
 *   CRON_SECRET
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ----------------------------------------------------------------
// Type definitions
// ----------------------------------------------------------------
interface CommodityRate {
  commodity: string
  variety?: string
  unit: string
  price: number
  currency: string
  market: string
  province: string
}

// ----------------------------------------------------------------
// KisanMandi API adapter
// ⚠ Replace this stub with the real API call once you have access.
// ----------------------------------------------------------------
async function fetchRatesFromKisanMandi(): Promise<CommodityRate[]> {
  const apiKey = Deno.env.get('KISANMANDI_API_KEY')
  const apiUrl = Deno.env.get('KISANMANDI_API_URL') ??
    'https://api.kisanmandi.com/v1/rates/today'

  if (!apiKey) {
    console.warn('KISANMANDI_API_KEY not set; returning stub data for testing')
    // Return minimal stub so the function doesn't hard-fail in dev
    return getStubRates()
  }

  const res = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`KisanMandi API responded with ${res.status}: ${await res.text()}`)
  }

  const json = await res.json()

  // ⚠ Adjust field mapping to match actual KisanMandi API response schema
  const items: Record<string, unknown>[] = json.data ?? json.rates ?? json ?? []
  return items.map((item) => ({
    commodity: String(item.commodity_name ?? item.commodity ?? item.name),
    variety: item.variety ? String(item.variety) : undefined,
    unit: String(item.unit ?? 'per_kg'),
    price: parseFloat(String(item.price ?? item.rate ?? 0)),
    currency: 'PKR',
    market: String(item.market ?? item.mandi ?? ''),
    province: String(item.province ?? item.region ?? ''),
  }))
}

// ----------------------------------------------------------------
// Stub rates (used when no API key is configured)
// ----------------------------------------------------------------
function getStubRates(): CommodityRate[] {
  return [
    { commodity: 'Wheat', variety: 'Chakwal-50', unit: 'per_40kg', price: 4800, currency: 'PKR', market: 'Lahore Mandi', province: 'Punjab' },
    { commodity: 'Rice', variety: 'Basmati 1121', unit: 'per_40kg', price: 8200, currency: 'PKR', market: 'Gujranwala', province: 'Punjab' },
    { commodity: 'Maize', variety: 'Hybrid', unit: 'per_40kg', price: 3200, currency: 'PKR', market: 'Faisalabad', province: 'Punjab' },
    { commodity: 'Tomato', unit: 'per_kg', price: 120, currency: 'PKR', market: 'Multan', province: 'Punjab' },
    { commodity: 'Potato', unit: 'per_kg', price: 65, currency: 'PKR', market: 'Okara', province: 'Punjab' },
    { commodity: 'Onion', unit: 'per_kg', price: 90, currency: 'PKR', market: 'Khairpur', province: 'Sindh' },
    { commodity: 'Sugarcane', unit: 'per_40kg', price: 450, currency: 'PKR', market: 'Dera Ismail Khan', province: 'KPK' },
    { commodity: 'Cotton', variety: 'MNH-886', unit: 'per_40kg', price: 8500, currency: 'PKR', market: 'Multan', province: 'Punjab' },
  ]
}

// ----------------------------------------------------------------
// Main handler
// ----------------------------------------------------------------
Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization') ?? ''
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const rates = await fetchRatesFromKisanMandi()

    if (rates.length === 0) {
      return new Response(JSON.stringify({ ok: true, ingested: 0, note: 'No rates returned from API' }))
    }

    // Build records with source and timestamp
    const now = new Date().toISOString()
    const records = rates.map((r) => ({
      ...r,
      source: 'kisanmandi',
      recorded_at: now,
    }))

    // Upsert in batches of 100 to avoid payload limits
    let totalInserted = 0
    const BATCH = 100
    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH)
      // ON CONFLICT handled by the unique functional index in 03_indexes.sql
      // Using insert with ignoreDuplicates since the index is on commodity+market+(date)
      const { count, error } = await supabase
        .from('market_rates')
        .insert(batch, { count: 'exact' })

      if (error) {
        // Log but continue — duplicate key errors are expected on re-run
        if (!error.message.includes('duplicate')) {
          console.error('market_rates insert error:', error.message)
        }
      } else {
        totalInserted += count ?? 0
      }
    }

    const result = {
      ok: true,
      fetched: rates.length,
      ingested: totalInserted,
      ran_at: now,
    }
    console.log('market-rates-cron completed:', result)
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('market-rates-cron error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 })
  }
})

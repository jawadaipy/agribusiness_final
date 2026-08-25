/**
 * easypaisa-webhook Edge Function
 *
 * POST /functions/v1/easypaisa-webhook
 * No auth header — validated by HMAC-SHA256 signature.
 *
 * EasyPaisa IPN (Instant Payment Notification) handler.
 * Validates the incoming payment notification, then updates
 * payments and subscriptions accordingly.
 *
 * Integration notes:
 *   - Register this URL in EasyPaisa Merchant Portal → IPN/Callback Settings
 *   - URL: https://<ref>.supabase.co/functions/v1/easypaisa-webhook
 *   - During payment initiation, store profile_id in orderId
 *     as "user:<profile_uuid>" so we can identify the user here.
 *   - For subscription payments, set storeId with plan identifier.
 *
 * ENV VARS REQUIRED:
 *   EASYPAISA_STORE_ID        — from EasyPaisa Merchant Portal
 *   EASYPAISA_HASH_KEY        — HMAC key from EasyPaisa
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'node:crypto'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// ----------------------------------------------------------------
// HMAC-SHA256 validation for EasyPaisa
// EasyPaisa signs IPN fields sorted alphabetically, joined by '&',
// prefixed with the hash key.
// ----------------------------------------------------------------
function verifyEasyPaisaHmac(
  params: Record<string, string>,
  hashKey: string,
  receivedHash: string,
): boolean {
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== 'hash' && k !== 'hashType')
    .sort()

  const signatureString = [hashKey, ...sortedKeys.map((k) => params[k] ?? '')].join('&')

  const computed = createHmac('sha256', hashKey)
    .update(signatureString)
    .digest('hex')
    .toUpperCase()

  return computed === (receivedHash ?? '').toUpperCase()
}

// ----------------------------------------------------------------
// Parse incoming body (EasyPaisa sends URL-encoded or JSON)
// ----------------------------------------------------------------
async function parseBody(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return await req.json()
  }
  const text = await req.text()
  const params: Record<string, string> = {}
  new URLSearchParams(text).forEach((v, k) => { params[k] = v })
  return params
}

// ----------------------------------------------------------------
// Determine plan name from amount
// ----------------------------------------------------------------
function resolvePlanFromAmount(amountPkr: number): string {
  if (amountPkr >= 4500) return 'enterprise'
  return 'standard'
}

// ----------------------------------------------------------------
// Main handler
// ----------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const hashKey = Deno.env.get('EASYPAISA_HASH_KEY')
  if (!hashKey) {
    console.error('EASYPAISA_HASH_KEY not configured')
    return new Response('Server configuration error', { status: 500 })
  }

  let params: Record<string, string>
  try {
    params = await parseBody(req)
  } catch {
    return new Response('Invalid request body', { status: 400 })
  }

  // ----------------------------------------------------------------
  // Validate HMAC signature
  // ----------------------------------------------------------------
  const receivedHash = params.hash ?? ''
  if (!receivedHash || !verifyEasyPaisaHmac(params, hashKey, receivedHash)) {
    console.error('EasyPaisa HMAC verification failed', {
      received: receivedHash,
      params: Object.keys(params),
    })
    return new Response('Invalid signature', { status: 400 })
  }

  // ----------------------------------------------------------------
  // Extract payment fields
  // ----------------------------------------------------------------
  const responseCode = params.responseCode       // '0000' = success for EasyPaisa
  const transactionId = params.transactionId     // unique transaction ref
  const amountStr = params.amount ?? '0'
  const amountPkr = parseFloat(amountStr)
  const txnType = params.paymentType ?? ''       // 'subscription', 'ad', etc.

  // Profile ID is stored in orderId as "user:<uuid>" during payment init
  const orderId = params.orderId ?? ''
  const profileId = orderId.startsWith('user:')
    ? orderId.replace('user:', '').trim()
    : null

  const isSuccess = responseCode === '0000'

  console.log('EasyPaisa IPN received', { transactionId, responseCode, isSuccess, profileId, txnType })

  if (!profileId) {
    console.warn('EasyPaisa IPN: could not extract profile_id from orderId:', orderId)
    return new Response('OK', { status: 200 })
  }

  try {
    // ----------------------------------------------------------------
    // Upsert payment record
    // ----------------------------------------------------------------
    await supabase.from('payments').upsert(
      {
        profile_id: profileId,
        amount: amountPkr,
        currency: 'PKR',
        gateway: 'easypaisa',
        gateway_payment_id: transactionId,
        status: isSuccess ? 'completed' : 'failed',
        description: `EasyPaisa ${txnType || 'payment'}`,
        metadata: params,
      },
      { onConflict: 'gateway_payment_id' },
    )

    if (isSuccess) {
      // ----------------------------------------------------------------
      // Handle subscription activation
      // ----------------------------------------------------------------
      if (txnType === 'subscription' || !txnType) {
        const planName = resolvePlanFromAmount(amountPkr)
        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

        await Promise.all([
          supabase.from('subscriptions').upsert(
            {
              profile_id: profileId,
              plan_name: planName,
              status: 'active',
              gateway: 'easypaisa',
              gateway_sub_id: transactionId,
              amount: amountPkr,
              currency: 'PKR',
              current_period_start: new Date().toISOString(),
              current_period_end: periodEnd.toISOString(),
            },
            { onConflict: 'gateway_sub_id' },
          ),
          supabase.from('profiles')
            .update({ subscription_status: 'active' })
            .eq('id', profileId),
        ])

        await supabase.from('notifications').insert({
          profile_id: profileId,
          type: 'payment_success',
          title: '✅ Payment Successful!',
          body: `Your EasyPaisa payment of PKR ${amountPkr.toLocaleString()} was received. Subscription is now active.`,
          metadata: { transactionId, gateway: 'easypaisa' },
        })
      }
      // ----------------------------------------------------------------
      // Handle ad plan purchase
      // ----------------------------------------------------------------
      else if (txnType === 'ad') {
        const adId = params.adId ?? null
        if (adId) {
          await supabase.from('payments')
            .update({ ad_id: adId })
            .eq('gateway_payment_id', transactionId)

          await supabase.from('notifications').insert({
            profile_id: profileId,
            type: 'payment_success',
            title: '✅ Ad Payment Received',
            body: 'Your ad payment has been received and is pending admin approval.',
            metadata: { transactionId, ad_id: adId },
          })
        }
      }
    } else {
      // ----------------------------------------------------------------
      // Payment failed
      // ----------------------------------------------------------------
      await supabase.from('notifications').insert({
        profile_id: profileId,
        type: 'payment_failed',
        title: '⚠️ Payment Failed',
        body: `Your EasyPaisa payment could not be processed (code: ${responseCode}). Please try again or use a different payment method.`,
        metadata: { transactionId, responseCode },
      })
    }
  } catch (err) {
    console.error('EasyPaisa webhook processing error:', err)
  }

  return new Response('OK', { status: 200 })
})

/**
 * jazzcash-webhook Edge Function
 *
 * POST /functions/v1/jazzcash-webhook
 * No auth header — validated by HMAC-SHA256 signature (pp_SecureHash).
 *
 * JazzCash IPN (Instant Payment Notification) handler.
 * Validates the incoming payment notification, then updates
 * payments and subscriptions accordingly.
 *
 * Integration notes:
 *   - Register this URL in JazzCash Merchant Portal → IPN Settings
 *   - URL: https://<ref>.supabase.co/functions/v1/jazzcash-webhook
 *   - During payment initiation, store profile_id in pp_BillReference
 *     as "user:<profile_uuid>" so we can identify the user here.
 *   - For subscription payments, set pp_TxnType = "subscription" in
 *     your payment initiation call.
 *
 * JazzCash API docs: https://sandbox.jazzcash.com.pk/documentations
 *
 * ENV VARS REQUIRED:
 *   JAZZCASH_INTEGRITY_SALT   — from JazzCash Merchant Portal
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
// HMAC-SHA256 validation
// JazzCash signs all IPN fields (sorted, excluding pp_SecureHash)
// prefixed with the integrity salt, joined by '&'.
// ----------------------------------------------------------------
function verifyJazzCashHmac(
  params: Record<string, string>,
  salt: string,
  receivedHash: string,
): boolean {
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== 'pp_SecureHash' && k !== 'pp_SecureHashType')
    .sort()

  const signatureString = [salt, ...sortedKeys.map((k) => params[k] ?? '')].join('&')

  const computed = createHmac('sha256', salt)
    .update(signatureString)
    .digest('hex')
    .toUpperCase()

  return computed === (receivedHash ?? '').toUpperCase()
}

// ----------------------------------------------------------------
// Parse incoming body (JazzCash sends URL-encoded or JSON)
// ----------------------------------------------------------------
async function parseBody(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return await req.json()
  }
  // Default: application/x-www-form-urlencoded
  const text = await req.text()
  const params: Record<string, string> = {}
  new URLSearchParams(text).forEach((v, k) => { params[k] = v })
  return params
}

// ----------------------------------------------------------------
// Main handler
// ----------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const salt = Deno.env.get('JAZZCASH_INTEGRITY_SALT')
  if (!salt) {
    console.error('JAZZCASH_INTEGRITY_SALT not configured')
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
  const receivedHash = params.pp_SecureHash ?? ''
  if (!receivedHash || !verifyJazzCashHmac(params, salt, receivedHash)) {
    console.error('JazzCash HMAC verification failed', {
      received: receivedHash,
      params: Object.keys(params),
    })
    return new Response('Invalid signature', { status: 400 })
  }

  // ----------------------------------------------------------------
  // Extract payment fields
  // ----------------------------------------------------------------
  const responseCode = params.pp_ResponseCode    // '000' = success
  const txnRefNo    = params.pp_TxnRefNo         // unique transaction ref
  // Amount in JazzCash is in paise (PKR × 100)
  const amountPaise = parseInt(params.pp_Amount ?? '0', 10)
  const amountPkr   = amountPaise / 100
  const txnType     = params.pp_TxnType ?? ''    // 'subscription', 'ad', etc.

  // Profile ID is stored in pp_BillReference as "user:<uuid>" during payment init
  const billRef = params.pp_BillReference ?? ''
  const profileId = billRef.startsWith('user:')
    ? billRef.replace('user:', '').trim()
    : null

  const isSuccess = responseCode === '000'

  console.log('JazzCash IPN received', { txnRefNo, responseCode, isSuccess, profileId, txnType })

  if (!profileId) {
    // Log but still return 200 — JazzCash retries on non-200
    console.warn('JazzCash IPN: could not extract profile_id from pp_BillReference:', billRef)
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
        gateway: 'jazzcash',
        gateway_payment_id: txnRefNo,
        status: isSuccess ? 'completed' : 'failed',
        description: `JazzCash ${txnType || 'payment'}: ${params.pp_TxnType ?? ''}`,
        metadata: params,
      },
      { onConflict: 'gateway_payment_id' },
    )

    if (isSuccess) {
      // ----------------------------------------------------------------
      // Handle subscription activation
      // ----------------------------------------------------------------
      if (txnType === 'subscription') {
        const planName = params.pp_SubMerchantId ?? params.pp_ProductID ?? 'standard'
        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

        await Promise.all([
          supabase.from('subscriptions').upsert(
            {
              profile_id: profileId,
              plan_name: planName,
              status: 'active',
              gateway: 'jazzcash',
              gateway_sub_id: txnRefNo,
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
          body: `Your JazzCash payment of PKR ${amountPkr.toLocaleString()} was received. Subscription is now active.`,
          metadata: { txnRefNo, gateway: 'jazzcash' },
        })
      }
      // ----------------------------------------------------------------
      // Handle ad plan purchase
      // ----------------------------------------------------------------
      else if (txnType === 'ad') {
        const adId = params.pp_OrderID ?? null
        if (adId) {
          // Link payment to ad and mark ad as ready for approval
          await supabase.from('payments')
            .update({ ad_id: adId })
            .eq('gateway_payment_id', txnRefNo)

          await supabase.from('notifications').insert({
            profile_id: profileId,
            type: 'payment_success',
            title: '✅ Ad Payment Received',
            body: 'Your ad payment has been received and is pending admin approval.',
            metadata: { txnRefNo, ad_id: adId },
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
        body: `Your JazzCash payment could not be processed (code: ${responseCode}). Please try again or use a different payment method.`,
        metadata: { txnRefNo, responseCode },
      })
    }
  } catch (err) {
    console.error('JazzCash webhook processing error:', err)
    // Still return 200 to stop JazzCash retries
  }

  // JazzCash expects HTTP 200 OK to stop retrying
  return new Response('OK', { status: 200 })
})

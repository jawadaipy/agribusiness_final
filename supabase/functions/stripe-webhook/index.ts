/**
 * stripe-webhook Edge Function
 *
 * POST /functions/v1/stripe-webhook
 * No auth header — validated by Stripe-Signature HMAC.
 *
 * Handles:
 *   checkout.session.completed    → activate subscription + record payment
 *   invoice.payment_succeeded     → renew subscription period
 *   invoice.payment_failed        → log failure + notify user
 *   customer.subscription.deleted → cancel subscription + notify user
 *
 * Setup in Stripe Dashboard:
 *   Developers → Webhooks → Add endpoint
 *   URL: https://<ref>.supabase.co/functions/v1/stripe-webhook
 *   Events: checkout.session.completed, invoice.payment_succeeded,
 *           invoice.payment_failed, customer.subscription.deleted
 *
 * ENV VARS REQUIRED:
 *   STRIPE_SECRET_KEY      — sk_live_... or sk_test_...
 *   STRIPE_WEBHOOK_SECRET  — whsec_... (from Stripe webhook config)
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=deno&deno-std=0.132.0'

// Stripe client with Deno-compatible fetch adapter
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
async function activateSubscription(
  profileId: string,
  planName: string,
  stripeSubId: string,
  customerId: string,
  periodEnd: Date,
  amount: number,
  currency: string,
  paymentIntentId: string | null,
) {
  await Promise.all([
    supabase.from('subscriptions').upsert(
      {
        profile_id: profileId,
        plan_name: planName,
        status: 'active',
        gateway: 'stripe',
        gateway_sub_id: stripeSubId,
        gateway_customer_id: customerId,
        amount,
        currency: currency.toUpperCase(),
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
      },
      { onConflict: 'gateway_sub_id' },
    ),
    supabase.from('profiles').update({ subscription_status: 'active' }).eq('id', profileId),
    paymentIntentId
      ? supabase.from('payments').upsert(
          {
            profile_id: profileId,
            amount,
            currency: currency.toUpperCase(),
            gateway: 'stripe',
            gateway_payment_id: paymentIntentId,
            status: 'completed',
            description: `Stripe subscription: ${planName}`,
          },
          { onConflict: 'gateway_payment_id' },
        )
      : Promise.resolve(),
  ])
}

async function notifyUser(
  profileId: string,
  type: string,
  title: string,
  body: string,
  metadata: Record<string, unknown> = {},
) {
  await supabase.from('notifications').insert({ profile_id: profileId, type, title, body, metadata })
}

async function findProfileBySubId(subId: string): Promise<string | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('profile_id')
    .eq('gateway_sub_id', subId)
    .single()
  return data?.profile_id ?? null
}

// ----------------------------------------------------------------
// Main handler
// ----------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing Stripe-Signature header', { status: 400 })
  }

  const rawBody = await req.text()
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    )
  } catch (err) {
    console.error('Stripe signature verification failed:', err)
    return new Response(`Webhook signature error: ${(err as Error).message}`, { status: 400 })
  }

  console.log(`Processing Stripe event: ${event.type} (${event.id})`)

  try {
    switch (event.type) {
      // ------------------------------------------------------------------
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const { profile_id, plan_name } = session.metadata ?? {}
        if (!profile_id) { console.warn('checkout.session.completed: no profile_id in metadata'); break }

        const sub = session.subscription ? await stripe.subscriptions.retrieve(session.subscription as string) : null

        await activateSubscription(
          profile_id,
          plan_name ?? 'standard',
          session.subscription as string,
          session.customer as string,
          sub ? new Date(sub.current_period_end * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          (session.amount_total ?? 0) / 100,
          session.currency ?? 'usd',
          session.payment_intent as string | null,
        )

        await notifyUser(
          profile_id,
          'payment_success',
          '🎉 Subscription Activated!',
          'Your AgriBusiness subscription is now active. Enjoy full access to all features.',
        )
        break
      }

      // ------------------------------------------------------------------
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const stripeSubId = invoice.subscription as string
        const profileId = await findProfileBySubId(stripeSubId)
        if (!profileId) { console.warn(`invoice.payment_succeeded: no subscription found for ${stripeSubId}`); break }

        await supabase.from('subscriptions')
          .update({
            status: 'active',
            current_period_start: new Date((invoice.period_start ?? 0) * 1000).toISOString(),
            current_period_end: new Date((invoice.period_end ?? 0) * 1000).toISOString(),
          })
          .eq('gateway_sub_id', stripeSubId)

        await supabase.from('profiles').update({ subscription_status: 'active' }).eq('id', profileId)

        await supabase.from('payments').upsert(
          {
            profile_id: profileId,
            amount: invoice.amount_paid / 100,
            currency: invoice.currency.toUpperCase(),
            gateway: 'stripe',
            gateway_payment_id: invoice.payment_intent as string,
            status: 'completed',
            description: 'Subscription renewal',
          },
          { onConflict: 'gateway_payment_id' },
        )
        break
      }

      // ------------------------------------------------------------------
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const profileId = await findProfileBySubId(invoice.subscription as string)
        if (!profileId) break

        await supabase.from('payments').upsert(
          {
            profile_id: profileId,
            amount: (invoice.amount_due ?? 0) / 100,
            currency: invoice.currency.toUpperCase(),
            gateway: 'stripe',
            gateway_payment_id: (invoice.payment_intent as string) ?? null,
            status: 'failed',
            description: 'Subscription renewal failed',
          },
          { onConflict: 'gateway_payment_id' },
        )

        await notifyUser(
          profileId,
          'payment_failed',
          '⚠️ Payment Failed',
          'Your subscription renewal payment failed. Please update your payment method to avoid service interruption.',
        )
        break
      }

      // ------------------------------------------------------------------
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const profileId = await findProfileBySubId(sub.id)
        if (!profileId) break

        await supabase.from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          })
          .eq('gateway_sub_id', sub.id)

        await supabase.from('profiles').update({ subscription_status: 'expired' }).eq('id', profileId)

        await notifyUser(
          profileId,
          'system',
          'Subscription Cancelled',
          'Your AgriBusiness subscription has been cancelled. You can resubscribe at any time from your dashboard.',
        )
        break
      }

      // ------------------------------------------------------------------
      default:
        console.log(`Unhandled Stripe event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true, event_id: event.id }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err)
    // Return 200 to prevent Stripe retries for permanent errors
    return new Response(JSON.stringify({ error: (err as Error).message, event_id: event.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

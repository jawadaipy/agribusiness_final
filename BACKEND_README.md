# AgriBusiness Backend — Deployment Guide

## Overview

This guide covers deploying the Supabase backend for the AgriBusiness multi-portal marketplace.

**Stack:** Postgres 15 + pgvector + pg_cron + pg_net + Supabase Auth + Supabase Storage + Supabase Edge Functions

**Payments:** Stripe (international) + JazzCash (PKR)

---

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed: `npm install -g supabase`
- A Supabase project created at [supabase.com](https://supabase.com)
- Node.js 18+ / Deno 1.40+
- Stripe account (for international payments)
- JazzCash merchant account (for PKR payments)
- KisanMandi API key (for commodity rate ingestion)
- OpenAI API key (for semantic search)

---

## Quick Start

### 1. Clone and configure

```bash
cp .env.example .env
# Edit .env with your actual credentials
```

### 2. Link to your Supabase project

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Enable required extensions in Supabase Dashboard

Go to **Database → Extensions** and enable:
- `uuid-ossp` ✓ (usually pre-enabled)
- `vector` (pgvector)
- `pg_cron`
- `pg_net`
- `unaccent`

Or run in SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "unaccent";
```

### 4. Run migrations

```bash
supabase db push
```

This runs all files in `supabase/migrations/` in order:
| File | Purpose |
|------|---------|
| `00_extensions.sql` | Extensions + custom FTS config |
| `01_enums.sql` | All ENUM types |
| `02_core_schema.sql` | 17 tables |
| `03_indexes.sql` | B-tree, GIN, HNSW indexes |
| `04_triggers.sql` | updated_at, signup hook, notifications |
| `05_rls_policies.sql` | All RLS policies |
| `06_storage_buckets.sql` | 5 storage buckets + policies |
| `07_functions.sql` | SQL functions + pg_cron jobs |
| `08_seed_categories.sql` | 26 categories + 3 ad plans |

### 5. Configure pg_cron Postgres settings

Run in Supabase SQL Editor (one-time setup):

```sql
-- Required for pg_cron → Edge Function HTTP calls
ALTER DATABASE postgres
  SET app.settings.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';

ALTER DATABASE postgres
  SET app.settings.cron_secret = 'YOUR_CRON_SECRET_HERE';
```

> Generate a secure cron secret: `openssl rand -hex 32`

### 6. Deploy Edge Functions

```bash
supabase functions deploy on-signup
supabase functions deploy semantic-search
supabase functions deploy match-suggestions
supabase functions deploy ad-approval
supabase functions deploy trial-expiry-cron
supabase functions deploy market-rates-cron
supabase functions deploy ad-rotation-cron
supabase functions deploy stripe-webhook
supabase functions deploy jazzcash-webhook
```

Or deploy all at once:
```bash
supabase functions deploy
```

### 7. Set Edge Function secrets

```bash
supabase secrets set CRON_SECRET=your_secret_here
supabase secrets set OPENAI_API_KEY=sk-proj-...
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set JAZZCASH_MERCHANT_ID=MC12345
supabase secrets set JAZZCASH_PASSWORD=...
supabase secrets set JAZZCASH_INTEGRITY_SALT=...
supabase secrets set KISANMANDI_API_KEY=...
supabase secrets set KISANMANDI_API_URL=https://api.kisanmandi.com/v1/rates/today
```

### 8. Create admin account

Admin accounts are provisioned manually (not via public signup):

```sql
-- 1. Create auth user (in SQL Editor)
SELECT auth.admin_create_user('{"email": "admin@agribusiness.pk", "password": "SecurePass123!", "email_confirm": true}');

-- 2. Get the new user's ID
SELECT id FROM auth.users WHERE email = 'admin@agribusiness.pk';

-- 3. Update their profile to admin
UPDATE public.profiles
SET user_type = 'admin', is_verified = true
WHERE id = '<uuid-from-step-2>';
```

---

## Payment Gateway Setup

### Stripe

1. Create products and prices in [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Add a webhook endpoint: `https://YOUR_REF.supabase.co/functions/v1/stripe-webhook`
3. Subscribe to events: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`
4. Copy the webhook signing secret (`whsec_...`) to Supabase secrets

**Frontend integration:**
- Use `stripe.js` to create a Checkout Session
- Pass `metadata: { profile_id: user.id, plan_name: 'pro' }` in the session

### JazzCash

1. Log into [JazzCash Merchant Portal](https://merchant.jazzcash.com.pk)
2. Register IPN URL: `https://YOUR_REF.supabase.co/functions/v1/jazzcash-webhook`
3. When initiating a payment, set:
   - `pp_BillReference`: `user:<profile_uuid>` (to identify the user in IPN)
   - `pp_TxnType`: `subscription` or `ad` (for routing logic in the webhook)
   - `pp_OrderID`: `<ad_uuid>` (if paying for an ad)

---

## Semantic Search Setup

### Add keywords to a profile

```typescript
// From frontend or Edge Function
const { error } = await supabase.from('profile_keywords').insert([
  { profile_id: userId, keyword: 'wheat farming' },
  { profile_id: userId, keyword: 'organic crops' },
  { profile_id: userId, keyword: 'Punjab agriculture' },
])
```

### Generate embeddings (batch script)

To embed existing keywords, call the OpenAI API for each and UPDATE:

```typescript
const { data: keywords } = await supabase
  .from('profile_keywords')
  .select('id, keyword')
  .is('embedding', null)
  .limit(100)

for (const kw of keywords) {
  const embedding = await generateEmbedding(kw.keyword) // OpenAI API call
  await supabase.from('profile_keywords')
    .update({ embedding })
    .eq('id', kw.id)
}
```

---

## API Reference

### Auto-generated (Supabase REST / GraphQL)

All tables are available via:
- `GET https://YOUR_REF.supabase.co/rest/v1/{table}` — with RLS enforced
- GraphQL: `POST https://YOUR_REF.supabase.co/graphql/v1`

### Custom Edge Functions

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/functions/v1/semantic-search` | POST | Optional | Hybrid vector + keyword profile search |
| `/functions/v1/match-suggestions` | POST | Required | Top-N profile matches for a post/profile |
| `/functions/v1/ad-approval` | POST | Admin | Approve or reject a pending ad |
| `/functions/v1/stripe-webhook` | POST | Stripe sig | Stripe payment lifecycle events |
| `/functions/v1/jazzcash-webhook` | POST | HMAC | JazzCash IPN payment notifications |
| `/functions/v1/trial-expiry-cron` | POST | CRON_SECRET | Manual trigger for trial expiry |
| `/functions/v1/market-rates-cron` | POST | CRON_SECRET | Manual trigger for rate ingestion |
| `/functions/v1/ad-rotation-cron` | POST | CRON_SECRET | Manual trigger for ad rotation |

---

## Scheduled Jobs

Verify pg_cron jobs are registered:
```sql
SELECT jobname, schedule, command FROM cron.job;
```

Expected output:
| jobname | schedule | description |
|---------|----------|-------------|
| `agri-trial-expiry` | `0 2 * * *` | Daily 02:00 UTC |
| `agri-market-rates` | `0 6 * * *` | Daily 06:00 UTC |
| `agri-ad-rotation` | `0 0 * * 0` | Weekly Sunday 00:00 UTC |

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| DB trigger for profile creation (not just Edge Function) | Atomic, reliable even if Edge Function is down |
| `get_my_role()` SQL function instead of JWT claims | Prevents client-side role spoofing |
| `SECURITY DEFINER` on notification triggers | Allows inserts from trigger context without relaxing user INSERT policy |
| HNSW index (m=16, ef_construction=64) | Best performance/recall tradeoff for <1M profile_keywords rows |
| Keyword-only fallback in `match_profiles()` | Search works even without OpenAI API key |
| Service role key in webhook Edge Functions | Bypasses RLS for payment/subscription writes (intentional) |
| `pp_BillReference = "user:<uuid>"` in JazzCash | JazzCash doesn't pass back custom metadata; BillReference is the reliable echo field |

---

## Local Development

```bash
# Start local Supabase stack
supabase start

# Reset and re-run all migrations
supabase db reset

# Serve Edge Functions locally
supabase functions serve

# Test a function
curl -X POST http://localhost:54321/functions/v1/semantic-search \
  -H "Content-Type: application/json" \
  -d '{"query": "wheat farming Punjab", "limit": 5}'
```

---

## Security Checklist

- [ ] RLS enabled on all 17 tables (verified via `SELECT tablename FROM pg_tables WHERE schemaname = 'public'` + check `pg_class.relrowsecurity`)
- [ ] `user_type = 'admin'` is not available via public signup (enforced in `fn_handle_new_user` trigger)
- [ ] Stripe webhook secret is set and signature verification is active
- [ ] JazzCash HMAC validation is active
- [ ] `CRON_SECRET` is a cryptographically random 32-byte hex string
- [ ] `.env` is in `.gitignore` (never committed)
- [ ] Storage bucket paths include `auth.uid()` prefix to prevent path traversal
- [ ] `admin_audit_log` has no UPDATE/DELETE policies (append-only)

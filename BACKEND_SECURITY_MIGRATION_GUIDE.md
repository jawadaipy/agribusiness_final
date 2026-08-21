# Backend Security Migration Guide

## Status

The source package contains `supabase/migrations/09_role_dashboard_security.sql`, `supabase/migrations/10_production_governance.sql`, and `supabase/migrations/11_five_role_connections.sql`. The application code compiles with all three migrations present, but **none of these migrations has been executed against a live Supabase database**. Apply them to a staging project first, in numerical order.

## What the migration changes

| Area | Result |
|---|---|
| Profile privacy | Creates `profile_private` for phone/email and exposes a safe `directory_profiles` view for public profile discovery. |
| Role safety | Normalizes legacy `org` records to `company` and blocks members from changing role, verification, trial, subscription, rating, or account-active state. |
| Dashboard data | Adds detail tables for student, farmer, consultant, organization, organization members, proposals, connection requests, and saved items. |
| Commercial controls | Blocks direct browser creation of payment/subscription records and forces new advertisements to begin as pending. |
| Publishing and matching | Limits public content to active listings/open projects and hides raw profile-keyword embeddings. |
| Storage | Removes bucket-wide authenticated reads for private problem and chat media. |
| Connection delivery | Adds private recipient/requester notification triggers and a real dashboard connection inbox. |
| Super Admin | Replaces fabricated Admin behavior with database-role access, audited member moderation, audited ad decisions, and audited category activation. |
| Buyer / Trader / Miller | Adds the `buyer` member role, its private procurement profile, and permission to publish open buying requirements without permission to create producer/service listings. |
| Consented contact sharing | Adds private contact-sharing preferences and a protected function that returns opted-in email/phone only to the two parties in an accepted connection. |

## Apply to staging first

Use the Supabase SQL Editor or your project migration workflow. Back up the database first, then run the migration in a transaction where supported.

Run Migration 09, validate its results, then run Migration 10, then Migration 11 in separate, reviewed SQL Editor executions. Keep the sequence intact: Migration 10 assumes the role, request, notification, and private-profile objects created by Migration 09; Migration 11 extends those same objects with Buyer and accepted-connection contact controls.

If any policy/view dependency fails, run `ROLLBACK;`, keep the error output, and correct the migration before retrying. Do not run this directly on the production project until the staging tests below pass.

## Required application configuration

The frontend must continue using its public anon key only. Payment finalization, subscription activation, signed chat-download URLs, matching embeddings, and ad approval must use trusted Edge Functions or backend routes with secrets stored server-side. Never expose a service-role key to the browser.

## Role-security acceptance tests

| Scenario | Expected result |
|---|---|
| Anonymous user opens network search | Can read `directory_profiles`; cannot select `profiles` or `profile_private`. |
| Farmer updates own display name or city | Succeeds. |
| Farmer updates own `user_type`, `is_verified`, or `subscription_status` | Database rejects the update. |
| Consultant submits a proposal | Succeeds only for own profile and an eligible project. |
| Farmer submits a proposal | Database rejects it. |
| Company creates organization | Succeeds only when the authenticated role is `company`. |
| User attempts to create completed payment or active subscription row | Database rejects the insert. |
| User submits advertisement with `status = approved` | Database rejects it; pending-only request is accepted. |
| Non-participant reads chat attachment | Access is denied. |
| User signing up as company | Creates a `company` profile and opens the Company dashboard after authentication. |
| User signing up as Buyer / Trader / Miller | Creates a `buyer` profile plus a private `buyer_profiles` row and opens the Buyer dashboard after authentication. |
| Member opens `/admin/` | Redirected away; the Super Admin panel never renders. |
| Manually provisioned `admin` opens `/admin/` | Can see only real metrics and empty states where no real records exist. |
| Member sends connection request | Recipient sees it under Dashboard → Connections and receives an in-app notification. |
| Recipient accepts/declines connection | Requester sees the decision in Dashboard → Connections and receives an in-app notification. |
| Accepted connection opens a public profile | Contact-card function returns only email/phone fields the other accepted member explicitly opted to share. |
| Pending, declined, blocked, withdrawn, self, or unrelated contact request | Contact-card function rejects/returns no private profile data. |
| Super Admin changes a member, ad, or category state | Change succeeds only through the protected database function and creates an append-only `admin_audit_log` row. |

## Provisioning the first Super Admin

Create a normal confirmed account first, verify its identity out of band, then run the following only from the protected Supabase SQL Editor. Never add `admin` to public signup metadata or expose an administrative invitation link.

```sql
UPDATE public.profiles
SET user_type = 'admin', is_active = true, is_verified = true
WHERE id = '<confirmed-auth-user-uuid>';
```

The Super Admin account should use strong MFA and should not be used for ordinary marketplace activity.

## After successful staging validation

Deploy the same migration sequence to production during a low-traffic maintenance window. Then create one real test account for each role—Student, Farmer, Buyer, Consultant, and Company—and repeat the acceptance tests. The current temporary web preview remains useful for visual review, but it cannot prove live database behavior until the migrations are applied to the Supabase project it uses.

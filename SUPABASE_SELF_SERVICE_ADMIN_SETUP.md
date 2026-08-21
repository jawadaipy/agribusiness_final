# Supabase Self-Service Setup: First Super Admin

This guide lets you activate the secure Admin Portal **without sharing Supabase access or passwords**. Complete the steps yourself inside your Supabase project dashboard. Do not put an administrator password in frontend code, Vercel environment variables, SQL files, or public documentation.

> **Recommended order:** apply the database migrations first, create the Auth user second, assign the database role third, then test the Admin Portal.

## 1. Back Up Before Database Changes

Open your Supabase project, then open **Database → Backups**. Confirm that you have a recent backup or create one if your Supabase plan provides that action. Apply all changes to a staging project first where possible.

## 2. Apply the Required Migrations

Open **SQL Editor → New query**. Copy and run each file below **one at a time**, waiting for a successful result before continuing.

| Order | File in the delivery source | What it activates |
| --- | --- | --- |
| 1 | `supabase/migrations/09_role_dashboard_security.sql` | Safe directory view, private profile table, role dashboards, connections, and RLS protections. |
| 2 | `supabase/migrations/10_production_governance.sql` | Connection notifications, governed Super Admin operations, and audit controls. |
| 3 | `supabase/migrations/11_five_role_connections.sql` | Buyer/Trader/Miller role support, contact-sharing preferences, and accepted-connection contact function. |

Do **not** run all three files together in one SQL Editor submission. If one produces an error, stop there and resolve that error before opening the next migration.

## 3. Create the Administrator in Supabase Auth

Open **Authentication → Users** and select **Add user** / **Create new user**. Enter the administrator email address you want to use and set a strong password directly in Supabase. If the form offers an **Auto Confirm User** option for this controlled first administrator, enable it so the administrator can sign in immediately; otherwise, complete the normal email confirmation process.

The Auth trigger should automatically create a matching `public.profiles` and `public.profile_private` record. This Auth-created account initially receives a safe ordinary role. That is expected: public signup must never create administrator accounts.

## 4. Assign the Protected `admin` Role

Return to **SQL Editor → New query**. First find the user UUID. Replace `YOUR_ADMIN_EMAIL` with the same email you created in Step 3.

```sql
SELECT id, email, email_confirmed_at
FROM auth.users
WHERE lower(email) = lower('YOUR_ADMIN_EMAIL');
```

Copy the returned `id`, then run the following query. Replace `YOUR_ADMIN_UUID` with that UUID.

```sql
UPDATE public.profiles
SET
  user_type = 'admin',
  full_name = COALESCE(NULLIF(full_name, ''), 'Platform Administrator'),
  is_active = true
WHERE id = 'YOUR_ADMIN_UUID';
```

Because this query runs in Supabase SQL Editor as the database owner, it can assign the protected role. A normal browser session cannot do this.

## 5. Verify the Database Result

Run this verification query, again replacing `YOUR_ADMIN_UUID`.

```sql
SELECT
  p.id,
  pp.email,
  p.user_type,
  p.is_active,
  p.is_verified
FROM public.profiles AS p
JOIN public.profile_private AS pp ON pp.profile_id = p.id
WHERE p.id = 'YOUR_ADMIN_UUID';
```

The result must show `user_type = admin` and `is_active = true`. If it returns no row, confirm the Auth user was created successfully and that Migration 09 completed before creating the user.

## 6. Deploy the Updated Website Source

Deploy the latest source package that contains `/admin-login`, the protected `/admin/` route, and the migrations. Do not copy the password into Vercel environment variables; the website only needs the normal Supabase URL and public anon key already used by the application.

## 7. Test Both Access Paths

Open the deployed **Admin Portal**:

```text
/admin-login
```

Sign in using the credentials created in Supabase. A correctly provisioned administrator should reach `/admin/`. Then use a separate regular member account to try the same Admin Portal. It must be signed out and denied access.

| Test | Expected result |
| --- | --- |
| Unauthenticated visitor opens `/admin/` | Redirected to onboarding. |
| Regular member signs in through `/admin-login` | Session is removed and access is denied. |
| Provisioned administrator signs in through `/admin-login` | Redirected to `/admin/`. |
| Administrator opens Network after Migrations 09–11 | Real active directory profiles can load; no demo fallback is shown. |

## If You Need to Remove Admin Access Later

Use SQL Editor and replace the ID and target role deliberately:

```sql
UPDATE public.profiles
SET user_type = 'farmer'
WHERE id = 'YOUR_ADMIN_UUID';
```

Choose the user’s appropriate ordinary role instead of `farmer` when applicable. Do not delete the user unless you intend to permanently remove their account and related data.

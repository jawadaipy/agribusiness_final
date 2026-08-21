# Role-Based Dashboard Integration

This source now routes every authenticated account through **`/dashboard`**, where the dashboard is selected from the user’s persisted **`public.profiles.user_type`** value. The supported account roles are `student`, `farmer`, `consultant`, and `company`.

## What changed

| Area | Change |
|---|---|
| Signup | The selected role is sent to Supabase Auth as `user_type`. The existing `fn_handle_new_user` database trigger creates the `profiles` row and applies the seven-day trial. |
| Login and dashboard | The dashboard now requires a real Supabase session and reads the role from `public.profiles`, not from browser local storage. |
| Role workspaces | Student/Researcher, Farmer/Buyer, Consultant/Researcher, and Company/Organization accounts receive role-specific workspace actions, explanations, and navigation. |
| Profile and navigation | Local demo-session fallbacks were removed from onboarding, dashboard, profile editing, and global navigation. |

## Required database prerequisite

Apply the project’s Supabase migrations, including `04_triggers.sql` and `05_rls_policies.sql`, to the same Supabase project configured by `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The dashboard depends on the `on_auth_user_created` trigger to write the initial `profiles` record.

## Local verification

Run the following commands from the project root:

```bash
npm install
npm run build
npm run dev
```

Create one test account for each role. If Supabase email confirmation is enabled, confirm the account email before signing in. On first authenticated access, `/dashboard` reads the profile row and renders the matching workspace.

> Do not restore the old `agribiz_current_user` browser-local fallback. It allowed a browser value to impersonate a user and bypass the intended session-only experience.

# Validation Notes — Role Dashboard and Marketplace Upgrade

## Browser verification on staging preview

| Date | Route | Result | Key finding |
| --- | --- | --- | --- |
| 2026-08-19 | `/onboarding` | Pass | The signup route renders the three-step role and credential flow without a local-storage/demo-login control. The confirmation panel and cooldown path are available only after a real provider signup response; no test account was created during this check. |
| 2026-08-19 | `/apps/agri-biz` | Pass — safe blocked state | The revised marketplace loaded the live categories, displayed no demo commodity cards or seller phone/WhatsApp controls, and then stopped with an explicit retryable error: `Marketplace identities require the safe directory view from Migration 09.` This confirms the source no longer falls back to unsafe raw profiles or fabricated product records. The screen will become operational after Migration 09 is applied. |

## Build verification

`pnpm run build` completed successfully after the signup-feedback, dashboard workbench, migration, marketplace, and secure-profile changes. The production build generated the Vercel/Nitro output without TypeScript compilation errors. Existing non-blocking output includes the project’s prior TanStack `inputValidator()` deprecation notice and Vite path-resolution migration notice.

## Final privacy scan

The public profile page no longer renders fabricated ratings, reviews, credentials, listings statistics, a sample biography, or a WhatsApp button backed by a member phone number. The only remaining `profile.phone` use is gated by `isOwner` inside the signed-in owner’s private settings panel; public visitors receive a database-backed connection-request action instead.

## Production-readiness access check

| Route | Anonymous browser result | Expected production behavior |
| --- | --- | --- |
| `/admin/` | Redirected to `/onboarding` without rendering the Super Admin console. | Only an authenticated database `admin` account may load the panel. |
| `/dashboard` | Redirected to `/onboarding` without rendering a role workspace. | Only an authenticated, active Student, Farmer, Buyer, Consultant, or Company account may load a role dashboard. |

The production member dashboard no longer contains a role-specific color system, sample progress percentage, mock session, or default trial state. The Super Admin panel is intentionally unreachable from the member navigation and will load real records only after Migration 10 is applied.

## Five-role onboarding validation

The staging onboarding route now renders exactly five member choices: **Farmer / Producer**, **Buyer / Trader / Miller**, **Agronomist / Consultant / Vet**, **Enterprise / Supplier**, and **Student / Researcher**. The selector contains no Super Admin/Admin option and uses the shared Evergreen, Harvest Gold, Rice Canvas, and Slate Leaf visual system.

## Real directory validation

The staging `/search` route renders the five working member-type filters and the private-connection explanation. Because Migration 09 is still unapplied to the preview database, the page displays a clear retryable setup error instead of seeded people, fabricated ratings, or raw-profile fallback data. This confirms that the network no longer gives a false impression that live member data is working.

## Live-project record validation

The revised project board queried the database and exposed three inherited records owned by the reserved `20000000-0000-0000-0000-*` demo UUID range. The frontend now excludes that known legacy demo-owner range rather than presenting sample requirements as real opportunities. No destructive database cleanup was performed; permanent removal requires a backed-up, reviewed SQL cleanup in staging and then production.

## Shared navigation-order validation

The staging homepage header now follows the requested public navigation order: **Marketplace → Projects → Network → Education → Our Apps**. The shared footer Platform list uses the same order, so the revised position persists across public pages and mobile navigation as well.

## Connection workflow backend validation

The staging Network directory was checked again before creating any test accounts. It resolved to the explicit safe error, **“Apply Migration 09 to the Supabase database before real profiles can load here.”** Because `directory_profiles` is unavailable, no real public profile can be selected and the request/recipient/accepted-contact workflow cannot be executed safely. No test accounts, requests, or contact records were created against the incomplete backend.

The required backend sequence remains Migration 09 (safe directory and connection tables), Migration 10 (connection notifications and Super Admin governance), then Migration 11 (Buyer role and accepted-connection contact function/preferences). After that sequence is deployed to staging, the two-account protocol in `DASHBOARD_VISUAL_UPLOAD_AND_CONNECTION_QA.md` can be run without exposing contact details.

## Dashboard visual and upload validation

The member workspace and shared profile components now use only the platform’s Evergreen, Harvest Gold, Rice Canvas, Slate Leaf, and semantic success/error treatments. Legacy role-colour utilities and low-contrast warm-white workbench surfaces were replaced with the same input outlines, card surfaces, action states, and secondary-control boundaries used by the Super Admin panel.

The profile editor now provides a local image chooser instead of an arbitrary image-URL field. It validates JPEG, PNG, WebP, and AVIF files to 5 MB before writing to the authenticated owner’s existing Supabase `avatars/{user-id}/…` folder. A public profile URL is attached only after storage upload succeeds and the member saves profile changes.

`pnpm run build` completed successfully after these visual and upload changes. Live visual verification of authenticated member dashboards, Super Admin, a real avatar upload, and the two-account connection sequence remains blocked until the database migration sequence is applied and confirmed accounts are available in staging.

## Admin Portal entry validation

The `/admin-login` route renders a separate Super Admin form with empty email and password inputs, a return link to standard member sign-in, and no credential hint or pre-filled administrator identity. The return link opens `/onboarding` in the normal member signup state; it does not expose the Admin Portal in the public role selector.

When standard member login mode is selected, the **Admin Portal** entry appears beneath the normal workspace sign-in and member-registration controls, separated by a visible divider. It is absent from the five-role signup selection.

`pnpm run build` completed successfully after the Admin Portal route was added.

## Security validation boundary

No live account was created and no production database migration was applied during this validation. The new role tables, safe `directory_profiles` view, and new RLS policies therefore still require staged database deployment and policy tests before the roles can persist their new detail records in the live project.

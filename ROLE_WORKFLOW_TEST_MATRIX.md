# Agribusiness.pk Secure Role Workflow Test Matrix

**Use this after applying Migrations 09, 10, and 11 to a staging Supabase project.** Execute the test cases with separate real test accounts created through Supabase Auth. Do not use `service_role` keys in the browser, do not impersonate users through `localStorage`, and do not seed fake marketplace testimonials, ratings, or customer reviews.

## Pre-conditions

| Requirement | Expected state before tests |
| --- | --- |
| Migration | `09_role_dashboard_security.sql`, `10_production_governance.sql`, and `11_five_role_connections.sql` have been applied successfully in staging, in order. |
| Email delivery | A verified custom SMTP sender and site/redirect URLs are configured in Supabase Auth. |
| Test identities | One confirmed account each for Farmer, Buyer, Company, Consultant, Student, plus a separately provisioned Admin if required. |
| Browser state | Use a clean/private browser profile for each role test. |
| Database access | SQL editor is used only for verification queries and policy tests, never from the public client. |

## Signup and Account Provisioning

| ID | Test | Expected result |
| --- | --- | --- |
| AUTH-01 | Sign up as Farmer with correct role metadata and confirm the email. | `auth.users`, `profiles`, `profile_private`, and `farmer_profiles` each receive the expected row. The role is `farmer`; phone is in `profile_private`, not public directory output. |
| AUTH-02 | Sign up as Company and confirm the email. | A `profiles` row is created with `user_type = company`; organization profile remains uncreated until the account owner completes it. |
| AUTH-03 | Sign up as Consultant and Student. | Each receives only their corresponding role-detail row. A student does not receive a company/farmer/consultant row. |
| AUTH-03B | Sign up as Buyer / Trader / Miller. | `profiles.user_type = buyer` and one `buyer_profiles` row are created. Public signup must reject `admin` and never offer it in the role selector. |
| AUTH-04 | Request another confirmation email before the cooldown ends. | UI prevents the request, shows the countdown, and does not falsely state that an email was sent. |
| AUTH-05 | Log in before email confirmation. | UI explains confirmation requirement; dashboard remains inaccessible. |
| AUTH-06 | Directly edit `profiles.user_type`, `is_verified`, `trial_ends_at`, `subscription_status`, `rating`, or `is_active` from the authenticated client. | Database trigger rejects the write. |

## Farmer / Producer

| ID | Test | Expected result |
| --- | --- | --- |
| FARM-01 | Save farm name, acreage, crops, livestock, and farm location. | Upsert succeeds only for the signed-in Farmer’s `farmer_profiles.profile_id`. |
| FARM-02 | Publish a product listing from the workbench or marketplace. | `listings.profile_id` equals the authenticated Farmer; title, price, quantity, location, and status persist. No client-provided `is_featured` or `view_count` can be set. |
| FARM-03 | Read My Produce records. | Farmer sees own active, draft, sold, and expired records as allowed; anonymous user sees only active records. |
| FARM-04 | Publish a farm need. | `projects` record belongs to Farmer and is initially `open`; an unrelated Farmer cannot alter it. |
| FARM-05 | Attempt a listing as a Student. | UI refuses the action and RLS also rejects direct insert. |

## Buyer / Trader / Miller

| ID | Test | Expected result |
| --- | --- | --- |
| BUY-01 | Save buyer/trader/miller name, commodities, grades, regions, expected volume, and logistics notes. | Upsert succeeds only for the signed-in Buyer’s `buyer_profiles.profile_id`. |
| BUY-02 | Publish a buying requirement. | `projects.profile_id` equals the authenticated Buyer and the record is `open`. |
| BUY-03 | Attempt to publish a marketplace product/service listing. | Buyer dashboard does not expose this action and RLS rejects a direct insert. |
| BUY-04 | Attempt to save another Buyer’s procurement profile. | RLS rejects the write. |

## Company / Organization

| ID | Test | Expected result |
| --- | --- | --- |
| ORG-01 | Create a company profile. | `organizations.owner_profile_id` equals the Company profile; an `organization_members` owner row is created. |
| ORG-02 | Update legal name, service areas, technologies, and public description. | Organization owner succeeds; an unrelated Company is denied. |
| ORG-03 | Publish an RFP/project. | Project belongs to Company profile and is visible as `open`; it does not disclose proposal content publicly. |
| ORG-04 | Invite an already registered team member. | Owner can add membership; non-owner cannot change members or roles. |
| ORG-05 | Attempt to set `organizations.is_verified` from the client. | System/admin ownership must retain verification control; if the initial migration does not yet contain a column guard, record this as a required follow-up trigger before production. |

## Consultant

| ID | Test | Expected result |
| --- | --- | --- |
| CONS-01 | Save degree, experience, services, technologies, availability, and starting rate. | Consultant can update own `consultant_profiles`; credential status remains system-admin managed. |
| CONS-02 | Publish an advisory service listing. | RLS permits Consultant-created listing with their own profile ID. |
| CONS-03 | Submit a proposal with a 20+ character cover note to an open Company/Farmer project. | `project_proposals` insert succeeds once per project per Consultant. |
| CONS-04 | Read proposals. | Only the proposal’s Consultant, the owner of the relevant project, and Admin can view it. |
| CONS-05 | Attempt to directly accept own proposal. | RLS rejects it. Project owner/Admin alone can set shortlist/reject/accept decisions. |

## Student / Researcher

| ID | Test | Expected result |
| --- | --- | --- |
| STUD-01 | Save institution, programme, degree, research interests, graduation date, and portfolio link. | Student can only create/update their own `student_profiles` row. |
| STUD-02 | Browse open opportunities. | Student receives open public project records only. |
| STUD-03 | Attempt to publish commercial marketplace listing or formal consultant proposal. | UI denies it and RLS rejects a direct database insert. |

## Privacy, Directory, and Connection Safety

| ID | Test | Expected result |
| --- | --- | --- |
| PRIV-01 | Query `directory_profiles` as anonymous/authenticated user. | Only public directory fields return; email, phone, billing/trial, active-state, and raw matching inputs do not return. |
| PRIV-02 | Query raw `profiles` as a different member. | Query is denied by RLS. |
| PRIV-03 | Query `profile_private` as owner. | Owner can read/update own email and phone. |
| PRIV-04 | Query a different member’s `profile_private`. | Query returns no row/denied. |
| PRIV-05 | Send and accept a connection request. | Requester and recipient can see the record; no unrelated profile can read it. |
| PRIV-06 | Load marketplace cards. | Cards show public profile identity and link to public profile; they never render direct phone/WhatsApp contact from profiles. |
| PRIV-07 | Load `/search` while `directory_profiles` is available and while it is unavailable. | With the view available, only real directory rows display. With the view unavailable, the UI shows a clear recoverable error and never falls back to sample profiles or raw `profiles`. |
| PRIV-08 | Recipient accepts a request after both members save their contact-share preferences. | Both sides see `accepted`; only the opted-in email/phone fields are returned by `get_accepted_connection_contact`. |
| PRIV-09 | Use `get_accepted_connection_contact` without an accepted connection, as an unrelated member, or for self. | Function raises/rejects the request and never returns `profile_private` data. |

## Exit Criteria

Staging is ready for production only when every expected-success test persists the correct database record and every expected-denial test is rejected by RLS or a database trigger. A passing UI is insufficient: capture the matching SQL/RLS evidence for every high-risk write, then apply the identical migration to production during a controlled release window.

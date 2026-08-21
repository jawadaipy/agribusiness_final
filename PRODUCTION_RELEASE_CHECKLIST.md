# Agribusiness.pk Production Release Checklist

## Deployment Order

| Step | Owner | Gate |
| --- | --- | --- |
| 1. Back up staging database | Database owner | Confirm a restore point before schema changes. |
| 2. Apply Migration 09 | Database owner | Safe directory view, role-detail tables, requests, and RLS policies exist. |
| 3. Run initial role workflow matrix | QA + database owner | Student, Farmer, Consultant, Company, and anonymous-denial tests pass. |
| 4. Apply Migration 10 | Database owner | Connection notification triggers and Super Admin audited RPCs exist. |
| 5. Apply Migration 11 | Database owner | Buyer role, buyer profile table, Buyer procurement policy, private contact preferences, and accepted-contact RPC exist. |
| 6. Provision one Super Admin | Platform owner | Account has manually assigned `profiles.user_type = 'admin'`; public signup never supplies that role. |
| 7. Configure custom SMTP | Platform owner | Confirmation emails can be sent reliably; test account confirmation succeeds. |
| 8. Run five-role production-readiness validation | QA | Buyer signup, safe directory, connection inbox, accepted-only contact sharing, inactive-account denial, member Admin-route denial, and Super Admin audit events pass. |
| 9. Apply same migrations to production | Database owner | Performed in a low-traffic change window after staging pass. |

## Required Assertions

The public website must not display a member’s email, telephone number, private billing state, or raw profile fields. The regular member dashboard must not have an Admin button, an administrative sidebar link, a fabricated progress percentage, a mock session, example profile facts, or default records attached to a newly created account.

The connection request must appear in the recipient’s **Dashboard → Connections** panel. A decision must update the sender’s own dashboard and create the corresponding in-app notification for both parties. These outcomes are database-triggered; they do not depend on an optimistic browser-only notification. After acceptance, each party may retrieve only the other party’s explicitly opted-in email and/or phone using the protected connection-contact function; pending, declined, blocked, withdrawn, self, and unrelated requests must reveal nothing.

The public onboarding selector must show only five member roles: Farmer / Producer, Buyer / Trader / Miller, Agronomist / Consultant / Vet, Enterprise / Supplier, and Student / Researcher. The database must route each confirmed account to its corresponding role workspace. Buyer is a private procurement role: it can save a buyer profile and post procurement requirements, but it cannot create producer, company, or consultant marketplace listings.

The Super Admin panel must be opened only by a confirmed Supabase user whose database profile role is `admin`. It must show real database records or an explicit empty state. Member moderation, advertisement decisions, and category activation must create append-only audit records through the protected database functions, not direct browser table updates.

## Explicitly Deferred

Bulk data export, role reassignment, billing manipulation, staff invitation, access to private contact data, payment reconciliation, and bulk messaging are excluded from this release. Each requires a separate server-side, least-privilege workflow and a more detailed audit design.

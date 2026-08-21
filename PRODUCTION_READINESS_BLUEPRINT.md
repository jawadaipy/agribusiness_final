# Agribusiness.pk Production-Readiness Blueprint

## Brand System

Agribusiness.pk will use a restrained, agriculture-led palette throughout public pages, member workspaces, and the Super Admin console. Role is conveyed through clear labels and contextual icons, **not by inventing a different colour system for every user type**.

| Token | Value | Purpose |
| --- | --- | --- |
| **Evergreen** | `#0F5132` | Primary navigation, principal actions, trusted platform state, and headings. |
| **Harvest Gold** | `#D98B1D` | Limited emphasis: verified markers, selected navigation, and high-value status. |
| **Rice Canvas** | `#F6F7F3` | App background, low-emphasis surfaces, and calm dashboard spacing. |
| **Slate Leaf** | `#20322E` | Body copy, data tables, and contrast against the light canvas. |

Error, success, and warning states remain semantic exception colours and do not become a second visual identity. Member dashboards, the directory, marketplace, and Super Admin use the same token names and components.

## Access and Authority Model

| Persona | Route access | Authority |
| --- | --- | --- |
| Student, Farmer, Consultant, Company | `/dashboard`, own profile, permitted marketplace/project actions, incoming/outgoing connection requests. | The database role limits writes to self-owned and role-appropriate records. |
| Admin / Super Admin | `/admin/` only after a live Supabase session and a database `profiles.user_type = 'admin'` check. | Platform moderation, member activation/verification, ad approvals, category operations, rate management, and audit review. |
| Anonymous visitor | Public directory, active listings, active/open content only. | Cannot access member dashboard, private profile data, connection requests, or Super Admin route. |

> **Admin is never a public signup role, a dashboard shortcut, or a client-side metadata flag.** It is provisioned manually in the database after the identity is confirmed.

## Connection Request Contract

The sender creates exactly one request per recipient pair. The recipient sees that request in an **Incoming Connections** workspace panel and can accept, decline, or block it. Acceptance or denial also creates a private in-app notification for the sender. The client never writes notifications directly; database triggers create them under a controlled `SECURITY DEFINER` function.

## Super Admin Operations

The Super Admin console will replace every fabricated count, sample advertiser, sample role, and non-functional action with live queries or explicit empty states. It will provide four operational surfaces:

| Surface | Live data | Permitted action |
| --- | --- | --- |
| **Overview** | Real profile, listing, project, pending-ad, and connection-request counts. | Read platform health. |
| **Members** | Directory-safe member records and moderation status. | Activate/deactivate and verify/unverify accounts; changes write an audit record. |
| **Ad review** | Pending ads owned by real profiles. | Approve/reject with a recorded reason. |
| **Operations** | Active categories, latest market rates, and append-only audit records. | Create/update categories and rates; inspect audit history. |

The initial Super Admin panel does **not** permit role reassignment, billing-state edits, direct access to private emails/phones, or arbitrary data export from the browser. Those actions require separate service-side workflows, audit controls, and owner approval before a later release.

## Deliberately Removed or Deferred

The current static Admin menu’s “Revenue,” “Roles & Permissions,” arbitrary “System” button, synthetic global search, fake role counts, and sample approval items will be removed. Live analytics, financial exports, payment reconciliation, staff account provisioning, and bulk messaging are deferred until they can be delivered through audited server-side functions rather than browser writes.

# Agribusiness.pk Five-Role Access and Connection Specification

## Five Member Roles

The public signup selector exposes exactly five member roles. **Super Admin remains a manually provisioned operational role and is never shown in signup.** Each member role has one secure dashboard with shared profile, discovery, and connection areas plus role-specific operational actions.

| Signup role | Primary purpose | Dashboard responsibilities | Restricted actions |
| --- | --- | --- | --- |
| **Farmer / Producer** | Sell farm output and obtain farm support. | Farm profile, produce listings, farm needs/RFPs, market rates, plant/animal case access, consultant discovery. | Cannot submit consultant proposals or administer company teams. |
| **Buyer / Trader / Miller** | Procure agricultural commodities and source verified producers. | Procurement profile, buying requirements, supplier shortlist, producer discovery, saved opportunities, market watch. | Cannot claim farm production fields or publish advisory services. |
| **Agronomist / Consultant / Vet** | Deliver professional advisory and technical services. | Credential profile, service listings, project discovery, proposal submission, clinic expertise, professional availability. | Cannot submit buyer procurement requirements as a Buyer. |
| **Enterprise / Supplier** | Offer agricultural inputs, technology, logistics, machinery, and corporate opportunities. | Organization profile, products/services, RFPs/tenders, projects/internships, organization membership, ads. | Cannot edit a member’s role, trust status, or platform data. |
| **Student / Researcher** | Build a research identity and find academic or early-career opportunities. | Academic profile, research interests, portfolio, internship/research opportunity discovery, professional connections. | Cannot publish commercial listings, procurement requirements, or formal consultant proposals. |

## Dashboard and Data Contract

Role selection is sent to Supabase Auth as `user_type` metadata. The signup trigger validates that value against a database enum and creates the matching `profiles` row. The authenticated dashboard **reads the database role**, not client storage or untrusted metadata, and renders only the permitted workspace.

The Buyer role is named `buyer` in the database. It represents Buyer, Trader, and Miller together and avoids creating three near-duplicate auth roles. Existing `org` records remain normalized to `company`; new signup never uses `org`.

## Consented Connection Lifecycle

| State | Sender view | Recipient view | Contact visibility |
| --- | --- | --- | --- |
| **Pending** | “Request sent”; can withdraw. | Appears in Dashboard → Connections; can accept, decline, or block. | No phone or email is visible. |
| **Accepted** | “Connected”; can view the other person’s opted-in contact card. | “Connected”; can view the other person’s opted-in contact card. | Only the two accepted parties can use the protected RPC; public visitors and unrelated members cannot read the contact details. |
| **Declined / blocked / withdrawn** | Clear status, no contact card. | Clear status, no contact card. | No phone or email is visible. |

Connection acceptance is the relationship consent. Each member additionally controls two privacy preferences in private settings: **share email with accepted connections** and **share phone with accepted connections**. New preference fields are explicit and visibly explained. The contact-card function returns only the methods the other accepted party has opted to share.

## Live-Data Reliability Rules

Public and member pages must never show sample profiles, sample projects, fabricated ratings, fabricated location/role details, or fake-success writes when a Supabase query fails. The application either renders real records, a clear empty state, or a clear recoverable error that explains the required database migration. It does not fall back from the safe `directory_profiles` view to raw `profiles`, because that would reintroduce private-data exposure.

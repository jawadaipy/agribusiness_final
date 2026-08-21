# Agribusiness.pk Role Workflows and Product-Gap Plan

**Purpose.** This is the implementation contract for the role-specific workspace. It maps each visible workflow to the existing Supabase schema, defines the member permissions that must remain enforced by RLS, and separates the first shippable release from later platform extensions. It contains no mock records and does not treat client-side hiding as authorization.

## Product Operating Model

Agribusiness.pk should be a **role-aware agricultural network and marketplace**, not four isolated dashboards. Every account has one core identity in `profiles`; role detail belongs in the role table selected by the secure signup trigger. A producer must be able to publish real output, a company must be able to publish a real opportunity, a consultant must be able to submit a real proposal, and a student must be able to make their academic capability discoverable without exposing private contact data.

Digital farmer–buyer marketplaces typically combine product discovery with quality, inventory, logistics, records, and direct stakeholder communication. They also benefit from advisory and market-information services that help producers decide what to grow, buy, or sell. [1] Digital advisory is most useful when it is locally actionable, trusted, and paired with feedback loops rather than presented as generic content. [2]

## Secure Role and Data Contract

| User role | Core profile | Role detail | Creates | Receives / manages | Must never be able to change |
| --- | --- | --- | --- | --- | --- |
| Farmer / Producer | `profiles` + `profile_private` | `farmer_profiles` | Product listings, farm-needs projects, plant-clinic posts, connection requests | Buyer interest, consultant connections, responses to their own cases | Another member’s records, own role, verification, subscription/trial state, ad delivery fields |
| Company / Organization | `profiles` + `profile_private` | `organizations` + `organization_members` | Organization profile, product/service listings, project/RFP posts, connection requests | Project proposals, team membership, customer and expert requests | Other organizations, proposal status unless it owns the project, billing/verification fields |
| Consultant | `profiles` + `profile_private` | `consultant_profiles` | Service listings, consultant proposals, replies to cases, connection requests | Project invitations, proposal status for own proposals, client connections | Another consultant profile, project ownership, own credential status |
| Student / Researcher | `profiles` + `profile_private` | `student_profiles` | Academic profile, portfolio link, connection requests, saved opportunities | Relevant open opportunities and connections | Employer/company data, role or trial controls, private contacts |

> **Authorization rule:** buttons may be role-aware, but the database remains the source of truth. A user who changes a client request must still fail RLS and trigger checks.

## Farmer / Producer Workspace

The Farmer dashboard is the most operational part of the platform. Its first release must lead with the producer’s farm identity and saleable output—not a generic marketplace browse page.

| Capability | User flow | Database persistence | Permission boundary | Release status |
| --- | --- | --- | --- | --- |
| Farm profile | Set farm name, acreage, crops, livestock, and farm location | Upsert `farmer_profiles` | Only the signed-in Farmer may write their `profile_id` | Build now |
| Product listing | Enter commodity, description, price, unit, quantity, location, and category; publish/manage its lifecycle | Insert/update/delete own `listings` | `profile_id = auth.uid()`; no privileged/featured field controls | Build now |
| My produce | See own active, paused, expired, and draft-equivalent records; edit or remove them | Query own `listings` | Own listing only; status must be restricted to permitted member values | Build now |
| Farm need | Post an input, irrigation, machinery, logistics, or advisory need | Insert own `projects` with relevant skills/category | Own project only; confidential bidder details remain private | Build now |
| Plant clinic | Report a crop or livestock issue and add media only through the protected path | Insert own `problem_posts`; protected storage upload | Owner and permitted experts only; private attachments are never bucket-public | Link existing feature |
| Market watch | View published market rates for selected crops/cities | Read `market_rates` | Read-only platform data | Link existing feature |
| Expert discovery | Search consultants by discipline, crops, location, and services; send request | Directory query + `connection_requests` | Contact details remain private until a consented connection/chat | Build now as controlled discovery |

### Farmer form design

The listing editor must ask for commodity title, category, quantity and unit, price or “on request,” harvest/availability note, city/location, and a clear description. Image upload is a separate future step until listing-media policies exist; accepting arbitrary public URLs is not a secure substitute. The dashboard must treat a listing as **a producer-owned market offer**, never automatically marked featured or advertised.

## Company / Organization Workspace

Organizations need both a public commercial identity and an accountable private operator workspace. The individual account creates the organization and becomes its initial owner; it is not correct to mutate a personal profile into a company record.

| Capability | User flow | Database persistence | Permission boundary | Release status |
| --- | --- | --- | --- | --- |
| Organization profile | Create and update legal name, public display name, registration reference, service coverage, technologies, and locations | Upsert `organizations`; create owner membership | Only a Company role can create; owner/admin can update | Build now |
| Team directory | Add an already-registered member with owner, manager, editor, or viewer scope | `organization_members` | Owner/admin only until manager capabilities are explicitly added to RLS | Build now with owner-only controls |
| Products and services | Publish catalog/offer listings linked to the accountable personal account | `listings` | Own listings only; clarity in UI that current schema does not yet support organization-owned listing attribution | Build now, document limitation |
| Project/RFP | Create a scoped project with required skills, budget range, deadline, city, and remote flag | `projects` | Owner may see proposals for its own project; project status controls public visibility | Build now |
| Proposal inbox | Review consultant proposals and accept, reject, or shortlist | `project_proposals` | Only project owner/admin changes the decision state | Build now |
| Targeted campaign | Submit a future category/location ad for review | `ads` | Member can submit only pending campaigns; admin controls delivery/metrics | Defer until billing and moderation operations are complete |

The public organization record should not expose registration numbers, private email addresses, phone numbers, member lists, internal notes, or commercial account state by default. The `organizations` table already permits a public operational profile while keeping its owner relationship controlled by RLS.

## Consultant Workspace

Consultants must be discoverable for specialized field work while the platform makes their credential state explicitly system-managed. They may promote services and quote for work but cannot mark themselves verified.

| Capability | User flow | Database persistence | Permission boundary | Release status |
| --- | --- | --- | --- | --- |
| Professional profile | Add degree, experience, services, technologies, availability, and starting rate | Upsert `consultant_profiles` | Consultant owns their row; credential status stays protected | Build now |
| Service offers | Publish an advisory or technical services listing | `listings` | Own listing only | Build now |
| Project discovery | Browse only open projects that match selected skills/categories | `projects` + safe directory/project presentation | Public gets open records only | Build now |
| Proposal submission | Draft one scoped note and optional quote for each project | `project_proposals` | Consultant may submit/update/withdraw their own proposal under RLS | Build now |
| Case participation | Answer plant-clinic cases and build a non-sensitive public body of expertise | `problem_comments` | Own comment only; solution marking is controlled by case owner/moderation | Link existing feature |

## Student / Researcher Workspace

Student features should prioritize verifiable academic context, research interests, supervised work, and opportunity relevance. A seven-day trial controls access availability—it must not imply that profile data is public or that a student is automatically verified.

| Capability | User flow | Database persistence | Permission boundary | Release status |
| --- | --- | --- | --- | --- |
| Academic profile | Add institution, programme, degree, research interests, graduation date, and portfolio link | Upsert `student_profiles` | Student owns the row; public output should be selectively exposed later | Build now |
| Opportunity discovery | Browse open projects and filters aligned to research interests/keywords | `projects`, category/keyword matching | Open project records only | Build now |
| Portfolio | Link to selected public work; no raw documents in the first release | `student_profiles.portfolio_url` | Owner controls URL; validation required | Build now |
| Connections | Request relevant connections with consultants and organizations | `connection_requests` | Only requester and recipient see status and note | Build now |

The current schema has no dedicated internship table. In release one, companies may use a project with a clear “internship/research” category convention, but production-quality opportunity classification requires a `project_kind` enum and an audience field in a later migration.

## Cross-Role Features

| Shared workflow | Existing secure model | Required UX rule |
| --- | --- | --- |
| Safe people discovery | `directory_profiles` | Never query raw `profiles` on a public page or display email/phone |
| Introductions | `connection_requests` | Do not expose phone/WhatsApp as an invitation shortcut; use consented connection/message flow |
| Saved work | `saved_items` | A member sees only their own saved listings/projects |
| Marketplace visibility | `listings` | Visitors see active listings; owners retain access to their inactive records |
| Project visibility | `projects` | Visitors see open projects; proposals remain visible only to consultant and project owner |
| Ads | `ads` + review process | A member submits pending creative only; approval, schedule, metrics, and rotation are system/admin controlled |

## Missing Capabilities: Prioritized Release Roadmap

| Priority | Capability | Why it matters | Recommended implementation |
| --- | --- | --- | --- |
| P0 | Apply Migration 09 in a staging Supabase project, then production | The dashboard tables, safe directory, profile privacy, and trigger update do not exist in the live database yet | Apply only through Supabase SQL Editor/CLI using a privileged owner account; test all RLS checks before production |
| P0 | Custom SMTP plus confirmation/recovery UX | Built-in provider limits can block legitimate confirmation emails; the current screen gives a raw opaque provider error | Configure a verified custom SMTP sender; add countdown, resend gate, and clear confirmation instructions |
| P0 | Feature forms and “My records” views | A dashboard is not functional without creating/managing its actual records | Build listing, farm/company/consultant/student profile, project, and proposal forms against RLS tables |
| P0 | Production test matrix | Security claims require verified client and database behavior | Add anonymous, member, cross-member, and admin test cases for every table and action |
| P1 | Organization-owned content attribution | Current listings/projects are owned by an individual profile, even when created for an organization | Add optional `organization_id` with RLS based on owner/member role after deciding manager/editor permissions |
| P1 | Opportunity type/audience | A generic project cannot reliably represent internship, research placement, RFP, or contract work | Add `project_kind`, target role(s), compensation visibility, and application requirements |
| P1 | Listing moderation lifecycle | Direct `active` creation risks spam, misinformation, and unsafe commercial claims | Add `draft`, `pending_review`, `active`, `rejected`, and audit moderation rules; never permit self-featured listing state |
| P1 | Secure file/media workflow | Products, portfolios, and cases need images/documents, but public URL input is not a secure storage policy | Add per-record storage paths, content-type/size checks, signed delivery, and malware moderation policy |
| P1 | Structured matching | Keyword matching needs a transparent, explainable relevance model | Use categories, location, verified profile fields, saved interest, and opt-in matching—not raw private data |
| P2 | Transaction, logistics, quality, and traceability | Marketplace value increases when a product can progress from discovery to reliable fulfillment | Model quote/offer, order, delivery, quality certificate, and complaint separately; do not call it “secure payment” until payment and dispute processes exist |
| P2 | Consultation appointment and feedback system | Valuable for advisory quality, but prone to privacy and reputation risks | Add consented booking, session states, service completion, and moderated bilateral feedback; no fabricated ratings or testimonials |
| P2 | Analytics and automated campaign rotation | Valuable only after verified inventory, adoption, and admin review processes exist | Run only on trusted server/Edge Function with audit logs and service credentials, not client calls |

## Implementation Gate

The immediate implementation must ship **the screens and data calls that Migration 09 already enables**. It must not deploy pages that pretend records exist or silently fall back to `localStorage`. The secure migration remains an external database deployment step because a front-end deployment cannot create tables or modify RLS.

## References

[1]: https://sti-portal.fao.org/families/digital-farmer-buyer-marketplaces "FAO STI Portal — Digital farmer-buyer marketplaces"
[2]: https://aimforscale.org/innovation-packages/digital-advisory/ "AIM for Scale — Digital Advisory Services for Agriculture"

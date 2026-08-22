# 🌾 AgriBusiness.pk — Pakistan's Premier Agri-Tech & B2B Trade Ecosystem

> **AgriBusiness** is an enterprise-grade digital agriculture platform, B2B trading floor, clinical advisory suite, and professional verified network engineered specifically for Pakistan's agricultural ecosystem — connecting Farmers & Producers, Commodity Buyers & Millers, Agronomists & Veterinary Consultants, Agribusiness Enterprises, and Students & Researchers.

[![Vercel Deployment Ready](https://img.shields.io/badge/Vercel-Deployment%20Ready-black?logo=vercel)](https://vercel.com)
[![React 19](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev)
[![TanStack Start](https://img.shields.io/badge/TanStack-Start%20SSR-orange?logo=react-query)](https://tanstack.com)
[![Supabase PostgreSQL](https://img.shields.io/badge/Supabase-PostgreSQL%2015%20%2B%20RLS-3ECF8E?logo=supabase)](https://supabase.com)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-CSS%20v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com)

---

## 🧭 Navigation & Companion Apps Suite

| Portal / Companion App | Route | Target Audience & Purpose |
|---|---|---|
| 📰 **Network Feed** | `/feed` | LinkedIn-style professional feed: field updates, questions, offers, and milestones from every role, with replies, smart-match suggestions, and the mandi snapshot rail. |
| 🏦 **Government Schemes Directory** | `/resources` | Curated, province-filtered guide to Pakistani agri support programs — Kisan Card, ZTBL/SBP financing, crop insurance, land records, and extension advisory, each with official source links. |
| 🏪 **Agri-Biz Trading Floor** | `/apps/agri-biz` | Free B2B classifieds and marketplace for crops, livestock, machinery, inputs, and fertilizers across Pakistani mandis. |
| 🌿 **Plant Clinic** | `/apps/plant-clinic` | Clinical crop health diagnosis, pest identification, symptom analysis, and agronomist consultations. |
| 🐄 **Animal Clinic** | `/apps/animal-clinic` | Telehealth for livestock and dairy farmers with direct prescriptions from veterinary specialists and university researchers. |
| 🎓 **Agri-Education & Research** | `/apps/education` | Agricultural academy with university courses, scientific research papers, modern farming webinars, and thesis guidance. |
| 📋 **Projects & RFP Marketplace** | `/projects` | Live agricultural tenders, farm needs, corporate contracts, and consultant proposal bidding. |
| 🔍 **Universal Search & Network** | `/search` | Directory of verified agricultural professionals, businesses, commodities, and service providers. |
| 💼 **Member Workbench** | `/dashboard` | Role-specific operating dashboard tailored to each account type. |
| 🛡️ **Super Admin Portal** | `/admin-login` & `/admin` | Platform moderation, member verification badges, ad review, and audit trail. |

---

## 🆕 Network Layer & Role Intelligence (Latest Release)

### 📰 Network Feed (`/feed`)
A professional, LinkedIn-style activity layer for the whole ecosystem:
- **Four post kinds** — Update, Ask the network, Offer, Milestone — each with role-aware composer prompts.
- **Replies** from any signed-in member; view counts per post; verified badges on authors.
- **Clinic isolation by design** — feed posts are `problem_posts` rows tagged `network`, and the Plant/Animal Clinics exclude tagged rows, so clinical cases and network conversation never mix.
- **Right rail** — Suggested-for-you matching plus a live "Mandi today" snapshot from the `market_rates` table.

### 🤝 Smart Matching Engine (`src/lib/matching.ts`)
A role-synergy matrix explains **why** two members should connect, then scores real directory profiles:
- `farmer ↔ buyer` (buys what you grow), `farmer ↔ consultant` (advises your crops), `company ↔ student` (internships), `consultant ↔ student` (research supervision), and every other pairing.
- Boosts for same city / same province and keyword overlap between role profiles (crops, commodities, services, research interests).
- Powers the dashboard's **Suggested for you** rail with one-click consented connection requests.

### 📊 Role Intelligence Panels (per-role dashboard upgrades)
| Role | Live intelligence on `/dashboard` |
|---|---|
| 🚜 **Farmer** | **Farm Intelligence**: local weather via open-meteo (no API key), Pakistan crop calendar with Urdu crop names and this-month sowing/harvest windows (your own crops highlighted), mandi indications, and derived weekly advisories (rain → hold sprays, heat → livestock care, dry → irrigation planning). |
| 🏢 **Buyer** | **Sourcing Desk**: live producer listings matched against the commodities and collection regions on the procurement profile, with "Your commodity / Your region" chips. |
| 🔬 **Consultant** | **Lead Radar**: open farm needs and enterprise briefs matched to the services/technologies on the professional profile. |
| 🎓 **Student** | **Opportunity Radar**: open projects and placements matched to research interests. |
| 🏭 **Company** | Engagement stats (opportunities posted, proposals received) feed the stat-card row; the Proposal Inbox remains in the workbench. |

Plus **live stat cards** for every role (connections, pending requests, and role-specific counters) and a **Network feed** link in the workspace navigation.

### 🌾 Pakistan Agri Intelligence (`src/lib/agri-intel.ts`)
- 12-crop **Pakistan crop calendar** (wheat, basmati, cotton, sugarcane, maize, potato, tomato, onion, kinnow, mango, chickpea, canola) with Urdu names, regional belts, and field tips.
- Coordinates for all 34 platform cities → free **open-meteo** weather + 4-day forecast.
- Season + weather → **advisory generator** (never a prescription; always defers to verified consultants).

### 🛠 Resilience Fix
Publishing forms now fall back gracefully when a database predates the optional `listings.services` / `projects.services` tag columns — inserts retry once without the column, so publishing works on both old and migrated databases.

### 🔖 Bookmarks (saved_items)
The previously unused `saved_items` table is now the platform's bookmark system:
- **Save buttons** on marketplace listing cards and open opportunity cards (signed-out visitors are routed to onboarding).
- **Saved tab** in every member's workspace — bookmarked listings and opportunities with prices, budgets, quick links, and one-click removal.
- Owner-scoped RLS: members only ever see and change their own bookmarks.

### 🏦 Government Schemes Directory (`/resources`)
Eleven curated programs across all provinces and AJK/GB — Punjab Kisan Card, PM Youth Business & Agriculture Loans, ZTBL financing, SBP agricultural credit, Crop Loan Insurance, Punjab/Sindh land records, extension advisory, and provincial support windows. Province + type filters, Urdu names, eligibility checklists, step-by-step application guidance, official source links, and a clear "verify before you apply" disclaimer. The farmer intelligence panel links into it directly.

### 🔑 Demo Accounts (password for all: `DemoAgri2026!`)
| Role | Email | City |
|---|---|---|
| 🚜 Farmer | `ali.hassan.farmer@agribiz.demo` | Multan (Vehari farm record) |
| 🏢 Buyer | `tariq.foods.buyer@agribiz.demo` | Lahore (wheat/maize/cotton procurement) |
| 🔬 Consultant | `dr.ayesha.agro@agribiz.demo` | Faisalabad (agronomy, soil, irrigation) |
| 🏭 Company | `admin.greentech@agribiz.demo` | Karachi (drip irrigation & seed supplier) |
| 🎓 Student | `zara.student@agribiz.demo` | Faisalabad (UAF agronomy researcher) |

---

## 🗺️ Suggested Roadmap (next iterations)

1. **Post reactions** — a `network_post_likes` table for lightweight endorsement of feed posts (bookmarks above already cover saving).
2. **Profile analytics** — `profile_views` table + "Who viewed your profile" card; weekly digest email.
3. **Skills & endorsements** — `skill_endorsements` table; endorse buttons on profiles, endorsed skills surfaced in matching.
4. **Urdu feed localization** — composer prompts and advisory text already exist in English; extend the i18n dictionary into `/feed` and the farmer intelligence panel.
5. **WhatsApp/SMS digests** — feed highlights and mandi alerts via the existing WhatsApp support channel for low-bandwidth growers.
6. **Events & webinars module** — company-hosted field days and university webinars with RSVPs feeding the notification system.
7. **Escrow-backed trade** — connect the existing Stripe/JazzCash edge functions to feed offers for protected first transactions.

---

## 👥 5-Role Access Architecture & Permission Matrix

AgriBusiness implements an authentic 5-Role Role-Based Access Control (RBAC) model with dedicated workbench tooling for each persona, plus a Super Admin governance layer:

| Feature / Capability | 🚜 Farmer (`farmer`) | 🏢 Buyer / Miller (`buyer`) | 🔬 Consultant / Vet (`consultant`) | 🏭 Agribusiness Enterprise (`company`) | 🎓 Student / Researcher (`student`) | 🛡️ Super Admin (`admin`) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Farm Profile & Crop Acreage** | ✅ Full CRUD | ❌ | ❌ | ❌ | ❌ | ✅ View |
| **Commodity Procurement Desk** | ❌ | ✅ Full CRUD | ❌ | ❌ | ❌ | ✅ View |
| **Consulting Credentials & Rates** | ❌ | ❌ | ✅ Full CRUD | ❌ | ❌ | ✅ View |
| **Company Registration & Staff** | ❌ | ❌ | ❌ | ✅ Full CRUD | ❌ | ✅ View |
| **Academic & Research Portfolio** | ❌ | ❌ | ❌ | ❌ | ✅ Full CRUD | ✅ View |
| **Publish Produce / Input Listings** | ✅ Produce | ❌ | ✅ Advisory | ✅ Products / Inputs | ❌ | ✅ Moderate |
| **Publish RFPs & Requirements** | ✅ Farm Needs | ✅ Sourcing RFP | ❌ | ✅ Enterprise RFP | ❌ | ✅ Moderate |
| **Submit Technical Proposals** | ❌ | ❌ | ✅ Full Bidding | ❌ | ❌ | ✅ Moderate |
| **Clinical Diagnostic Cases** | ✅ Report Case | ❌ | ✅ Diagnostic Solution | ❌ | ❌ | ✅ Moderate |
| **Consented Connection Inbox** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Audit |
| **Member Moderation & Verification** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Full RPC |
| **Audit Logs & System Health** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Full |

---

## 🔒 Privacy & Consented Contact Card Architecture

Direct contact details (Phone number, WhatsApp, Email, CNIC) are **never publicly exposed** on profile pages:
1. **Public View (`directory_profiles`):** Safely exposes only `display_name`, `user_type`, `city`, `province`, `is_verified`, and public bio.
2. **Private Storage (`profile_private`):** Encrypted contact fields isolated behind Row Level Security (RLS).
3. **Consented Contact Exchange:** Members exchange a formal Connection Request (`connection_requests`). Only upon **mutual acceptance** does the PostgreSQL RPC `get_accepted_connection_contact(peer_id)` return the contact methods that the member has explicitly opted to share.

---

## 📧 Frictionless Registration (Email Verification Bypassed)

To provide an instant, friction-free onboarding experience for growers and agribusinesses in Pakistan:
- **Instant Auto-Login:** When a user registers on `/onboarding`, their session is established immediately without any blocking email confirmation screens, redirecting directly to `/dashboard`.
- **Automatic Fallback Provisioning:** If the database trigger has not yet executed, the frontend initializes the profile from metadata with zero waiting.

### Supabase Email Confirmation Configuration:
In your [Supabase Dashboard](https://supabase.com):
1. Go to **Authentication** → **Providers** → **Email**.
2. Toggle **"Confirm email"** to **OFF** (Disabled).
3. Under **Sign Up**, ensure **"Allow new users to sign up"** is enabled.
4. Click **Save**.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend Framework** | React 19 + TypeScript | High-performance reactive UI with modern hooks |
| **Full-Stack Meta-Framework** | TanStack Start (SSR) | Server-side rendering and type-safe server functions |
| **Routing** | TanStack Router | File-based, type-safe route tree (`src/routes`) |
| **Design System & Styling** | Tailwind CSS v4 + Material Symbols | Curated agricultural palette: Evergreen (`#0F5132`), Harvest Gold (`#E6B00F`), Rice Canvas (`#F4F2E9`) |
| **Database & Auth** | Supabase (PostgreSQL 15 + RLS + Auth) | Multi-tenant relational storage with Row Level Security |
| **Server Engine** | Nitro (`nitro.preset = "vercel"`) + Vite 8 | Ultra-fast build engine optimized for Vercel Serverless Functions |
| **Deployment Target** | Vercel | Vercel Build Output API v3 with edge static caching and serverless SSR |

---

## 📦 Deploying to Vercel (Step-by-Step)

The repository is preconfigured for **Vercel** deployment with `vercel.json` and Nitro SSR.

### Step 1: Push Repository to GitHub
```bash
git add .
git commit -m "feat: complete production readiness"
git push origin main
```

### Step 2: Import into Vercel
1. Open [Vercel New Project](https://vercel.com/new).
2. Connect your GitHub account and select your `agribizness_final` repository.
3. Framework Preset: **Other** (handled automatically by Nitro & `vercel.json`).
4. Build Command: `npm run build` (or leave default).

### Step 3: Add Environment Variables in Vercel
Under **Project Settings** → **Environment Variables**, add:

| Variable Name | Required | Description | Example Value |
|---|:---:|---|---|
| `VITE_SUPABASE_URL` | **Yes** | Your Supabase Project URL | `https://your-ref.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Supabase Public Anon Key | `eyJhbGciOi...` |
| `SUPABASE_URL` | Optional | Server-side Supabase URL | `https://your-ref.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Supabase Service Role Key | `eyJhbGciOi...` |

### Step 4: Deploy
Click **Deploy**. Vercel will run `npm run build`, generate `.vercel/output`, and publish both static assets and serverless SSR functions globally.

---

## 🗄️ Database Migrations Sequence (00 – 11)

All PostgreSQL schema definitions and RLS policies are located in `supabase/migrations/`:

| # | Migration File | Key Tables & Responsibilities |
|---|---|---|
| **00** | `00_extensions.sql` | `uuid-ossp`, `pgcrypto`, `citext`, `pg_trgm` |
| **01** | `01_enums.sql` | Custom ENUMs: `user_type` (farmer, buyer, consultant, company, student, admin), `subscription_status`, `listing_status`, `project_status`, `ad_status`, `payment_status` |
| **02** | `02_core_schema.sql` | `profiles`, `profile_private`, `categories`, `listings`, `projects`, `threads`, `messages`, `ads` |
| **03** | `03_indexes.sql` | GIN trigram indexes for fast commodity and category search |
| **04** | `04_triggers.sql` | `fn_handle_new_user` on `auth.users` insert, timestamp updater triggers |
| **05** | `05_rls_policies.sql` | Granular Row Level Security for multi-tenant isolation |
| **06** | `06_storage_buckets.sql` | Supabase Storage buckets for avatars, listing images, and clinical media |
| **07** | `07_functions.sql` | Ad rotation, trial expiry, and notification helpers |
| **08** | `08_seed_categories.sql` | Baseline 24 official agricultural sectors and sub-categories |
| **09** | `09_role_dashboard_security.sql` | `directory_profiles` safe public view, role tables, `connection_requests` |
| **10** | `10_production_governance.sql` | Super Admin moderation RPC functions and `admin_audit_log` |
| **11** | `11_five_role_connections.sql` | Buyer profiles, consented contact RPC (`get_accepted_connection_contact`), and role-specific publishing constraints |

> [!TIP]
> **One-Step Database Setup**: To initialize or reset a database in one click, run [`supabase/COMPLETE_DATABASE_SETUP.sql`](supabase/COMPLETE_DATABASE_SETUP.sql) inside the Supabase SQL Editor.

---

## 💻 Local Development Setup

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS)
- **npm** or **bun**

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/agribizness_final.git
cd agribizness_final

# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory (based on `.env.example`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Start Local Dev Server
```bash
npm run dev
```
Open **`http://localhost:8080`** in your browser.

### 5. Build for Production
```bash
npm run build
```

---

## 🏷️ Official 24 Agricultural Industry Disciplines

1. Agricultural Engineering and Technology
2. Agribusiness Family Care
3. Agriculture & Field Crops
4. Basic Sciences
5. Business Management Sciences
6. Computer Science & AI
7. Construction & Infrastructure
8. Education & Extension
9. Electronic and Print Media
10. Engineering (Civil, Mechanical, Electrical)
11. Food Science and Technology
12. Health and Diagnostics
13. Horticultural Sciences & Orchards
14. Information Technology
15. Lab Equipment and Chemicals
16. Law and Agri-Lawyers
17. Marketing & General Order Supplies
18. Oilseed Industry
19. Poultry Science / Animal Husbandry
20. Real-Estate & Farm Land
21. Sugar Industry & Cane Technology
22. Textile & Cotton Technology
23. Veterinary Science (DVM)
24. Other Specialized Disciplines

---

## 📄 License & Terms

Engineered for **AgriBusiness Pakistan**. All rights reserved.
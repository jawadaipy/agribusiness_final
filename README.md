# 🌾 AgriBusiness.pk — Pakistan's Premier Agri-Tech & B2B Trade Network

> **AgriBusiness** is an enterprise-grade digital agriculture platform, B2B trading floor, clinical advisory suite, and professional verified network engineered specifically for Pakistan's agricultural ecosystem — connecting Farmers, Buyers/Traders, Agronomy & Livestock Consultants, Agribusiness Enterprises, and Students/Researchers.

---

## 🚀 Quick Links
- **B2B Trading Floor & Classifieds:** `/apps/agri-biz`
- **Plant Clinic (Crop Health & Agronomy):** `/apps/plant-clinic`
- **Animal & Livestock Clinic (Veterinary Advisory):** `/apps/animal-clinic`
- **Agri-Tech Academy:** `/apps/education`
- **Live Projects & RFP Opportunities:** `/projects`
- **Verified 24-Sector Member Directory:** `/search`
- **Role-Based Workbench & Dashboard:** `/dashboard`
- **Platform Governance & Moderation:** `/admin`

---

## 👥 5-Role Access Architecture & Permission Matrix

AgriBusiness implements a strict 5-Role Role-Based Access Control (RBAC) model with dedicated workbench tooling for each persona, plus a Super Admin governance layer:

| Feature / Capability | 🚜 Farmer (`farmer`) | 🏢 Buyer / Miller (`buyer`) | 🔬 Consultant / Vet (`consultant`) | 🏭 Agribusiness Enterprise (`company`) | 🎓 Student / Researcher (`student`) | 🛡️ Super Admin (`admin`) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Farm Profile & Crop Acreage** | ✅ Full | ❌ | ❌ | ❌ | ❌ | ✅ View |
| **Commodity Procurement Profile** | ❌ | ✅ Full | ❌ | ❌ | ❌ | ✅ View |
| **Consulting Credentials & Rates** | ❌ | ❌ | ✅ Full | ❌ | ❌ | ✅ View |
| **Company Registration & Staff** | ❌ | ❌ | ❌ | ✅ Full | ❌ | ✅ View |
| **Academic & Thesis Portfolio** | ❌ | ❌ | ❌ | ❌ | ✅ Full | ✅ View |
| **Publish Produce / Input Listings** | ✅ Produce | ❌ | ✅ Advisory | ✅ Products / Inputs | ❌ | ✅ Moderate |
| **Publish RFPs & Requirements** | ✅ Farm Needs | ✅ Sourcing RFP | ❌ | ✅ Enterprise RFP | ❌ | ✅ Moderate |
| **Submit Project Proposals / Quotes** | ❌ | ❌ | ✅ Full Bidding | ❌ | ❌ | ✅ Moderate |
| **Clinical Diagnostic Cases** | ✅ Report Case | ❌ | ✅ Diagnostic Solution | ❌ | ❌ | ✅ Moderate |
| **Consented Connection Inbox** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Audit |
| **Member Verification & Moderation** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Full RPC |
| **Audit Logs & System Health** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Full |

---

## 🔒 Privacy & Consented Contact Card Architecture

Direct contact details (Phone number, WhatsApp, Email, CNIC) are **never publicly exposed** on profile pages:
1. **Public View (`directory_profiles`):** Safely exposes only `display_name`, `user_type`, `city`, `is_verified`, and public summary.
2. **Private Storage (`profile_private`):** Encrypted contact fields isolated behind Row Level Security.
3. **Consented Contact Exchange:** Members must exchange a formal Connection Request (`connection_requests`). Only upon **mutual acceptance** does the PostgreSQL RPC `get_accepted_connection_contact(peer_id)` return the verified phone and email.

---

## 📧 Seamless Registration (Email Verification Disabled)

To ensure zero friction during farmer and agribusiness onboarding in Pakistan:
- **Instant Auto-Login:** Upon submitting the registration form on `/onboarding`, the platform immediately logs the user in and redirects straight to `/dashboard`.
- **Automatic Profile Auto-Initialization:** If the profile database trigger is pending, the client automatically initializes the member's profile record from auth metadata with zero blocking screens.

### To configure Supabase Email Verification:
In your [Supabase Dashboard](https://supabase.com/dashboard):
1. Navigate to **Authentication** → **Providers** → **Email**.
2. Uncheck **"Confirm email"** (Set to Disabled).
3. Under **Sign Up**, enable **"Allow new users to sign up"**.
4. Save changes.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + TypeScript + TanStack Start (SSR) |
| **Routing** | TanStack React Router (Type-Safe Route Tree) |
| **Styling & Design System** | Tailwind CSS v4 + Material Symbols + Framer Motion |
| **Database & Auth** | Supabase (PostgreSQL 15 + Row Level Security + GoTrue Auth) |
| **Serverless Engine** | Nitro (`nitro.preset = "vercel"`) + Vite 8 |
| **Deployment Target** | Vercel (Serverless Functions + Static Assets) |

---

## 📦 Deployment to Vercel

The project is preconfigured for **Vercel** serverless deployment with `vercel.json` and Nitro SSR.

### Step 1: Push Repository to GitHub
```bash
git add .
git commit -m "feat: production ready for Vercel deployment"
git push origin main
```

### Step 2: Import Project in Vercel
1. Open the [Vercel Dashboard](https://vercel.com/new).
2. Import your GitHub repository.
3. Keep default build settings (`npm run build`).

### Step 3: Add Environment Variables in Vercel
In the Vercel project settings, configure the following Environment Variables:

| Variable Name | Description | Example / Default |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase Project URL | `https://yholetgmaexmcvupmwmn.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Public Publishable Anon Key | `sb_publishable_...` |
| `SUPABASE_URL` | Supabase Server URL | `https://yholetgmaexmcvupmwmn.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role (Optional for backend scripts) | `eyJhbGciOi...` |

### Step 4: Deploy
Click **Deploy**. Vercel will automatically build the Nitro serverless bundle and deploy the platform globally.

---

## 🗄️ Database Migrations Sequence (00 – 11)

The database schema is modularized into ordered migrations located in `supabase/migrations/`:

| Migration File | Description |
|---|---|
| `00_extensions.sql` | UUID, pgcrypto, citext extensions |
| `01_types_and_roles.sql` | Account types (`farmer`, `buyer`, `consultant`, `company`, `student`, `admin`) |
| `02_core_tables.sql` | `profiles`, `profile_private`, `categories`, `listings`, `projects` |
| `03_social_and_ads.sql` | `problem_posts`, `problem_comments`, `ads`, `notifications` |
| `04_triggers.sql` | Auto profile generation trigger on `auth.users` insert |
| `05_rls_policies.sql` | Multi-tenant Row Level Security policies |
| `06_indexes.sql` | Performance indexes for mandi search and categories |
| `07_seed_data.sql` | Baseline 26 categories and sample market records |
| `08_admin_and_fixes.sql` | Admin audit logs and moderation functions |
| `09_super_admin_rpc.sql` | Member activation / verification RPC |
| `10_super_admin_rpc_fix.sql` | Security definer fixes for super admin |
| `11_five_role_connections.sql` | Role profile tables (`farmer_profiles`, `buyer_profiles`, `consultant_profiles`, `organizations`, `student_profiles`), `project_proposals`, and consented connection contact exchange RPC |

To initialize a new Supabase database instance in one step, execute [`supabase/COMPLETE_DATABASE_SETUP.sql`](supabase/COMPLETE_DATABASE_SETUP.sql) in the Supabase SQL Editor.

---

## 💻 Local Development

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **npm** or **bun**

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Local Development Server
```bash
npm run dev
```
Open **`http://localhost:8080`** in your browser.

### 4. Build for Production Locally
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

## 📄 License & Intellectual Property
Engineered for **AgriBusiness Pakistan**. All rights reserved.#   a g r i b u s i n e s s _ f i n a l  
 
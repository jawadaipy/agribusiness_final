/**
 * Curated directory of Pakistani government support programs relevant to
 * AgriBusiness members. Static content — windows and rules change, so every
 * card carries an "official source" link and the page shows a disclaimer.
 */

export type SchemeProvince = "All Pakistan" | "Punjab" | "Sindh" | "Khyber Pakhtunkhwa" | "Balochistan" | "AJK & GB";

export type SchemeCategory = "Finance" | "Subsidy" | "Insurance" | "Land & Records" | "Advisory" | "Youth & Startups";

export type GovScheme = {
  id: string;
  name: string;
  urdu: string;
  province: SchemeProvince;
  category: SchemeCategory;
  summary: string;
  eligibility: string[];
  howToApply: string[];
  source: { label: string; url: string };
};

export const SCHEME_PROVINCES: SchemeProvince[] = ["All Pakistan", "Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan", "AJK & GB"];

export const SCHEME_CATEGORIES: SchemeCategory[] = ["Finance", "Subsidy", "Insurance", "Land & Records", "Advisory", "Youth & Startups"];

export const GOV_SCHEMES: GovScheme[] = [
  {
    id: "kisan-card-punjab",
    name: "Punjab Kisan Card",
    urdu: "پنجاب کسان کارڈ",
    province: "Punjab",
    category: "Subsidy",
    summary: "Province-wide farmer registration card that channels input subsidies (fertilizer, seed, machinery) and emergency support directly to registered landholders and tenants.",
    eligibility: ["Farmers with verifiable land record or tenancy in Punjab", "CNIC-linked registration through the agriculture department"],
    howToApply: ["Register at your District Agriculture Office or the online portal", "Complete biometric verification with your CNIC and land record (fard)"],
    source: { label: "agripunjab.gov.pk", url: "https://agripunjab.gov.pk" },
  },
  {
    id: "pmyb-agri-loans",
    name: "PM Youth Business & Agriculture Loan Scheme",
    urdu: "وزیراعظم نوجوان کاروبار و زرعی قرضہ اسکیم",
    province: "All Pakistan",
    category: "Youth & Startups",
    summary: "Mark-up-subsidized loans in tiers for young entrepreneurs, including agri-startups, agri-processing, and farm mechanization ventures.",
    eligibility: ["Pakistani citizens aged 21–45 (18+ for IT/tech ventures)", "Viable business plan; small-farmer applicants prioritized in agriculture tiers"],
    howToApply: ["Apply online with CNIC and business plan", "Bank conducts appraisal before disbursement"],
    source: { label: "pmyp.gov.pk", url: "https://pmyp.gov.pk" },
  },
  {
    id: "ztbl-loans",
    name: "ZTBL Production & Development Loans",
    urdu: "زرعی ترقیاتی بینک قرضے",
    province: "All Pakistan",
    category: "Finance",
    summary: "Zarai Taraqiati Bank seasonal production loans for crop inputs plus development loans for farm infrastructure — tubewells, farm buildings, machinery, orchard establishment.",
    eligibility: ["Landholding farmers with clean land record; passbook-based lending", "Tenants and oral lessees eligible under specific schemes"],
    howToApply: ["Visit your nearest ZTBL branch with land passbook and CNIC", "Loan officer prepares feasibility and passbook charge"],
    source: { label: "ztbl.com.pk", url: "https://ztbl.com.pk" },
  },
  {
    id: "sbp-agri-financing",
    name: "SBP Agricultural Financing (Banks & MFBs)",
    urdu: "اسٹیٹ بینک زرعی مالیہ",
    province: "All Pakistan",
    category: "Finance",
    summary: "State Bank of Pakistan requires commercial and microfinance banks to lend to the agriculture sector — crop loans, working capital, and value-chain financing at benchmarked rates.",
    eligibility: ["Farmers, livestock owners, and agri-enterprises", "Borrowers typically need CNIC, land/asset document, and a simple cash-flow statement"],
    howToApply: ["Approach any commercial or microfinance bank's agri-financing desk", "Ask specifically for the agriculture credit scheme and its current markup rate"],
    source: { label: "sbp.org.pk", url: "https://www.sbp.org.pk" },
  },
  {
    id: "clis-crop-insurance",
    name: "Crop Loan Insurance Scheme (CLIS)",
    urdu: "فصلی قرضہ بیمہ اسکیم",
    province: "All Pakistan",
    category: "Insurance",
    summary: "Mandatory-pass crop insurance for loanee farmers — premiums are subsidized, and payouts cover natural calamities (flood, drought, hail, pest attack) on insured crops.",
    eligibility: ["Farmers taking crop production loans from participating banks", "Coverage travels with the loan — no separate policy purchase"],
    howToApply: ["Confirm with your lending bank that CLIS covers your loan", "Report damage to the bank and revenue officials within the claim window"],
    source: { label: "sbp.org.pk", url: "https://www.sbp.org.pk" },
  },
  {
    id: "punjab-land-records",
    name: "Punjab Land Records Authority (PLRA)",
    urdu: "اراضی ریکارڈ اتھارٹی",
    province: "Punjab",
    category: "Land & Records",
    summary: "Arazi Record Centres issue fard (record of rights), mutations, and verifications — the documents most subsidy and loan applications depend on.",
    eligibility: ["Any landowner or verified tenant in Punjab", "Third parties with authorized power of attorney"],
    howToApply: ["Visit an Arazi Record Centre with CNIC", "Request fard or mutation tracking; use the helpline for status checks"],
    source: { label: "punjab-zameen.gov.pk", url: "https://punjab-zameen.gov.pk" },
  },
  {
    id: "sindh-land-records",
    name: "Sindh Land Records & Revenue Services",
    urdu: "سندھ زمین و محصول",
    province: "Sindh",
    category: "Land & Records",
    summary: "Board of Revenue Sindh provides land records, allotments, and mutation services that back tenancy proof for schemes and finance.",
    eligibility: ["Landowners and tenants in Sindh with verifiable revenue record"],
    howToApply: ["Apply through the Board of Revenue portal or district revenue office", "Carry CNIC and existing record documents"],
    source: { label: "sindhboardofrevenue.gov.pk", url: "https://sindhboardofrevenue.gos.pk" },
  },
  {
    id: "extension-advisory",
    name: "District Agriculture Extension Advisory",
    urdu: "زرعی ایکٹنشن مشاورت",
    province: "All Pakistan",
    category: "Advisory",
    summary: "Free seasonal agronomy support — pest and disease alerts, sowing recommendations, and demonstration plots — from provincial extension field staff.",
    eligibility: ["Any farmer; priority visits for smallholders and women-led farms"],
    howToApply: ["Contact your tehsil or district agriculture office for a field visit", "Ask about the seasonal pest-forecast bulletins for your crop"],
    source: { label: "Ministry of National Food Security", url: "https://mnfsr.gov.pk" },
  },
  {
    id: "kp-agri-support",
    name: "KP Agriculture Department Support Programs",
    urdu: "خیبر پختونخوا زرعی پروگرام",
    province: "Khyber Pakhtunkhwa",
    category: "Subsidy",
    summary: "Rolling programs for orchard development, tunnel farming, solar irrigation, and quality seed — subsidy windows open seasonally by district.",
    eligibility: ["KP farmers and agri-enterprises; scheme-specific criteria apply"],
    howToApply: ["Watch announcements from the KP Agriculture Department", "Apply through your district agriculture office when a window opens"],
    source: { label: "kp.gov.pk", url: "https://kp.gov.pk" },
  },
  {
    id: "balochistan-water",
    name: "Balochistan Water & Horticulture Support",
    urdu: "بلوچستان آبپاشی و باغبانی",
    province: "Balochistan",
    category: "Subsidy",
    summary: "Support for drip/sprinkler conversion, karez rehabilitation, and orchard (apple, grape, date) development in participating districts.",
    eligibility: ["Farmers in notified districts; water-user associations for communal schemes"],
    howToApply: ["Contact the provincial irrigation or agriculture department", "Community schemes apply through the water-user association"],
    source: { label: "balochistan.gov.pk", url: "https://balochistan.gov.pk" },
  },
  {
    id: "ajk-gb-programs",
    name: "AJK & GB Agriculture & Livestock Programs",
    urdu: "آزاد کشمیر و گلگت بلتستان زرعی پروگرام",
    province: "AJK & GB",
    category: "Subsidy",
    summary: "Regional departments run support for mountain agriculture — nursery plants, tunnel farming, trout and livestock packages.",
    eligibility: ["Residents of AJK or Gilgit-Baltistan engaged in farming or livestock"],
    howToApply: ["Apply via the regional Agriculture/Livestock department offices", "Seasonal windows announced district-wise"],
    source: { label: "ajk.gov.pk", url: "https://ajk.gov.pk" },
  },
];

export const CATEGORY_ICONS: Record<SchemeCategory, string> = {
  Finance: "account_balance",
  Subsidy: "savings",
  Insurance: "shield",
  "Land & Records": "landscape",
  Advisory: "support_agent",
  "Youth & Startups": "rocket_launch",
};

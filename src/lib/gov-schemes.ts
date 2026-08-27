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
  subsidyAmount?: string;
  helpline?: string;
  eligibility: string[];
  howToApply: string[];
  source: { label: string; url: string };
};

export const SCHEME_PROVINCES: SchemeProvince[] = ["All Pakistan", "Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan", "AJK & GB"];

export const SCHEME_CATEGORIES: SchemeCategory[] = ["Finance", "Subsidy", "Insurance", "Land & Records", "Advisory", "Youth & Startups"];

export const CATEGORY_ICONS: Record<SchemeCategory, string> = {
  Finance: "payments",
  Subsidy: "redeem",
  Insurance: "shield",
  "Land & Records": "description",
  Advisory: "psychiatry",
  "Youth & Startups": "rocket_launch",
};

export const GOV_SCHEMES: GovScheme[] = [
  {
    id: "green-tractor-punjab",
    name: "Chief Minister Punjab Green Tractor Scheme",
    urdu: "وزیراعلیٰ پنجاب گرین ٹریکٹر اسکیم",
    province: "Punjab",
    category: "Subsidy",
    subsidyAmount: "₨ 1,500,000 / Tractor",
    helpline: "0800-17000",
    summary: "Flagship provincial farm mechanization scheme providing ₨ 1.5 Million flat subsidy on 50HP to 85HP modern tractors for small and medium landholders across all 36 Punjab districts.",
    eligibility: ["Farmers owning 1 to 50 acres of agricultural land in Punjab", "Valid CNIC and land verification via Arazi Record Centre (PLRA)"],
    howToApply: ["Apply online via gts.punjab.gov.pk portal with CNIC and land fard", "Transparent electronic balloting; selected winners get subsidy vouchers for authorized tractor manufacturers (Millat, Al-Ghazi, etc.)"],
    source: { label: "gts.punjab.gov.pk", url: "https://agripunjab.gov.pk" },
  },
  {
    id: "solar-tubewell-punjab",
    name: "CM Punjab Solar Tubewell Conversion Subsidy Scheme",
    urdu: "وزیراعلیٰ پنجاب سولر ٹیوب ویل اسکیم",
    province: "Punjab",
    category: "Subsidy",
    subsidyAmount: "80% Gov Subsidy (up to ₨ 1.5M)",
    helpline: "0800-17000",
    summary: "Government pays 80% of total capital costs to convert heavy electricity and diesel-driven tubewells to solar PV power systems, drastically reducing irrigation expenses.",
    eligibility: ["Farmers with an existing functional tubewell", "Agricultural landholding of up to 25 acres"],
    howToApply: ["Submit application at District Directorate of Agriculture (On-Farm Water Management)", "Field engineers verify groundwater depth and system discharge before authorized solar installation"],
    source: { label: "watermanagement.agripunjab.gov.pk", url: "https://agripunjab.gov.pk" },
  },
  {
    id: "kisan-card-punjab",
    name: "Punjab Kisan Card (Interest-Free Input Financing)",
    urdu: "پنجاب کسان کارڈ (بغیر سود زرعی قرضہ)",
    province: "Punjab",
    category: "Subsidy",
    subsidyAmount: "₨ 150,000 / Season",
    helpline: "0800-17000",
    summary: "Digital debit card providing ₨ 30,000 per acre (up to ₨ 150,000 per season) interest-free loans to buy fertilizer, certified seed, and pesticides directly at subsidized rates.",
    eligibility: ["Landholders and registered tenants owning/tilling up to 12.5 acres in Punjab", "CNIC-linked SIM and biometric verification"],
    howToApply: ["Register at your Tehsil Agriculture Extension Office or via HBL Konnect centers", "Collect your biometric Kisan Card and buy inputs from authorized fertilizer dealers"],
    source: { label: "agripunjab.gov.pk", url: "https://agripunjab.gov.pk" },
  },
  {
    id: "livestock-card-punjab",
    name: "Chief Minister Punjab Livestock Card Scheme",
    urdu: "وزیراعلیٰ پنجاب لائیو اسٹاک کارڈ اسکیم",
    province: "Punjab",
    category: "Finance",
    subsidyAmount: "₨ 250,000 Interest-Free",
    helpline: "0800-17000",
    summary: "Interest-free digital financing of up to ₨ 250,000 for rural livestock farmers to purchase silage, concentrated cattle feed, mineral blocks, and veterinary medicines for animal fattening.",
    eligibility: ["Livestock farmers owning 5 to 10 cattle/buffaloes in Punjab", "Registered with the Punjab Livestock & Dairy Development Department (L&DD)"],
    howToApply: ["Visit your nearest Civil Veterinary Hospital or District Livestock Office", "Receive Livestock Card for monthly drawdown at registered animal feed outlets"],
    source: { label: "livestock.punjab.gov.pk", url: "https://livestock.punjab.gov.pk" },
  },
  {
    id: "sindh-hari-card",
    name: "Sindh Peoples Hari Card Scheme",
    urdu: "سندھ پیپلز ہاری کارڈ اسکیم",
    province: "Sindh",
    category: "Subsidy",
    subsidyAmount: "Direct Cash Subsidies",
    helpline: "021-99201800",
    summary: "Digital registration and relief card for small farmers and sharecroppers (haris) in Sindh, providing direct financial assistance for certified seed, Urea/DAP price rebates, and disaster relief.",
    eligibility: ["Haris and small landowners holding up to 16 acres in Sindh", "Verified through local Tapedar and Sindh Revenue Department"],
    howToApply: ["Visit your District Agriculture Office with Form VII (land fard) and CNIC", "Complete biometric registration to receive direct mobile wallet subsidy disbursement"],
    source: { label: "sindhagri.gov.pk", url: "https://sindh.gov.pk" },
  },
  {
    id: "oilseed-promotion",
    name: "National Oilseed Promotion Program (Canola & Sunflower)",
    urdu: "قومی پروگرام برائے فروغ روغنی اجناس",
    province: "All Pakistan",
    category: "Subsidy",
    subsidyAmount: "₨ 5,000 / Acre",
    helpline: "0800-17000",
    summary: "National incentive program providing ₨ 5,000/acre direct cash subsidy on approved hybrid Canola, Sarson (Mustard), and Sunflower cultivation to boost national edible oil self-reliance.",
    eligibility: ["Growers sowing certified hybrid oilseeds on 1 to 20 acres", "Purchase bags with official FSC&RD subsidy scratch coupons"],
    howToApply: ["Buy certified seed bags with subsidy vouchers from registered seed distributors", "SMS the scratch code along with your CNIC number to 8070 to receive instant funds"],
    source: { label: "agripunjab.gov.pk", url: "https://agripunjab.gov.pk" },
  },
  {
    id: "pmyb-agri-loans",
    name: "PM Youth Business & Agriculture Loan Scheme",
    urdu: "وزیراعظم نوجوان کاروبار و زرعی قرضہ اسکیم",
    province: "All Pakistan",
    category: "Youth & Startups",
    subsidyAmount: "Up to ₨ 7.5 Million (Tier 1-3)",
    helpline: "051-9207000",
    summary: "Concessionary mark-up loans (0% for Tier-1 up to ₨ 500k, 5% for Tier-2, 7% for Tier-3) for young entrepreneurs, modern dairy farms, agri-tech startups, and machinery procurement.",
    eligibility: ["Pakistani citizens aged 21–45 (18+ for agri-tech/IT ventures)", "Viable agricultural business feasibility report"],
    howToApply: ["Apply online via the official PMYP portal (pmyp.gov.pk)", "Selected commercial banks (NBP, BOP, HBL, Meezan) conduct verification before disbursement"],
    source: { label: "pmyp.gov.pk", url: "https://pmyp.gov.pk" },
  },
  {
    id: "ztbl-loans",
    name: "ZTBL Seasonal Crop & Farm Development Loans",
    urdu: "زرعی ترقیاتی بینک قرضے",
    province: "All Pakistan",
    category: "Finance",
    subsidyAmount: "Passbook Benchmark Rates",
    helpline: "051-9252700",
    summary: "Zarai Taraqiati Bank seasonal production loans for seed, fertilizer, and spray plus medium-term development loans for tractors, laser land levelers, solar tubewells, and commercial orchards.",
    eligibility: ["Landholders with clean agricultural passbook; tenant farmers under specific guarantor schemes", "Clean credit history verified via e-CIB"],
    howToApply: ["Visit nearest ZTBL branch with land passbook, photographs, and CNIC", "ZTBL Mobile Credit Officer (MCO) visits farm to verify land and disburse loan"],
    source: { label: "ztbl.com.pk", url: "https://ztbl.com.pk" },
  },
  {
    id: "clis-crop-insurance",
    name: "Crop Loan Insurance Scheme (CLIS)",
    urdu: "فصلی قرضہ بیمہ اسکیم",
    province: "All Pakistan",
    category: "Insurance",
    subsidyAmount: "Subsidized Premium",
    helpline: "021-111-727-111",
    summary: "Mandatory crop insurance protection for all loanee farmers — premiums are 100% subsidized by the government for small farmers, insuring Wheat, Cotton, Rice, Sugarcane, and Maize against floods, drought, and locust attacks.",
    eligibility: ["Farmers obtaining crop production credit from participating scheduled commercial banks", "Coverage applies automatically to crop loan accounts"],
    howToApply: ["Inquire with your lending bank branch regarding CLIS coverage on your loan", "In case of declared natural disaster, insurance claim is credited directly to offset your loan balance"],
    source: { label: "sbp.org.pk", url: "https://www.sbp.org.pk" },
  },
  {
    id: "punjab-land-records",
    name: "Punjab Land Records Authority (PLRA / Arazi Record)",
    urdu: "اراضی ریکارڈ اتھارٹی (فرد برائے زرعی قرضہ)",
    province: "Punjab",
    category: "Land & Records",
    helpline: "042-111-22-22-77",
    summary: "Digital Arazi Record Centres issue verified fard (record of rights), electronic mutations, and mortgaging for bank agri-loans and government subsidy verification.",
    eligibility: ["Landowners and verified agricultural tenants in Punjab", "Authorized representatives with bio-metric verification"],
    howToApply: ["Visit any Arazi Record Centre or Dehi Markaz-e-Maal with CNIC", "Online fard issuance available via the PLRA mobile app (Zameen Punjab)"],
    source: { label: "punjab-zameen.gov.pk", url: "https://punjab-zameen.gov.pk" },
  },
];

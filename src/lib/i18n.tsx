import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export type Lang = "en" | "ur";

// ----------------------------------------------------------------
// Translation strings (EN + UR)
// Urdu tone: warm, direct, respectful — as you'd speak to a customer
// ----------------------------------------------------------------
const strings = {
  en: {
    // Navigation
    nav_marketplace: "Marketplace",
    nav_projects: "Projects",
    nav_network: "Network",
    nav_education: "Education",
    nav_login: "Sign In",
    nav_post_listing: "Post a Listing",
    nav_lang_toggle: "اردو",

    // Hero
    hero_badge: "Pakistan's Trusted Agri-Network",
    hero_headline_1: "The Digital Frontier for",
    hero_headline_2: "Agriculture",
    hero_sub: "Connecting farmers, companies, and consultants through Pakistan's largest professional agri-marketplace.",
    hero_cta_primary: "Browse the Marketplace",
    hero_cta_secondary: "Start My Free 7 Days",
    hero_stat_farmers: "Verified Farmers",
    hero_stat_consultants: "Consultants",
    hero_stat_volume: "Trade Volume",

    // Pricing
    pricing_eyebrow: "Flexible Plans",
    pricing_headline: "Pick the plan that fits your scale",
    pricing_sub: "Start free for 7 days — no card needed. Upgrade whenever you're ready.",
    pricing_cta_trial: "Start Free 7 Days",
    pricing_cta_pro: "Unlock Professional",
    pricing_cta_enterprise: "Talk to Sales",
    pricing_payment_note: "Pay with JazzCash, Easypaisa, or card",
    pricing_trial_note: "7 days free, cancel any time",

    // Empty states
    empty_search: "No matches for",
    empty_search_hint: "Try broadening your keywords, or post your requirement directly.",
    empty_projects: "No projects match your filters right now.",
    empty_projects_hint: "Post your own requirement below and get proposals within 24 hours.",
    empty_listings: "Nothing listed in this category yet.",
    empty_listings_hint: "Be the first — post your product and reach 50,000+ verified buyers.",
    empty_activity: "No recent activity yet.",
    empty_activity_hint: "Once you start trading or connecting, your activity will show here.",

    // Forms
    form_full_name: "Full Name",
    form_email: "Email Address",
    form_phone: "Mobile Number",
    form_password: "Password",
    form_cnic: "National ID (CNIC)",
    form_sector: "Primary Agri-Sector",
    form_phone_placeholder: "03XX-XXXXXXX",
    form_cnic_placeholder: "XXXXX-XXXXXXX-X",
    form_email_placeholder: "you@example.com",
    form_name_placeholder: "e.g. Tariq Khan",

    // Validation errors
    err_required: "This field is required",
    err_email: "Please enter a valid email address",
    err_phone: "Pakistani numbers are 11 digits starting with 03 (e.g. 03001234567)",
    err_cnic: "CNIC format: XXXXX-XXXXXXX-X (13 digits total)",
    err_password: "Password must be at least 8 characters",
    err_name: "Please enter your full name (at least 2 characters)",

    // Buttons / CTAs
    btn_continue: "Continue",
    btn_back: "Back",
    btn_submit: "Activate My Free Account",
    btn_signin: "Sign In to My Account",
    btn_whatsapp: "Message on WhatsApp",
    btn_message: "Send a Message",
    btn_bid: "Submit a Proposal",
    btn_post_listing: "Post My Product",
    btn_post_project: "Post My Requirement",
    btn_view_details: "See Full Details",
    btn_load_more: "Load More",
    btn_signout: "Sign Out",
    btn_verify: "Complete Verification",

    // Auth
    already_account: "Already have an account?",
    no_account: "New to AgriBusiness?",

    // Dashboard
    dash_greeting: "Welcome back",
    dash_greeting_ur: "خوش آمدید",
    dash_new_notification: "new notifications today",
    dash_new_listing: "Post New Listing",

    // Offline
    offline_banner: "You're offline — data won't refresh until you reconnect",
    offline_reconnected: "You're back online!",

    // 404
    not_found_title: "This page doesn't exist",
    not_found_sub: "You might have followed a broken link, or this page has moved.",
    not_found_cta: "Go to Homepage",

    // Error boundary
    error_title: "Something went wrong",
    error_sub: "We couldn't load this page. Check your connection and try again.",
    error_retry: "Try Again",
    error_home: "Go Home",

    // WhatsApp message templates
    wa_listing: "Salaam! I found your listing on AgriBusiness and I'm interested. Can we discuss?",
    wa_profile: "Salaam! I came across your profile on AgriBusiness. I'd like to connect.",
  },

  ur: {
    // Navigation
    nav_marketplace: "بازار",
    nav_projects: "منصوبے",
    nav_network: "نیٹ ورک",
    nav_education: "تعلیم",
    nav_login: "لاگ ان",
    nav_post_listing: "اشتہار دیں",
    nav_lang_toggle: "English",

    // Hero
    hero_badge: "پاکستان کا قابل اعتماد زرعی نیٹ ورک",
    hero_headline_1: "زراعت کا ڈیجیٹل",
    hero_headline_2: "مستقبل",
    hero_sub: "کسانوں، کمپنیوں اور ماہرین کو پاکستان کے سب سے بڑے زرعی پلیٹ فارم سے جوڑیں۔",
    hero_cta_primary: "بازار دیکھیں",
    hero_cta_secondary: "مفت آزمائیں — 7 دن",
    hero_stat_farmers: "تصدیق شدہ کسان",
    hero_stat_consultants: "ماہرین",
    hero_stat_volume: "تجارتی حجم",

    // Pricing
    pricing_eyebrow: "سستے پلان",
    pricing_headline: "اپنے کام کے مطابق پلان چنیں",
    pricing_sub: "7 دن مفت — کارڈ کی ضرورت نہیں۔ جب چاہیں اپ گریڈ کریں۔",
    pricing_cta_trial: "7 دن مفت شروع کریں",
    pricing_cta_pro: "پروفیشنل انلاک کریں",
    pricing_cta_enterprise: "ہم سے بات کریں",
    pricing_payment_note: "جاز کیش، ایزی پیسہ یا کارڈ سے ادا کریں",
    pricing_trial_note: "7 دن مفت، کسی بھی وقت منسوخ کریں",

    // Empty states
    empty_search: "کوئی نتیجہ نہیں",
    empty_search_hint: "کلیدی الفاظ بدل کر آزمائیں، یا اپنی ضرورت براہ راست پوسٹ کریں۔",
    empty_projects: "ابھی کوئی منصوبہ نہیں ملا۔",
    empty_projects_hint: "اپنی ضرورت پوسٹ کریں اور 24 گھنٹوں میں تجاویز پائیں۔",
    empty_listings: "ابھی اس زمرے میں کچھ نہیں ہے۔",
    empty_listings_hint: "پہلے بنیں — اپنی مصنوعات پوسٹ کریں اور 50,000 سے زیادہ خریداروں تک پہنچیں۔",
    empty_activity: "ابھی کوئی سرگرمی نہیں۔",
    empty_activity_hint: "تجارت یا رابطے شروع کریں تو یہاں نظر آئے گا۔",

    // Forms
    form_full_name: "پورا نام",
    form_email: "ای میل",
    form_phone: "موبائل نمبر",
    form_password: "پاس ورڈ",
    form_cnic: "قومی شناختی کارڈ (CNIC)",
    form_sector: "بنیادی زرعی شعبہ",
    form_phone_placeholder: "03XX-XXXXXXX",
    form_cnic_placeholder: "XXXXX-XXXXXXX-X",
    form_email_placeholder: "آپ کی ای میل",
    form_name_placeholder: "مثلاً: طارق خان",

    // Validation errors
    err_required: "یہ خانہ ضروری ہے",
    err_email: "درست ای میل درج کریں",
    err_phone: "پاکستانی نمبر 03 سے شروع ہو اور 11 ہندسے ہوں (مثلاً: 03001234567)",
    err_cnic: "CNIC فارمیٹ: XXXXX-XXXXXXX-X",
    err_password: "پاس ورڈ کم از کم 8 حروف ہونا چاہیے",
    err_name: "براہ کرم اپنا پورا نام لکھیں",

    // Buttons / CTAs
    btn_continue: "جاری رکھیں",
    btn_back: "واپس",
    btn_submit: "میرا مفت اکاؤنٹ بنائیں",
    btn_signin: "لاگ ان کریں",
    btn_whatsapp: "واٹس ایپ پر بات کریں",
    btn_message: "پیغام بھیجیں",
    btn_bid: "تجویز دیں",
    btn_post_listing: "میری مصنوعات پوسٹ کریں",
    btn_post_project: "میری ضرورت پوسٹ کریں",
    btn_view_details: "پوری تفصیل دیکھیں",
    btn_load_more: "مزید دکھائیں",
    btn_signout: "لاگ آؤٹ",
    btn_verify: "تصدیق مکمل کریں",

    // Auth
    already_account: "پہلے سے اکاؤنٹ ہے؟",
    no_account: "نئے ہیں؟",

    // Dashboard
    dash_greeting: "خوش آمدید",
    dash_greeting_ur: "خوش آمدید",
    dash_new_notification: "نئی اطلاعات آج",
    dash_new_listing: "نئی لسٹنگ پوسٹ کریں",

    // Offline
    offline_banner: "آپ آف لائن ہیں — دوبارہ منسلک ہونے تک ڈیٹا تازہ نہیں ہوگا",
    offline_reconnected: "آپ دوبارہ آن لائن ہیں!",

    // 404
    not_found_title: "یہ صفحہ موجود نہیں",
    not_found_sub: "لنک ٹوٹا ہوا ہے یا یہ صفحہ منتقل ہو گیا ہے۔",
    not_found_cta: "ہوم پیج پر جائیں",

    // Error boundary
    error_title: "کچھ غلط ہو گیا",
    error_sub: "یہ صفحہ لوڈ نہیں ہو سکا۔ اپنا انٹرنیٹ چیک کریں اور دوبارہ کوشش کریں۔",
    error_retry: "دوبارہ کوشش کریں",
    error_home: "ہوم پیج",

    // WhatsApp
    wa_listing: "السلام علیکم! میں نے آپ کا اشتہار AgriBusiness پر دیکھا۔ کیا ہم بات کر سکتے ہیں؟",
    wa_profile: "السلام علیکم! آپ کا پروفائل AgriBusiness پر دیکھا۔ رابطہ کرنا چاہتا ہوں۔",
  },
} as const;

type TranslationKey = keyof typeof strings.en;

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("agri_lang") as Lang) ?? "en";
    }
    return "en";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem("agri_lang", l);
    }
    // Apply RTL direction to <html>
    document.documentElement.setAttribute("dir", l === "ur" ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", l === "ur" ? "ur" : "en");
  };

  useEffect(() => {
    // Apply on mount
    document.documentElement.setAttribute("dir", lang === "ur" ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", lang === "ur" ? "ur" : "en");
  }, []);

  const t = (key: TranslationKey): string => strings[lang][key] as string;
  const isRTL = lang === "ur";

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Graceful fallback if used outside provider (e.g. SSR)
    return {
      lang: "en" as Lang,
      setLang: (_: Lang) => {},
      t: (key: TranslationKey) => strings.en[key] as string,
      isRTL: false,
    };
  }
  return ctx;
}

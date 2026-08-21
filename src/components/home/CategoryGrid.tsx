import { Link } from "@tanstack/react-router";
import { useTranslation } from "@/lib/i18n";
import { motion } from "framer-motion";

export function CategoryGrid() {
  const { lang } = useTranslation();

  const categories = [
    {
      name: lang === "ur" ? "گندم و اناج" : "Wheat & Grains",
      icon: "grass",
      gradient: "from-emerald-500 to-green-700",
      bgSoft: "bg-emerald-50",
      textColor: "text-emerald-800",
      slug: "wheat-grains",
      count: "3,240 listings"
    },
    {
      name: lang === "ur" ? "باسمتی چاول" : "Basmati Rice",
      icon: "rice_bowl",
      gradient: "from-amber-400 to-yellow-600",
      bgSoft: "bg-amber-50",
      textColor: "text-amber-800",
      slug: "rice",
      count: "1,890 listings"
    },
    {
      name: lang === "ur" ? "کپاس" : "Cotton",
      icon: "eco",
      gradient: "from-teal-500 to-cyan-700",
      bgSoft: "bg-teal-50",
      textColor: "text-teal-800",
      slug: "cotton",
      count: "980 listings"
    },
    {
      name: lang === "ur" ? "مشینری" : "Machinery",
      icon: "agriculture",
      gradient: "from-blue-500 to-indigo-700",
      bgSoft: "bg-blue-50",
      textColor: "text-blue-800",
      slug: "machinery",
      count: "540 listings"
    },
    {
      name: lang === "ur" ? "مویشی" : "Livestock",
      icon: "pets",
      gradient: "from-orange-500 to-red-600",
      bgSoft: "bg-orange-50",
      textColor: "text-orange-800",
      slug: "livestock",
      count: "2,100 listings"
    },
    {
      name: lang === "ur" ? "شمسی توانائی" : "Solar Energy",
      icon: "solar_power",
      gradient: "from-yellow-400 to-orange-500",
      bgSoft: "bg-yellow-50",
      textColor: "text-yellow-800",
      slug: "solar",
      count: "320 listings"
    },
  ];

  return (
    <section
      className="bg-background py-16 md:py-20 relative overflow-hidden"
      aria-labelledby="categories-heading"
    >
      {/* Subtle background */}
      <div className="absolute inset-0 section-dots opacity-30 pointer-events-none" />

      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4"
        >
          <div className="text-left max-w-2xl">
            <span className="section-eyebrow mb-2 block">
              {lang === "ur" ? "زرعی شعبہ جات" : "Agriculture Sectors"}
            </span>
            <h2
              id="categories-heading"
              className="section-heading"
            >
              {lang === "ur" ? "بازار کے زمرے" : "Browse the Marketplace"}
            </h2>
            <p className="section-sub mt-2">
              {lang === "ur"
                ? "پاکستان کی زرعی سپلائی چین میں ہر شعبے کو دریافت کریں۔"
                : "Explore commodities, certified inputs, livestock, and machinery across Pakistan."}
            </p>
          </div>
          <Link
            to="/categories"
            className="flex items-center gap-1.5 text-secondary font-bold text-xs uppercase tracking-wider hover:text-primary transition-colors group shrink-0"
          >
            {lang === "ur" ? "سب دیکھیں" : "View All Categories"}
            <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Hero Feature Card */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="md:col-span-5 gradient-agri rounded-3xl p-8 text-left flex flex-col justify-between group overflow-hidden relative shadow-xl min-h-[320px]"
          >
            {/* Decorative */}
            <div className="absolute inset-0 section-dots opacity-20 pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/8 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary/50 via-secondary to-secondary/50" />

            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-primary font-bold text-[10px] uppercase tracking-wider mb-5 shadow-md">
                <span className="material-symbols-outlined text-[14px]">storefront</span>
                Featured Trading Floor
              </span>
              <h3 className="font-display text-3xl md:text-4xl font-bold text-white mb-3 leading-tight tracking-tight">
                Agri-Biz{" "}
                <span className="text-secondary italic">Trading Floor</span>
              </h3>
              <p className="text-white/75 text-sm leading-relaxed max-w-xs mb-7 font-medium">
                {lang === "ur"
                  ? "پاکستان کے تصدیق شدہ فروخت کنندگان اور خریداروں کے لیے جدید ترین ٹریڈنگ ہب۔"
                  : "The digital exchange for verified commodity sellers, millers, and corporate buyers."}
              </p>
              <Link
                to="/apps/agri-biz"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-secondary hover:text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                {lang === "ur" ? "ابھی شروع کریں" : "Start Trading"}
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>

            {/* Background icon */}
            <div className="absolute -bottom-4 -right-4 opacity-8 pointer-events-none group-hover:opacity-12 transition-opacity">
              <span className="material-symbols-outlined text-[160px] text-white -rotate-12 group-hover:rotate-0 transition-transform duration-700">
                storefront
              </span>
            </div>

            {/* Quick stats strip */}
            <div className="relative z-10 mt-6 pt-5 border-t border-white/15 grid grid-cols-3 gap-2">
              {[["1,240+", "Active Lots"], ["₨5.2B", "Volume"], ["50k+", "Members"]].map(([val, label]) => (
                <div key={label}>
                  <div className="font-display text-lg font-black text-white">{val}</div>
                  <div className="text-[9px] font-bold text-white/50 uppercase tracking-wider">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Category Grid */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.06 * i, duration: 0.45 }}
              >
                <Link
                  to={`/categories/${cat.slug}`}
                  className="flex flex-col items-center justify-center p-5 bg-white border border-outline-variant/40 rounded-2xl hover:border-primary/30 card-shadow hover:card-shadow-hover hover:-translate-y-1 transition-all duration-300 group text-center"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center mb-3.5 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    <span className="material-symbols-outlined text-[26px] text-white" aria-hidden="true">
                      {cat.icon}
                    </span>
                  </div>
                  <span className="font-bold text-primary text-xs text-center leading-snug mb-1">
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-on-surface-variant/60 font-medium">
                    {cat.count}
                  </span>
                  <span className="text-[10px] text-secondary font-bold uppercase tracking-wider mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    {lang === "ur" ? "دیکھیں" : "Browse"}
                    <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                  </span>
                </Link>
              </motion.div>
            ))}

            {/* See More tile */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.42, duration: 0.45 }}
            >
              <Link
                to="/categories"
                aria-label="Browse all categories"
                className="flex flex-col items-center justify-center p-5 bg-surface-container-low border-2 border-dashed border-outline-variant/50 rounded-2xl hover:border-primary/40 hover:bg-white transition-all duration-300 group text-center h-full"
              >
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white transition-all shadow-sm border border-outline-variant/30">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-white text-[22px]">add</span>
                </div>
                <span className="font-bold text-on-surface-variant text-xs text-center group-hover:text-primary transition-colors">
                  {lang === "ur" ? "مزید 12+" : "12+ More"}
                </span>
                <span className="text-[10px] text-on-surface-variant/50 font-medium mt-0.5">
                  View all sectors
                </span>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
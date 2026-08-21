import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const appConfig = {
  biz: {
    id: "biz",
    name: "Agri Biz",
    badge: "Free Classifieds & Trade",
    icon: "storefront",
    gradient: "from-primary to-primary-light",
    glowColor: "rgba(15, 81, 50, 0.2)",
    accentClass: "bg-primary/10 text-primary border-primary/20",
    tagline: "Free classified app that connects people to sell and buy second-hand goods & agricultural commodities.",
    stats: [
      { value: "50k+", label: "Active Members" },
      { value: "1,240+", label: "Active Lots" },
      { value: "₨5.2B", label: "Volume Traded" },
    ],
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&q=80&auto=format&fit=crop",
    features: [
      "Fill a simple form and post to sell goods across Pakistan.",
      "Attach images that represent your product and attract verified buyers.",
      "Chat feature for fast communication with counterparties.",
      "Location feature to accurately pin your position on the map.",
    ],
    link: "/apps/agri-biz",
    cta: "Launch Agri Biz",
  },
  animal: {
    id: "animal",
    name: "Animal Clinic",
    badge: "Partner University Advisory",
    icon: "pets",
    gradient: "from-amber-500 to-orange-700",
    glowColor: "rgba(245, 158, 11, 0.2)",
    accentClass: "bg-amber-50 text-amber-800 border-amber-200",
    tagline: "Facilitating livestock and dairy farmers to get certified clinical advice and peer support.",
    stats: [
      { value: "850+", label: "Verified Vets" },
      { value: "24/7", label: "Availability" },
      { value: "99%", label: "Satisfaction" },
    ],
    image: "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=800&q=80&auto=format&fit=crop",
    features: [
      "Post animal problems with diseases & symptoms in audio, video, and image formats.",
      "Get expert advice from Partner University's Animals Department.",
      "Connect with experienced farmers using text comments and voice messages.",
      "Publishing problems with images helps experts accurately diagnose the condition.",
    ],
    link: "/apps/animal-clinic",
    cta: "Open Animal Clinic",
  },
  plant: {
    id: "plant",
    name: "Plant Clinic",
    badge: "AI Plant & Crop Doctor",
    icon: "psychiatry",
    gradient: "from-emerald-500 to-teal-700",
    glowColor: "rgba(16, 185, 129, 0.2)",
    accentClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    tagline: "Dedicated help regarding plants, fruits, flowers, seeds, vegetables, and field crops.",
    stats: [
      { value: "1,420+", label: "Cases Solved" },
      { value: "200+", label: "Expert Agros" },
      { value: "95%", label: "Accuracy" },
    ],
    image: "https://images.unsplash.com/photo-1592982537447-6f296d9ccbd3?w=800&q=80&auto=format&fit=crop",
    features: [
      "Provides specialized help regarding plants, fruits, flowers, and seeds.",
      "Farmers find it easy to describe their problem and get fast response from experts.",
      "Collaborate with other farmers via text comments and voice messages.",
      "Publishing problems with images helps experts accurately diagnose the condition.",
    ],
    link: "/apps/plant-clinic",
    cta: "Open Plant Clinic",
  },
};

type AppKey = keyof typeof appConfig;

export function AppHub() {
  const [activeTab, setActiveTab] = useState<AppKey>("biz");
  const current = appConfig[activeTab];

  return (
    <section className="bg-background py-16 md:py-24 relative overflow-hidden border-y border-outline-variant/30">
      <div className="absolute inset-0 section-dots opacity-30 pointer-events-none" />

      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="max-w-2xl mx-auto mb-10 text-center"
        >
          <span className="section-eyebrow mb-2 block">Our Apps</span>
          <h2 className="section-heading">
            Specialized Digital Tools <br className="hidden sm:block" />
            <span className="gradient-text-gold">for Agriculture</span>
          </h2>
          <p className="section-sub mt-3">
            From classified trading to expert clinical diagnoses — powered by Partner University faculty and AI.
          </p>
        </motion.div>

        {/* App Selector Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          {(Object.keys(appConfig) as AppKey[]).map((key) => {
            const app = appConfig[key];
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={[
                  "flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer border",
                  isActive
                    ? `bg-gradient-to-r ${app.gradient} text-white shadow-lg border-transparent scale-105`
                    : "bg-white text-on-surface-variant hover:text-primary border-outline-variant/40 hover:border-primary/30 hover:bg-surface-container-low card-shadow",
                ].join(" ")}
              >
                <span className="material-symbols-outlined text-[18px]">{app.icon}</span>
                {app.name}
              </button>
            );
          })}
        </div>

        {/* Dynamic Showcase */}
        <div className="bg-white rounded-3xl overflow-hidden border border-outline-variant/30 card-shadow max-w-5xl mx-auto">
          {/* Gradient top bar matching active app */}
          <div className={`h-1 w-full bg-gradient-to-r ${current.gradient}`} />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-0 items-stretch"
            >
              {/* Left Column */}
              <div className="lg:col-span-7 p-7 md:p-9 space-y-5 text-left">
                {/* Badge + stats */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${current.accentClass}`}>
                    {current.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-display text-2xl md:text-3xl font-bold text-primary tracking-tight mb-2">
                    {current.name}
                  </h3>
                  <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
                    {current.tagline}
                  </p>
                </div>

                {/* Mini stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {current.stats.map((stat) => (
                    <div key={stat.label} className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/30 text-center">
                      <div className="font-display text-xl font-black text-primary">{stat.value}</div>
                      <div className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-wider mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Key features */}
                <ul className="space-y-2.5 pt-1">
                  {current.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-xs font-medium text-primary">
                      <div className="w-5 h-5 rounded-full bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-secondary text-[12px]">check</span>
                      </div>
                      <span className="text-on-surface leading-relaxed">{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* CTAs */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Link
                    to={current.link}
                    className={`btn-primary flex items-center gap-2 bg-gradient-to-r ${current.gradient} border-0`}
                  >
                    {current.cta}
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                  <Link
                    to="/apps"
                    className="btn-ghost flex items-center gap-2"
                  >
                    All Apps
                  </Link>
                </div>
              </div>

              {/* Right Column: Image */}
              <div className="lg:col-span-5 relative overflow-hidden min-h-[280px] bg-surface-container-low">
                <img
                  src={current.image}
                  alt={current.name}
                  className="w-full h-full object-cover absolute inset-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                {/* Image overlay info */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r ${current.gradient} text-white text-xs font-bold shadow-lg mb-2`}>
                    <span className="material-symbols-outlined text-[16px]">{current.icon}</span>
                    {current.stats[0].value} {current.stats[0].label}
                  </div>
                  <div className="text-white font-bold text-sm">{current.name}</div>
                  <div className="text-white/70 text-xs font-medium">{current.badge}</div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

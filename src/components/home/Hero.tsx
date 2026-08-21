import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { motion } from "framer-motion";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=900&q=80&auto=format&fit=crop";

const stats = [
  { value: "50k+", label: "Active Members", icon: "groups" },
  { value: "2,400+", label: "Expert Consultants", icon: "school" },
  { value: "₨5.2B", label: "Trade Volume", icon: "trending_up" },
];

const quickTags = ["Wheat", "Basmati Rice", "Cotton", "Solar Tubewells", "Fertilizers", "Soil Expert"];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function Hero() {
  const [imgError, setImgError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { t, isRTL } = useTranslation();
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/search", search: searchQuery.trim() ? { q: searchQuery } : undefined });
  };

  return (
    <section className="relative pt-20 md:pt-24 pb-12 md:pb-20 overflow-hidden gradient-mesh">
      {/* Background decorative elements */}
      <div className="absolute inset-0 section-dots opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-secondary/60 to-transparent" />
      
      {/* Ambient glow orbs */}
      <div className="absolute top-16 left-1/4 w-[500px] h-[500px] bg-primary/6 rounded-full blur-[100px] pointer-events-none animate-glow-pulse" />
      <div className="absolute top-32 right-0 w-[400px] h-[400px] bg-secondary/8 rounded-full blur-[80px] pointer-events-none" style={{ animationDelay: "1.5s" }} />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">

          {/* Left Text Column */}
          <div className="lg:col-span-7 text-left space-y-6">

            {/* Live badge */}
            <motion.div
              custom={0}
              initial="hidden"
              animate="show"
              variants={fadeUp}
              className="inline-flex"
            >
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass border border-primary/20 shadow-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  Pakistan's #1 Agri Platform
                </span>
                <span className="text-outline-variant/50 text-xs">·</span>
                <span className="text-xs font-semibold text-secondary">50,000+ Members</span>
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.div custom={1} initial="hidden" animate="show" variants={fadeUp}>
              <h1 className="font-display text-4xl sm:text-5xl md:text-5xl lg:text-[60px] font-black text-primary tracking-tight leading-[1.05]">
                {t("hero_headline_1")}{" "}
                <span className="relative inline-block">
                  <span className="gradient-text-gold">{t("hero_headline_2")}</span>
                  {/* Underline accent */}
                  <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-secondary/60 to-transparent rounded-full" />
                </span>
              </h1>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              custom={2}
              initial="hidden"
              animate="show"
              variants={fadeUp}
              className="text-sm sm:text-base text-on-surface-variant leading-relaxed max-w-xl font-medium"
            >
              {t("hero_sub")}
            </motion.p>

            {/* Search Form */}
            <motion.form
              custom={3}
              initial="hidden"
              animate="show"
              variants={fadeUp}
              onSubmit={handleSearch}
              className="max-w-2xl"
            >
              <div className="relative flex items-center bg-white p-1.5 rounded-2xl border-2 border-outline-variant/40 shadow-lg focus-within:border-primary focus-within:shadow-xl transition-all duration-300 group">
                <div className="flex items-center gap-1 px-3 shrink-0">
                  <span className="material-symbols-outlined text-primary/60 text-[22px]" aria-hidden="true">
                    search
                  </span>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search commodities, consultants, machinery..."
                  className="w-full bg-transparent text-sm text-primary font-medium placeholder:text-on-surface-variant/40 focus:outline-none py-2.5 pr-2 border-none shadow-none ring-0 focus:ring-0"
                />
                <button
                  type="submit"
                  className="shrink-0 px-6 py-3 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-primary-container transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 group"
                >
                  <span className="hidden sm:inline">Search</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>

              {/* Quick tags */}
              <div className="flex flex-wrap items-center gap-2 pt-3.5">
                <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider">Trending:</span>
                {quickTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => navigate({ to: "/search", search: { q: tag } })}
                    className="tag-pill text-[11px]"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </motion.form>

            {/* Stats row */}
            <motion.div
              custom={4}
              initial="hidden"
              animate="show"
              variants={fadeUp}
              className="pt-2 border-t border-outline-variant/40"
            >
              <div className="grid grid-cols-3 gap-3 max-w-xl">
                {stats.map((stat, i) => (
                  <div key={i} className="group p-4 bg-white rounded-2xl border border-outline-variant/30 card-shadow transition-all hover:card-shadow-hover hover:-translate-y-0.5 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[16px] text-primary">{stat.icon}</span>
                      </div>
                    </div>
                    <div className="font-display text-2xl font-black text-primary leading-none">{stat.value}</div>
                    <div className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* CTA buttons */}
            <motion.div
              custom={5}
              initial="hidden"
              animate="show"
              variants={fadeUp}
              className="flex flex-wrap gap-3"
            >
              <Link
                to="/onboarding"
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Join Free Today
              </Link>
              <Link
                to="/apps/agri-biz"
                className="btn-ghost flex items-center gap-2 text-xs"
              >
                <span className="material-symbols-outlined text-[16px]">storefront</span>
                Browse Marketplace
              </Link>
            </motion.div>
          </div>

          {/* Right Media Column */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 relative max-w-lg mx-auto lg:max-w-none w-full"
          >
            {/* Main image frame */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-white/80 bg-white group glow-green">
              <div className="relative aspect-[4/3] overflow-hidden bg-surface-container-low">
                {imgError ? (
                  <div className="w-full h-full gradient-agri flex items-center justify-center">
                    <span className="material-symbols-outlined text-[80px] text-white/20">agriculture</span>
                  </div>
                ) : (
                  <img
                    src={HERO_IMAGE}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    alt="Farmer in agricultural field in Punjab, Pakistan"
                    loading="eager"
                    onError={() => setImgError(true)}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/10 to-transparent" />

                {/* Location tag on image */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="glass-dark px-3.5 py-2 rounded-xl flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[18px]">location_on</span>
                    <span className="text-xs font-bold text-white">Punjab Agri Corridor</span>
                  </div>
                  <span className="badge-gold text-[10px] shadow-md">Verified Trade</span>
                </div>
              </div>

              {/* Bottom quick link strip */}
              <div className="p-3 bg-white grid grid-cols-2 gap-2.5 text-left border-t border-outline-variant/20">
                <Link to="/apps/agri-biz" className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-primary/5 transition-colors border border-outline-variant/30 group/card">
                  <div className="w-9 h-9 rounded-xl gradient-agri text-white flex items-center justify-center shrink-0 shadow-sm group-hover/card:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[18px]">storefront</span>
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-primary truncate">B2B Exchange</div>
                    <div className="text-[10px] text-on-surface-variant/70">1,240+ Active Lots</div>
                  </div>
                </Link>

                <Link to="/apps/plant-clinic" className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-secondary/5 transition-colors border border-outline-variant/30 group/card">
                  <div className="w-9 h-9 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0 shadow-sm group-hover/card:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[18px]">psychiatry</span>
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-primary truncate">Plant Clinic</div>
                    <div className="text-[10px] text-on-surface-variant/70">AI Diagnosis</div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Floating rate card */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 -right-4 glass px-4 py-3 rounded-2xl border border-white/60 shadow-xl flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-600 text-[18px]">trending_up</span>
              </div>
              <div>
                <div className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-wider">Wheat · Multan</div>
                <div className="text-sm font-black text-primary">₨ 4,200 <span className="text-emerald-600 text-xs font-bold">↑ 2.4%</span></div>
              </div>
            </motion.div>

            {/* Members online indicator */}
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              className="absolute -bottom-3 -left-4 glass px-3.5 py-2.5 rounded-2xl border border-white/60 shadow-xl flex items-center gap-2.5"
            >
              <div className="flex -space-x-2">
                {["#0f5132", "#d98b1d", "#2d7a56"].map((c, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black text-white shadow-sm"
                    style={{ background: c }}
                  >
                    {["AK", "MF", "ZA"][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-wider">Active Now</div>
                <div className="text-xs font-black text-primary status-live">1,240 Online</div>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
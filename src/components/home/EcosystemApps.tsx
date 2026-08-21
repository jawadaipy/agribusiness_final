import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

const ecosystemApps = [
  {
    id: "plant-clinic",
    title: "Plant Clinic",
    badge: "AI Diagnostic",
    icon: "psychiatry",
    gradient: "from-emerald-500 to-teal-700",
    bgGlow: "rgba(16, 185, 129, 0.15)",
    description: "Upload leaf or pest photos for instant AI disease diagnosis and verified agronomist treatment prescriptions.",
    stats: "1,420+ Cases Solved",
    link: "/apps/plant-clinic",
    action: "Launch Clinic",
    statsIcon: "verified"
  },
  {
    id: "animal-clinic",
    title: "Animal & Vet Clinic",
    badge: "24/7 Care",
    icon: "pets",
    gradient: "from-amber-500 to-orange-700",
    bgGlow: "rgba(245, 158, 11, 0.15)",
    description: "Direct telehealth consultations for dairy cattle, buffaloes, and poultry with certified Pakistani veterinarians.",
    stats: "850+ Verified Vets",
    link: "/apps/animal-clinic",
    action: "Consult Vet",
    statsIcon: "medical_services"
  },
  {
    id: "agri-biz",
    title: "Agri-Biz Trading Floor",
    badge: "B2B Exchange",
    icon: "storefront",
    gradient: "from-blue-500 to-indigo-700",
    bgGlow: "rgba(99, 102, 241, 0.15)",
    description: "Trade bulk grains, combine harvesters, solar tubewells, and certified fertilizers with verified sellers.",
    stats: "₨ 5.2B Volume Traded",
    link: "/apps/agri-biz",
    action: "Enter Market",
    statsIcon: "trending_up"
  },
  {
    id: "academy",
    title: "Agri-Tech Academy",
    badge: "Certification",
    icon: "school",
    gradient: "from-purple-500 to-violet-700",
    bgGlow: "rgba(139, 92, 246, 0.15)",
    description: "High-yield farm management, precision irrigation, and greenhouse masterclasses taught by Agri University faculty.",
    stats: "4,200+ Learners",
    link: "/apps/education",
    action: "Explore Courses",
    statsIcon: "workspace_premium"
  },
  {
    id: "projects",
    title: "Projects & RFP Board",
    badge: "Verified Bidding",
    icon: "engineering",
    gradient: "from-teal-500 to-cyan-700",
    bgGlow: "rgba(20, 184, 166, 0.15)",
    description: "Post agricultural engineering requirements, hire drip irrigation consultants, or rent heavy harvesting machinery.",
    stats: "₨ 150k Max Escrow",
    link: "/projects",
    action: "Browse RFPs",
    statsIcon: "gavel"
  },
  {
    id: "directory",
    title: "Expert Network",
    badge: "24 Disciplines",
    icon: "groups",
    gradient: "from-primary to-primary-container",
    bgGlow: "rgba(15, 81, 50, 0.15)",
    description: "Find and contact verified agricultural engineers, consultants, and companies across 24 official industry sectors.",
    stats: "50k+ Members",
    link: "/search",
    action: "Search Network",
    statsIcon: "person_search"
  },
];

export function EcosystemApps() {
  return (
    <section className="py-16 md:py-24 bg-white relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 section-grid opacity-60 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/4 rounded-full blur-[120px] pointer-events-none" />

      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto relative z-10">

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
        >
          <div className="max-w-xl">
            <span className="section-eyebrow mb-2 block">Integrated Agri-Tech Suite</span>
            <h2 className="section-heading">
              Our Ecosystem{" "}
              <span className="gradient-text-gold">Apps & Services</span>
            </h2>
            <p className="section-sub mt-3">
              Tailored digital tools engineered specifically for Pakistani growers, agronomists, millers, and agribusiness enterprises.
            </p>
          </div>

          <Link
            to="/onboarding"
            className="btn-primary flex items-center gap-2 self-start md:self-auto shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">lock_open</span>
            Get Free Access
          </Link>
        </motion.div>

        {/* Apps grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ecosystemApps.map((app, i) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.07 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="group relative bg-white rounded-3xl border border-outline-variant/40 overflow-hidden cursor-pointer flex flex-col card-shadow transition-all duration-300"
              style={{ ["--glow" as string]: app.bgGlow }}
            >
              {/* Hover glow bg */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(circle at 30% 30%, ${app.bgGlow}, transparent 70%)` }}
              />

              {/* Top accent gradient bar */}
              <div className={`h-1 w-full bg-gradient-to-r ${app.gradient}`} />

              <div className="p-6 flex flex-col flex-grow relative z-10">
                {/* Top row: icon + badge */}
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <span className="material-symbols-outlined text-[24px] text-white">{app.icon}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-bold text-[9px] uppercase tracking-wider border border-outline-variant/50">
                    {app.badge}
                  </span>
                </div>

                <h3 className="font-display text-lg font-bold text-primary mb-2 tracking-tight group-hover:text-secondary transition-colors duration-200">
                  {app.title}
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed font-medium flex-grow mb-5">
                  {app.description}
                </p>

                {/* Footer */}
                <div className="pt-4 border-t border-outline-variant/30 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary/80">
                    <span className={`material-symbols-outlined text-[14px] text-secondary`}>{app.statsIcon}</span>
                    {app.stats}
                  </span>
                  <Link
                    to={app.link}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:text-secondary transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {app.action}
                    <span className="material-symbols-outlined text-[15px] group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 p-6 md:p-8 rounded-3xl gradient-agri relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="absolute inset-0 section-dots opacity-20 pointer-events-none" />
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none" />
          <div className="relative z-10 text-center md:text-left">
            <h3 className="font-display text-xl md:text-2xl font-bold text-white mb-1">
              Ready to grow your agribusiness?
            </h3>
            <p className="text-white/70 text-sm font-medium">
              Join 50,000+ farmers, consultants, and enterprises on Pakistan's leading agri-tech platform.
            </p>
          </div>
          <Link to="/onboarding" className="btn-secondary shrink-0 relative z-10 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
            Start for Free
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

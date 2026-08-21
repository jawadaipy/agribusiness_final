import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";

const steps = [
  {
    step: "01",
    title: "Create Your Profile",
    desc: "Register as a farmer, consultant, buyer, company, or student — choose the role that matches your goals.",
    icon: "person_add",
    gradient: "from-primary to-primary-light",
    features: ["Role-based dashboard", "Verified badge", "Free forever plan"],
  },
  {
    step: "02",
    title: "Connect & Trade",
    desc: "Browse listings, consult agronomists, bid on projects, and negotiate terms securely on the platform.",
    icon: "handshake",
    gradient: "from-secondary to-secondary-light",
    features: ["Escrow protection", "Direct messaging", "Verified counterparties"],
  },
  {
    step: "03",
    title: "Scale & Prosper",
    desc: "Execute verified contracts, access satellite farm mapping, boost yields, and grow your agribusiness.",
    icon: "trending_up",
    gradient: "from-teal-600 to-emerald-700",
    features: ["AI crop insights", "Market analytics", "Expansion network"],
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Dark gradient background for contrast */}
      <div className="absolute inset-0 gradient-agri" />
      <div className="absolute inset-0 section-dots opacity-30 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Ambient orbs */}
      <div className="absolute top-10 right-1/4 w-[400px] h-[400px] bg-white/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[300px] h-[300px] bg-secondary/10 rounded-full blur-[60px] pointer-events-none" />

      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="max-w-2xl mx-auto text-center mb-14"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold text-white/80 uppercase tracking-wider mb-4">
            <span className="material-symbols-outlined text-secondary text-[14px]">route</span>
            Simple 3-Step Process
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
            Agricultural Commerce{" "}
            <span className="text-secondary">Made Seamless</span>
          </h2>
          <p className="text-white/70 text-sm leading-relaxed font-medium">
            From registration to your first trade — our platform guides you every step of the way, designed specifically for Pakistan's agricultural ecosystem.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-12 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-[2px]">
            <div className="h-full bg-gradient-to-r from-white/30 via-secondary/40 to-white/30" />
            {/* Animated dots on line */}
            <motion.div
              animate={{ x: ["0%", "100%", "0%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-secondary shadow-lg"
              style={{ boxShadow: "0 0 10px rgba(217, 139, 29, 0.8)" }}
            />
          </div>

          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.12 * i, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="group relative"
            >
              {/* Glass card */}
              <div className="glass-green rounded-3xl p-7 border border-white/15 hover:border-white/25 transition-all duration-300 h-full flex flex-col">
                {/* Step number + icon */}
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform duration-300`}>
                    <span className="material-symbols-outlined text-white text-[28px]">{step.icon}</span>
                  </div>
                  <span className="font-display text-5xl font-black text-white/10 select-none">
                    {step.step}
                  </span>
                </div>

                <h3 className="font-display text-xl font-bold text-white mb-2 tracking-tight">
                  {step.title}
                </h3>
                <p className="text-white/65 text-sm leading-relaxed font-medium mb-6 flex-grow">
                  {step.desc}
                </p>

                {/* Feature list */}
                <ul className="space-y-2">
                  {step.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2.5 text-xs font-medium text-white/80">
                      <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-secondary text-[12px]">check</span>
                      </span>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom action */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 px-8 py-4 bg-secondary text-primary rounded-2xl font-bold text-sm uppercase tracking-wider hover:bg-white hover:text-primary transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            style={{ boxShadow: "0 8px 30px rgba(217, 139, 29, 0.4)" }}
          >
            <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
            Get Started Free — No Credit Card
          </Link>
          <p className="text-white/40 text-xs mt-3 font-medium">
            Join 50,000+ agricultural professionals already on the platform
          </p>
        </motion.div>
      </div>
    </section>
  );
}

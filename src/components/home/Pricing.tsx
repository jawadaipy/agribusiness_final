import { Link } from "@tanstack/react-router";
import { useTranslation } from "@/lib/i18n";
import { motion } from "framer-motion";

export function Pricing() {
  const { t } = useTranslation();

  const plans = [
    {
      name: "Starter",
      icon: "eco",
      price: "Free",
      period: "forever",
      desc: "Perfect for exploring — access market rates, connect with experts, and try the platform with no commitment.",
      features: [
        "3 Matched Listings per month",
        "Live market rate ticker",
        "Basic profile listing",
        "Mobile app access",
      ],
      cta: "Start Free",
      to: "/onboarding",
      highlight: false,
      gradient: "from-surface-container-low to-white",
      iconBg: "bg-primary/10 text-primary",
    },
    {
      name: "Professional",
      icon: "workspace_premium",
      price: "₨ 4,999",
      period: "/ month",
      desc: "For active farmers, consultants, and companies who need unlimited reach and verified credibility.",
      features: [
        "Unlimited listings & RFPs",
        "Priority verification badge",
        "Advanced market analytics",
        "AI match suggestions",
        "Direct WhatsApp integration",
        "Satellite farm imagery",
      ],
      cta: "Go Professional",
      to: "/onboarding",
      highlight: true,
      gradient: "from-primary to-primary-container",
      iconBg: "bg-white/20 text-white",
      paymentNote: true,
    },
    {
      name: "Enterprise",
      icon: "domain",
      price: "Custom",
      period: "",
      desc: "Tailored for agri-corporations, NGOs, and government bodies needing bulk tools and dedicated support.",
      features: [
        "Custom API integration",
        "Dedicated account manager",
        "Batch procurement tools",
        "SLA-backed 24/7 support",
        "Unlimited team members",
        "White-label options",
      ],
      cta: "Contact Sales",
      to: "/onboarding",
      highlight: false,
      gradient: "from-surface-container-low to-white",
      iconBg: "bg-primary/10 text-primary",
    },
  ];

  return (
    <section className="py-16 md:py-24 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto relative">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
        className="max-w-2xl mx-auto mb-14 text-center"
      >
        <span className="section-eyebrow mb-3 block">Simple, Transparent Pricing</span>
        <h2 className="section-heading">
          Plans That <span className="gradient-text-gold">Scale With You</span>
        </h2>
        <p className="section-sub mt-3">
          Start free. Upgrade when you're ready. All plans include a 7-day risk-free trial — no credit card required.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 * i, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className={[
              "flex flex-col rounded-3xl border overflow-hidden transition-all duration-300 relative",
              plan.highlight
                ? "gradient-agri border-primary shadow-2xl md:-translate-y-3 glow-green"
                : "bg-white border-outline-variant/40 hover:border-primary/30 card-shadow hover:card-shadow-hover hover:-translate-y-1",
            ].join(" ")}
          >
            {plan.highlight && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary/60 via-secondary to-secondary/60" />
            )}

            {/* Popular tag */}
            {plan.highlight && (
              <div className="absolute -top-px left-1/2 -translate-x-1/2">
                <div className="px-4 py-1 bg-secondary text-primary font-bold text-[9px] uppercase tracking-wider rounded-b-xl shadow-lg">
                  Most Popular
                </div>
              </div>
            )}

            <div className="p-7 md:p-8 flex flex-col flex-grow">
              {/* Plan header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3 ${plan.iconBg} ${plan.highlight ? "" : "border border-primary/15"}`}
                  >
                    <span className="material-symbols-outlined text-[22px]">{plan.icon}</span>
                  </div>
                  <h3
                    className={`font-display text-xl font-bold tracking-tight ${plan.highlight ? "text-white" : "text-primary"}`}
                  >
                    {plan.name}
                  </h3>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className={`font-display text-4xl font-black tracking-tight ${plan.highlight ? "text-white" : "text-primary"}`}>
                  {plan.price}
                </span>
                {plan.period && (
                  <span className={`text-xs font-bold uppercase tracking-wider ${plan.highlight ? "text-white/60" : "text-on-surface-variant/60"}`}>
                    {plan.period}
                  </span>
                )}
              </div>

              <p className={`text-xs leading-relaxed font-medium mb-6 ${plan.highlight ? "text-white/75" : "text-on-surface-variant/80"}`}>
                {plan.desc}
              </p>

              {/* Features */}
              <ul className="space-y-3 mb-7 flex-grow" aria-label={`${plan.name} plan features`}>
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-3 text-xs font-medium">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${plan.highlight ? "bg-white/15" : "bg-primary/8"}`}>
                      <span
                        className={`material-symbols-outlined text-[12px] ${plan.highlight ? "text-secondary" : "text-primary"}`}
                        aria-hidden="true"
                      >
                        check
                      </span>
                    </div>
                    <span className={plan.highlight ? "text-white/90" : "text-on-surface"}>
                      {feat}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Payment methods */}
              {plan.paymentNote && (
                <div className="mb-6 p-3.5 rounded-2xl bg-white/10 border border-white/15">
                  <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mb-2.5">
                    Accepted Pakistani Payments
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-lg bg-[#EE1C25] text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                      JazzCash
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-[#3CB451] text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                      Easypaisa
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-white/20 text-white text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">credit_card</span>
                      Card
                    </span>
                  </div>
                </div>
              )}

              <Link
                to={plan.to}
                className={[
                  "w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-center transition-all shadow-md mt-auto",
                  plan.highlight
                    ? "bg-secondary text-primary hover:bg-white hover:text-primary shadow-lg"
                    : "bg-primary text-white hover:bg-primary-container shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5",
                ].join(" ")}
              >
                {plan.cta}
              </Link>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom note */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-center text-xs text-on-surface-variant mt-10 font-medium"
      >
        All plans include a{" "}
        <strong className="text-primary font-bold">7-day risk-free trial</strong>
        . No credit card required to start. Cancel anytime.
      </motion.p>
    </section>
  );
}

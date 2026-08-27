/**
 * HomePricingSection — Homepage pricing section.
 * Highlights the 14-day free trial, Standard (1,500 PKR/mo) and
 * Enterprise (4,500 PKR/mo) plans, and JazzCash/EasyPaisa payment methods.
 */
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { formatPKR } from "@/lib/format";
import { SUBSCRIPTION_PLANS } from "@/lib/payment";

export function HomePricingSection() {
  return (
    <section className="border-t border-black/[0.06] bg-[#F7FAF7] py-16 md:py-24">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full border border-emerald-300 bg-emerald-100/80 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-900">
            Transparent PKR Pricing
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Simple plans after your{" "}
            <span className="text-secondary">14-day free trial</span>
          </h2>
          <p className="mt-3 text-xs leading-relaxed text-on-surface-variant sm:text-sm">
            Every new account includes a 14-day free trial with full publishing access.
            Upgrade to keep trading, listing products, and responding to tenders.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-12 grid gap-6 sm:mx-auto sm:max-w-xl md:max-w-none md:grid-cols-2 lg:gap-8">
          {/* Plan 1: Standard / Normal User */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col justify-between rounded-3xl border border-emerald-200/80 bg-white p-7 shadow-sm transition hover:shadow-md lg:p-9"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                    <span className="material-symbols-outlined text-[22px]">person</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                      Standard
                    </span>
                    <h3 className="font-display text-lg font-bold text-slate-900">
                      Normal User Plan
                    </h3>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 font-mono text-[11px] font-bold text-emerald-800 border border-emerald-200">
                  14-Day Free Trial
                </span>
              </div>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">
                  {formatPKR(SUBSCRIPTION_PLANS.standard.price)}
                </span>
                <span className="text-xs font-semibold text-slate-500">/ month</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                For Farmers, Buyers, Agronomists &amp; Researchers
              </p>

              <div className="my-6 h-px bg-slate-100" />

              <ul className="space-y-2.5">
                {[
                  "24-Hour Live Access to Mandi Rates (30+ Mandis)",
                  "Marketplace: 5 Verified Posts / Month",
                  "Access to Updated Agri Gov Schemes & Subsidies",
                  "AgriBusiness Networking & Direct Consents",
                  "Access to Our Recommended Projects & RFPs",
                  "Free Plant & Animal Clinical Telehealth Support",
                ].map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600 mt-0.5 shrink-0">
                      check_circle
                    </span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100">
              <Link
                to="/onboarding"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-emerald-900"
              >
                <span>Start 14-Day Free Trial</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </Link>
              <p className="mt-2.5 text-center text-[11px] text-slate-400">
                No credit card required · Instant access
              </p>
            </div>
          </motion.div>

          {/* Plan 2: Enterprise / Company */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative flex flex-col justify-between rounded-3xl border-2 border-amber-400/90 bg-white p-7 shadow-md transition hover:shadow-lg lg:p-9"
          >
            {/* Highlight Tag */}
            <div className="absolute -top-3 right-8 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-950 shadow-xs">
              Commercial / Best Value
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                    <span className="material-symbols-outlined text-[22px]">domain</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                      Enterprise
                    </span>
                    <h3 className="font-display text-lg font-bold text-slate-900">
                      Company &amp; Agri-Tech
                    </h3>
                  </div>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 font-mono text-[11px] font-bold text-amber-900 border border-amber-200">
                  14-Day Free Trial
                </span>
              </div>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">
                  {formatPKR(SUBSCRIPTION_PLANS.enterprise.price)}
                </span>
                <span className="text-xs font-semibold text-slate-500">/ month</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                For Agri-Businesses, Seed &amp; Machinery Companies, Exporters
              </p>

              <div className="my-6 h-px bg-slate-100" />

              <ul className="space-y-2.5">
                {[
                  "Everything in Individual plan included",
                  "Marketplace: Unlimited Posts & Commercial Catalog",
                  "24-Hour Live Access to Mandi Rates & Analytics",
                  "Access to Updated Agri Gov Schemes & Tenders",
                  "Priority Company Verified Trust Badge",
                  "Access to Our Recommended High-Value Projects",
                  "Corporate Ad Studio & Sponsored Banner Placements",
                ].map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <span className="material-symbols-outlined text-[16px] text-amber-600 mt-0.5 shrink-0">
                      check_circle
                    </span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100">
              <Link
                to="/onboarding"
                search={{ role: "company" }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-xs font-bold uppercase tracking-wider text-amber-950 shadow-sm transition hover:from-amber-600 hover:to-amber-700"
              >
                <span>Start Enterprise Free Trial</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </Link>
              <p className="mt-2.5 text-center text-[11px] text-slate-400">
                Pay in PKR via JazzCash &amp; EasyPaisa
              </p>
            </div>
          </motion.div>
        </div>

        {/* Local Payment Badges & Details Link */}
        <div className="mt-12 rounded-2xl border border-emerald-200/60 bg-white p-6 shadow-xs sm:flex sm:items-center sm:justify-between sm:p-8">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Accepted local payment methods:
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 border border-red-200">
                <span className="h-2 w-2 rounded-full bg-red-600" />
                JazzCash
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700 border border-green-200">
                <span className="h-2 w-2 rounded-full bg-green-600" />
                EasyPaisa
              </span>
            </div>
          </div>
          <div className="mt-4 sm:mt-0">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-emerald-700 hover:underline"
            >
              <span>View complete plan comparison &amp; FAQ</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

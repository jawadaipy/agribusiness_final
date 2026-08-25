/**
 * /pricing — Subscription plans page.
 * Two tiers: Standard (PKR 1,500/mo) and Enterprise (PKR 4,500/mo).
 * Payment via JazzCash or EasyPaisa.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { formatPKR } from "@/lib/format";
import { getAuthenticatedMember, type MemberProfile } from "@/lib/member";
import {
  SUBSCRIPTION_PLANS,
  getPlanForRole,
  getTrialDaysRemaining,
  isSubscriptionExpired,
  hasFullAccess,
  initiateJazzCashPayment,
  initiateEasyPaisaPayment,
  type PlanName,
} from "@/lib/payment";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing & Plans | AgriBusiness Pakistan" },
      {
        name: "description",
        content:
          "AgriBusiness subscription plans — Standard PKR 1,500/mo and Enterprise PKR 4,500/mo. Pay with JazzCash or EasyPaisa.",
      },
    ],
  }),
  component: PricingPage,
});

type PaymentGateway = "jazzcash" | "easypaisa";

const CHECK_FEATURES = [
  { standard: true, enterprise: true, label: "Publish products & services" },
  { standard: true, enterprise: true, label: "Post RFPs & requirements" },
  { standard: true, enterprise: true, label: "Plant & animal clinic access" },
  { standard: true, enterprise: true, label: "Network feed & marketplace" },
  { standard: true, enterprise: true, label: "Smart matching & directory" },
  { standard: true, enterprise: true, label: "Mandi rate intelligence" },
  { standard: false, enterprise: true, label: "Priority listing placement" },
  { standard: false, enterprise: true, label: "Corporate ad studio" },
  { standard: false, enterprise: true, label: "Unlimited product catalog" },
  { standard: false, enterprise: true, label: "Advanced analytics" },
  { standard: false, enterprise: true, label: "Dedicated account support" },
  { standard: false, enterprise: true, label: "Corporate verification badge" },
];

function PricingPage() {
  const navigate = useNavigate();
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanName | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    getAuthenticatedMember().then(({ profile }) => {
      setMember(profile);
      setLoading(false);
    });
  }, []);

  const trialDays = member ? getTrialDaysRemaining(member) : 0;
  const expired = member ? isSubscriptionExpired(member) : false;
  const isActive = member?.subscription_status === "active";

  const handleSelectPlan = useCallback(
    (plan: PlanName) => {
      if (!member) {
        navigate({ to: "/onboarding" });
        return;
      }
      if (isActive) return;
      setSelectedPlan(plan);
      setSelectedGateway(null);
      setShowPaymentModal(true);
    },
    [member, isActive, navigate],
  );

  const handlePay = useCallback(() => {
    if (!member || !selectedPlan || !selectedGateway) return;
    setProcessing(true);
    if (selectedGateway === "jazzcash") {
      initiateJazzCashPayment(member.id, selectedPlan);
    } else {
      initiateEasyPaisaPayment(member.id, selectedPlan);
    }
  }, [member, selectedPlan, selectedGateway]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pb-16 pt-20">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0B3D2E] via-[#0E4A35] to-[#134E3A] px-4 py-16 text-center text-white sm:py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_70%)]" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative mx-auto max-w-3xl">
            <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300 backdrop-blur-sm border border-white/10">
              Simple, transparent pricing
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Pick the plan that{" "}
              <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
                fits your scale
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70">
              Start free — no card needed. When your trial ends, subscribe to keep publishing,
              trading, and connecting across Pakistan's agricultural network.
            </p>

            {/* Trial status */}
            {member && !isActive && (
              <div className="mt-6">
                {expired ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/20 px-4 py-2 text-xs font-bold text-rose-200 border border-rose-400/30">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    Your free trial has ended — subscribe to continue
                  </span>
                ) : trialDays > 0 ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-4 py-2 text-xs font-bold text-blue-200 border border-blue-400/30">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    {trialDays} day{trialDays !== 1 ? "s" : ""} remaining in your free trial
                  </span>
                ) : null}
              </div>
            )}

            {isActive && (
              <div className="mt-6">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-200 border border-emerald-400/30">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  You have an active subscription
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Plans */}
        <section className="mx-auto -mt-12 max-w-5xl px-4 sm:px-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Standard Plan */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative rounded-3xl border border-emerald-200 bg-white p-8 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <span className="material-symbols-outlined text-[24px]">person</span>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Standard</span>
                  <h3 className="font-display text-xl font-bold text-slate-900">Normal User</h3>
                </div>
              </div>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-slate-900">
                  {formatPKR(SUBSCRIPTION_PLANS.standard.price)}
                </span>
                <span className="text-sm text-slate-500">/month</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {SUBSCRIPTION_PLANS.standard.trialDays}-day free trial included
              </p>

              <p className="mt-4 text-xs leading-relaxed text-slate-600">
                For farmers, buyers, consultants, and researchers who need full access to
                marketplace publishing, clinic, and the professional network.
              </p>

              <ul className="mt-6 space-y-2.5">
                {SUBSCRIPTION_PLANS.standard.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="material-symbols-outlined text-emerald-500 text-[15px] mt-0.5 shrink-0">
                      check_circle
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handleSelectPlan("standard")}
                disabled={isActive}
                className="mt-8 w-full rounded-xl bg-emerald-700 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isActive ? "Currently Active" : expired ? "Subscribe Now" : "Start Free Trial"}
              </button>
            </motion.div>

            {/* Enterprise Plan */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="relative rounded-3xl border-2 border-amber-400 bg-white p-8 shadow-xl"
            >
              {/* Popular badge */}
              <div className="absolute -top-3 right-6 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-1 text-xs font-bold text-amber-950 shadow-md">
                BEST VALUE
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <span className="material-symbols-outlined text-[24px]">domain</span>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Enterprise</span>
                  <h3 className="font-display text-xl font-bold text-slate-900">Company & Enterprise</h3>
                </div>
              </div>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-slate-900">
                  {formatPKR(SUBSCRIPTION_PLANS.enterprise.price)}
                </span>
                <span className="text-sm text-slate-500">/month</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {SUBSCRIPTION_PLANS.enterprise.trialDays}-day free trial included
              </p>

              <p className="mt-4 text-xs leading-relaxed text-slate-600">
                For agri-tech companies, suppliers, and enterprises needing unlimited catalog,
                corporate ad studio, and dedicated support.
              </p>

              <ul className="mt-6 space-y-2.5">
                {SUBSCRIPTION_PLANS.enterprise.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="material-symbols-outlined text-amber-500 text-[15px] mt-0.5 shrink-0">
                      check_circle
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handleSelectPlan("enterprise")}
                disabled={isActive}
                className="mt-8 w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-xs font-bold uppercase tracking-wider text-amber-950 shadow-md transition hover:from-amber-600 hover:to-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isActive ? "Currently Active" : expired ? "Subscribe Now" : "Start Free Trial"}
              </button>
            </motion.div>
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="mx-auto mt-16 max-w-4xl px-4 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold text-slate-900">
            Compare Plans
          </h2>
          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-5 py-3 font-bold text-slate-700">Feature</th>
                  <th className="px-5 py-3 text-center font-bold text-emerald-700">Standard</th>
                  <th className="px-5 py-3 text-center font-bold text-amber-700">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-5 py-3 font-bold text-slate-900">Monthly Price</td>
                  <td className="px-5 py-3 text-center font-bold text-slate-900">{formatPKR(1500)}</td>
                  <td className="px-5 py-3 text-center font-bold text-slate-900">{formatPKR(4500)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-5 py-3 font-bold text-slate-900">Free Trial</td>
                  <td className="px-5 py-3 text-center text-slate-600">14 days</td>
                  <td className="px-5 py-3 text-center text-slate-600">14 days</td>
                </tr>
                {CHECK_FEATURES.map((feat) => (
                  <tr key={feat.label} className="border-b border-slate-50">
                    <td className="px-5 py-2.5 text-slate-700">{feat.label}</td>
                    <td className="px-5 py-2.5 text-center">
                      {feat.standard ? (
                        <span className="material-symbols-outlined text-emerald-500 text-[16px]">check_circle</span>
                      ) : (
                        <span className="material-symbols-outlined text-slate-300 text-[16px]">cancel</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      {feat.enterprise ? (
                        <span className="material-symbols-outlined text-amber-500 text-[16px]">check_circle</span>
                      ) : (
                        <span className="material-symbols-outlined text-slate-300 text-[16px]">cancel</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Payment Method Info */}
        <section className="mx-auto mt-16 max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Pay with Pakistan's trusted wallets
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            Secure payments processed via JazzCash and EasyPaisa. No international card required.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
                <span className="font-display text-lg font-bold text-red-600">JC</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900">JazzCash</p>
                <p className="text-xs text-slate-500">Mobile wallet & cards</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
                <span className="font-display text-lg font-bold text-green-600">EP</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900">EasyPaisa</p>
                <p className="text-xs text-slate-500">Mobile wallet</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto mt-16 max-w-3xl px-4 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold text-slate-900">
            Frequently Asked Questions
          </h2>
          <div className="mt-8 space-y-4">
            {[
              { q: "Can I use the platform for free?", a: "Yes! Every new account gets a 14-day free trial. Browse the marketplace and rates for free even after the trial — publishing and advanced features require a subscription." },
              { q: "How does payment work?", a: "Choose JazzCash or EasyPaisa at checkout. You'll be redirected to their secure page to complete payment. Your subscription activates instantly upon successful payment." },
              { q: "Can I cancel anytime?", a: "Yes. Your subscription runs month-to-month with no long-term commitment. Cancel any time from your dashboard." },
              { q: "What happens when my trial expires?", a: "You can still browse the marketplace, view rates, and search the directory. Publishing listings, posting RFPs, and creating ads require an active subscription." },
            ].map(({ q, a }) => (
              <details key={q} className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
                <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-bold text-slate-900">
                  {q}
                  <span className="material-symbols-outlined text-[18px] text-slate-400 transition group-open:rotate-180">
                    expand_more
                  </span>
                </summary>
                <p className="px-5 pb-4 text-xs leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => !processing && setShowPaymentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-bold text-slate-900">Choose Payment Method</h3>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={processing}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-700 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {SUBSCRIPTION_PLANS[selectedPlan].label}
                  </span>
                  <span className="font-display text-lg font-bold text-slate-900">
                    {formatPKR(SUBSCRIPTION_PLANS[selectedPlan].price)}/mo
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select payment method
                </p>

                {/* JazzCash */}
                <button
                  type="button"
                  onClick={() => setSelectedGateway("jazzcash")}
                  className={`flex w-full items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition ${
                    selectedGateway === "jazzcash"
                      ? "border-red-400 bg-red-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/30"
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100">
                    <span className="font-display text-sm font-bold text-red-600">JC</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">JazzCash</p>
                    <p className="text-xs text-slate-500">Mobile wallet, debit & credit cards</p>
                  </div>
                  {selectedGateway === "jazzcash" && (
                    <span className="material-symbols-outlined ml-auto text-red-500 text-[20px]">
                      check_circle
                    </span>
                  )}
                </button>

                {/* EasyPaisa */}
                <button
                  type="button"
                  onClick={() => setSelectedGateway("easypaisa")}
                  className={`flex w-full items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition ${
                    selectedGateway === "easypaisa"
                      ? "border-green-400 bg-green-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-green-200 hover:bg-green-50/30"
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100">
                    <span className="font-display text-sm font-bold text-green-600">EP</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">EasyPaisa</p>
                    <p className="text-xs text-slate-500">Mobile wallet payments</p>
                  </div>
                  {selectedGateway === "easypaisa" && (
                    <span className="material-symbols-outlined ml-auto text-green-500 text-[20px]">
                      check_circle
                    </span>
                  )}
                </button>
              </div>

              {/* Pay CTA */}
              <button
                type="button"
                onClick={handlePay}
                disabled={!selectedGateway || processing}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Redirecting to payment...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">payment</span>
                    Pay {formatPKR(SUBSCRIPTION_PLANS[selectedPlan].price)} via{" "}
                    {selectedGateway === "jazzcash" ? "JazzCash" : selectedGateway === "easypaisa" ? "EasyPaisa" : "..."}
                  </>
                )}
              </button>

              <p className="mt-4 text-center text-xs text-slate-400">
                You will be redirected to the payment provider's secure page.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </>
  );
}

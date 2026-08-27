/**
 * Government Schemes Directory — curated, province-filtered guide to
 * Pakistani agricultural support programs (finance, subsidies, insurance,
 * land records, advisory). Static content with official source links.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/utils";
import {
  GOV_SCHEMES,
  SCHEME_PROVINCES,
  SCHEME_CATEGORIES,
  CATEGORY_ICONS,
  type SchemeProvince,
  type SchemeCategory,
} from "@/lib/gov-schemes";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Government Schemes & Support | AgriBusiness Pakistan" },
      {
        name: "description",
        content: "A curated guide to Pakistani agricultural support programs — Green Tractor, Solar Tubewell, Kisan Card, Hari Card, crop loans, subsidies, and land records.",
      },
    ],
  }),
  component: ResourcesPage,
});

function ResourcesPage() {
  const [province, setProvince] = useState<SchemeProvince>("All Pakistan");
  const [category, setCategory] = useState<SchemeCategory | "all">("all");
  const [query, setQuery] = useState("");

  const visible = GOV_SCHEMES.filter((scheme) => {
    const matchesProvince =
      province === "All Pakistan" ? true : scheme.province === "All Pakistan" || scheme.province === province;
    const matchesCategory = category === "all" || scheme.category === category;

    const q = query.trim().toLowerCase();
    const searchable = `${scheme.name} ${scheme.urdu} ${scheme.summary} ${scheme.subsidyAmount || ""} ${scheme.category} ${scheme.province}`.toLowerCase();
    const matchesQuery = !q || searchable.includes(q);

    return matchesProvince && matchesCategory && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-[#F4F8F4] text-left">
      <Navbar />
      <main className="pb-16 pt-24">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">

          {/* Hero Banner */}
          <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-[#06180e] via-[#092516] to-[#0c311e] p-8 md:p-12 text-white shadow-lg relative overflow-hidden">
            <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
            <div className="relative z-10 max-w-3xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300 border border-emerald-400/30">
                <span className="material-symbols-outlined text-[15px]">account_balance</span>
                Pakistani Agricultural Support &amp; Subsidies
              </span>
              <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Official Agricultural Schemes &amp; Subsidies
              </h1>
              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-emerald-100/80">
                Green Tractor schemes, solar tubewell conversions, interest-free Kisan Cards, Sindh Hari Cards, livestock financing, and crop insurance in one verified directory.
              </p>

              {/* Instant Search Bar */}
              <div className="mt-6 flex max-w-xl items-center gap-2 rounded-2xl bg-white/95 p-1.5 shadow-md border border-white">
                <span className="material-symbols-outlined pl-2.5 text-[20px] text-slate-500">search</span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search schemes (e.g. Tractor, Solar, Kisan Card, Hari, Loan, Oilseed)…"
                  className="w-full bg-transparent py-2 pr-3 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-500"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="pr-2 text-xs font-bold text-slate-400 hover:text-slate-700"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="mt-8 space-y-3.5 rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 min-w-[70px]">Province:</span>
              {SCHEME_PROVINCES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvince(p)}
                  className={cn(
                    "rounded-xl px-3.5 py-1.5 text-xs font-bold transition border cursor-pointer",
                    province === p
                      ? "bg-emerald-800 text-white border-emerald-800 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-900",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 min-w-[70px]">Category:</span>
              <button
                type="button"
                onClick={() => setCategory("all")}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 text-xs font-bold transition border cursor-pointer",
                  category === "all"
                    ? "bg-emerald-800 text-white border-emerald-800 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-900",
                )}
              >
                All Categories
              </button>
              {SCHEME_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition border cursor-pointer",
                    category === c
                      ? "bg-emerald-800 text-white border-emerald-800 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-900",
                  )}
                >
                  <span className="material-symbols-outlined text-[15px]">{CATEGORY_ICONS[c]}</span>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Results Grid */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-600">
              Showing <span className="text-emerald-800 font-mono font-extrabold">{visible.length}</span> active government schemes
            </p>
          </div>

          {visible.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-emerald-300 bg-white p-12 text-center text-xs text-slate-600 shadow-xs">
              <span className="material-symbols-outlined text-4xl text-slate-400">search_off</span>
              <p className="mt-2 font-display text-sm font-bold text-slate-900">No programs match your search or filters</p>
              <p className="mt-1">Try clearing your search query or selecting "All Pakistan" and "All Categories".</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setProvince("All Pakistan");
                  setCategory("all");
                }}
                className="mt-4 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((scheme) => (
                <article
                  key={scheme.id}
                  className="flex flex-col justify-between rounded-3xl border border-emerald-200/80 bg-white p-6 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-base font-bold leading-snug text-slate-900">{scheme.name}</h2>
                        <p className="mt-0.5 text-xs font-bold text-emerald-800">{scheme.urdu}</p>
                      </div>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                        <span className="material-symbols-outlined text-[20px]">{CATEGORY_ICONS[scheme.category]}</span>
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                        {scheme.category}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                        {scheme.province}
                      </span>
                      {scheme.subsidyAmount && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-amber-900 border border-amber-300">
                          ⭐ {scheme.subsidyAmount}
                        </span>
                      )}
                    </div>

                    <p className="mt-3.5 text-xs leading-5 text-slate-600">{scheme.summary}</p>

                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-emerald-700">verified_user</span>
                          Who Qualifies:
                        </p>
                        <ul className="mt-1 space-y-1">
                          {scheme.eligibility.map((item) => (
                            <li key={item} className="flex items-start gap-1.5 text-xs leading-4 text-slate-600">
                              <span className="material-symbols-outlined mt-px text-[13px] text-emerald-600 shrink-0">check</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-emerald-700">how_to_reg</span>
                          How to Apply:
                        </p>
                        <ol className="mt-1 space-y-1">
                          {scheme.howToApply.map((step, index) => (
                            <li key={step} className="flex items-start gap-1.5 text-xs leading-4 text-slate-600">
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-black text-emerald-900">
                                {index + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                    {scheme.helpline ? (
                      <a
                        href={`tel:${scheme.helpline.replace(/[^0-9]/g, "")}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-900"
                      >
                        <span className="material-symbols-outlined text-[15px]">call</span>
                        <span>{scheme.helpline}</span>
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">Free Official Program</span>
                    )}

                    <a
                      href={scheme.source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="press inline-flex items-center gap-1 rounded-xl bg-emerald-800 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-900 shadow-xs"
                    >
                      <span>{scheme.source.label}</span>
                      <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Verification Disclaimer */}
          <div className="mt-12 rounded-3xl border border-amber-300 bg-amber-50/70 p-5 text-xs text-amber-950 shadow-xs flex items-start gap-3">
            <span className="material-symbols-outlined text-[24px] text-amber-700 shrink-0">info</span>
            <div className="leading-relaxed">
              <span className="font-bold">Important Notice:</span> Scheme application deadlines, subsidy vouchers, and eligibility criteria are governed by official provincial agriculture departments. Always verify through the official government portal links above or your local District Agriculture Office. AgriBusiness Pakistan provides this directory for public farmer awareness and never charges application fees.
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}

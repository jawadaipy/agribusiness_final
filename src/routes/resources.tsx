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
import { GOV_SCHEMES, SCHEME_PROVINCES, SCHEME_CATEGORIES, CATEGORY_ICONS, type SchemeProvince, type SchemeCategory } from "@/lib/gov-schemes";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [{ title: "Government Schemes & Support | AgriBusiness Pakistan" },{ name: "description", content: "A curated guide to Pakistani agricultural support programs — loans, subsidies, crop insurance, land records, and advisory services." }],
  }),
  component: ResourcesPage,
});

function ResourcesPage() {
  const [province, setProvince] = useState<SchemeProvince>("All Pakistan");
  const [category, setCategory] = useState<SchemeCategory | "all">("all");

  const visible = GOV_SCHEMES.filter((scheme) => {
    const matchesProvince = province === "All Pakistan" ? true : scheme.province === "All Pakistan" || scheme.province === province;
    const matchesCategory = category === "all" || scheme.category === category;
    return matchesProvince && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pb-14 pt-24">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          {/* Hero */}
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[.12em] text-primary">
              <span className="material-symbols-outlined text-[14px]">account_balance</span>
              Government support directory
            </p>
            <h1 className="mt-3 font-display text-3xl tracking-tight text-primary md:text-4xl">Know every scheme you're entitled to</h1>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Loans, input subsidies, crop insurance, land records, and free extension advisory — the public programs Pakistani growers
              and agri-businesses can actually use, in one place. Filter by your province and need.
            </p>
          </div>

          {/* Filters */}
          <div className="mt-7 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[.12em] text-on-surface-variant/70">Region</span>
              {SCHEME_PROVINCES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvince(p)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-bold transition",
                    province === p ? "bg-primary text-on-primary" : "control-secondary",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[.12em] text-on-surface-variant/70">Type</span>
              <button
                type="button"
                onClick={() => setCategory("all")}
                className={cn("rounded-xl px-3 py-1.5 text-xs font-bold transition", category === "all" ? "bg-primary text-on-primary" : "control-secondary")}
              >
                All types
              </button>
              {SCHEME_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition",
                    category === c ? "bg-primary text-on-primary" : "control-secondary",
                  )}
                >
                  <span className="material-symbols-outlined text-[14px]">{CATEGORY_ICONS[c]}</span>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Cards */}
          {visible.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-dashed border-outline bg-surface-container-low/60 p-6 text-center text-xs leading-5 text-on-surface-variant">
              No programs listed for this combination yet. Provincial windows open seasonally — check the official portals for announcements.
            </p>
          ) : (
            <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((scheme) => (
                <article key={scheme.id} className="flex flex-col rounded-2xl border border-outline-variant/60 bg-white p-5 shadow-[0_10px_28px_rgba(15,81,50,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,81,50,0.10)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-lg font-bold leading-snug text-primary">{scheme.name}</h2>
                      <p className="mt-0.5 text-sm font-bold text-secondary">{scheme.urdu}</p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
                      <span className="material-symbols-outlined text-[20px]">{CATEGORY_ICONS[scheme.category]}</span>
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase text-primary">{scheme.category}</span>
                    <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs font-bold text-on-surface-variant">{scheme.province}</span>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-on-surface-variant">{scheme.summary}</p>

                  <div className="mt-4 space-y-3 border-t border-outline-variant/40 pt-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[.1em] text-on-surface-variant/70">Who qualifies</p>
                      <ul className="mt-1 space-y-1">
                        {scheme.eligibility.map((item) => (
                          <li key={item} className="flex items-start gap-1.5 text-xs leading-4 text-on-surface-variant">
                            <span className="material-symbols-outlined mt-px text-[12px] text-primary">check</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[.1em] text-on-surface-variant/70">How to apply</p>
                      <ol className="mt-1 space-y-1">
                        {scheme.howToApply.map((step, index) => (
                          <li key={step} className="flex items-start gap-1.5 text-xs leading-4 text-on-surface-variant">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[8px] font-black text-primary">{index + 1}</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <a
                    href={scheme.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-auto inline-flex w-fit items-center gap-1.5 pt-4 text-xs font-bold text-primary transition hover:underline"
                  >
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    {scheme.source.label}
                  </a>
                </article>
              ))}
            </div>
          )}

          {/* Disclaimer */}
          <p className="mt-8 rounded-2xl border border-secondary/30 bg-secondary-container/40 p-4 text-xs leading-5 text-on-surface-variant">
            <span className="font-bold text-primary">Verify before you apply:</span> scheme windows, subsidy rates, and eligibility rules
            change with government notifications. Always confirm current details with the issuing department or your district office
            before travelling or submitting documents. AgriBusiness lists programs for awareness and never charges for applications.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Sector {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  count: number;
}

const FALLBACK_SECTORS: Sector[] = [
  { id: "crops", name: "Crops & Grains", slug: "crops-grains", icon: "grass", description: "Wheat, rice, maize, and pulses trading and agronomy expertise.", count: 0 },
  { id: "machinery", name: "Machinery & Tech", slug: "machinery-tech", icon: "agriculture", description: "Tractors, solar irrigation systems, and precision agri-tools.", count: 0 },
  { id: "livestock", name: "Livestock & Dairy", slug: "livestock-dairy", icon: "pets", description: "Cattle trading, dairy equipment, and certified veterinary services.", count: 0 },
  { id: "inputs", name: "Agri-Inputs", slug: "agri-inputs", icon: "science", description: "Certified seeds, fertilizers, and eco-friendly crop protection.", count: 0 },
  { id: "solar", name: "Solar & Energy", slug: "solar-energy", icon: "solar_power", description: "Renewable energy and solar tubewell solutions for off-grid farming.", count: 0 },
  { id: "consult", name: "Consultancy", slug: "consultancy", icon: "psychology", description: "Soil testing, agronomic audits, and international export guidance.", count: 0 },
];

const CategoriesPage = () => {
  const [sectors, setSectors] = useState<Sector[] | null>(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from("categories")
      .select("id,name,slug,icon,description,listings(count)")
      .eq("is_active", true)
      .is("parent_id", null)
      .order("sort_order")
      .then(({ data, error }) => {
        if (!alive) return;
        if (error || !data?.length) {
          setSectors(FALLBACK_SECTORS);
          return;
        }
        setSectors(
          (data as unknown as { id: string; name: string; slug: string; icon: string | null; description: string | null; listings: { count: number }[] | null }[]).map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            icon: c.icon ?? "category",
            description: c.description,
            count: c.listings?.[0]?.count ?? 0,
          })),
        );
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pb-14 pt-24 text-left">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">

          <div className="mb-8 max-w-2xl animate-in fade-in slide-in-from-left-6 duration-500">
            <p className="eyebrow mb-3">Agri taxonomy</p>
            <h1 className="mb-3 font-display text-3xl font-bold tracking-tight text-primary md:text-4xl">
              Explore the <span className="text-secondary">agri-ecosystem</span>
            </h1>
            <p className="text-xs font-medium leading-relaxed text-on-surface-variant">
              Navigate through Pakistan's comprehensive agricultural classification directory. Connect with verified stakeholders in your sector.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 animate-in fade-in slide-in-from-bottom-6 duration-500 md:grid-cols-2 lg:grid-cols-3">
            {(sectors ?? []).map((sector) => (
              <motion.div key={sector.slug} whileHover={{ y: -4 }} className="h-full">
                <Link
                  to="/categories/$slug"
                  params={{ slug: sector.slug }}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-outline-variant/40 bg-white p-6 shadow-sm transition-all hover:border-primary/30 hover:shadow-lg"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-low transition-all group-hover:bg-primary">
                    <span className="material-symbols-outlined text-2xl text-primary transition-all group-hover:scale-105 group-hover:text-white" aria-hidden="true">
                      {sector.icon}
                    </span>
                  </div>

                  <h3 className="mb-2 font-display text-lg font-bold tracking-tight text-primary transition-colors group-hover:text-secondary">
                    {sector.name}
                  </h3>

                  <p className="mb-6 flex-grow text-xs font-medium leading-relaxed text-on-surface-variant/80">
                    {sector.description}
                  </p>

                  <div className="flex items-center justify-between border-t border-outline-variant/30 pt-4">
                    <span className="stat-num text-xs font-bold uppercase tracking-wider text-primary">
                      {sector.count > 0 ? `${sector.count.toLocaleString()} listing${sector.count === 1 ? "" : "s"}` : "Browse sector"}
                    </span>
                    <span className="material-symbols-outlined text-[18px] text-secondary opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" aria-hidden="true">
                      arrow_forward
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Concierge banner — functional WhatsApp deep-link */}
          <div className="relative mt-12 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-container p-8 text-left text-white shadow-xl md:p-12">
            <div className="relative z-10 max-w-xl">
              <h2 className="mb-3 font-display text-2xl font-bold tracking-tight md:text-3xl">
                Can't find your <span className="text-secondary-light italic">specialty?</span>
              </h2>
              <p className="mb-6 text-xs font-medium leading-relaxed text-white/80">
                Our sector specialists help navigate niche commodity categories and locate verified regional consultants.
              </p>
              <a
                href="https://wa.me/923001234567?text=Salaam!%20I%20need%20help%20finding%20a%20category%20or%20consultant%20on%20AgriBusiness.pk"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-2 rounded-xl bg-secondary px-6 py-3 text-xs font-bold uppercase tracking-wider text-on-secondary shadow-md transition-all hover:bg-white hover:text-primary"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">support_agent</span>
                Contact Concierge
              </a>
            </div>

            <span className="material-symbols-outlined pointer-events-none absolute -right-10 top-1/2 rotate-12 text-[200px] text-white/5" aria-hidden="true">
              explore
            </span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export const Route = createFileRoute("/categories")({
  head: () => ({
    title: "Agri Taxonomy | AgriBusiness Pakistan",
    meta: [
      { name: "description", content: "Explore Pakistan's most comprehensive agricultural classification system and sector directory." },
      { property: "og:title", content: "AgriBusiness Sectors" },
      { property: "og:description", content: "Navigate through the Pakistan agricultural ecosystem by sector and commodity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CategoriesPage,
});

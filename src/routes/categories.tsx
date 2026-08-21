import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { createFileRoute } from '@tanstack/react-router';
import { cn } from "@/lib/utils";

const CategoriesPage = () => {
  const sectors = [
    { 
      name: "Crops & Grains", 
      icon: "grass", 
      count: "12.4k Listings",
      desc: "Wheat, Rice, Maize, and pulses trading and agronomy expertise.",
      color: "bg-surface-container-low",
      slug: "crops-grains"
    },
    { 
      name: "Machinery & Tech", 
      icon: "agriculture", 
      count: "5.2k Listings",
      desc: "Tractors, solar irrigation systems, and precision agri-tools.",
      color: "bg-surface-container-low",
      slug: "machinery-tech"
    },
    { 
      name: "Livestock & Dairy", 
      icon: "pets", 
      count: "8.1k Listings",
      desc: "Cattle trading, dairy equipment, and certified veterinary services.",
      color: "bg-surface-container-low",
      slug: "livestock-dairy"
    },
    { 
      name: "Agri-Inputs", 
      icon: "science", 
      count: "3.9k Listings",
      desc: "Certified seeds, fertilizers, and eco-friendly crop protection.",
      color: "bg-surface-container-low",
      slug: "agri-inputs"
    },
    { 
      name: "Solar & Energy", 
      icon: "solar_power", 
      count: "1.8k Listings",
      desc: "Renewable energy and solar tubewell solutions for off-grid farming.",
      color: "bg-surface-container-low",
      slug: "solar-energy"
    },
    { 
      name: "Consultancy", 
      icon: "psychology", 
      count: "2.5k Experts",
      desc: "Soil testing, agronomic audits, and international export guidance.",
      color: "bg-surface-container-low",
      slug: "consultancy"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-14 text-left">
        <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
          
          <div className="max-w-2xl mb-8 animate-in fade-in slide-in-from-left-6 duration-500">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-3 rounded-full bg-primary/10 border border-primary/20">
              <span className="material-symbols-outlined text-[15px] text-primary">hub</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Agri Taxonomy</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-primary mb-3 tracking-tight">
              Explore the <span className="text-secondary">Agri-Ecosystem</span>
            </h1>
            <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
              Navigate through Pakistan's comprehensive agricultural classification directory. Connect with verified stakeholders in your sector.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-6 duration-500">
            {sectors.map((sector, i) => (
              <motion.a
                key={sector.slug}
                href={`/categories/${sector.slug}`}
                whileHover={{ y: -4 }}
                className="group bg-white rounded-2xl p-6 border border-outline-variant/40 hover:border-primary/30 hover:shadow-lg transition-all relative overflow-hidden flex flex-col h-full shadow-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-all">
                  <span className="material-symbols-outlined text-2xl group-hover:scale-105 transition-transform text-primary group-hover:text-white">
                    {sector.icon}
                  </span>
                </div>
                
                <h3 className="font-display text-lg font-bold text-primary mb-2 tracking-tight group-hover:text-secondary transition-colors">
                  {sector.name}
                </h3>
                
                <p className="text-xs font-medium text-on-surface-variant/80 leading-relaxed mb-6 flex-grow">
                  {sector.desc}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    {sector.count}
                  </span>
                  <span className="material-symbols-outlined text-secondary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[18px]">
                    arrow_forward
                  </span>
                </div>
              </motion.a>
            ))}
          </div>

          {/* Concierge Banner */}
          <div className="mt-12 bg-gradient-to-br from-primary to-primary-container rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-xl text-left">
            <div className="max-w-xl relative z-10">
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-3 tracking-tight">
                Can't find your <span className="text-secondary-container italic">Specialty?</span>
              </h2>
              <p className="text-xs text-white/80 mb-6 font-medium leading-relaxed">
                Our sector specialists help navigate niche commodity categories and locate verified regional consultants.
              </p>
              <button className="px-6 py-3 bg-secondary text-primary rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-white transition-all shadow-md flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">support_agent</span>
                Contact Concierge
              </button>
            </div>
            
            <span className="material-symbols-outlined absolute top-1/2 -right-10 -translate-y-1/2 text-[200px] text-white/5 rotate-12 pointer-events-none">
              explore
            </span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export const Route = createFileRoute('/categories')({
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
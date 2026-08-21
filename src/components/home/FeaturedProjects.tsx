import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";

const CARD_IMAGES = [
  "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&q=80&auto=format&fit=crop",
];

interface ProjectItem {
  id: string;
  title: string;
  desc: string;
  price: string;
  type: string;
  image: string;
  typeColor: string;
  typeGradient: string;
}

function FeaturedCard({ proj, index }: { proj: ProjectItem; index: number }) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.1 * index, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-3xl overflow-hidden group border border-outline-variant/40 flex flex-col text-left card-shadow hover:card-shadow-hover hover:-translate-y-1.5 transition-all duration-300"
    >
      <div className="w-full aspect-[16/10] relative overflow-hidden bg-surface-container-low">
        {imgError ? (
          <div className="w-full h-full gradient-agri flex items-center justify-center">
            <span className="material-symbols-outlined text-[56px] text-white/20" aria-hidden="true">
              agriculture
            </span>
          </div>
        ) : (
          <img
            src={proj.image}
            alt={proj.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            onError={() => setImgError(true)}
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-xl font-bold text-[9px] uppercase tracking-wider shadow-md text-white bg-gradient-to-r ${proj.typeGradient}`}>
            {proj.type}
          </span>
        </div>
        <div className="absolute top-4 right-4">
          <span className="px-2.5 py-1 rounded-lg bg-secondary text-primary font-bold text-[9px] shadow-md uppercase tracking-wider">
            Verified
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-display text-base font-bold text-primary mb-2 line-clamp-2 group-hover:text-secondary transition-colors duration-200 tracking-tight leading-snug">
          {proj.title}
        </h3>
        <p className="text-xs text-on-surface-variant mb-5 line-clamp-2 leading-relaxed font-medium flex-grow">
          {proj.desc}
        </p>

        <div className="pt-4 border-t border-outline-variant/30 flex items-end justify-between">
          <div>
            <p className="text-[9px] font-bold text-on-surface-variant/50 mb-0.5 uppercase tracking-widest">
              Project Value
            </p>
            <p className="text-xl font-black text-primary tracking-tight">{proj.price}</p>
          </div>
          <Link
            to={`/projects/${proj.id}`}
            aria-label={`View details for ${proj.title}`}
            className="w-11 h-11 rounded-xl gradient-agri text-white flex items-center justify-center hover:shadow-lg transition-all shadow-md group-hover:scale-110 duration-300"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              arrow_outward
            </span>
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

export function FeaturedProjects() {
  const projects: ProjectItem[] = [
    {
      id: "1",
      title: "John Deere 8R Series Heavy Tractor 2024 — Punjab Ready",
      desc: "High-horsepower precision-ag tractor for large-scale farming in Punjab. Includes GPS auto-steer and yield mapping.",
      price: "₨ 4.52 کروڑ",
      type: "Machinery",
      image: CARD_IMAGES[0],
      typeColor: "text-blue-700",
      typeGradient: "from-blue-500 to-indigo-600",
    },
    {
      id: "2",
      title: "Premium Grade A Wheat Seed — Certified (50 Tons)",
      desc: "High-yield certified seed optimised for Faisalabad and Multan belt. Full lab reports and phytosanitary certificate included.",
      price: "₨ 1,20,000",
      type: "Commodity",
      image: CARD_IMAGES[1],
      typeColor: "text-emerald-700",
      typeGradient: "from-emerald-500 to-teal-600",
    },
  ];

  return (
    <section
      className="py-16 md:py-20 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto"
      aria-labelledby="featured-projects-heading"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4 text-left"
      >
        <div>
          <span className="section-eyebrow mb-2 block">Marketplace</span>
          <h2
            id="featured-projects-heading"
            className="section-heading"
          >
            Featured <span className="gradient-text-gold">Agri-Opportunities</span>
          </h2>
        </div>
        <Link
          to="/projects"
          className="flex items-center gap-1.5 text-primary font-bold text-xs uppercase tracking-wider hover:text-secondary transition-colors group shrink-0"
        >
          Browse All Projects{" "}
          <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform" aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
        {projects.map((proj, i) => (
          <FeaturedCard key={proj.id} proj={proj} index={i} />
        ))}

        {/* CTA card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="gradient-agri text-white rounded-3xl shadow-xl p-7 flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="absolute inset-0 section-dots opacity-20 pointer-events-none" />
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-56 h-56 bg-secondary/10 rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-secondary/20 border border-secondary/30 flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-secondary text-[24px]">satellite_alt</span>
            </div>
            <h3 className="font-display text-xl font-bold mb-2 tracking-tight leading-snug">
              Satellite Farm View —{" "}
              <span className="text-secondary">Pro Users</span>
            </h3>
            <p className="text-xs text-white/75 mb-6 relative z-10 font-medium leading-relaxed">
              Access real-time satellite imagery, moisture indices, NDVI crop health mapping, and yield predictions.
            </p>
          </div>

          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 bg-secondary text-primary px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-white hover:text-primary transition-all relative z-10 shadow-lg self-start"
          >
            <span className="material-symbols-outlined text-[16px]">lock_open</span>
            Unlock Satellite View
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

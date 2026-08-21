import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";

export const Route = createFileRoute("/apps/")({
  head: () => ({
    title: "Our Apps Suite | AgriBusiness Pakistan",
    meta: [
      {
        name: "description",
        content: "Explore AgriBusiness suite of companion apps: Agri Biz Classifieds, Animal Clinic, and Plant Clinic.",
      },
    ],
  }),
  component: AppsIndexPage,
});

function AppsIndexPage() {
  const apps = [
    {
      id: "agri-biz",
      name: "Agri Biz",
      tagline: "Free Classified & Trading Floor",
      badge: "Marketplace & Classifieds",
      icon: "storefront",
      color: "from-blue-600 to-emerald-700",
      accent: "bg-secondary text-primary",
      link: "/apps/agri-biz",
      image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&q=80&auto=format&fit=crop",
      overview: "Free classified app that connects people to sell and buy second-hand goods, farm machinery, crops, and agricultural supplies across Pakistan.",
      features: [
        "Fill a simple form and post to sale goods with transparent PKR pricing.",
        "Attach high-resolution images that represent your product to attract more buyers.",
        "Chat & WhatsApp messaging provides a fast way to communicate with parties and stay updated.",
        "Location & GPS feature allows buyers to locate item positions accurately across Pakistani mandis."
      ],
      cta: "Launch Agri Biz App"
    },
    {
      id: "animal-clinic",
      name: "Animal Clinic",
      tagline: "Partner University Veterinary Telehealth",
      badge: "Livestock & Dairy Care",
      icon: "pets",
      color: "from-amber-600 to-orange-800",
      accent: "bg-amber-400 text-amber-950",
      link: "/apps/animal-clinic",
      image: "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=800&q=80&auto=format&fit=crop",
      overview: "Animal Clinic App is built to facilitate animal farmers to post their animals' problems like diseases with symptoms in audio, video, and image format to get expert advice from Partner University's Animals Department and fellow farmers who have experienced similar conditions.",
      features: [
        "Post animal problems with clinical symptoms using audio, video, and high-res images.",
        "Direct advice and prescriptions from Partner University's Animals & Veterinary Department.",
        "Peer knowledge exchange with experienced dairy and cattle farmers via text and voice notes.",
        "Visual problem publishing helps veterinary experts easily understand disease conditions quickly."
      ],
      cta: "Open Animal Clinic"
    },
    {
      id: "plant-clinic",
      name: "Plant Clinic",
      tagline: "AI Diagnosis & Agronomy Advisory",
      badge: "Crops, Fruits & Horticulture",
      icon: "psychiatry",
      color: "from-emerald-700 to-teal-900",
      accent: "bg-emerald-400 text-emerald-950",
      link: "/apps/plant-clinic",
      image: "https://images.unsplash.com/photo-1592982537447-6f296d9ccbd3?w=800&q=80&auto=format&fit=crop",
      overview: "This App provides dedicated help regarding plants, fruits, flowers, seeds, vegetables, and field crops. Farmers can easily describe their problem and get fast responses from qualified agronomists and peer growers.",
      features: [
        "Covers plants, fruits, flowers, seeds, field crops, and soil nutrition.",
        "Intuitive posting interface with text comments and voice message support.",
        "Fast response from certified agronomists and experienced farmers with similar case history.",
        "Photo analysis helps experts diagnose leaf spots, blights, and pests with precision."
      ],
      cta: "Open Plant Clinic"
    }
  ];

  return (
    <div className="min-h-screen bg-background text-left">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
          
          {/* Header Banner */}
          <div className="text-center max-w-3xl mx-auto mb-14 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="inline-block px-3.5 py-1 mb-3 text-[11px] font-bold tracking-[0.15em] uppercase rounded-full bg-secondary/20 text-primary border border-secondary/30">
              AgriBusiness Digital Ecosystem
            </span>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-primary tracking-tight mb-3">
              Our <span className="text-secondary">Specialized Apps</span>
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant font-medium leading-relaxed max-w-2xl mx-auto">
              Empowering farmers, veterinarians, agronomists, and agribusiness traders with integrated digital tools for diagnosis, trade, and telehealth.
            </p>
          </div>

          {/* Apps Detailed List */}
          <div className="space-y-12">
            {apps.map((app, index) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-3xl border border-outline-variant/40 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 grid grid-cols-1 lg:grid-cols-12"
              >
                {/* Media Column */}
                <div className="lg:col-span-5 relative aspect-[16/10] lg:aspect-auto overflow-hidden bg-surface-container-low">
                  <img
                    src={app.image}
                    alt={app.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:hidden" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/95 text-primary backdrop-blur-md shadow-sm border border-primary/10">
                      {app.badge}
                    </span>
                  </div>
                </div>

                {/* Content Column */}
                <div className="lg:col-span-7 p-6 sm:p-8 md:p-10 flex flex-col justify-between space-y-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-[22px] text-secondary">
                          {app.icon}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                          {app.tagline}
                        </span>
                        <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                          {app.name}
                        </h2>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-on-surface-variant font-medium leading-relaxed mt-3 mb-6">
                      {app.overview}
                    </p>

                    <div className="space-y-2.5">
                      <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider">
                        Key Capabilities & Workflow:
                      </h4>
                      <ul className="space-y-2">
                        {app.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs font-medium text-primary/90">
                            <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
                              check_circle
                            </span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-outline-variant/30 flex flex-wrap items-center gap-3">
                    <Link
                      to={app.link}
                      className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-primary-container transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <span>{app.cta}</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>

                    <Link
                      to="/onboarding"
                      className="px-5 py-3 rounded-xl border border-outline-variant/50 text-xs font-bold text-primary hover:bg-surface-container-low transition-all cursor-pointer"
                    >
                      Join as Expert / Farmer
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}

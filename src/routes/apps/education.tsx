import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { createFileRoute } from '@tanstack/react-router';
import { cn } from "@/lib/utils";

const EducationHubPage = () => {
  const courses = [
    {
      id: 1,
      title: "Sustainable Soil Management & NPK Optimization",
      provider: "University of Agriculture, Faisalabad",
      rating: 4.9,
      students: "1,240+",
      price: "₨ 12,000",
      image: "https://images.unsplash.com/photo-1592982537447-6f296d9ccbd3?w=600&q=80&auto=format&fit=crop",
      tag: "Best Seller"
    },
    {
      id: 2,
      title: "Modern Drip Irrigation Systems: Design & Operation",
      provider: "AgriTech Pakistan Academy",
      rating: 4.8,
      students: "850+",
      price: "₨ 15,500",
      image: "https://images.unsplash.com/photo-1509391366360-1e97f52ce23b?w=600&q=80&auto=format&fit=crop",
      tag: "Technical"
    },
    {
      id: 3,
      title: "Commercial Dairy & Livestock Herd Health 2026",
      provider: "Livestock Development Council",
      rating: 4.7,
      students: "2,100+",
      price: "₨ 8,000",
      image: "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=600&q=80&auto=format&fit=crop",
      tag: "Business"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-14 text-left">
        <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 animate-in fade-in slide-in-from-left-6 duration-500">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-sm font-bold">school</span>
                </div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Agri-Tech Academy</span>
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-primary mb-2 tracking-tight">
                Education & Skills <span className="text-secondary">Hub</span>
              </h1>
              <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
                Upskill your farm management with certified courses from Pakistan's leading agricultural scientists and universities.
              </p>
            </div>
            <button className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-primary-container transition-all shadow-md flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">library_books</span>
              Browse Catalog
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
            {courses.map((course) => (
              <div key={course.id} className="group bg-white rounded-2xl border border-outline-variant/40 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full text-left">
                <div className="relative aspect-video overflow-hidden bg-surface-container-low">
                  <img 
                    src={course.image} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    alt={course.title} 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&q=80&auto=format&fit=crop";
                    }}
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-secondary text-primary px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider shadow-md">
                      {course.tag}
                    </span>
                  </div>
                </div>
                
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="font-display text-base font-bold text-primary mb-2 leading-snug group-hover:text-secondary transition-colors line-clamp-2">{course.title}</h3>
                  <div className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-4">{course.provider}</div>
                  
                  <div className="grid grid-cols-2 gap-4 py-3 border-y border-outline-variant/30 mb-4">
                    <div>
                      <div className="flex items-center gap-1 text-primary font-bold text-sm">
                        <span className="material-symbols-outlined text-secondary text-[16px] fill-secondary">star</span>
                        {course.rating}
                      </div>
                      <div className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-wider">Rating</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-primary">{course.students}</div>
                      <div className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-wider">Learners</div>
                    </div>
                  </div>
                  
                  <div className="mt-auto flex items-center justify-between gap-4">
                    <div className="text-lg font-bold text-primary tracking-tight">{course.price}</div>
                    <button className="px-5 py-2.5 bg-surface-container-low border border-outline-variant/40 text-primary rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-primary hover:text-white transition-all shadow-sm">
                      Enroll Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Instructor Call to Action */}
            <div className="bg-gradient-to-br from-primary to-primary-container rounded-2xl p-6 flex flex-col items-center justify-center text-center group transition-all relative overflow-hidden h-full shadow-lg text-white">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 relative z-10 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-secondary text-2xl">psychology</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 relative z-10 tracking-tight">Become an Instructor</h3>
              <p className="text-xs text-white/80 mb-6 leading-relaxed relative z-10 max-w-[220px] font-medium">Share your agronomic expertise and reach 50,000+ agribusiness leaders.</p>
              <button className="px-6 py-2.5 bg-secondary text-primary rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-white transition-all relative z-10 shadow-sm">Get Started</button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export const Route = createFileRoute('/apps/education')({
  head: () => ({
    title: "Education Hub | Agri-Tech Learning | AgriBusiness",
    meta: [
      { name: "description", content: "Access certified agricultural courses, technical training, and expert-led webinars." },
      { property: "og:title", content: "AgriBusiness Education Hub" },
      { property: "og:description", content: "Upskill in the latest agri-tech and farm management strategies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EducationHubPage,
});
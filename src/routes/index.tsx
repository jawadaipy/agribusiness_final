import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { RateTicker } from "@/components/shared/RateTicker";
import { Hero } from "@/components/home/Hero";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { EcosystemApps } from "@/components/home/EcosystemApps";
import { HowItWorks } from "@/components/home/HowItWorks";
import { AppHub } from "@/components/home/AppHub";
import { FeaturedProjects } from "@/components/home/FeaturedProjects";
import { Pricing } from "@/components/home/Pricing";
import { Footer } from "@/components/layout/Footer";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    title: "AgriBusiness — Pakistan's Premier Agri-Tech Marketplace",
    meta: [
      { name: "description", content: "The ultimate agri-tech platform for Pakistan's agricultural community." },
    ],
  }),
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <RateTicker />
        <EcosystemApps />
        <CategoryGrid />
        <AppHub />
        <FeaturedProjects />
        <HowItWorks />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}

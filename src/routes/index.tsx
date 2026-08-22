import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { RateTicker } from "@/components/shared/RateTicker";
import { Hero } from "@/components/home/Hero";
import { RoleStrip, HowItWorksMinimal, AppsStrip, CtaBand } from "@/components/home/Sections";
import { FeaturedProjects } from "@/components/home/FeaturedProjects";
import { Footer } from "@/components/layout/Footer";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    title: "AgriBusiness — Pakistan's Agri Professional Network",
    meta: [
      { name: "description", content: "The professional network where Pakistan's farmers, buyers, consultants, enterprises, and researchers do real business." },
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
        <RoleStrip />
        <HowItWorksMinimal />
        <AppsStrip />
        <FeaturedProjects />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}

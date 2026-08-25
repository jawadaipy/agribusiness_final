import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { RateTicker } from "@/components/shared/RateTicker";
import { Hero } from "@/components/home/Hero";
import { TrustBand, RolesExplorer, HowItWorksMinimal, AppsStrip, CtaBand } from "@/components/home/Sections";
import { FeaturedProjects } from "@/components/home/FeaturedProjects";
import { HomePricingSection } from "@/components/home/HomePricingSection";
import { AdSlot } from "@/components/shared/AdSlot";
import { Footer } from "@/components/layout/Footer";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "AgriBusiness — Pakistan's Agri Professional Network" },
      { name: "description", content: "The professional network where Pakistan's farmers, buyers, consultants, enterprises, and researchers do real business — live mandi rates, verified listings, open tenders." },
    ],
  }),
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* The board is the product — dark exchange hero with live rates */}
        <Hero />
        <RateTicker />

        {/* Proof before pitch: live platform numbers from the database */}
        <TrustBand />

        {/* The capability matrix — what each member role can actually do */}
        <RolesExplorer />

        <HowItWorksMinimal />
        <AppsStrip />

        {/* Real open requirements, highest budgets first */}
        <FeaturedProjects />

        {/* Platform-sponsored placement (renders only when a flight is live) */}
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          <AdSlot variant="banner" />
        </div>

        {/* Transparent PKR Pricing with 14-day free trial */}
        <HomePricingSection />

        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}

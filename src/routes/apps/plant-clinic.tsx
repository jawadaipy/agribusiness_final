import { createFileRoute } from "@tanstack/react-router";
import { ClinicPage } from "@/components/clinic/ClinicPage";

const PlantClinicPage = () => (
  <ClinicPage
    config={{
      icon: "psychiatry",
      badgeText: "Verified agronomy diagnostics",
      title: "Plant Health & Crop Clinic",
      subtitle:
        "Share crop symptoms, upload evidence photos, and receive diagnostic prescriptions from certified agronomists and experienced growers.",
      headerStatLabel: "Resolved cases",
      reportTitle: "Report plant symptoms & diseases",
      headlinePlaceholder: "Problem headline (e.g. Yellowing leaves and stem borer on maize in Sahiwal)",
      bodyPlaceholder: "Describe symptoms, affected acreage, soil moisture, and recent fertilizer/pesticide sprays…",
      tagsPlaceholder: "Crop & tags (e.g. Wheat, Rust, Multan)",
      defaultTags: "Wheat, Leaves",
      replyPlaceholder: "Provide an agronomic diagnosis or advisory reply…",
      submitCta: "Submit for analysis",
      submitSuccess: "Your plant symptom report has been submitted to verified agronomists.",
      loadError: "Plant clinic cases could not be loaded from the database.",
      posterFallback: "Verified Grower",
      expertFallback: "Agronomist",
      casesLabel: "Live plant cases",
      emptyTitle: "No plant cases reported yet",
      emptyMessage: "Be the first grower to submit crop symptoms above for verified expert diagnosis.",
      expertBlurbTitle: "Expert advisory network",
      expertBlurb:
        "Agronomists and consultants publish verified prescriptions and build their reputation in Pakistan's agricultural sector.",
      expertCta: "Browse specialist directory",
    }}
  />
);

export const Route = createFileRoute("/apps/plant-clinic")({
  head: () => ({
    meta: [{ title: "Plant Clinic | AI-Powered Agronomy | AgriBusiness" },
      { name: "description", content: "Diagnostic platform for crop health and expert agronomy recommendations." },
      { property: "og:title", content: "AgriBusiness Plant Clinic" },
      { property: "og:description", content: "Get expert advice and AI-powered diagnosis for your crops." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlantClinicPage,
});

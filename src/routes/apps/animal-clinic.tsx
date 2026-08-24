import { createFileRoute } from "@tanstack/react-router";
import { ClinicPage } from "@/components/clinic/ClinicPage";

const AnimalClinicPage = () => (
  <ClinicPage
    config={{
      icon: "pets",
      badgeText: "24/7 livestock & dairy telehealth",
      title: "Animal & Veterinary Clinic",
      subtitle:
        "Direct clinical advisory for cattle, buffalo, poultry, and small ruminants — with certified veterinarians from partner animal-sciences faculties.",
      headerStatLabel: "Resolved cases",
      reportTitle: "Report livestock symptoms / emergency",
      headlinePlaceholder: "Case headline (e.g. Sahiwal cow showing high fever and reduced milk output)",
      bodyPlaceholder: "Describe symptoms, temperature, herd count, feeding regime, vaccinations, and duration of illness…",
      tagsPlaceholder: "Species & tags (e.g. Dairy Cattle, Mastitis, Okara)",
      defaultTags: "Dairy Cattle",
      replyPlaceholder: "Provide veterinary advice or a clinical diagnosis…",
      submitCta: "Submit for vet review",
      submitSuccess: "Your livestock case has been submitted for certified veterinary review.",
      loadError: "Livestock clinical cases could not be loaded from the database.",
      posterFallback: "Livestock Producer",
      expertFallback: "Doctor of Veterinary Medicine",
      casesLabel: "Active veterinary cases",
      emptyTitle: "No veterinary cases reported yet",
      emptyMessage: "Be the first producer to submit animal symptoms above for certified veterinary diagnosis.",
      expertBlurbTitle: "Veterinary advisory protocol",
      expertBlurb:
        "Direct partnership with University of Veterinary and Animal Sciences (UVAS) and Faisalabad Agriculture University alumni networks.",
      expertCta: "Find a livestock specialist",
    }}
  />
);

export const Route = createFileRoute("/apps/animal-clinic")({
  head: () => ({
    meta: [{ title: "Animal Clinic | Veterinary Telehealth | AgriBusiness" },
      { name: "description", content: "Veterinary telehealth advisory for dairy and livestock farmers." },
      { property: "og:title", content: "AgriBusiness Animal Clinic" },
      { property: "og:description", content: "Certified veterinary telehealth support for cattle, poultry, and livestock." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnimalClinicPage,
});

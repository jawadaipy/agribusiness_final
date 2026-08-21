/**
 * Shared constants used across all forms and UI components.
 * Add or reorder cities freely; keep the list alphabetically sorted.
 */

export const CITIES = [
  "Bahawalpur",
  "Chiniot",
  "D.G. Khan",
  "Faisalabad",
  "Gujranwala",
  "Gujrat",
  "Hafizabad",
  "Hyderabad",
  "Islamabad",
  "Jhang",
  "Karachi",
  "Kasur",
  "Khushab",
  "Lahore",
  "Larkana",
  "Layah",
  "Lodhran",
  "Mardan",
  "Multan",
  "Muzaffarabad",
  "Narowal",
  "Nawabshah",
  "Okara",
  "Peshawar",
  "Quetta",
  "Rahim Yar Khan",
  "Rawalpindi",
  "Sahiwal",
  "Sargodha",
  "Sheikhupura",
  "Sialkot",
  "Sukkur",
  "Vehari",
] as const;

export type City = (typeof CITIES)[number];

export const AGRI_SERVICES = [
  "Crop Farming",
  "Livestock & Dairy",
  "Poultry Farming",
  "Horticulture",
  "Fisheries & Aquaculture",
  "Agri Consulting",
  "Soil & Water Testing",
  "Seed Supply",
  "Fertilizer Supply",
  "Pesticide / Agro-chemicals",
  "Irrigation Systems",
  "Cold Chain & Storage",
  "Agri Finance & Insurance",
  "Export & Trading",
  "Farm Machinery",
  "Food Processing",
  "Education & Research",
  "Vet & Animal Health",
] as const;

export type AgriService = (typeof AGRI_SERVICES)[number];

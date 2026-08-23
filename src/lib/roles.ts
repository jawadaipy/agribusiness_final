/**
 * The role capability matrix — the single source of truth for what each
 * account type may do on the platform. Used by the homepage role explorer,
 * member profiles, onboarding, and to gate posting surfaces.
 */
import type { AccountRole } from "@/lib/member";

export interface RoleCapability {
  key: string;
  label: string;
  detail: string;
  icon: string;
  /** Where the member performs this action. */
  surface: string;
}

export interface RoleDefinition {
  id: AccountRole;
  name: string;
  short: string;
  icon: string;
  headline: string;
  /** Top-level listing category slugs this role may post in. Empty = no commercial listings. */
  listingCategories: string[];
  /** Whether this role may publish RFPs / requirements on the projects board. */
  canPostProjects: boolean;
  /** Whether this role may submit consultant proposals. */
  canSubmitProposals: boolean;
  capabilities: RoleCapability[];
}

const FEED = "/feed";
const MARKET = "/apps/agri-biz";
const PROJECTS = "/projects";
const CLINIC_P = "/apps/plant-clinic";
const CLINIC_A = "/apps/animal-clinic";
const SEARCH = "/search";

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: "farmer",
    name: "Farmer / Producer",
    short: "Farmer",
    icon: "agriculture",
    headline: "Sell your harvest directly, post farm needs, and get expert advice.",
    listingCategories: ["crops-grains", "livestock-dairy"],
    canPostProjects: true,
    canSubmitProposals: false,
    capabilities: [
      { key: "sell-produce", label: "Sell produce & livestock lots", detail: "Post grain, fruit, vegetable, cattle, and dairy lots with transparent PKR pricing.", icon: "storefront", surface: MARKET },
      { key: "post-rfp", label: "Post farm requirements", detail: "Tender soil testing, solar conversion, machinery repair, and advisory work.", icon: "engineering", surface: PROJECTS },
      { key: "clinic", label: "Free crop & animal clinics", detail: "Report symptoms with photos; verified agronomists and vets reply.", icon: "psychiatry", surface: CLINIC_P },
      { key: "feed", label: "Field updates & mandi insight", detail: "Share harvest reports and market notes with the whole network.", icon: "dynamic_feed", surface: FEED },
    ],
  },
  {
    id: "buyer",
    name: "Buyer / Trader / Miller",
    short: "Buyer",
    icon: "shopping_cart",
    headline: "Source graded commodities directly from verified producers.",
    listingCategories: ["crops-grains"],
    canPostProjects: true,
    canSubmitProposals: false,
    capabilities: [
      { key: "wanted", label: "Post wanted notices", detail: "Publish commodity demand — volume, grade, and delivery terms.", icon: "campaign", surface: MARKET },
      { key: "buying-rfp", label: "Post procurement tenders", detail: "Tender sourcing, quality inspection, logistics, and export documentation.", icon: "description", surface: PROJECTS },
      { key: "discover", label: "Discover verified producers", detail: "Search the directory by crop, city, and rating; connect with consent.", icon: "search", surface: SEARCH },
      { key: "feed", label: "Market offers to growers", detail: "Publish forward-contract and spot-purchase offers.", icon: "dynamic_feed", surface: FEED },
    ],
  },
  {
    id: "consultant",
    name: "Agronomist / Consultant / Vet",
    short: "Consultant",
    icon: "psychology",
    headline: "Turn field expertise into paid engagements and a public reputation.",
    listingCategories: ["consultancy-services"],
    canPostProjects: false,
    canSubmitProposals: true,
    capabilities: [
      { key: "services", label: "List professional services", detail: "Agronomy, IPM, irrigation, veterinary, and export-compliance services.", icon: "workspace_premium", surface: MARKET },
      { key: "bid", label: "Bid on open RFPs", detail: "Submit technical proposals on farm and enterprise requirements.", icon: "gavel", surface: PROJECTS },
      { key: "clinic", label: "Answer clinic cases", detail: "Diagnose posted crop and livestock cases; flag solutions.", icon: "medical_services", surface: CLINIC_P },
      { key: "feed", label: "Publish advisories", detail: "Season alerts, pest warnings, and practice notes to the network.", icon: "dynamic_feed", surface: FEED },
    ],
  },
  {
    id: "company",
    name: "Enterprise / Supplier",
    short: "Enterprise",
    icon: "domain",
    headline: "Trade inputs and machinery, list company services, and post tenders.",
    listingCategories: ["agri-inputs", "machinery-tech", "solar-energy", "consultancy-services", "crops-grains", "livestock-dairy"],
    canPostProjects: true,
    canSubmitProposals: true,
    capabilities: [
      { key: "catalog", label: "Full commercial catalog", detail: "Inputs, machinery, solar, services, and commodity lots — the widest listing scope.", icon: "inventory_2", surface: MARKET },
      { key: "tenders", label: "Post corporate tenders", detail: "Tender logistics, installations, data programmes, and supply contracts.", icon: "assignment", surface: PROJECTS },
      { key: "hire", label: "Find specialist partners", detail: "Commission consultants and verify suppliers through the directory.", icon: "group_add", surface: SEARCH },
      { key: "advertise", label: "Advertise on the network", detail: "Sponsored placements reviewed by platform moderation.", icon: "campaign", surface: "/dashboard" },
    ],
  },
  {
    id: "student",
    name: "Student / Researcher",
    short: "Researcher",
    icon: "school",
    headline: "Find trials, supervisors, field data partners — and your first byline.",
    listingCategories: [],
    canPostProjects: false,
    canSubmitProposals: false,
    capabilities: [
      { key: "research", label: "Post research requests", detail: "Recruit orchards for trials, sampling, and surveys on the feed.", icon: "science", surface: FEED },
      { key: "clinic", label: "Follow live case studies", detail: "Real diagnoses from working agronomists and vets.", icon: "psychiatry", surface: CLINIC_P },
      { key: "connect", label: "Connect with professionals", detail: "Build a supervisor and industry network with consented connections.", icon: "handshake", surface: SEARCH },
      { key: "profile", label: "Publish a research profile", detail: "Institution, programme, and research interests on your public profile.", icon: "badge", surface: "/profile/me" },
    ],
  },
];

export function roleDefinition(role: string): RoleDefinition | undefined {
  return ROLE_DEFINITIONS.find((r) => r.id === role);
}

/** Can this role publish commercial listings at all? */
export function canPostListings(role: string): boolean {
  return (roleDefinition(role)?.listingCategories.length ?? 0) > 0;
}

/** Filter a category list down to what this role is allowed to post in. */
export function allowedListingCategories(
  role: string,
  categories: { id: string; name: string; slug?: string | null }[],
): { id: string; name: string; slug?: string | null }[] {
  const def = roleDefinition(role);
  if (!def || def.listingCategories.length === 0) return [];
  return categories.filter((c) => def.listingCategories.includes(c.slug ?? ""));
}

/** Human sentence for the listing gate, shown in the composer/modal. */
export function listingScopeSentence(role: string): string {
  const def = roleDefinition(role);
  if (!def) return "";
  if (def.listingCategories.length === 0) {
    return `${def.name} accounts do not post commercial listings — your superpowers are on the feed, clinics, and the directory.`;
  }
  const scope = def.listingCategories.map((slug) => slug.replace(/-/g, " ")).join(", ");
  return `As a ${def.short}, you can post in: ${scope}.`;
}

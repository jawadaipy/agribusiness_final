/**
 * Field Ledger implementation: a secure, operational dashboard surface.
 * Forms use the authenticated profile ID and show only persisted Supabase data.
 * No placeholder records, local auth, fake success, ratings, or exposed contacts.
 */
import { useEffect, useMemo, useState } from "react";
import type { MemberProfile } from "@/lib/member";
import { supabase } from "@/lib/supabase";
import { ConnectionInbox } from "@/components/dashboard/ConnectionInbox";
import { CitySelect } from "@/components/shared/CitySelect";
import { PrimaryActionButton } from "@/components/shared/PrimaryActionButton";
import { AGRI_SERVICES } from "@/lib/constants";

type ListingRecord = {
  id: string;
  title: string;
  price: number | string | null;
  unit: string | null;
  quantity: number | string | null;
  city: string | null;
  status: string;
  created_at: string;
};

type ProjectRecord = {
  id: string;
  title: string;
  description: string;
  budget_min: number | string | null;
  budget_max: number | string | null;
  currency: string;
  deadline: string | null;
  required_skills: string[] | null;
  location: string | null;
  city: string | null;
  is_remote: boolean;
  status: string;
  created_at: string;
};

type OrganizationRecord = {
  id: string;
  legal_name: string;
  display_name: string | null;
  registration_no: string | null;
  website: string | null;
  description: string | null;
  services: string[] | null;
  technologies: string[] | null;
  city: string | null;
  province: string | null;
};

type Tab = "profile" | "publish" | "opportunities" | "connections";

const inputClass =
  "mt-1 w-full rounded-xl border border-outline bg-white px-3 py-2.5 text-xs font-medium text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
const labelClass = "text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-on-primary shadow-[0_8px_20px_rgba(15,81,50,0.16)] transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60";

function splitValues(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 25);
}

function joinValues(value: string[] | null | undefined) {
  return value?.join(", ") ?? "";
}

function toNullableNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatPkr(value: number | string | null) {
  if (value === null || value === undefined || value === "") return "Price on request";
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function SchemaNotice({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-secondary/35 bg-secondary-container p-3 text-xs leading-5 text-on-secondary-container">
      <p className="font-bold">Database setup needed</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

function Notice({ tone, message }: { tone: "success" | "error"; message: string }) {
  return (
    <div
      className={`rounded-xl border p-3 text-xs leading-5 ${tone === "success" ? "border-primary/25 bg-primary/10 text-primary" : "border-error/25 bg-error/10 text-error"}`}
    >
      {message}
    </div>
  );
}

export function WorkspaceWorkbench({ profile }: { profile: MemberProfile }) {
  const isFarmer = profile.user_type === "farmer";
  const isBuyer = profile.user_type === "buyer";
  const isCompany = profile.user_type === "company";
  const isConsultant = profile.user_type === "consultant";
  const isStudent = profile.user_type === "student";

  const initialTab: Tab = isStudent ? "profile" : "publish";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [schemaUnavailable, setSchemaUnavailable] = useState(false);
  const [myListings, setMyListings] = useState<ListingRecord[]>([]);
  const [myProjects, setMyProjects] = useState<ProjectRecord[]>([]);
  const [openProjects, setOpenProjects] = useState<ProjectRecord[]>([]);
  const [organization, setOrganization] = useState<OrganizationRecord | null>(null);

  const [farmerForm, setFarmerForm] = useState({
    farmName: "",
    acreage: "",
    crops: "",
    livestock: "",
    farmLocation: "",
  });
  const [buyerForm, setBuyerForm] = useState({
    organizationName: "",
    commodities: "",
    grades: "",
    procurementRegions: "",
    expectedVolume: "",
    logisticsNotes: "",
  });
  const [consultantForm, setConsultantForm] = useState({
    degree: "",
    yearsExperience: "",
    services: "",
    technologies: "",
    availability: "",
    rateFromPkr: "",
  });
  const [studentForm, setStudentForm] = useState({
    institution: "",
    programme: "",
    degree: "",
    expectedGraduationAt: "",
    researchInterests: "",
    portfolioUrl: "",
  });
  const [organizationForm, setOrganizationForm] = useState({
    legalName: "",
    displayName: "",
    registrationNo: "",
    website: "",
    description: "",
    services: "",
    technologies: "",
    city: profile.city ?? "",
    province: "",
  });
  // editing an existing listing or project (null = create mode)
  const [editingListing, setEditingListing] = useState<ListingRecord | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);

  const [listingForm, setListingForm] = useState({
    title: "",
    description: "",
    price: "",
    unit: "",
    quantity: "",
    location: "",
    city: profile.city ?? "",
    services: [] as string[],
  });
  const [projectForm, setProjectForm] = useState({
    title: "",
    description: "",
    budgetMin: "",
    budgetMax: "",
    deadline: "",
    skills: "",
    location: "",
    city: profile.city ?? "",
    isRemote: false,
    services: [] as string[],
  });
  const [proposalDrafts, setProposalDrafts] = useState<Record<string, { note: string; quote: string }>>({});

  const tabLabels = useMemo(
    () => [
      { id: "profile" as const, label: isCompany ? "Company profile" : "My profile", icon: "account_circle" },
      {
        id: "publish" as const,
        label: isBuyer ? "Buying requirements" : isFarmer ? "My produce" : isConsultant ? "My services" : isCompany ? "Publish" : "Portfolio",
        icon: isBuyer ? "shopping_cart" : isCompany ? "add_business" : "inventory_2",
      },
      {
        id: "opportunities" as const,
        label: isBuyer ? "Supply opportunities" : isFarmer ? "Farm needs" : isConsultant ? "Projects" : isCompany ? "My opportunities" : "Find opportunities",
        icon: "work",
      },
      { id: "connections" as const, label: "Connections", icon: "group_add" },
    ],
    [isBuyer, isCompany, isConsultant, isFarmer],
  );

  const loadWorkspace = async () => {
    setLoading(true);
    setSchemaUnavailable(false);
    setError("");

    const [listingsResult, projectsResult] = await Promise.all([
      supabase
        .from("listings")
        .select("id,title,price,unit,quantity,city,status,created_at")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("projects")
        .select("id,title,description,budget_min,budget_max,currency,deadline,required_skills,location,city,is_remote,status,created_at")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false }),
    ]);

    if (listingsResult.error || projectsResult.error) {
      setError(listingsResult.error?.message || projectsResult.error?.message || "Could not load your records.");
    }
    setMyListings((listingsResult.data ?? []) as ListingRecord[]);
    setMyProjects((projectsResult.data ?? []) as ProjectRecord[]);

    if (isFarmer) {
      const { data, error: detailError } = await supabase
        .from("farmer_profiles")
        .select("farm_name,acreage,crops,livestock,farm_location")
        .eq("profile_id", profile.id)
        .maybeSingle();
      if (detailError) {
        setSchemaUnavailable(true);
      } else if (data) {
        setFarmerForm({
          farmName: data.farm_name ?? "",
          acreage: data.acreage?.toString() ?? "",
          crops: joinValues(data.crops),
          livestock: joinValues(data.livestock),
          farmLocation: data.farm_location ?? "",
        });
      }
    }

    if (isBuyer) {
      const { data, error: detailError } = await supabase
        .from("buyer_profiles")
        .select("organization_name,commodities,grades,procurement_regions,expected_volume,logistics_notes")
        .eq("profile_id", profile.id)
        .maybeSingle();
      if (detailError) {
        setSchemaUnavailable(true);
      } else if (data) {
        setBuyerForm({
          organizationName: data.organization_name ?? "",
          commodities: joinValues(data.commodities),
          grades: joinValues(data.grades),
          procurementRegions: joinValues(data.procurement_regions),
          expectedVolume: data.expected_volume ?? "",
          logisticsNotes: data.logistics_notes ?? "",
        });
      }
    }

    if (isConsultant) {
      const [detailResult, opportunitiesResult] = await Promise.all([
        supabase
          .from("consultant_profiles")
          .select("degree,years_experience,services,technologies,availability,rate_from_pkr")
          .eq("profile_id", profile.id)
          .maybeSingle(),
        supabase
          .from("projects")
          .select("id,title,description,budget_min,budget_max,currency,deadline,required_skills,location,city,is_remote,status,created_at")
          .eq("status", "open")
          .neq("profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(12),
      ]);
      if (detailResult.error) {
        setSchemaUnavailable(true);
      } else if (detailResult.data) {
        const data = detailResult.data;
        setConsultantForm({
          degree: data.degree ?? "",
          yearsExperience: data.years_experience?.toString() ?? "",
          services: joinValues(data.services),
          technologies: joinValues(data.technologies),
          availability: data.availability ?? "",
          rateFromPkr: data.rate_from_pkr?.toString() ?? "",
        });
      }
      if (!opportunitiesResult.error) setOpenProjects((opportunitiesResult.data ?? []) as ProjectRecord[]);
    }

    if (isStudent) {
      const [detailResult, opportunitiesResult] = await Promise.all([
        supabase
          .from("student_profiles")
          .select("institution,programme,degree,expected_graduation_at,research_interests,portfolio_url")
          .eq("profile_id", profile.id)
          .maybeSingle(),
        supabase
          .from("projects")
          .select("id,title,description,budget_min,budget_max,currency,deadline,required_skills,location,city,is_remote,status,created_at")
          .eq("status", "open")
          .neq("profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(12),
      ]);
      if (detailResult.error) {
        setSchemaUnavailable(true);
      } else if (detailResult.data) {
        const data = detailResult.data;
        setStudentForm({
          institution: data.institution ?? "",
          programme: data.programme ?? "",
          degree: data.degree ?? "",
          expectedGraduationAt: data.expected_graduation_at ?? "",
          researchInterests: joinValues(data.research_interests),
          portfolioUrl: data.portfolio_url ?? "",
        });
      }
      if (!opportunitiesResult.error) setOpenProjects((opportunitiesResult.data ?? []) as ProjectRecord[]);
    }

    if (isCompany) {
      const { data, error: organizationError } = await supabase
        .from("organizations")
        .select("id,legal_name,display_name,registration_no,website,description,services,technologies,city,province")
        .eq("owner_profile_id", profile.id)
        .maybeSingle();
      if (organizationError) {
        setSchemaUnavailable(true);
      } else if (data) {
        const organizationData = data as OrganizationRecord;
        setOrganization(organizationData);
        setOrganizationForm({
          legalName: organizationData.legal_name ?? "",
          displayName: organizationData.display_name ?? "",
          registrationNo: organizationData.registration_no ?? "",
          website: organizationData.website ?? "",
          description: organizationData.description ?? "",
          services: joinValues(organizationData.services),
          technologies: joinValues(organizationData.technologies),
          city: organizationData.city ?? profile.city ?? "",
          province: organizationData.province ?? "",
        });
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadWorkspace();
  }, [profile.id]);

  const submit = async (action: () => Promise<{ error: { message: string } | null }>, successMessage: string) => {
    setSubmitting(true);
    setError("");
    setSuccess("");
    const { error: submitError } = await action();
    if (submitError) {
      setError(submitError.message);
    } else {
      setSuccess(successMessage);
      await loadWorkspace();
    }
    setSubmitting(false);
  };

  const saveRoleProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isFarmer) {
      await submit(
        () =>
          supabase.from("farmer_profiles").upsert(
            {
              profile_id: profile.id,
              farm_name: farmerForm.farmName.trim() || null,
              acreage: toNullableNumber(farmerForm.acreage),
              crops: splitValues(farmerForm.crops),
              livestock: splitValues(farmerForm.livestock),
              farm_location: farmerForm.farmLocation.trim() || null,
            },
            { onConflict: "profile_id" },
          ),
        "Farm profile saved securely.",
      );
      return;
    }
    if (isBuyer) {
      await submit(
        () =>
          supabase.from("buyer_profiles").upsert(
            {
              profile_id: profile.id,
              organization_name: buyerForm.organizationName.trim() || null,
              commodities: splitValues(buyerForm.commodities),
              grades: splitValues(buyerForm.grades),
              procurement_regions: splitValues(buyerForm.procurementRegions),
              expected_volume: buyerForm.expectedVolume.trim() || null,
              logistics_notes: buyerForm.logisticsNotes.trim() || null,
            },
            { onConflict: "profile_id" },
          ),
        "Procurement profile saved securely.",
      );
      return;
    }
    if (isConsultant) {
      await submit(
        () =>
          supabase.from("consultant_profiles").upsert(
            {
              profile_id: profile.id,
              degree: consultantForm.degree.trim() || null,
              years_experience: toNullableNumber(consultantForm.yearsExperience),
              services: splitValues(consultantForm.services),
              technologies: splitValues(consultantForm.technologies),
              availability: consultantForm.availability.trim() || null,
              rate_from_pkr: toNullableNumber(consultantForm.rateFromPkr),
            },
            { onConflict: "profile_id" },
          ),
        "Professional profile saved. Verification status remains administrator-controlled.",
      );
      return;
    }
    if (isStudent) {
      await submit(
        () =>
          supabase.from("student_profiles").upsert(
            {
              profile_id: profile.id,
              institution: studentForm.institution.trim() || null,
              programme: studentForm.programme.trim() || null,
              degree: studentForm.degree.trim() || null,
              expected_graduation_at: studentForm.expectedGraduationAt || null,
              research_interests: splitValues(studentForm.researchInterests),
              portfolio_url: studentForm.portfolioUrl.trim() || null,
            },
            { onConflict: "profile_id" },
          ),
        "Academic profile saved securely.",
      );
    }
  };

  const saveOrganization = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!organizationForm.legalName.trim()) {
      setError("A legal organization name is required before saving the company profile.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    const payload = {
      legal_name: organizationForm.legalName.trim(),
      display_name: organizationForm.displayName.trim() || null,
      registration_no: organizationForm.registrationNo.trim() || null,
      website: organizationForm.website.trim() || null,
      description: organizationForm.description.trim() || null,
      services: splitValues(organizationForm.services),
      technologies: splitValues(organizationForm.technologies),
      city: organizationForm.city.trim() || null,
      province: organizationForm.province.trim() || null,
    };
    const result = organization
      ? await supabase.from("organizations").update(payload).eq("id", organization.id)
      : await supabase
          .from("organizations")
          .insert({ ...payload, owner_profile_id: profile.id })
          .select("id")
          .single();

    if (result.error) {
      setError(result.error.message);
      setSubmitting(false);
      return;
    }
    if (!organization && "data" in result && result.data?.id) {
      const membershipResult = await supabase.from("organization_members").insert({
        organization_id: result.data.id,
        profile_id: profile.id,
        member_role: "owner",
      });
      if (membershipResult.error) {
        setError(`Company profile created, but its owner membership could not be recorded: ${membershipResult.error.message}`);
        setSubmitting(false);
        return;
      }
    }
    setSuccess("Company profile saved. You are recorded as the accountable organization owner.");
    setSubmitting(false);
    await loadWorkspace();
  };

  const saveListing = async (status: "active" | "draft") => {
    if (listingForm.title.trim().length < 3) {
      setError("Use a clear product or service title of at least three characters.");
      return;
    }
    const payload = {
      profile_id: profile.id,
      title: listingForm.title.trim(),
      description: listingForm.description.trim() || null,
      price: toNullableNumber(listingForm.price),
      unit: listingForm.unit.trim() || null,
      quantity: toNullableNumber(listingForm.quantity),
      location: listingForm.location.trim() || null,
      city: listingForm.city || null,
      services: listingForm.services.length ? listingForm.services : null,
      status,
    };
    if (editingListing) {
      await submit(
        () => supabase.from("listings").update(payload).eq("id", editingListing.id),
        status === "draft" ? "Draft saved." : "Listing updated and published.",
      );
      setEditingListing(null);
    } else {
      await submit(
        () => supabase.from("listings").insert(payload),
        status === "draft" ? "Saved as draft." : isFarmer ? "Your producer listing is now live." : "Your service listing is now live.",
      );
    }
    setListingForm({ title: "", description: "", price: "", unit: "", quantity: "", location: "", city: profile.city ?? "", services: [] });
  };

  const startEditListing = (listing: ListingRecord) => {
    setEditingListing(listing);
    setListingForm({
      title: listing.title,
      description: "",
      price: listing.price !== null ? String(listing.price) : "",
      unit: listing.unit ?? "",
      quantity: listing.quantity !== null ? String(listing.quantity) : "",
      location: "",
      city: listing.city ?? "",
      services: [],
    });
    setTab("publish");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteListing = async (id: string) => {
    if (!window.confirm("Delete this listing permanently?")) return;
    await submit(
      () => supabase.from("listings").delete().eq("id", id),
      "Listing deleted.",
    );
  };

  const saveProject = async (status: "open" | "draft") => {
    if (projectForm.title.trim().length < 5 || projectForm.description.trim().length < 5) {
      setError("Provide a concise title and a clear requirement description before publishing.");
      return;
    }
    const budgetMin = toNullableNumber(projectForm.budgetMin);
    const budgetMax = toNullableNumber(projectForm.budgetMax);
    if (budgetMin !== null && budgetMax !== null && budgetMax < budgetMin) {
      setError("Maximum budget cannot be lower than minimum budget.");
      return;
    }
    const payload = {
      profile_id: profile.id,
      title: projectForm.title.trim(),
      description: projectForm.description.trim(),
      budget_min: budgetMin,
      budget_max: budgetMax,
      deadline: projectForm.deadline || null,
      required_skills: splitValues(projectForm.skills),
      location: projectForm.location.trim() || null,
      city: projectForm.city || null,
      services: projectForm.services.length ? projectForm.services : null,
      is_remote: projectForm.isRemote,
      status,
    };
    if (editingProject) {
      await submit(
        () => supabase.from("projects").update(payload).eq("id", editingProject.id),
        status === "draft" ? "Draft saved." : "Opportunity updated and published.",
      );
      setEditingProject(null);
    } else {
      await submit(
        () => supabase.from("projects").insert(payload),
        status === "draft" ? "Saved as draft." : isCompany ? "Opportunity published." : isBuyer ? "Buying requirement published." : "Farm need published.",
      );
    }
    setProjectForm({ title: "", description: "", budgetMin: "", budgetMax: "", deadline: "", skills: "", location: "", city: profile.city ?? "", isRemote: false, services: [] });
  };

  const startEditProject = (project: ProjectRecord) => {
    setEditingProject(project);
    setProjectForm({
      title: project.title,
      description: project.description ?? "",
      budgetMin: project.budget_min !== null ? String(project.budget_min) : "",
      budgetMax: project.budget_max !== null ? String(project.budget_max) : "",
      deadline: project.deadline ?? "",
      skills: joinValues(project.required_skills),
      location: project.location ?? "",
      city: project.city ?? "",
      isRemote: project.is_remote,
      services: [],
    });
    setTab("opportunities");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteProject = async (id: string) => {
    if (!window.confirm("Delete this opportunity permanently?")) return;
    await submit(
      () => supabase.from("projects").delete().eq("id", id),
      "Opportunity deleted.",
    );
  };

  const submitProposal = async (projectId: string) => {
    const draft = proposalDrafts[projectId] ?? { note: "", quote: "" };
    if (draft.note.trim().length < 20) {
      setError("Write at least 20 characters explaining why your expertise fits this project.");
      return;
    }
    await submit(
      () =>
        supabase.from("project_proposals").insert({
          project_id: projectId,
          profile_id: profile.id,
          cover_note: draft.note.trim(),
          quoted_amount: toNullableNumber(draft.quote),
        }),
      "Proposal submitted. Only you and the project owner can view it.",
    );
  };

  const renderRoleProfile = () => {
    if (isCompany) {
      return (
        <form onSubmit={saveOrganization} className="grid gap-4 md:grid-cols-2">
          <Field label="Legal organization name" required>
            <input required value={organizationForm.legalName} onChange={(e) => setOrganizationForm({ ...organizationForm, legalName: e.target.value })} className={inputClass} placeholder="Registered legal name" />
          </Field>
          <Field label="Public display name">
            <input value={organizationForm.displayName} onChange={(e) => setOrganizationForm({ ...organizationForm, displayName: e.target.value })} className={inputClass} placeholder="Brand or public name" />
          </Field>
          <Field label="Registration reference">
            <input value={organizationForm.registrationNo} onChange={(e) => setOrganizationForm({ ...organizationForm, registrationNo: e.target.value })} className={inputClass} placeholder="Optional internal verification reference" />
          </Field>
          <Field label="Website">
            <input type="url" value={organizationForm.website} onChange={(e) => setOrganizationForm({ ...organizationForm, website: e.target.value })} className={inputClass} placeholder="https://example.com" />
          </Field>
          <Field label="City">
            <CitySelect value={organizationForm.city} onChange={(c) => setOrganizationForm({ ...organizationForm, city: c })} />
          </Field>
          <Field label="Province">
            <input value={organizationForm.province} onChange={(e) => setOrganizationForm({ ...organizationForm, province: e.target.value })} className={inputClass} placeholder="Province" />
          </Field>
          <Field label="Services" className="md:col-span-2" help="Separate services with commas.">
            <input value={organizationForm.services} onChange={(e) => setOrganizationForm({ ...organizationForm, services: e.target.value })} className={inputClass} placeholder="Seed distribution, crop logistics, agri-finance" />
          </Field>
          <Field label="Technologies" className="md:col-span-2" help="Separate technologies with commas.">
            <input value={organizationForm.technologies} onChange={(e) => setOrganizationForm({ ...organizationForm, technologies: e.target.value })} className={inputClass} placeholder="Drip irrigation, cold chain, remote sensing" />
          </Field>
          <Field label="Public description" className="md:col-span-2">
            <textarea value={organizationForm.description} onChange={(e) => setOrganizationForm({ ...organizationForm, description: e.target.value })} className={`${inputClass} min-h-28 resize-y`} placeholder="Describe the organization, service coverage, and the value it provides." />
          </Field>
          <div className="md:col-span-2"><button disabled={submitting} className={buttonClass}>{submitting ? "Saving…" : organization ? "Save company profile" : "Create company profile"}</button></div>
        </form>
      );
    }

    if (isFarmer) {
      return (
        <form onSubmit={saveRoleProfile} className="grid gap-4 md:grid-cols-2">
          <Field label="Farm name"><input value={farmerForm.farmName} onChange={(e) => setFarmerForm({ ...farmerForm, farmName: e.target.value })} className={inputClass} placeholder="Farm or enterprise name" /></Field>
          <Field label="Acreage"><input type="number" min="0" step="0.01" value={farmerForm.acreage} onChange={(e) => setFarmerForm({ ...farmerForm, acreage: e.target.value })} className={inputClass} placeholder="e.g. 25" /></Field>
          <Field label="Crops" help="Separate crops with commas."><input value={farmerForm.crops} onChange={(e) => setFarmerForm({ ...farmerForm, crops: e.target.value })} className={inputClass} placeholder="Wheat, rice, maize" /></Field>
          <Field label="Livestock" help="Optional; separate with commas."><input value={farmerForm.livestock} onChange={(e) => setFarmerForm({ ...farmerForm, livestock: e.target.value })} className={inputClass} placeholder="Dairy cattle, poultry" /></Field>
          <Field label="Farm location" className="md:col-span-2"><input value={farmerForm.farmLocation} onChange={(e) => setFarmerForm({ ...farmerForm, farmLocation: e.target.value })} className={inputClass} placeholder="Village, tehsil, district" /></Field>
          <div className="md:col-span-2"><button disabled={submitting} className={buttonClass}>{submitting ? "Saving…" : "Save farm profile"}</button></div>
        </form>
      );
    }

    if (isBuyer) {
      return (
        <form onSubmit={saveRoleProfile} className="grid gap-4 md:grid-cols-2">
          <Field label="Buyer, trader, or mill name"><input value={buyerForm.organizationName} onChange={(e) => setBuyerForm({ ...buyerForm, organizationName: e.target.value })} className={inputClass} placeholder="Business or procurement desk name" /></Field>
          <Field label="Expected volume"><input value={buyerForm.expectedVolume} onChange={(e) => setBuyerForm({ ...buyerForm, expectedVolume: e.target.value })} className={inputClass} placeholder="e.g. 500 MT monthly" /></Field>
          <Field label="Commodities" help="Separate commodities with commas."><input value={buyerForm.commodities} onChange={(e) => setBuyerForm({ ...buyerForm, commodities: e.target.value })} className={inputClass} placeholder="Wheat, maize, paddy" /></Field>
          <Field label="Grades or specifications" help="Separate grades/specifications with commas."><input value={buyerForm.grades} onChange={(e) => setBuyerForm({ ...buyerForm, grades: e.target.value })} className={inputClass} placeholder="Grade A, moisture below 12%, export quality" /></Field>
          <Field label="Procurement regions" className="md:col-span-2" help="Separate collection regions with commas."><input value={buyerForm.procurementRegions} onChange={(e) => setBuyerForm({ ...buyerForm, procurementRegions: e.target.value })} className={inputClass} placeholder="Faisalabad, Sargodha, Multan" /></Field>
          <Field label="Logistics and collection notes" className="md:col-span-2"><textarea value={buyerForm.logisticsNotes} onChange={(e) => setBuyerForm({ ...buyerForm, logisticsNotes: e.target.value })} className={`${inputClass} min-h-28 resize-y`} placeholder="Collection point, weighbridge, delivery timing, packaging, or logistics requirements." /></Field>
          <div className="md:col-span-2"><button disabled={submitting} className={buttonClass}>{submitting ? "Saving…" : "Save procurement profile"}</button></div>
        </form>
      );
    }

    if (isConsultant) {
      return (
        <form onSubmit={saveRoleProfile} className="grid gap-4 md:grid-cols-2">
          <Field label="Degree"><input value={consultantForm.degree} onChange={(e) => setConsultantForm({ ...consultantForm, degree: e.target.value })} className={inputClass} placeholder="e.g. MSc Agronomy" /></Field>
          <Field label="Years of experience"><input type="number" min="0" value={consultantForm.yearsExperience} onChange={(e) => setConsultantForm({ ...consultantForm, yearsExperience: e.target.value })} className={inputClass} placeholder="e.g. 8" /></Field>
          <Field label="Services" help="Separate services with commas."><input value={consultantForm.services} onChange={(e) => setConsultantForm({ ...consultantForm, services: e.target.value })} className={inputClass} placeholder="Soil testing, crop planning, irrigation" /></Field>
          <Field label="Technologies" help="Separate technologies with commas."><input value={consultantForm.technologies} onChange={(e) => setConsultantForm({ ...consultantForm, technologies: e.target.value })} className={inputClass} placeholder="GIS, sensors, greenhouses" /></Field>
          <Field label="Availability"><input value={consultantForm.availability} onChange={(e) => setConsultantForm({ ...consultantForm, availability: e.target.value })} className={inputClass} placeholder="e.g. Remote + Punjab field visits" /></Field>
          <Field label="Starting rate (PKR)"><input type="number" min="0" value={consultantForm.rateFromPkr} onChange={(e) => setConsultantForm({ ...consultantForm, rateFromPkr: e.target.value })} className={inputClass} placeholder="Optional" /></Field>
          <div className="md:col-span-2"><button disabled={submitting} className={buttonClass}>{submitting ? "Saving…" : "Save professional profile"}</button></div>
        </form>
      );
    }

    return (
      <form onSubmit={saveRoleProfile} className="grid gap-4 md:grid-cols-2">
        <Field label="Institution"><input value={studentForm.institution} onChange={(e) => setStudentForm({ ...studentForm, institution: e.target.value })} className={inputClass} placeholder="University or research institute" /></Field>
        <Field label="Programme"><input value={studentForm.programme} onChange={(e) => setStudentForm({ ...studentForm, programme: e.target.value })} className={inputClass} placeholder="e.g. BS Agriculture" /></Field>
        <Field label="Degree"><input value={studentForm.degree} onChange={(e) => setStudentForm({ ...studentForm, degree: e.target.value })} className={inputClass} placeholder="Current or completed degree" /></Field>
        <Field label="Expected graduation"><input type="date" value={studentForm.expectedGraduationAt} onChange={(e) => setStudentForm({ ...studentForm, expectedGraduationAt: e.target.value })} className={inputClass} /></Field>
        <Field label="Research interests" className="md:col-span-2" help="Separate interests with commas."><input value={studentForm.researchInterests} onChange={(e) => setStudentForm({ ...studentForm, researchInterests: e.target.value })} className={inputClass} placeholder="Soil health, post-harvest, precision agriculture" /></Field>
        <Field label="Public portfolio link" className="md:col-span-2"><input type="url" value={studentForm.portfolioUrl} onChange={(e) => setStudentForm({ ...studentForm, portfolioUrl: e.target.value })} className={inputClass} placeholder="https://..." /></Field>
        <div className="md:col-span-2"><button disabled={submitting} className={buttonClass}>{submitting ? "Saving…" : "Save academic profile"}</button></div>
      </form>
    );
  };

  const renderListingForm = () => (
    <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low p-5">
      <h3 className="mb-4 font-display text-lg text-primary">
        {editingListing ? "Edit listing" : isFarmer ? "New produce listing" : "New product or service"}
      </h3>
      <form
        onSubmit={(e) => { e.preventDefault(); void saveListing("active"); }}
        className="grid gap-4 md:grid-cols-2"
      >
        <Field label={isFarmer ? "Product / commodity title" : "Product or service title"} required>
          <input required value={listingForm.title} onChange={(e) => setListingForm({ ...listingForm, title: e.target.value })} className={inputClass} placeholder={isFarmer ? "e.g. Fresh wheat, 2026 harvest" : "e.g. Precision irrigation design service"} />
        </Field>
        <Field label="City" required>
          <CitySelect required value={listingForm.city} onChange={(c) => setListingForm({ ...listingForm, city: c })} />
        </Field>
        <Field label="Price (PKR)" help="Leave blank if price is on request.">
          <input min="0" type="number" value={listingForm.price} onChange={(e) => setListingForm({ ...listingForm, price: e.target.value })} className={inputClass} placeholder="e.g. 4500" />
        </Field>
        <Field label="Unit">
          <input value={listingForm.unit} onChange={(e) => setListingForm({ ...listingForm, unit: e.target.value })} className={inputClass} placeholder="e.g. per 40kg, per acre, per visit" />
        </Field>
        <Field label="Available quantity">
          <input min="0" type="number" value={listingForm.quantity} onChange={(e) => setListingForm({ ...listingForm, quantity: e.target.value })} className={inputClass} placeholder="Optional" />
        </Field>
        <Field label="Location" help="Mandi, district, or service area">
          <input value={listingForm.location} onChange={(e) => setListingForm({ ...listingForm, location: e.target.value })} className={inputClass} placeholder="e.g. Sargodha Fruit Market" />
        </Field>
        <Field label="Description" className="md:col-span-2">
          <textarea value={listingForm.description} onChange={(e) => setListingForm({ ...listingForm, description: e.target.value })} className={`${inputClass} min-h-28 resize-y`} placeholder="State the product condition, grade, availability, or service scope." />
        </Field>
        {/* Services offered */}
        <fieldset className="md:col-span-2">
          <legend className={labelClass}>Services / categories (choose all that apply)</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {AGRI_SERVICES.map((s) => (
              <label key={s} className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-outline-variant/60 bg-white px-3 py-2 text-xs font-medium text-primary transition hover:bg-primary/5">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-primary"
                  checked={listingForm.services.includes(s)}
                  onChange={(e) =>
                    setListingForm({
                      ...listingForm,
                      services: e.target.checked
                        ? [...listingForm.services, s]
                        : listingForm.services.filter((v) => v !== s),
                    })
                  }
                />
                {s}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex items-center gap-3 md:col-span-2">
          <PrimaryActionButton
            publishLabel={editingListing ? "Update & publish" : isFarmer ? "Publish produce listing" : "Publish listing"}
            draftLabel="Save as draft"
            loading={submitting}
            onPublish={() => void saveListing("active")}
            onDraft={() => void saveListing("draft")}
          />
          {editingListing && (
            <button
              type="button"
              onClick={() => { setEditingListing(null); setListingForm({ title: "", description: "", price: "", unit: "", quantity: "", location: "", city: profile.city ?? "", services: [] }); }}
              className="control-secondary rounded-xl px-4 py-3 text-xs font-bold"
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>
    </div>
  );

  const renderProjectForm = () => (
    <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low p-5">
      <h3 className="mb-4 font-display text-lg text-primary">
        {editingProject ? "Edit opportunity" : isBuyer ? "New buying requirement" : isCompany ? "New opportunity / RFP" : "New farm need"}
      </h3>
      <form
        onSubmit={(e) => { e.preventDefault(); void saveProject("open"); }}
        className="grid gap-4 md:grid-cols-2"
      >
        <Field label={isBuyer ? "Buying requirement title" : isCompany ? "Opportunity / RFP title" : "Farm need title"} required>
          <input required value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} className={inputClass} placeholder={isBuyer ? "e.g. Procurement: Grade A wheat, 500 MT" : isCompany ? "e.g. Irrigation efficiency assessment" : "e.g. Need a drip irrigation consultant"} />
        </Field>
        <Field label="Deadline">
          <input type="date" value={projectForm.deadline} onChange={(e) => setProjectForm({ ...projectForm, deadline: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Minimum budget (PKR)">
          <input min="0" type="number" value={projectForm.budgetMin} onChange={(e) => setProjectForm({ ...projectForm, budgetMin: e.target.value })} className={inputClass} placeholder="Optional" />
        </Field>
        <Field label="Maximum budget (PKR)">
          <input min="0" type="number" value={projectForm.budgetMax} onChange={(e) => setProjectForm({ ...projectForm, budgetMax: e.target.value })} className={inputClass} placeholder="Optional" />
        </Field>
        <Field label={isBuyer ? "Commodity, grade, or logistics tags" : "Required skills"} className="md:col-span-2" help="Separate entries with commas.">
          <input value={projectForm.skills} onChange={(e) => setProjectForm({ ...projectForm, skills: e.target.value })} className={inputClass} placeholder={isBuyer ? "Wheat, Grade A, 12% moisture, Punjab collection" : "Agronomy, soil testing, cold-chain logistics"} />
        </Field>
        <Field label="City" required>
          <CitySelect required value={projectForm.city} onChange={(c) => setProjectForm({ ...projectForm, city: c })} />
        </Field>
        <Field label="Location" help="Site, district, or service area">
          <input value={projectForm.location} onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })} className={inputClass} placeholder="e.g. Faisalabad Industrial Estate" />
        </Field>
        {!isBuyer ? (
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-on-surface-variant md:col-span-2">
            <input type="checkbox" checked={projectForm.isRemote} onChange={(e) => setProjectForm({ ...projectForm, isRemote: e.target.checked })} className="h-4 w-4 rounded border-outline text-primary" />
            Remote or hybrid work is possible
          </label>
        ) : null}
        <Field label={isBuyer ? "Buying requirement details" : "Requirement description"} className="md:col-span-2" required>
          <textarea required value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} className={`${inputClass} min-h-32 resize-y`} placeholder={isBuyer ? "State commodity, quantity, grade, collection area, delivery timing, payment terms." : "Describe the outcome, context, deliverables, and how applicants should frame their proposal."} />
        </Field>
        {/* Services tags */}
        <fieldset className="md:col-span-2">
          <legend className={labelClass}>Services / categories (choose all that apply)</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {AGRI_SERVICES.map((s) => (
              <label key={s} className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-outline-variant/60 bg-white px-3 py-2 text-xs font-medium text-primary transition hover:bg-primary/5">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-primary"
                  checked={projectForm.services.includes(s)}
                  onChange={(e) =>
                    setProjectForm({
                      ...projectForm,
                      services: e.target.checked
                        ? [...projectForm.services, s]
                        : projectForm.services.filter((v) => v !== s),
                    })
                  }
                />
                {s}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex items-center gap-3 md:col-span-2">
          <PrimaryActionButton
            publishLabel={editingProject ? "Update & publish" : isBuyer ? "Publish buying requirement" : isCompany ? "Publish opportunity" : "Publish farm need"}
            draftLabel="Save as draft"
            loading={submitting}
            onPublish={() => void saveProject("open")}
            onDraft={() => void saveProject("draft")}
          />
          {editingProject && (
            <button
              type="button"
              onClick={() => { setEditingProject(null); setProjectForm({ title: "", description: "", budgetMin: "", budgetMax: "", deadline: "", skills: "", location: "", city: profile.city ?? "", isRemote: false, services: [] }); }}
              className="control-secondary rounded-xl px-4 py-3 text-xs font-bold"
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>
    </div>
  );

  const renderListings = () => (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-xl text-primary">My listings</h3>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">{myListings.length} total</span>
      </div>
      {myListings.length === 0 ? (
        <p className="rounded-xl border border-dashed border-outline bg-surface-container-low p-4 text-xs leading-5 text-on-surface-variant">
          No listing yet. Use the form above to publish or save a draft.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {myListings.map((listing) => (
            <article key={listing.id} className="rounded-xl border border-outline-variant bg-white p-4">
              <div className="flex justify-between gap-3">
                <h4 className="text-sm font-bold text-primary">{listing.title}</h4>
                <span
                  className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${
                    listing.status === "draft"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {listing.status === "draft" ? "Draft" : listing.status}
                </span>
              </div>
              <p className="mt-2 text-sm font-bold text-primary">
                {formatPkr(listing.price)}{" "}
                {listing.unit ? <span className="text-[10px] font-medium text-on-surface-variant">/ {listing.unit}</span> : null}
              </p>
              <p className="mt-1 text-[11px] text-on-surface-variant">
                {listing.quantity !== null ? `${listing.quantity} available · ` : ""}
                {listing.city || "City not set"}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => startEditListing(listing)}
                  className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/60 px-2.5 py-1.5 text-[10px] font-bold text-primary transition hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[13px]">edit</span> Edit
                </button>
                <button
                  type="button"
                  onClick={() => void deleteListing(listing.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-error/30 px-2.5 py-1.5 text-[10px] font-bold text-error transition hover:bg-error/10"
                >
                  <span className="material-symbols-outlined text-[13px]">delete</span> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );

  const renderMyProjects = () => (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-xl text-primary">My opportunities</h3>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">{myProjects.length} total</span>
      </div>
      {myProjects.length === 0 ? (
        <p className="rounded-xl border border-dashed border-outline bg-surface-container-low p-4 text-xs leading-5 text-on-surface-variant">
          No opportunity or RFP yet. Use the form above to publish or save a draft.
        </p>
      ) : (
        <div className="space-y-3">
          {myProjects.map((project) => (
            <article key={project.id} className="rounded-xl border border-outline-variant bg-white p-4">
              <div className="flex justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-primary">{project.title}</h4>
                  <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">{project.description}</p>
                </div>
                <span
                  className={`h-fit rounded-full px-2 py-1 text-[9px] font-bold uppercase ${
                    project.status === "draft"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {project.status === "draft" ? "Draft" : project.status}
                </span>
              </div>
              <p className="mt-3 text-[11px] font-medium text-on-surface-variant">
                {project.budget_min !== null || project.budget_max !== null
                  ? `${formatPkr(project.budget_min)} – ${formatPkr(project.budget_max)}`
                  : "Budget on request"}
                {project.deadline
                  ? ` · Deadline ${new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short" }).format(new Date(project.deadline))}`
                  : ""}
                {project.city ? ` · ${project.city}` : ""}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => startEditProject(project)}
                  className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/60 px-2.5 py-1.5 text-[10px] font-bold text-primary transition hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[13px]">edit</span> Edit
                </button>
                <button
                  type="button"
                  onClick={() => void deleteProject(project.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-error/30 px-2.5 py-1.5 text-[10px] font-bold text-error transition hover:bg-error/10"
                >
                  <span className="material-symbols-outlined text-[13px]">delete</span> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );

  const renderOpenProjects = () => (
    <div className="space-y-4">{openProjects.length === 0 ? <p className="rounded-xl border border-dashed border-outline bg-surface-container-low p-4 text-xs leading-5 text-on-surface-variant">No relevant open projects are available right now. Your saved profile fields will support more relevant matching when the next opportunity is published.</p> : openProjects.map((project) => { const draft = proposalDrafts[project.id] ?? { note: "", quote: "" }; return <article key={project.id} className="rounded-2xl border border-outline-variant bg-white p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><h3 className="font-display text-xl text-primary">{project.title}</h3><p className="mt-2 text-xs leading-5 text-on-surface-variant">{project.description}</p></div><span className="h-fit rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">Open</span></div><p className="mt-4 text-[11px] font-semibold text-on-surface-variant">{project.required_skills?.length ? `Skills: ${project.required_skills.join(", ")} · ` : ""}{project.city || project.location || "Pakistan"}{project.is_remote ? " · Remote possible" : ""}</p>{isConsultant ? <div className="mt-5 grid gap-3 border-t border-outline-variant pt-4 md:grid-cols-[1fr_180px_auto]"><textarea value={draft.note} onChange={(e) => setProposalDrafts({ ...proposalDrafts, [project.id]: { ...draft, note: e.target.value } })} className={`${inputClass} mt-0 min-h-24 resize-y`} placeholder="Briefly explain your fit, proposed approach, and relevant experience (minimum 20 characters)." /><input type="number" min="0" value={draft.quote} onChange={(e) => setProposalDrafts({ ...proposalDrafts, [project.id]: { ...draft, quote: e.target.value } })} className={`${inputClass} mt-0 h-fit`} placeholder="Quote in PKR (optional)" /><button type="button" disabled={submitting} onClick={() => void submitProposal(project.id)} className={`${buttonClass} h-fit`}>{submitting ? "Sending…" : "Submit proposal"}</button></div> : <p className="mt-4 rounded-xl bg-surface-container-low p-3 text-[11px] leading-5 text-on-surface-variant">This is an open opportunity. Use a connection request to introduce your academic profile; formal consultant proposals are restricted to Consultant accounts.</p>}</article>; })}</div>
  );

  if (loading) return <div className="rounded-2xl border border-outline-variant bg-white p-6 text-xs text-on-surface-variant">Loading your secure workspace records…</div>;

  return (
    <section className="rounded-2xl border border-outline-variant bg-white p-5 shadow-[0_10px_28px_rgba(15,81,50,0.08)] md:p-7">
      <div className="flex flex-col justify-between gap-4 border-b border-outline-variant pb-5 md:flex-row md:items-end">
        <div><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">Operational workspace</p><h2 className="mt-1 font-display text-2xl text-primary">Create records that belong to your account</h2><p className="mt-2 max-w-2xl text-[11px] leading-5 text-on-surface-variant">Each action is saved through the signed-in Supabase account and is still constrained by role-specific database policies.</p></div>
        <button type="button" onClick={() => void loadWorkspace()} className="control-secondary inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold"><span className="material-symbols-outlined text-[16px]">refresh</span>Refresh records</button>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">{tabLabels.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${tab === item.id ? "bg-primary text-on-primary" : "control-secondary"}`}><span className="material-symbols-outlined text-[16px]">{item.icon}</span>{item.label}</button>)}</div>
      <div className="mt-5 space-y-4">{schemaUnavailable && <SchemaNotice message="This role’s secure profile table is not available yet. Apply Migrations 09 and 11 to a staging Supabase project and verify their RLS tests before production. Marketplace and project records may continue to use the already-existing tables." />}{error && <Notice tone="error" message={error} />}{success && <Notice tone="success" message={success} />}{tab === "profile" && renderRoleProfile()}{tab === "publish" && (isStudent ? <div className="rounded-xl bg-surface-container-low p-5 text-xs leading-6 text-on-surface-variant"><p className="font-bold text-primary">Portfolio first</p><p className="mt-2">Save your academic profile and an optional public portfolio link. Student accounts do not publish commercial listings, which keeps marketplace supply accountable to producers, companies, and consultants.</p></div> : isBuyer ? <>{renderProjectForm()}{renderMyProjects()}</> : <>{renderListingForm()}{renderListings()}</>)}{tab === "opportunities" && (isFarmer || isCompany ? <>{renderProjectForm()}{renderMyProjects()}</> : renderOpenProjects())}{tab === "connections" && <ConnectionInbox profileId={profile.id} />}</div>
    </section>
  );
}

function Field({ label, help, required, className = "", children }: { label: string; help?: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return <label className={`block ${className}`}><span className={labelClass}>{label}{required ? <span className="text-error"> *</span> : null}</span>{children}{help ? <span className="mt-1 block text-[10px] leading-4 text-on-surface-variant">{help}</span> : null}</label>;
}

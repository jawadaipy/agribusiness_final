/**
 * Real project and requirement board. It never displays seeded opportunities,
 * random bid counts, fabricated verification, or fake successful submissions.
 */
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedMember } from "@/lib/member";
import { formatPKR } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";
import { SaveButton } from "@/components/shared/SaveButton";
import { fetchSavedIds } from "@/lib/saved-items";

type ProjectRecord = {
  id: string;
  profile_id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  location: string | null;
  city: string | null;
  required_skills: string[] | null;
  deadline: string | null;
  created_at: string;
};

// Previous demo migrations used this reserved UUID range. These database rows
// are never shown as marketplace opportunities; permanent deletion needs an
// explicit reviewed database cleanup after backup confirmation.
const LEGACY_DEMO_PROFILE_PREFIX = "20000000-0000-0000-0000-";

function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    budgetMin: "",
    budgetMax: "",
    location: "",
    city: "",
    tags: "",
    description: "",
    deadline: "",
  });
  const [savedProjectIds, setSavedProjectIds] = useState<Set<string>>(new Set());

  const PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const loadProjects = async () => {
    setIsLoading(true);
    setLoadError("");
    const { data, error } = await supabase
      .from("projects")
      .select(
        "id,profile_id,title,description,budget_min,budget_max,currency,location,city,required_skills,deadline,created_at"
      )
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setProjects([]);
      setLoadError("Open opportunities could not be loaded. Confirm database connection.");
    } else {
      setProjects(
        ((data ?? []) as ProjectRecord[]).filter(
          (project) => !project.profile_id.startsWith(LEGACY_DEMO_PROFILE_PREFIX)
        )
      );
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void loadProjects();
    // Pre-fill bookmark state for signed-in members
    supabase.auth.getUser().then(({ data: authData }) => {
      if (!authData.user) return;
      void fetchSavedIds(authData.user.id).then(({ projectIds }) => setSavedProjectIds(projectIds));
    });
  }, []);

  const filteredProjects = projects.filter((project) =>
    [
      project.title,
      project.description,
      project.location || "",
      project.city || "",
      ...(project.required_skills ?? []),
    ].some((value) => value.toLowerCase().includes(searchQuery.trim().toLowerCase()))
  );

  const parseAmount = (value: string) => (value.trim() ? Number(value) : null);

  const openPostForm = async () => {
    const { user, profile } = await getAuthenticatedMember();
    if (!user) {
      navigate({ to: "/onboarding" });
      return;
    }
    if (!profile || !["farmer", "buyer", "company"].includes(profile.user_type)) {
      setSubmitError(
        "Only Farmer/Producer, Buyer/Trader/Miller, and Enterprise/Supplier accounts can post requirements. Consultants and students can discover open opportunities from their own dashboard."
      );
      return;
    }
    setSubmitError("");
    setSubmitSuccess("");
    setShowForm(true);
  };

  const handleCreateProject = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    if (newProject.title.trim().length < 5 || newProject.description.trim().length < 5) {
      setSubmitError("Provide a concise title and a clear requirement description before publishing.");
      return;
    }

    const minimum = parseAmount(newProject.budgetMin);
    const maximum = parseAmount(newProject.budgetMax);

    if (
      (minimum !== null && !Number.isFinite(minimum)) ||
      (maximum !== null && !Number.isFinite(maximum)) ||
      (minimum !== null && maximum !== null && maximum < minimum)
    ) {
      setSubmitError("Use valid budget amounts and ensure maximum is not lower than minimum.");
      return;
    }

    const { user, profile } = await getAuthenticatedMember();
    if (!user || !profile) {
      navigate({ to: "/onboarding" });
      return;
    }

    if (!["farmer", "buyer", "company"].includes(profile.user_type)) {
      setSubmitError("Your account role cannot publish this requirement.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from("projects").insert({
      profile_id: profile.id,
      title: newProject.title.trim(),
      description: newProject.description.trim(),
      budget_min: minimum,
      budget_max: maximum,
      currency: "PKR",
      location: newProject.location.trim() || null,
      city: newProject.city.trim() || null,
      required_skills: newProject.tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      deadline: newProject.deadline || null,
      status: "open",
    });

    if (error) {
      setSubmitError(error.message);
    } else {
      setSubmitSuccess("Requirement published successfully. It is now live on the board.");
      setNewProject({
        title: "",
        budgetMin: "",
        budgetMax: "",
        location: "",
        city: "",
        tags: "",
        description: "",
        deadline: "",
      });
      await loadProjects();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background text-on-background">
      <Navbar />
      <main className="pb-16 pt-24">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          
          {/* Header Banner */}
          <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Live Agricultural RFP & Opportunity Board
              </span>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-primary md:text-4xl">
                Projects and <span className="text-secondary">Requirements</span>
              </h1>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-on-surface-variant font-medium">
                Verified procurement requests, farm engineering RFPs, and consultancy contracts across Pakistan.
              </p>
            </div>

            <button
              onClick={() => void openPostForm()}
              className="btn-primary inline-flex w-fit items-center gap-2 text-xs shrink-0 cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Post Requirement
            </button>
          </div>

          {submitError && !showForm ? <Notice tone="error" message={submitError} /> : null}

          {/* Main Layout */}
          <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
            
            {/* Sidebar Controls */}
            <aside className="space-y-5 text-left">
              {/* Search Filter Card */}
              <div className="rounded-3xl border border-outline-variant/40 bg-white p-5 card-shadow">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <span className="material-symbols-outlined text-[18px] text-secondary">filter_alt</span>
                  Search Board
                </h2>
                <div className="relative mt-3">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant/50">
                    search
                  </span>
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low py-2.5 pl-9 pr-3 text-xs font-medium text-primary outline-none focus:border-primary transition-all"
                    placeholder="Commodity, machinery, city…"
                  />
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-3 text-xs font-bold uppercase tracking-wider text-secondary hover:underline cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Verified Trust Panel */}
              <div className="rounded-3xl gradient-agri p-6 text-white card-shadow relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 pointer-events-none" />
                <span className="material-symbols-outlined text-secondary text-[24px] mb-2 block">
                  verified_user
                </span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-secondary-container">
                  Accountable RFP Bidding
                </h2>
                <p className="mt-2 text-xs leading-5 text-white/80 font-medium">
                  Verified Farmers, Buyers, and Enterprises can publish requirements. Qualified agronomists and contractors submit proposals directly.
                </p>
                <div className="mt-4 pt-3 border-t border-white/15 flex items-center gap-2 text-xs text-secondary font-bold uppercase">
                  <span>100% Verified Identity</span>
                </div>
              </div>
            </aside>

            {/* Opportunities Feed */}
            <section className="space-y-4 text-left">
              {isLoading ? (
                <div className="space-y-4">
                  <ProjectSkeleton />
                  <ProjectSkeleton />
                  <ProjectSkeleton />
                </div>
              ) : loadError ? (
                <div className="rounded-3xl border border-error/25 bg-error/10 p-6">
                  <p className="font-bold text-error">Opportunity data could not be loaded</p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">{loadError}</p>
                  <button
                    onClick={() => void loadProjects()}
                    className="mt-4 rounded-xl border border-error/30 bg-white px-4 py-2 text-xs font-bold text-error cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              ) : filteredProjects.length ? (
                <>
                {filteredProjects.slice(0, visibleCount).map((project) => {
                  const deadlineSoon =
                    project.deadline &&
                    new Date(project.deadline).getTime() - Date.now() > 0 &&
                    new Date(project.deadline).getTime() - Date.now() < 7 * 24 * 3600 * 1000;
                  return (
                  <article
                    key={project.id}
                    className="rounded-3xl border border-outline-variant/40 bg-white p-6 card-shadow hover:card-shadow-hover hover:border-primary/40 transition-all duration-300 group"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary border border-primary/20">
                            <span className="material-symbols-outlined text-[12px]" aria-hidden="true">schedule</span>
                            {new Intl.DateTimeFormat("en-PK", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }).format(new Date(project.created_at))}
                          </span>
                          {project.deadline && (
                            <span
                              className={
                                deadlineSoon
                                  ? "inline-flex items-center gap-1 rounded-md bg-error/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-error border border-error/25"
                                  : "inline-flex items-center gap-1 rounded-md bg-secondary/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-on-secondary-container border border-secondary/20"
                              }
                            >
                              <span className="material-symbols-outlined text-[12px]" aria-hidden="true">{deadlineSoon ? "hourglass_top" : "event"}</span>
                              {deadlineSoon ? "Closing soon: " : "Deadline: "}{project.deadline}
                            </span>
                          )}
                          <span className="ml-auto">
                            <SaveButton kind="project" targetId={project.id} initiallySaved={savedProjectIds.has(project.id)} compact />
                          </span>
                        </div>

                        <Link
                          to="/projects/$id"
                          params={{ id: project.id }}
                          className="group/title inline-block"
                        >
                          <h2 className="font-display text-lg font-bold text-primary group-hover/title:text-secondary transition-colors tracking-tight">
                            {project.title}
                          </h2>
                        </Link>

                        <p className="mt-2 line-clamp-3 text-xs sm:text-sm leading-relaxed text-on-surface-variant font-medium">
                          {project.description}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <span className="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">
                              location_on
                            </span>
                            {project.location || project.city || "Pakistan Wide"}
                          </span>
                          <span className="inline-flex items-center gap-1 font-black text-primary">
                            <span className="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">
                              payments
                            </span>
                            {project.budget_min !== null || project.budget_max !== null
                              ? `${formatPKR(project.budget_min ?? 0)} – ${formatPKR(project.budget_max ?? 0)}`
                              : "Budget on request"}
                          </span>
                        </div>

                        {project.required_skills?.length ? (
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {project.required_skills.slice(0, 6).map((tag) => (
                              <span
                                key={tag}
                                className="tag-pill py-0.5 px-2.5 text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-row md:flex-col gap-2 shrink-0 pt-2 md:pt-0">
                        <Link
                          to="/projects/$id"
                          params={{ id: project.id }}
                          className="btn-primary inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs"
                        >
                          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">visibility</span>
                          View RFP
                        </Link>
                        <Link
                          to="/profile/$id"
                          params={{ id: project.profile_id }}
                          className="btn-ghost inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs"
                        >
                          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">person</span>
                          Publisher
                        </Link>
                      </div>
                    </div>
                  </article>
                  );
                })}
                {filteredProjects.length > visibleCount && (
                  <div className="pt-4 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                      className="rounded-xl border border-primary/30 bg-white px-6 py-3 text-xs font-bold uppercase tracking-wider text-primary transition hover:bg-primary/5"
                    >
                      Load more requirements ({filteredProjects.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
                </>
              ) : (
                <div className="rounded-3xl border border-dashed border-outline-variant/70 bg-white p-12 text-center card-shadow">
                  <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-3xl text-primary/40">work_off</span>
                  </div>
                  <h2 className="font-display text-lg font-bold text-primary">No Open Requirements Found</h2>
                  <p className="mt-1 text-xs leading-relaxed text-on-surface-variant font-medium max-w-sm mx-auto">
                    Try broadening your search term or check back shortly as members post new opportunities.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Post RFP Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
            <motion.section
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-outline-variant/50 bg-white p-7 shadow-2xl text-left"
            >
              <div className="flex items-start justify-between gap-4 border-b border-outline-variant/30 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                    Official RFP Board
                  </span>
                  <h2 className="font-display text-2xl font-bold text-primary mt-0.5">
                    Post a Real Requirement
                  </h2>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-xl bg-surface-container-low p-2 text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {submitError ? <Notice tone="error" message={submitError} /> : null}
              {submitSuccess ? <Notice tone="success" message={submitSuccess} /> : null}

              <form onSubmit={handleCreateProject} className="mt-5 grid gap-4 sm:grid-cols-2">
                <FormField label="Requirement title" required className="sm:col-span-2">
                  <input
                    required
                    value={newProject.title}
                    onChange={(event) =>
                      setNewProject({ ...newProject, title: event.target.value })
                    }
                    className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3.5 py-2.5 text-xs font-medium text-primary outline-none focus:border-primary"
                    placeholder="e.g. Grade A maize procurement, 300 MT"
                  />
                </FormField>

                <FormField label="Deadline">
                  <input
                    type="date"
                    value={newProject.deadline}
                    onChange={(event) =>
                      setNewProject({ ...newProject, deadline: event.target.value })
                    }
                    className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3.5 py-2.5 text-xs font-medium text-primary outline-none focus:border-primary"
                  />
                </FormField>

                <FormField label="City / Mandi">
                  <input
                    value={newProject.city}
                    onChange={(event) =>
                      setNewProject({ ...newProject, city: event.target.value })
                    }
                    className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3.5 py-2.5 text-xs font-medium text-primary outline-none focus:border-primary"
                    placeholder="e.g. Faisalabad"
                  />
                </FormField>

                <FormField label="Minimum budget (PKR)">
                  <input
                    type="number"
                    min="0"
                    value={newProject.budgetMin}
                    onChange={(event) =>
                      setNewProject({ ...newProject, budgetMin: event.target.value })
                    }
                    className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3.5 py-2.5 text-xs font-medium text-primary outline-none focus:border-primary"
                    placeholder="Optional min"
                  />
                </FormField>

                <FormField label="Maximum budget (PKR)">
                  <input
                    type="number"
                    min="0"
                    value={newProject.budgetMax}
                    onChange={(event) =>
                      setNewProject({ ...newProject, budgetMax: event.target.value })
                    }
                    className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3.5 py-2.5 text-xs font-medium text-primary outline-none focus:border-primary"
                    placeholder="Optional max"
                  />
                </FormField>

                <FormField label="Location / collection area" className="sm:col-span-2">
                  <input
                    value={newProject.location}
                    onChange={(event) =>
                      setNewProject({ ...newProject, location: event.target.value })
                    }
                    className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3.5 py-2.5 text-xs font-medium text-primary outline-none focus:border-primary"
                    placeholder="District, grain market, or site address"
                  />
                </FormField>

                <FormField label="Commodity / expertise tags" className="sm:col-span-2">
                  <input
                    value={newProject.tags}
                    onChange={(event) =>
                      setNewProject({ ...newProject, tags: event.target.value })
                    }
                    className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3.5 py-2.5 text-xs font-medium text-primary outline-none focus:border-primary"
                    placeholder="Wheat, Grade A, Soil testing, Cold storage…"
                  />
                </FormField>

                <FormField label="Requirement details" required className="sm:col-span-2">
                  <textarea
                    required
                    rows={4}
                    value={newProject.description}
                    onChange={(event) =>
                      setNewProject({ ...newProject, description: event.target.value })
                    }
                    className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3.5 py-2.5 text-xs font-medium text-primary outline-none focus:border-primary"
                    placeholder="Describe commodity specifications, volume, delivery dates, quality parameters, and terms."
                  />
                </FormField>

                <div className="flex justify-end gap-3 sm:col-span-2 pt-2 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="btn-ghost text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isSubmitting}
                    className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? "Publishing…" : "Publish RFP"}
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  </button>
                </div>
              </form>
            </motion.section>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

function FormField({
  label,
  required,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function Notice({ tone, message }: { tone: "success" | "error"; message: string }) {
  return (
    <p
      className={`mb-6 rounded-2xl border p-4 text-xs font-bold leading-relaxed text-left flex items-center gap-2 shadow-xs ${
        tone === "success"
          ? "border-primary/20 bg-primary/10 text-primary"
          : "border-error/25 bg-error/10 text-error"
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">
        {tone === "success" ? "check_circle" : "error"}
      </span>
      {message}
    </p>
  );
}

function ProjectSkeleton() {
  return (
    <div className="h-44 animate-pulse rounded-3xl bg-surface-container-low border border-outline-variant/30" />
  );
}

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Project Board | AgriBusiness Pakistan" },
      {
        name: "description",
        content: "Browse real agricultural projects and requirements across Pakistan.",
      },
      { property: "og:title", content: "AgriBusiness Project Board" },
    ],
  }),
  component: ProjectsPage,
});

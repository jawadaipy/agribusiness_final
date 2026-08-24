import { AnimatePresence, motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedMember, type MemberProfile } from "@/lib/member";
import { formatPKR } from "@/lib/format";

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
  is_remote: boolean;
  status: string;
  created_at: string;
};

type OwnerProfile = {
  id: string;
  display_name: string | null;
  user_type: string;
  city: string | null;
  location: string | null;
  is_verified: boolean;
  avatar_url: string | null;
};

type ProposalRecord = {
  id: string;
  project_id: string;
  profile_id: string;
  cover_note: string;
  quoted_amount: number | null;
  status: string;
  created_at: string;
};

const ProjectDetailPage = () => {
  const { id } = useParams({ from: "/projects/$id" });
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [currentMember, setCurrentMember] = useState<MemberProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);

  // Proposal submission form state
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [coverNote, setCoverNote] = useState("");
  const [quotedAmount, setQuotedAmount] = useState("");
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [proposalError, setProposalError] = useState("");
  const [proposalSuccess, setProposalSuccess] = useState("");

  const loadProjectData = async () => {
    setIsLoading(true);
    setLoadError("");

    const [authResult, projectResult] = await Promise.all([
      getAuthenticatedMember(),
      supabase
        .from("projects")
        .select("id,profile_id,title,description,budget_min,budget_max,currency,location,city,required_skills,deadline,is_remote,status,created_at")
        .eq("id", id)
        .maybeSingle(),
    ]);

    setCurrentMember(authResult.profile);

    if (projectResult.error || !projectResult.data) {
      setLoadError("This project or requirement could not be found.");
      setIsLoading(false);
      return;
    }

    const projectData = projectResult.data as ProjectRecord;
    setProject(projectData);

    // Fetch owner info
    const { data: ownerData } = await supabase
      .from("directory_profiles")
      .select("id,display_name,user_type,city,location,is_verified,avatar_url")
      .eq("id", projectData.profile_id)
      .maybeSingle();

    if (ownerData) {
      setOwner(ownerData as OwnerProfile);
    }

    // If current user is owner or consultant, check proposals
    if (authResult.profile) {
      const isOwner = authResult.profile.id === projectData.profile_id;
      const query = supabase
        .from("project_proposals")
        .select("id,project_id,profile_id,cover_note,quoted_amount,status,created_at")
        .eq("project_id", id);

      if (!isOwner) {
        query.eq("profile_id", authResult.profile.id);
      }

      const { data: proposalData } = await query.order("created_at", { ascending: false });
      if (proposalData) {
        setProposals(proposalData as ProposalRecord[]);
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadProjectData();
  }, [id]);

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMember) {
      navigate({ to: "/onboarding" });
      return;
    }
    if (currentMember.user_type !== "consultant") {
      setProposalError("Only Consultant accounts are permitted to submit technical proposals.");
      return;
    }
    if (coverNote.trim().length < 20) {
      setProposalError("Please write at least 20 characters detailing your relevant technical qualifications.");
      return;
    }

    setIsSubmittingProposal(true);
    setProposalError("");
    setProposalSuccess("");

    const parsedQuote = quotedAmount.trim() ? Number(quotedAmount) : null;
    const { error } = await supabase.from("project_proposals").insert({
      project_id: id,
      profile_id: currentMember.id,
      cover_note: coverNote.trim(),
      quoted_amount: parsedQuote,
    });

    if (error) {
      setProposalError(error.message);
    } else {
      setProposalSuccess("Your proposal has been securely submitted to the project owner.");
      setCoverNote("");
      setQuotedAmount("");
      setShowProposalModal(false);
      await loadProjectData();
    }
    setIsSubmittingProposal(false);
  };

  const isOwner = currentMember && project && currentMember.id === project.profile_id;
  const isConsultant = currentMember?.user_type === "consultant";
  const hasSubmitted = proposals.some((p) => p.profile_id === currentMember?.id);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <Navbar />
      <main className="pb-16 pt-24 text-left">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          <div className="mx-auto max-w-6xl">
            {isLoading ? (
              <div className="space-y-6">
                <div className="h-64 animate-pulse rounded-3xl bg-white" />
                <div className="h-40 animate-pulse rounded-2xl bg-white" />
              </div>
            ) : loadError || !project ? (
              <div className="rounded-3xl border border-error/25 bg-error/10 p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-error">work_off</span>
                <h1 className="mt-3 font-display text-2xl font-bold text-error">Requirement Not Found</h1>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">{loadError || "The requested project brief does not exist."}</p>
                <Link to="/projects" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-on-primary">
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span> Return to Project Board
                </Link>
              </div>
            ) : (
              <div className="grid items-start gap-8 lg:grid-cols-12">
                <div className="space-y-6 lg:col-span-8">
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl border border-outline-variant/40 bg-white p-6 shadow-sm sm:p-8">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <span className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
                        {project.status.toUpperCase()} REQUIREMENT
                      </span>
                      <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant/60">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        Posted {new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", year: "numeric" }).format(new Date(project.created_at))}
                      </div>
                      {project.is_remote && (
                        <span className="rounded-md bg-secondary/15 px-2 py-0.5 text-xs font-bold uppercase text-primary">
                          Remote Available
                        </span>
                      )}
                    </div>

                    <h1 className="mb-6 font-display text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                      {project.title}
                    </h1>

                    <div className="mb-6 grid grid-cols-1 gap-4 border-y border-outline-variant/30 py-4 sm:grid-cols-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-low text-secondary">
                          <span className="material-symbols-outlined text-[20px]">payments</span>
                        </div>
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Budget Range</div>
                          <div className="text-sm font-bold text-primary">
                            {project.budget_min !== null || project.budget_max !== null
                              ? `${formatPKR(project.budget_min ?? 0)} – ${formatPKR(project.budget_max ?? 0)}`
                              : "Budget on request"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-low text-secondary">
                          <span className="material-symbols-outlined text-[20px]">location_on</span>
                        </div>
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Location</div>
                          <div className="text-sm font-bold text-primary">{project.location || project.city || "Pakistan"}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-low text-secondary">
                          <span className="material-symbols-outlined text-[20px]">event</span>
                        </div>
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Deadline</div>
                          <div className="text-sm font-bold text-primary">
                            {project.deadline
                              ? new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", year: "numeric" }).format(new Date(project.deadline))
                              : "Open"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h3 className="mb-2 text-base font-bold tracking-tight text-primary">Project Specification & Scope</h3>
                        <p className="whitespace-pre-line text-xs font-medium leading-relaxed text-on-surface-variant sm:text-sm">
                          {project.description}
                        </p>
                      </div>

                      {project.required_skills && project.required_skills.length > 0 && (
                        <div>
                          <h3 className="mb-3 text-base font-bold tracking-tight text-primary">Required Skills & Disciplines</h3>
                          <div className="flex flex-wrap gap-2">
                            {project.required_skills.map((skill, i) => (
                              <span key={i} className="rounded-full border border-outline-variant/60 bg-surface-container-low px-3 py-1 text-xs font-bold text-primary">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Proposals Review section for Project Owner */}
                  {isOwner && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-outline-variant/40 bg-white p-6 shadow-sm sm:p-8">
                      <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-3">
                        <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-primary">
                          <span className="material-symbols-outlined text-[20px] text-secondary">inbox</span>
                          Submitted Consultant Proposals ({proposals.length})
                        </h2>
                      </div>

                      {proposals.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-low p-5 text-xs text-on-surface-variant">
                          No proposals have been received for this opportunity yet.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {proposals.map((proposal) => (
                            <div key={proposal.id} className="rounded-2xl border border-outline-variant/30 bg-surface-container-low/50 p-5">
                              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                                <Link to="/profile/$id" params={{ id: proposal.profile_id }} className="text-xs font-bold text-primary hover:underline">
                                  View Consultant Profile →
                                </Link>
                                <span className="text-xs font-bold text-primary">
                                  Quote: {proposal.quoted_amount ? formatPKR(proposal.quoted_amount) : "Quote on discussion"}
                                </span>
                              </div>
                              <p className="mt-3 text-xs leading-5 text-on-surface-variant">{proposal.cover_note}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Submission status for Consultant who already bid */}
                  {isConsultant && hasSubmitted && (
                    <div className="rounded-2xl border border-success/25 bg-success/10 p-5 text-xs text-success">
                      <p className="font-bold">✓ Proposal Submitted</p>
                      <p className="mt-1">You have submitted a proposal for this project. The project owner has received your brief and can contact you.</p>
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <aside className="w-full space-y-5 lg:sticky lg:top-20 lg:col-span-4">
                  <div className="rounded-3xl border border-outline-variant/40 bg-white p-6 shadow-sm">
                    {isConsultant && !isOwner && !hasSubmitted && (
                      <>
                        <button
                          onClick={() => setShowProposalModal(true)}
                          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-xs font-bold uppercase tracking-wider text-on-primary shadow-md transition-all hover:bg-primary-container"
                        >
                          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">send</span>
                          Submit Proposal
                        </button>
                        <p className="mb-4 text-center text-xs font-medium text-on-surface-variant">
                          {proposals.length > 0
                            ? `${proposals.length} proposal${proposals.length === 1 ? "" : "s"} received so far`
                            : "Be the first to propose on this requirement"}
                        </p>
                      </>
                    )}

                    {!currentMember && (
                      <Link
                        to="/onboarding"
                        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-xs font-bold uppercase tracking-wider text-on-primary shadow-md transition-all hover:bg-primary-container"
                      >
                        Sign in to Bid
                      </Link>
                    )}

                    {proposalSuccess && (
                      <p className="mb-4 rounded-xl bg-success/10 p-3 text-xs font-semibold text-success">{proposalSuccess}</p>
                    )}

                    <div className="border-t border-outline-variant/30 pt-4">
                      <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">Project Publisher</h4>
                      {owner ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-sm">
                              {owner.display_name?.slice(0, 2).toUpperCase() || "AB"}
                            </div>
                            <div>
                              <div className="flex items-center gap-1 text-xs font-bold text-primary">
                                {owner.display_name || "Enterprise Member"}
                                {owner.is_verified && <span className="material-symbols-outlined text-[14px] text-secondary">verified</span>}
                              </div>
                              <div className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-on-surface-variant/60">
                                {owner.user_type} · {owner.city || "Pakistan"}
                              </div>
                            </div>
                          </div>

                          <Link
                            to="/profile/$id"
                            params={{ id: owner.id }}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/70 py-2.5 text-xs font-bold text-primary transition hover:bg-surface-container-low"
                          >
                            <span className="material-symbols-outlined text-[16px]">person</span> View Public Profile
                          </Link>
                        </div>
                      ) : (
                        <p className="text-xs text-on-surface-variant">Verified Member Account</p>
                      )}
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-container p-5 text-white shadow-md">
                    <h4 className="relative z-10 mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[16px] text-secondary">lock</span>
                      Protected Engagement
                    </h4>
                    <p className="relative z-10 text-xs font-medium leading-relaxed text-white/80">
                      All project requirements, proposals, and connection requests are protected by Supabase Row-Level Security. Contact details remain confidential until connection consent.
                    </p>
                  </div>
                </aside>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Consultant Proposal Modal — animated in/out like the projects board modal */}
      <AnimatePresence>
        {showProposalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-label="Submit consultant proposal"
            onClick={() => setShowProposalModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg rounded-3xl border border-outline-variant/40 bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-outline-variant/30 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-secondary">Consultant Proposal</span>
                  <h2 className="font-display text-xl font-bold text-primary">Submit Technical Bid</h2>
                </div>
                <button onClick={() => setShowProposalModal(false)} aria-label="Close proposal form" className="rounded-xl p-2 text-on-surface-variant hover:bg-surface-container-low">
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
                </button>
              </div>

              {proposalError && (
                <p className="mt-4 rounded-xl border border-error/25 bg-error/10 p-3 text-xs font-semibold text-error">{proposalError}</p>
              )}

              <form onSubmit={handleSubmitProposal} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="proposal-quote" className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Proposed Quote (PKR)
                  </label>
                  <input
                    id="proposal-quote"
                    type="number"
                    min="0"
                    value={quotedAmount}
                    onChange={(e) => setQuotedAmount(e.target.value)}
                    placeholder="e.g. 50000 (Optional)"
                    className="mt-1 w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3.5 py-2.5 text-xs text-primary outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label htmlFor="proposal-note" className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Technical Fit &amp; Methodology *
                  </label>
                  <textarea
                    id="proposal-note"
                    required
                    rows={5}
                    maxLength={2000}
                    value={coverNote}
                    onChange={(e) => setCoverNote(e.target.value)}
                    placeholder="Explain your technical experience, proposed methodology, and deliverables (min 20 characters)…"
                    className="mt-1 w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3.5 py-2.5 text-xs text-primary outline-none focus:border-primary"
                  />
                  <p className="mt-1 text-right text-xs text-on-surface-variant/60">{coverNote.length}/2000</p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProposalModal(false)}
                    className="rounded-xl border border-outline-variant/60 px-4 py-2.5 text-xs font-bold text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingProposal}
                    className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-on-primary disabled:opacity-50"
                  >
                    {isSubmittingProposal ? "Submitting…" : "Send Proposal"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export const Route = createFileRoute("/projects/$id")({
  head: () => ({
    meta: [{ title: "Project Details | AgriBusiness Pakistan" },
      { name: "description", content: "View detailed requirements and submit proposals for verified agricultural projects." },
      { property: "og:title", content: "AgriBusiness Project Details" },
      { property: "og:description", content: "Detailed project brief and bidding platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectDetailPage,
});
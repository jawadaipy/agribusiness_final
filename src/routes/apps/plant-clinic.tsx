import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedMember, type MemberProfile } from "@/lib/member";

type ProblemPost = {
  id: string;
  profile_id: string;
  title: string;
  body: string;
  media_urls: string[] | null;
  tags: string[] | null;
  is_resolved: boolean;
  view_count: number;
  created_at: string;
  posterName?: string;
  posterCity?: string;
  comments?: ProblemComment[];
};

type ProblemComment = {
  id: string;
  post_id: string;
  profile_id: string;
  body: string;
  is_solution: boolean;
  upvotes: number;
  created_at: string;
  authorName?: string;
  authorRole?: string;
};

const PlantClinicPage = () => {
  const navigate = useNavigate();
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [cases, setCases] = useState<ProblemPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Report form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("Tomato, Leaves");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  // Reply state
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [isReplying, setIsReplying] = useState<string | null>(null);

  const loadCases = async () => {
    setIsLoading(true);
    setLoadError("");

    const [authResult, postsResult] = await Promise.all([
      getAuthenticatedMember(),
      supabase
        .from("problem_posts")
        .select("id,profile_id,title,body,media_urls,tags,is_resolved,view_count,created_at")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

    setMember(authResult.profile);

    if (postsResult.error) {
      setLoadError("Clinical cases could not be loaded from database.");
      setCases([]);
      setIsLoading(false);
      return;
    }

    const posts = (postsResult.data ?? []) as ProblemPost[];

    if (posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      const profileIds = Array.from(new Set(posts.map((p) => p.profile_id)));

      const [profilesResult, commentsResult] = await Promise.all([
        supabase.from("directory_profiles").select("id,display_name,city,user_type").in("id", profileIds),
        supabase
          .from("problem_comments")
          .select("id,post_id,profile_id,body,is_solution,upvotes,created_at")
          .in("post_id", postIds)
          .order("created_at", { ascending: true }),
      ]);

      const profileMap = new Map((profilesResult.data ?? []).map((p) => [p.id, p]));
      const commentProfileIds = Array.from(new Set((commentsResult.data ?? []).map((c) => c.profile_id)));

      let commentProfileMap = new Map<string, { display_name: string | null; user_type: string }>();
      if (commentProfileIds.length > 0) {
        const { data: cProfiles } = await supabase
          .from("directory_profiles")
          .select("id,display_name,user_type")
          .in("id", commentProfileIds);
        commentProfileMap = new Map((cProfiles ?? []).map((c) => [c.id, c]));
      }

      const commentsByPost = new Map<string, ProblemComment[]>();
      for (const c of (commentsResult.data ?? []) as ProblemComment[]) {
        const author = commentProfileMap.get(c.profile_id);
        const enrichedComment: ProblemComment = {
          ...c,
          authorName: author?.display_name || "Agronomist",
          authorRole: author?.user_type ? author.user_type.toUpperCase() : "CONSULTANT",
        };
        const list = commentsByPost.get(c.post_id) || [];
        list.push(enrichedComment);
        commentsByPost.set(c.post_id, list);
      }

      const enrichedPosts: ProblemPost[] = posts.map((p) => {
        const owner = profileMap.get(p.profile_id);
        return {
          ...p,
          posterName: owner?.display_name || "Verified Grower",
          posterCity: owner?.city || "Punjab",
          comments: commentsByPost.get(p.id) || [],
        };
      });

      setCases(enrichedPosts);
    } else {
      setCases([]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadCases();
  }, []);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    if (!member) {
      navigate({ to: "/onboarding" });
      return;
    }

    if (title.trim().length < 5 || body.trim().length < 10) {
      setSubmitError("Provide a detailed symptom description (at least 10 characters).");
      return;
    }

    setIsSubmitting(true);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const media = imageUrl.trim() ? [imageUrl.trim()] : [];

    const { error } = await supabase.from("problem_posts").insert({
      profile_id: member.id,
      title: title.trim(),
      body: body.trim(),
      tags: tags.length ? tags : null,
      media_urls: media.length ? media : null,
    });

    if (error) {
      setSubmitError(error.message);
    } else {
      setSubmitSuccess("Your clinical symptom report has been submitted to verified agronomists.");
      setTitle("");
      setBody("");
      setImageUrl("");
      await loadCases();
    }
    setIsSubmitting(false);
  };

  const handleAddComment = async (postId: string) => {
    if (!member) {
      navigate({ to: "/onboarding" });
      return;
    }
    const text = replyText[postId]?.trim() || "";
    if (text.length < 5) return;

    setIsReplying(postId);
    const { error } = await supabase.from("problem_comments").insert({
      post_id: postId,
      profile_id: member.id,
      body: text,
      is_solution: member.user_type === "consultant",
    });

    if (!error) {
      setReplyText((prev) => ({ ...prev, [postId]: "" }));
      await loadCases();
    }
    setIsReplying(null);
  };

  return (
    <div className="min-h-screen bg-background text-on-background">
      <Navbar />
      <main className="pb-16 pt-24">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          
          {/* Clinic Header Banner */}
          <div className="mx-auto mb-8 max-w-5xl text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl gradient-agri text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none" />
              <div className="relative z-10 space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold uppercase tracking-wider text-secondary">
                  <span className="material-symbols-outlined text-[14px]">psychiatry</span>
                  AI & Verified Agronomy Diagnostic Hub
                </div>
                <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
                  Plant Health & Crop Clinic
                </h1>
                <p className="max-w-xl text-xs sm:text-sm font-medium leading-relaxed text-white/80">
                  Share crop symptoms, upload evidence photos, and receive expert diagnostic prescriptions from certified agronomists and AI models.
                </p>
              </div>

              <div className="relative z-10 flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                <div className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm text-center">
                  <span className="text-[10px] uppercase font-bold text-white/60 block">Resolved Cases</span>
                  <span className="font-display text-2xl font-black text-secondary">{cases.length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-12">
            
            {/* Clinical Feed */}
            <div className="space-y-6 lg:col-span-8 text-left">
              
              {/* Report Issue Card */}
              <form onSubmit={handleReportSubmit} className="rounded-3xl border border-outline-variant/40 bg-white p-6 sm:p-7 card-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                    <span className="material-symbols-outlined text-[20px] text-secondary">add_circle</span>
                    Report Plant Symptoms & Diseases
                  </h3>
                  <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">Free Diagnostic</span>
                </div>

                {submitError && (
                  <div className="mb-4 rounded-2xl border border-error/20 bg-error/10 p-3.5 text-xs font-bold text-error flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{submitError}</span>
                  </div>
                )}
                {submitSuccess && (
                  <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span>{submitSuccess}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Problem Headline (e.g. Yellowing leaves and stem borer on Maize in Sahiwal)"
                    className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-3 text-xs font-medium text-primary outline-none focus:border-primary transition-all"
                  />

                  <textarea
                    required
                    rows={3}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Describe symptoms, affected acreage, soil moisture, and recent fertilizer/pesticide sprays..."
                    className="w-full resize-none rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-3 text-xs font-medium text-primary outline-none focus:border-primary transition-all"
                  />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="Crop & tags (e.g. Wheat, Rust, Multan)"
                      className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-2.5 text-xs font-medium text-primary outline-none focus:border-primary transition-all"
                    />
                    <input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Evidence photo URL (optional)"
                      className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-2.5 text-xs font-medium text-primary outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-outline-variant/30 flex items-center justify-between">
                  <span className="text-[10px] text-on-surface-variant/60 font-medium">
                    Verified agronomists reply within 2 hours
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? "Submitting..." : "Submit for Analysis"}
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  </button>
                </div>
              </form>

              {/* Cases List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">forum</span>
                    Live Clinical Cases ({cases.length})
                  </h2>
                </div>

                {isLoading ? (
                  <div className="space-y-4">
                    <div className="h-44 animate-pulse rounded-3xl bg-white border border-outline-variant/30" />
                    <div className="h-44 animate-pulse rounded-3xl bg-white border border-outline-variant/30" />
                  </div>
                ) : loadError ? (
                  <div className="rounded-3xl border border-error/25 bg-error/10 p-6 text-left">
                    <p className="text-xs font-bold text-error">{loadError}</p>
                    <button
                      onClick={() => void loadCases()}
                      className="mt-3 rounded-xl border border-error/30 bg-white px-4 py-2 text-xs font-bold text-error cursor-pointer"
                    >
                      Try again
                    </button>
                  </div>
                ) : cases.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-outline-variant/70 bg-white p-12 text-center card-shadow">
                    <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-3xl text-primary/40">psychiatry</span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-primary">No Clinical Cases Reported Yet</h3>
                    <p className="mt-1 text-xs text-on-surface-variant font-medium max-w-sm mx-auto">
                      Be the first grower to submit plant symptoms above for verified expert diagnosis.
                    </p>
                  </div>
                ) : (
                  cases.map((problem) => (
                    <motion.div
                      key={problem.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-3xl border border-outline-variant/40 bg-white p-6 card-shadow hover:card-shadow-hover transition-all duration-300"
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-agri text-white font-bold text-xs shadow-sm">
                            {problem.posterName?.charAt(0) || "P"}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-primary">{problem.posterName}</div>
                            <div className="text-[10px] font-semibold text-on-surface-variant/70">
                              {problem.posterCity} • {new Intl.DateTimeFormat("en-PK", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }).format(new Date(problem.created_at))}
                            </div>
                          </div>
                        </div>
                        {problem.is_resolved ? (
                          <span className="badge-success">Resolved</span>
                        ) : (
                          <span className="badge-gold">Under Review</span>
                        )}
                      </div>

                      <h3 className="mb-2 font-display text-base font-bold tracking-tight text-primary">
                        {problem.title}
                      </h3>
                      <p className="mb-4 text-xs font-medium leading-relaxed text-on-surface-variant">
                        {problem.body}
                      </p>

                      {problem.media_urls && problem.media_urls.length > 0 && (
                        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {problem.media_urls.map((m, idx) => (
                            <div key={idx} className="aspect-video overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-low">
                              <img src={m} alt="Clinical evidence" className="h-full w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}

                      {problem.tags && (
                        <div className="mb-4 flex flex-wrap items-center gap-1.5">
                          {problem.tags.map((tag) => (
                            <span key={tag} className="tag-pill text-[10px] py-0.5 px-2.5">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Expert Replies */}
                      {problem.comments && problem.comments.length > 0 && (
                        <div className="space-y-3 border-l-2 border-primary/20 pl-4 my-4">
                          {problem.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm mt-1">
                                <span className="material-symbols-outlined text-[16px]">psychiatry</span>
                              </div>
                              <div className="flex-1 rounded-2xl rounded-tl-none border border-outline-variant/30 bg-surface-container-low/60 p-4">
                                <div className="mb-1 flex items-center gap-2">
                                  <span className="text-xs font-bold text-primary">{comment.authorName}</span>
                                  <span className="badge-gold text-[8px] py-0 px-2">
                                    {comment.authorRole}
                                  </span>
                                </div>
                                <p className="text-xs font-medium leading-relaxed text-on-surface-variant">
                                  {comment.body}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Input Box */}
                      <div className="mt-4 flex gap-2 pt-3 border-t border-outline-variant/20">
                        <input
                          value={replyText[problem.id] || ""}
                          onChange={(e) =>
                            setReplyText({ ...replyText, [problem.id]: e.target.value })
                          }
                          placeholder="Provide agronomic diagnosis or advisory reply..."
                          className="flex-1 rounded-xl border border-outline-variant/40 bg-surface-container-low px-3.5 py-2.5 text-xs text-primary outline-none focus:border-primary font-medium"
                        />
                        <button
                          type="button"
                          disabled={isReplying === problem.id}
                          onClick={() => void handleAddComment(problem.id)}
                          className="btn-primary py-2 px-4 text-xs font-bold disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          Reply
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6 lg:col-span-4 text-left">
              <div className="rounded-3xl gradient-agri p-6 text-white card-shadow relative overflow-hidden">
                <div className="absolute top-0 right-0 w-36 h-36 bg-white/5 rounded-full -mr-12 -mt-12 pointer-events-none" />
                <h4 className="relative z-10 mb-4 font-display text-base font-bold tracking-tight text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">analytics</span>
                  Clinic Intelligence
                </h4>
                <div className="relative z-10 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <span className="font-bold text-white/70">Database Cases</span>
                    <span className="font-display font-black text-white">{cases.length}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <span className="font-bold text-white/70">Diagnostic Engine</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      Active 24/7
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white/70">Integrity</span>
                    <span className="font-bold text-secondary">100% Persisted</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-outline-variant/40 bg-white p-6 card-shadow">
                <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                  <span className="material-symbols-outlined text-[18px] text-secondary">verified</span>
                  Expert Advisory Network
                </h4>
                <p className="text-xs leading-relaxed text-on-surface-variant font-medium">
                  Agronomists and Consultants can publish direct verified prescriptions and build their reputation in Pakistan's agricultural sector.
                </p>
                <Link
                  to="/search"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-secondary transition-colors"
                >
                  Browse Specialist Directory
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export const Route = createFileRoute("/apps/plant-clinic")({
  head: () => ({
    title: "Plant Clinic | AI-Powered Agronomy | AgriBusiness",
    meta: [
      { name: "description", content: "Diagnostic platform for crop health and expert agronomy recommendations." },
      { property: "og:title", content: "AgriBusiness Plant Clinic" },
      { property: "og:description", content: "Get expert advice and AI-powered diagnosis for your crops." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlantClinicPage,
});
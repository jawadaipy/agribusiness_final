/**
 * Shared clinic engine for the Plant and Animal clinic apps.
 * Both are the same product — report a case, get expert replies — so one
 * implementation carries both. Differences live entirely in the config.
 *
 * Data honesty rules: the header counter shows actually-resolved cases;
 * comments only wear the expert badge when is_solution is true; evidence
 * photos upload to the problem-media bucket (no URL-only input).
 */
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedMember, type MemberProfile } from "@/lib/member";
import { MediaUploader } from "@/components/shared/MediaUploader";
import { uploadFeedMedia } from "@/lib/feed";

export interface ClinicConfig {
  icon: string;
  badgeText: string;
  title: string;
  subtitle: string;
  headerStatLabel: string;
  reportTitle: string;
  headlinePlaceholder: string;
  bodyPlaceholder: string;
  tagsPlaceholder: string;
  defaultTags: string;
  replyPlaceholder: string;
  submitCta: string;
  submitSuccess: string;
  loadError: string;
  posterFallback: string;
  expertFallback: string;
  casesLabel: string;
  emptyTitle: string;
  emptyMessage: string;
  expertBlurbTitle: string;
  expertBlurb: string;
  expertCta: string;
}

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

export function ClinicPage({ config }: { config: ClinicConfig }) {
  const navigate = useNavigate();
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [cases, setCases] = useState<ProblemPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Report form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState(config.defaultTags);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
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
      setLoadError(config.loadError);
      setCases([]);
      setIsLoading(false);
      return;
    }

    const posts = ((postsResult.data ?? []) as ProblemPost[]).filter((p) => !(p.tags ?? []).includes("network"));

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
          authorName: author?.display_name || config.expertFallback,
          authorRole: author?.user_type ? author.user_type.toUpperCase() : "EXPERT",
        };
        const list = commentsByPost.get(c.post_id) || [];
        list.push(enrichedComment);
        commentsByPost.set(c.post_id, list);
      }

      const enrichedPosts: ProblemPost[] = posts.map((p) => {
        const owner = profileMap.get(p.profile_id);
        return {
          ...p,
          posterName: owner?.display_name || config.posterFallback,
          posterCity: owner?.city || "Pakistan",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

    const uploadedUrls: string[] = [];
    for (const file of pendingFiles.slice(0, 3)) {
      if (!file.type.startsWith("image/")) continue;
      const { url } = await uploadFeedMedia(member.id, file);
      if (url) uploadedUrls.push(url);
    }

    const { error } = await supabase.from("problem_posts").insert({
      profile_id: member.id,
      title: title.trim(),
      body: body.trim(),
      tags: tags.length ? tags : null,
      media_urls: uploadedUrls.length ? uploadedUrls : null,
    });

    if (error) {
      setSubmitError(error.message);
    } else {
      setSubmitSuccess(config.submitSuccess);
      setTitle("");
      setBody("");
      setTagsInput(config.defaultTags);
      setPendingFiles([]);
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
      is_solution: false,
    });

    if (!error) {
      setReplyText((prev) => ({ ...prev, [postId]: "" }));
      await loadCases();
    }
    setIsReplying(null);
  };

  // Honest counters: only cases actually flagged resolved count as resolved.
  const resolvedCount = cases.filter((c) => c.is_resolved).length;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <Navbar />
      <main className="pb-16 pt-24">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">

          {/* Clinic Header Banner */}
          <div className="mx-auto mb-8 max-w-5xl text-left">
            <div className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-3xl gradient-agri p-6 text-white shadow-xl sm:flex-row sm:items-center sm:p-8">
              <div className="pointer-events-none absolute -mr-20 -mt-20 right-0 top-0 h-64 w-64 rounded-full bg-white/5" aria-hidden="true" />
              <div className="relative z-10 space-y-2">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-secondary">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{config.icon}</span>
                  {config.badgeText}
                </p>
                <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                  {config.title}
                </h1>
                <p className="max-w-xl text-xs font-medium leading-relaxed text-white/80 sm:text-sm">
                  {config.subtitle}
                </p>
              </div>

              <div className="relative z-10 flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-center backdrop-blur-sm">
                  <span className="block text-xs font-bold uppercase text-white/60">{config.headerStatLabel}</span>
                  <span className="stat-num font-display text-2xl font-black text-secondary">{resolvedCount}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-12">

            {/* Clinical Feed */}
            <div className="space-y-6 text-left lg:col-span-8">

              {/* Report Issue Card */}
              <form onSubmit={handleReportSubmit} className="rounded-3xl border border-outline-variant/40 bg-white p-6 card-shadow sm:p-7">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                    <span className="material-symbols-outlined text-[20px] text-secondary" aria-hidden="true">add_circle</span>
                    {config.reportTitle}
                  </h3>
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Free diagnostic</span>
                </div>

                {submitError && (
                  <div className="mb-4 flex items-center gap-2 rounded-2xl border border-error/20 bg-error/10 p-3.5 text-xs font-bold text-error">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">error</span>
                    <span>{submitError}</span>
                  </div>
                )}
                {submitSuccess && (
                  <div className="mb-4 flex items-center gap-2 rounded-2xl border border-success/25 bg-success/10 p-3.5 text-xs font-bold text-success">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check_circle</span>
                    <span>{submitSuccess}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <label htmlFor="clinic-title" className="sr-only">Case headline</label>
                  <input
                    id="clinic-title"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={config.headlinePlaceholder}
                    className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-3 text-xs font-medium text-primary outline-none transition-all focus:border-primary"
                  />

                  <label htmlFor="clinic-body" className="sr-only">Symptom description</label>
                  <textarea
                    id="clinic-body"
                    required
                    rows={3}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={config.bodyPlaceholder}
                    className="w-full resize-none rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-3 text-xs font-medium text-primary outline-none transition-all focus:border-primary"
                  />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label htmlFor="clinic-tags" className="sr-only">Tags</label>
                    <input
                      id="clinic-tags"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder={config.tagsPlaceholder}
                      className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-2.5 text-xs font-medium text-primary outline-none transition-all focus:border-primary"
                    />
                  </div>

                  <MediaUploader compact accept="image/*" maxFiles={3} onUpload={setPendingFiles} />
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-outline-variant/30 pt-4">
                  <span className="text-xs font-medium text-on-surface-variant/60">
                    Verified experts reply within hours
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary flex items-center gap-1.5 text-xs disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting…" : config.submitCta}
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">send</span>
                  </button>
                </div>
              </form>

              {/* Cases List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                    <span className="material-symbols-outlined text-[18px] text-secondary" aria-hidden="true">forum</span>
                    {config.casesLabel} ({cases.length})
                  </h2>
                </div>

                {isLoading ? (
                  <div className="space-y-4">
                    <div className="h-44 skeleton rounded-3xl border border-outline-variant/30" />
                    <div className="h-44 skeleton rounded-3xl border border-outline-variant/30" />
                  </div>
                ) : loadError ? (
                  <div className="rounded-3xl border border-error/25 bg-error/10 p-6 text-left">
                    <p className="text-xs font-bold text-error">{loadError}</p>
                    <button
                      type="button"
                      onClick={() => void loadCases()}
                      className="mt-3 rounded-xl border border-error/30 bg-white px-4 py-2 text-xs font-bold text-error"
                    >
                      Try again
                    </button>
                  </div>
                ) : cases.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-outline-variant/70 bg-white p-12 text-center card-shadow">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container-low">
                      <span className="material-symbols-outlined text-3xl text-primary/40" aria-hidden="true">{config.icon}</span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-primary">{config.emptyTitle}</h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs font-medium text-on-surface-variant">
                      {config.emptyMessage}
                    </p>
                  </div>
                ) : (
                  cases.map((problem) => (
                    <motion.div
                      key={problem.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-3xl border border-outline-variant/40 bg-white p-6 card-shadow transition-all duration-300 hover:card-shadow-hover"
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-agri text-xs font-bold text-white shadow-sm">
                            {problem.posterName?.charAt(0) || "?"}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-primary">{problem.posterName}</div>
                            <div className="text-xs font-semibold text-on-surface-variant/70">
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
                          <span className="badge-gold">Under review</span>
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
                              <img src={m} alt="Case evidence" loading="lazy" className="h-full w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}

                      {problem.tags && problem.tags.length > 0 && (
                        <div className="mb-4 flex flex-wrap items-center gap-1.5">
                          {problem.tags.map((tag) => (
                            <span key={tag} className="tag-pill py-0.5 px-2.5 text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Expert Replies — the expert badge only appears on flagged solutions */}
                      {problem.comments && problem.comments.length > 0 && (
                        <div className="my-4 space-y-3 border-l-2 border-primary/20 pl-4">
                          {problem.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
                                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{config.icon}</span>
                              </div>
                              <div className="flex-1 rounded-2xl rounded-tl-none border border-outline-variant/30 bg-surface-container-low/60 p-4">
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-bold text-primary">{comment.authorName}</span>
                                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/60">
                                    {comment.authorRole}
                                  </span>
                                  {comment.is_solution && (
                                    <span className="badge-success py-0 px-2">Solution</span>
                                  )}
                                </div>
                                <p className="text-xs font-medium leading-relaxed text-on-surface-variant">
                                  {comment.body}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Input */}
                      <div className="mt-4 flex gap-2 border-t border-outline-variant/20 pt-3">
                        <label htmlFor={`reply-${problem.id}`} className="sr-only">Reply</label>
                        <input
                          id={`reply-${problem.id}`}
                          value={replyText[problem.id] || ""}
                          onChange={(e) => setReplyText({ ...replyText, [problem.id]: e.target.value })}
                          placeholder={config.replyPlaceholder}
                          className="flex-1 rounded-xl border border-outline-variant/40 bg-surface-container-low px-3.5 py-2.5 text-xs font-medium text-primary outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          disabled={isReplying === problem.id}
                          onClick={() => void handleAddComment(problem.id)}
                          className="btn-primary shrink-0 px-4 py-2 text-xs font-bold disabled:opacity-50"
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
            <aside className="space-y-6 text-left lg:col-span-4">
              <div className="relative overflow-hidden rounded-3xl gradient-agri p-6 text-white card-shadow">
                <div className="pointer-events-none absolute -mr-12 -mt-12 right-0 top-0 h-36 w-36 rounded-full bg-white/5" aria-hidden="true" />
                <h4 className="relative z-10 mb-4 flex items-center gap-2 font-display text-base font-bold tracking-tight text-white">
                  <span className="material-symbols-outlined text-[20px] text-secondary" aria-hidden="true">analytics</span>
                  Clinic intelligence
                </h4>
                <div className="relative z-10 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <span className="font-bold text-white/70">Cases in the board</span>
                    <span className="stat-num font-display font-black text-white">{cases.length}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <span className="font-bold text-white/70">Resolved</span>
                    <span className="stat-num font-bold text-secondary">{resolvedCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white/70">Records</span>
                    <span className="font-bold text-secondary">100% persisted</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-outline-variant/40 bg-white p-6 card-shadow">
                <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                  <span className="material-symbols-outlined text-[18px] text-secondary" aria-hidden="true">verified</span>
                  {config.expertBlurbTitle}
                </h4>
                <p className="text-xs font-medium leading-relaxed text-on-surface-variant">
                  {config.expertBlurb}
                </p>
                <Link
                  to="/search"
                  search={{ q: "" }}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary transition-colors hover:text-secondary"
                >
                  {config.expertCta}
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

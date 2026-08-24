/**
 * Network Feed — the LinkedIn-style heartbeat of AgriBusiness Pakistan.
 * Members share updates, questions, offers, and milestones; every role sees
 * field intelligence from across the ecosystem and can connect inline.
 * Posts live in problem_posts tagged "network"; comments use problem_comments.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedMember, type MemberProfile } from "@/lib/member";
import { SmartMatches } from "@/components/dashboard/SmartMatches";
import { MediaUploader } from "@/components/shared/MediaUploader";
import { useMarketRates, normalizeUnit } from "@/hooks/useMarketRates";
import {
  fetchNetworkPosts,
  insertNetworkPost,
  uploadFeedMedia,
  addFeedComment,
  KIND_META,
  FEED_KINDS,
  timeAgo,
  type FeedPost,
  type FeedKind,
} from "@/lib/feed";
import { ROLE_LABELS, ROLE_ICONS } from "@/lib/matching";
import { isAccountRole } from "@/lib/member";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [{ title: "Network Feed | AgriBusiness Pakistan" },{ name: "description", content: "Field updates, questions, offers, and milestones from Pakistan's agricultural network." }],
  }),
  component: FeedPage,
});

type Filter = "all" | FeedKind;

const FEED_PAGE_SIZE = 20;

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "AB";
}

function roleMeta(userType: string) {
  return isAccountRole(userType) ? { label: ROLE_LABELS[userType], icon: ROLE_ICONS[userType] } : { label: userType, icon: "person" };
}

function FeedPage() {
  const navigate = useNavigate();
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [limit, setLimit] = useState(FEED_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // composer state
  const [kind, setKind] = useState<FeedKind>("update");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const [composerError, setComposerError] = useState("");

  const loadFeed = useCallback(async (pageLimit: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else {
      setLoading(true);
      setLoadError("");
    }
    const { posts: fetched, error } = await fetchNetworkPosts(pageLimit);
    if (error) setLoadError(error);
    if (append) {
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...fetched.filter((p) => !seen.has(p.id))];
      });
      setLoadingMore(false);
    } else {
      setPosts(fetched);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { profile } = await getAuthenticatedMember();
      setMember(profile);
      setAuthChecked(true);
    };
    void checkAuth();
    void loadFeed(FEED_PAGE_SIZE, false);
  }, [loadFeed]);

  const publish = async () => {
    if (!member) return;
    setComposerError("");
    if (title.trim().length < 4) {
      setComposerError("Give your post a clear headline (at least 4 characters).");
      return;
    }
    if (body.trim().length < 15) {
      setComposerError("Add a little more detail (at least 15 characters) so the network can respond usefully.");
      return;
    }
    setPosting(true);

    // Upload any attached photos first; a failed upload shouldn't kill the post.
    const uploadedUrls: string[] = [];
    for (const file of pendingFiles.slice(0, 4)) {
      if (!file.type.startsWith("image/")) continue;
      const { url } = await uploadFeedMedia(member.id, file);
      if (url) uploadedUrls.push(url);
    }

    const { error } = await insertNetworkPost({
      profileId: member.id,
      title: title.trim(),
      body: body.trim(),
      kind,
      mediaUrls: uploadedUrls,
    });
    setPosting(false);
    if (error) {
      setComposerError(error);
      return;
    }
    setTitle("");
    setBody("");
    setPendingFiles([]);
    await loadFeed(FEED_PAGE_SIZE, false);
  };

  const visiblePosts = filter === "all" ? posts : posts.filter((p) => p.kind === filter);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pb-14 pt-24">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          <div className="mb-6 max-w-3xl">
            <p className="eyebrow">Network feed</p>
            <h1 className="mt-3 font-display text-3xl tracking-tight text-primary md:text-4xl">What Pakistan's fields are saying today</h1>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Harvest reports, mandi insight, questions to experts, and offers from every corner of the ecosystem — farmers, buyers,
              consultants, enterprises, and researchers in one professional conversation.
            </p>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              {/* Composer — skeleton while auth resolves so the layout never jumps */}
              {!authChecked ? (
                <section className="rounded-2xl border border-outline-variant/60 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 shrink-0 rounded-xl skeleton" />
                    <div className="flex-1 space-y-2">
                      <div className="h-6 w-2/3 rounded skeleton" />
                      <div className="h-16 w-full rounded skeleton" />
                    </div>
                  </div>
                </section>
              ) : member ? (
                <section className="rounded-2xl border border-outline-variant/60 bg-white p-5 shadow-[0_10px_28px_rgba(15,81,50,0.06)]">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-black text-on-primary">
                      {initials(member.display_name || member.full_name || member.email)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-1.5">
                        {FEED_KINDS.map((k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setKind(k)}
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                              kind === k ? "bg-primary text-on-primary" : "border border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-low"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[13px]" aria-hidden="true">{KIND_META[k].icon}</span>
                            {KIND_META[k].label}
                          </button>
                        ))}
                      </div>
                      <label htmlFor="feed-title" className="sr-only">Post headline</label>
                      <input
                        id="feed-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={110}
                        placeholder={kind === "question" ? "Your question in one line…" : "Your headline…"}
                        className="mt-3 w-full rounded-xl border border-outline bg-white px-3 py-2.5 text-sm font-semibold text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                      <label htmlFor="feed-body" className="sr-only">Post details</label>
                      <textarea
                        id="feed-body"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        maxLength={600}
                        placeholder={KIND_META[kind].prompt}
                        className="mt-2 min-h-24 w-full resize-y rounded-xl border border-outline bg-white px-3 py-2.5 text-sm leading-6 text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                      <div className="mt-3">
                        <MediaUploader compact accept="image/*" maxFiles={4} onUpload={setPendingFiles} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-on-surface-variant">{composerError ? <span className="font-bold text-error">{composerError}</span> : `${body.length}/600 · visible to the whole network`}</p>
                        <button
                          type="button"
                          disabled={posting}
                          onClick={() => void publish()}
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-on-primary shadow-[0_8px_20px_rgba(15,81,50,0.16)] transition hover:bg-primary-container disabled:opacity-60"
                        >
                          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">send</span>
                          {posting ? "Posting…" : "Post to network"}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="rounded-2xl border border-outline-variant/60 bg-white p-6 text-center shadow-[0_10px_28px_rgba(15,81,50,0.06)]">
                  <span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">lock</span>
                  <h2 className="mt-3 font-display text-xl text-primary">Join the conversation</h2>
                  <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-on-surface-variant">
                    Create your free member account to post updates, ask the network, and respond to growers and experts.
                  </p>
                  <button type="button" onClick={() => navigate({ to: "/onboarding" })} className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-on-primary">
                    Create your account
                  </button>
                </section>
              )}

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {(["all", ...FEED_KINDS] as Filter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      filter === f ? "bg-primary text-on-primary" : "control-secondary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{f === "all" ? "forum" : KIND_META[f].icon}</span>
                    {f === "all" ? "All posts" : KIND_META[f].label}
                  </button>
                ))}
                <button type="button" onClick={() => void loadFeed(FEED_PAGE_SIZE, false)} aria-label="Refresh feed" className="ml-auto inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-on-surface-variant transition hover:bg-surface-container-low">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">refresh</span>
                </button>
              </div>

              {/* Posts */}
              {loading && posts.length === 0 ? (
                <div className="space-y-4">
                  {[0, 1, 2].map((i) => <div key={i} className="h-44 skeleton rounded-2xl" />)}
                </div>
              ) : loadError ? (
                <p className="rounded-2xl border border-error/25 bg-error/10 p-4 text-xs leading-5 text-error">{loadError}</p>
              ) : visiblePosts.length === 0 ? (
                <section className="rounded-2xl border border-dashed border-outline bg-surface-container-low/60 p-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">grass</span>
                  <h2 className="mt-3 font-display text-xl text-primary">{filter === "all" ? "The feed is warming up" : `No ${KIND_META[filter as FeedKind].label.toLowerCase()} posts yet`}</h2>
                  <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-on-surface-variant">
                    {member ? "Be the first to share — a harvest note, a question, or an offer. The network grows one honest post at a time." : "Sign in and start the conversation."}
                  </p>
                </section>
              ) : (
                <div className="space-y-4">
                  {visiblePosts.map((post) => (
                    <FeedPostCard key={post.id} post={post} member={member} onCommented={() => loadFeed(limit, true)} />
                  ))}
                  {posts.length >= limit && filter === "all" && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        disabled={loadingMore}
                        onClick={() => {
                          const next = limit + FEED_PAGE_SIZE;
                          setLimit(next);
                          void loadFeed(next, false);
                        }}
                        className="rounded-xl border border-primary/30 bg-white px-6 py-3 text-xs font-bold uppercase tracking-wider text-primary transition hover:bg-primary/5 disabled:opacity-60"
                      >
                        {loadingMore ? "Loading…" : "Load more posts"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right rail */}
            <aside className="space-y-5 lg:sticky lg:top-20">
              {member ? <SmartMatches profile={member} limit={3} /> : null}
              <MandiSnapshot />
              <section className="rounded-2xl bg-primary p-5 text-on-primary">
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">spa</span>
                  One professional standard
                </h3>
                <p className="mt-2 text-xs leading-5 text-white/80">
                  Post real field information, no middleman spam. Contact details stay private until a connection is accepted.
                </p>
              </section>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function FeedPostCard({ post, member, onCommented }: { post: FeedPost; member: MemberProfile | null; onCommented: () => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [commentError, setCommentError] = useState("");

  const authorName = post.author?.display_name || "Member";
  const meta = post.author ? roleMeta(post.author.user_type) : { label: "Member", icon: "person" };
  const meta2 = KIND_META[post.kind];

  const submitComment = async () => {
    if (!member) return;
    if (commentDraft.trim().length < 3) {
      setCommentError("Write at least a few words.");
      return;
    }
    setCommenting(true);
    setCommentError("");
    const { error } = await addFeedComment({ postId: post.id, profileId: member.id, body: commentDraft });
    setCommenting(false);
    if (error) {
      setCommentError(error);
      return;
    }
    setCommentDraft("");
    await onCommented();
  };

  return (
    <article className="rounded-2xl border border-outline-variant/60 bg-white p-5 shadow-[0_10px_28px_rgba(15,81,50,0.06)]">
      <div className="flex items-start gap-3">
        <Link to="/profile/$id" params={{ id: post.profile_id }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-black text-on-primary">
          {initials(authorName)}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link to="/profile/$id" params={{ id: post.profile_id }} className="text-sm font-bold text-primary hover:underline">{authorName}</Link>
            {post.author?.is_verified ? <span className="material-symbols-outlined text-[14px] text-secondary" title="Platform verified">verified</span> : null}
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${meta2.chip}`}>
              <span className="material-symbols-outlined mr-0.5 align-[-2px] text-xs">{meta2.icon}</span>
              {meta2.label}
            </span>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-on-surface-variant">
            <span className="flex items-center gap-1 font-semibold"><span className="material-symbols-outlined text-[12px]">{meta.icon}</span>{meta.label}</span>
            {post.author?.city ? <span>· {post.author.city}</span> : null}
            <span>· {timeAgo(post.created_at)}</span>
          </p>
        </div>
      </div>

      <h3 className="mt-3 text-[15px] font-bold leading-6 text-primary">{post.title}</h3>
      <p className={cn("mt-1.5 text-[13px] leading-6 text-on-surface-variant", !expanded && "line-clamp-4")}>{post.body}</p>
      {post.body.length > 220 ? (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 text-xs font-bold text-primary hover:underline">
          {expanded ? "Show less" : "Read more"}
        </button>
      ) : null}

      {post.media_urls && post.media_urls.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {post.media_urls.slice(0, 2).map((url) => (
            <img key={url} src={url} alt="" className="h-40 w-full rounded-xl border border-outline-variant/40 object-cover" loading="lazy" />
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-4 border-t border-outline-variant/40 pt-3 text-xs font-bold text-on-surface-variant">
        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">visibility</span>{post.view_count} views</span>
        <button type="button" onClick={() => setShowComments((v) => !v)} className="flex items-center gap-1 transition hover:text-primary">
          <span className="material-symbols-outlined text-[14px]">chat_bubble</span>
          {post.comments.length} {post.comments.length === 1 ? "reply" : "replies"}
        </button>
      </div>

      {showComments ? (
        <div className="mt-3 space-y-3">
          {post.comments.map((comment) => {
            const cName = comment.author?.display_name || "Member";
            const cMeta = comment.author ? roleMeta(comment.author.user_type) : null;
            return (
              <div key={comment.id} className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container text-xs font-black text-primary">
                  {initials(cName)}
                </span>
                <div className="min-w-0 flex-1 rounded-xl bg-surface-container-low px-3 py-2">
                  <p className="flex flex-wrap items-center gap-x-2 text-xs font-bold text-primary">
                    {cName}
                    {cMeta ? <span className="font-semibold text-on-surface-variant">· {cMeta.label}</span> : null}
                    <span className="font-medium text-on-surface-variant/60">· {timeAgo(comment.created_at)}</span>
                  </p>
                  <p className="mt-1 text-xs leading-5 text-on-surface-variant">{comment.body}</p>
                </div>
              </div>
            );
          })}

          {member ? (
            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-black text-on-primary">
                {initials(member.display_name || member.full_name || member.email)}
              </span>
              <div className="min-w-0 flex-1">
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Add your field knowledge…"
                  className="min-h-16 w-full resize-y rounded-xl border border-outline bg-white px-3 py-2 text-xs leading-5 text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-error">{commentError}</p>
                  <button
                    type="button"
                    disabled={commenting}
                    onClick={() => void submitComment()}
                    className="rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-on-primary transition hover:bg-primary-container disabled:opacity-60"
                  >
                    {commenting ? "Sending…" : "Reply"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
              <Link to="/onboarding" className="font-bold text-primary hover:underline">Sign in</Link> to reply.
            </p>
          )}
        </div>
      ) : null}
    </article>
  );
}

function MandiSnapshot() {
  const { rates, loading, indicative } = useMarketRates(6);

  return (
    <section className="rounded-2xl border border-outline-variant/60 bg-white p-5 shadow-[0_10px_28px_rgba(15,81,50,0.06)]">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Mandi today</p>
        <Link to="/rates" className="text-xs font-bold text-primary hover:underline">
          Full board
        </Link>
      </div>
      {loading ? (
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-4 w-full rounded skeleton" />)}
        </div>
      ) : rates.length === 0 ? (
        <p className="mt-3 text-xs leading-5 text-on-surface-variant">
          {indicative ? "Live rates are unavailable right now." : "No rates published yet today."}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rates.map((rate) => (
            <li key={`${rate.commodity}-${rate.city}`} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-semibold text-primary">
                {rate.commodity} <span className="font-medium text-on-surface-variant">· {rate.city}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <span className="stat-num font-bold text-primary">₨ {new Intl.NumberFormat("en-PK").format(rate.modalPrice)}</span>
                {rate.unit && <span className="text-xs text-on-surface-variant/60">/{normalizeUnit(rate.unit)}</span>}
                <span
                  className={`material-symbols-outlined text-[14px] ${rate.trend === "up" ? "text-success" : rate.trend === "down" ? "text-error" : "text-on-surface-variant/40"}`}
                  aria-label={rate.trend}
                >
                  {rate.trend === "up" ? "trending_up" : rate.trend === "down" ? "trending_down" : "trending_flat"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs leading-4 text-on-surface-variant/60">
        {indicative ? "Indicative rates — verify at your local mandi." : "Verify at your local mandi before transacting."}
      </p>
    </section>
  );
}

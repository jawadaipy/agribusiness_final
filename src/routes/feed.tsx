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
import {
  fetchNetworkPosts,
  insertNetworkPost,
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
    title: "Network Feed | AgriBusiness Pakistan",
    meta: [{ name: "description", content: "Field updates, questions, offers, and milestones from Pakistan's agricultural network." }],
  }),
  component: FeedPage,
});

type Filter = "all" | FeedKind;

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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // composer state
  const [kind, setKind] = useState<FeedKind>("update");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [composerError, setComposerError] = useState("");

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const { posts: fetched, error } = await fetchNetworkPosts(60);
    if (error) setLoadError(error);
    setPosts(fetched);
    setLoading(false);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { profile } = await getAuthenticatedMember();
      setMember(profile);
      setAuthChecked(true);
    };
    void checkAuth();
    void loadFeed();
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
    const { error } = await insertNetworkPost({ profileId: member.id, title: title.trim(), body: body.trim(), kind });
    setPosting(false);
    if (error) {
      setComposerError(error);
      return;
    }
    setTitle("");
    setBody("");
    await loadFeed();
  };

  const visiblePosts = filter === "all" ? posts : posts.filter((p) => p.kind === filter);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pb-14 pt-24">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          <div className="mb-6 max-w-3xl">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-primary">
              <span className="material-symbols-outlined text-[14px]">dynamic_feed</span>
              Network feed
            </p>
            <h1 className="mt-3 font-display text-3xl tracking-tight text-primary md:text-4xl">What Pakistan's fields are saying today</h1>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Harvest reports, mandi insight, questions to experts, and offers from every corner of the ecosystem — farmers, buyers,
              consultants, enterprises, and researchers in one professional conversation.
            </p>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              {/* Composer */}
              {authChecked && member ? (
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
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold transition ${
                              kind === k ? "bg-primary text-on-primary" : "border border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-low"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[13px]">{KIND_META[k].icon}</span>
                            {KIND_META[k].label}
                          </button>
                        ))}
                      </div>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={110}
                        placeholder={kind === "question" ? "Your question in one line…" : "Your headline…"}
                        className="mt-3 w-full rounded-xl border border-outline bg-white px-3 py-2.5 text-sm font-semibold text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        maxLength={600}
                        placeholder={KIND_META[kind].prompt}
                        className="mt-2 min-h-24 w-full resize-y rounded-xl border border-outline bg-white px-3 py-2.5 text-sm leading-6 text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] text-on-surface-variant">{composerError ? <span className="font-bold text-error">{composerError}</span> : `${body.length}/600 · visible to the whole network`}</p>
                        <button
                          type="button"
                          disabled={posting}
                          onClick={() => void publish()}
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-on-primary shadow-[0_8px_20px_rgba(15,81,50,0.16)] transition hover:bg-primary-container disabled:opacity-60"
                        >
                          <span className="material-symbols-outlined text-[15px]">send</span>
                          {posting ? "Posting…" : "Post to network"}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              ) : authChecked ? (
                <section className="rounded-2xl border border-outline-variant/60 bg-white p-6 text-center shadow-[0_10px_28px_rgba(15,81,50,0.06)]">
                  <span className="material-symbols-outlined text-3xl text-primary">lock</span>
                  <h2 className="mt-3 font-display text-xl text-primary">Join the conversation</h2>
                  <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-on-surface-variant">
                    Create your free member account to post updates, ask the network, and respond to growers and experts.
                  </p>
                  <button onClick={() => navigate({ to: "/onboarding" })} className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-on-primary">
                    Create your account
                  </button>
                </section>
              ) : null}

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {(["all", ...FEED_KINDS] as Filter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition ${
                      filter === f ? "bg-primary text-on-primary" : "control-secondary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">{f === "all" ? "forum" : KIND_META[f].icon}</span>
                    {f === "all" ? "All posts" : KIND_META[f].label}
                  </button>
                ))}
                <button type="button" onClick={() => void loadFeed()} className="ml-auto inline-flex items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-bold text-on-surface-variant transition hover:bg-surface-container-low">
                  <span className="material-symbols-outlined text-[14px]">refresh</span>
                </button>
              </div>

              {/* Posts */}
              {loading && posts.length === 0 ? (
                <div className="space-y-4">
                  {[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-[#E3E1D5]" />)}
                </div>
              ) : loadError ? (
                <p className="rounded-2xl border border-error/25 bg-error/10 p-4 text-xs leading-5 text-error">{loadError}</p>
              ) : visiblePosts.length === 0 ? (
                <section className="rounded-2xl border border-dashed border-outline bg-surface-container-low/60 p-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-primary">grass</span>
                  <h2 className="mt-3 font-display text-xl text-primary">{filter === "all" ? "The feed is warming up" : `No ${KIND_META[filter as FeedKind].label.toLowerCase()} posts yet`}</h2>
                  <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-on-surface-variant">
                    {member ? "Be the first to share — a harvest note, a question, or an offer. The network grows one honest post at a time." : "Sign in and start the conversation."}
                  </p>
                </section>
              ) : (
                <div className="space-y-4">
                  {visiblePosts.map((post) => (
                    <FeedPostCard key={post.id} post={post} member={member} onCommented={loadFeed} />
                  ))}
                </div>
              )}
            </div>

            {/* Right rail */}
            <aside className="space-y-5 lg:sticky lg:top-20">
              {member ? <SmartMatches profile={member} limit={3} /> : null}
              <MandiSnapshot />
              <section className="rounded-2xl bg-primary p-5 text-on-primary">
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[16px] text-secondary">spa</span>
                  One professional standard
                </h3>
                <p className="mt-2 text-[11px] leading-5 text-white/80">
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
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${meta2.chip}`}>
              <span className="material-symbols-outlined mr-0.5 align-[-2px] text-[11px]">{meta2.icon}</span>
              {meta2.label}
            </span>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-on-surface-variant">
            <span className="flex items-center gap-1 font-semibold"><span className="material-symbols-outlined text-[12px]">{meta.icon}</span>{meta.label}</span>
            {post.author?.city ? <span>· {post.author.city}</span> : null}
            <span>· {timeAgo(post.created_at)}</span>
          </p>
        </div>
      </div>

      <h3 className="mt-3 text-[15px] font-bold leading-6 text-primary">{post.title}</h3>
      <p className={cn("mt-1.5 text-[13px] leading-6 text-on-surface-variant", !expanded && "line-clamp-4")}>{post.body}</p>
      {post.body.length > 220 ? (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 text-[11px] font-bold text-primary hover:underline">
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

      <div className="mt-3 flex items-center gap-4 border-t border-outline-variant/40 pt-3 text-[10px] font-bold text-on-surface-variant">
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
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container text-[9px] font-black text-primary">
                  {initials(cName)}
                </span>
                <div className="min-w-0 flex-1 rounded-xl bg-surface-container-low px-3 py-2">
                  <p className="flex flex-wrap items-center gap-x-2 text-[11px] font-bold text-primary">
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
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-[9px] font-black text-on-primary">
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
                  <p className="text-[10px] text-error">{commentError}</p>
                  <button
                    type="button"
                    disabled={commenting}
                    onClick={() => void submitComment()}
                    className="rounded-xl bg-primary px-3.5 py-2 text-[10px] font-bold text-on-primary transition hover:bg-primary-container disabled:opacity-60"
                  >
                    {commenting ? "Sending…" : "Reply"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-surface-container-low px-3 py-2 text-[11px] text-on-surface-variant">
              <Link to="/onboarding" className="font-bold text-primary hover:underline">Sign in</Link> to reply.
            </p>
          )}
        </div>
      ) : null}
    </article>
  );
}

function MandiSnapshot() {
  const [rates, setRates] = useState<Array<{ commodity: string; city: string; modal_price: number; unit: string; trend: string }>>([]);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    supabase
      .from("market_rates")
      .select("commodity,city,modal_price,unit,trend")
      .limit(6)
      .then(({ data, error }) => {
        if (error || !data?.length) setUnavailable(true);
        else setRates(data);
      });
  }, []);

  return (
    <section className="rounded-2xl border border-outline-variant/60 bg-white p-5 shadow-[0_10px_28px_rgba(15,81,50,0.06)]">
      <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.14em] text-on-surface-variant/65">
        <span className="material-symbols-outlined text-[14px] text-primary">store</span>
        Mandi today
      </p>
      {unavailable ? (
        <p className="mt-3 text-[11px] leading-5 text-on-surface-variant">Live rates are unavailable right now.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rates.map((rate) => (
            <li key={`${rate.commodity}-${rate.city}`} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate font-semibold text-primary">{rate.commodity} <span className="font-medium text-on-surface-variant">· {rate.city}</span></span>
              <span className="flex shrink-0 items-center gap-1">
                <span className="font-bold text-primary">₨ {new Intl.NumberFormat("en-PK").format(rate.modal_price)}</span>
                <span className={`material-symbols-outlined text-[14px] ${rate.trend === "up" ? "text-emerald-600" : rate.trend === "down" ? "text-red-500" : "text-on-surface-variant/40"}`}>
                  {rate.trend === "up" ? "trending_up" : rate.trend === "down" ? "trending_down" : "trending_flat"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[9px] leading-4 text-on-surface-variant/60">Indicative rates — verify at your local mandi before transacting.</p>
    </section>
  );
}

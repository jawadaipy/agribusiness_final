/**
 * Network feed data layer. Network updates are stored as `problem_posts`
 * rows tagged "network" with the post kind encoded as "kind:<value>" so the
 * clinical apps (which show untagged case posts) stay clean.
 */
import { supabase } from "@/lib/supabase";
import type { AccountRole } from "@/lib/member";

export const NETWORK_TAG = "network";
export const FEED_KINDS = ["update", "question", "offer", "achievement"] as const;
export type FeedKind = (typeof FEED_KINDS)[number];

export type FeedAuthor = {
  display_name: string | null;
  user_type: AccountRole | string;
  city: string | null;
  is_verified: boolean;
  avatar_url: string | null;
};

export type FeedComment = {
  id: string;
  post_id: string;
  profile_id: string;
  body: string;
  created_at: string;
  author: FeedAuthor | null;
};

export type FeedPost = {
  id: string;
  profile_id: string;
  title: string;
  body: string;
  tags: string[] | null;
  media_urls: string[] | null;
  view_count: number;
  created_at: string;
  kind: FeedKind;
  author: FeedAuthor | null;
  comments: FeedComment[];
};

export function isNetworkPost(post: { tags: string[] | null }): boolean {
  return (post.tags ?? []).includes(NETWORK_TAG);
}

export function parseKind(tags: string[] | null): FeedKind {
  const found = (tags ?? []).find((t) => t.startsWith("kind:"));
  const value = found?.slice(5);
  return (FEED_KINDS as readonly string[]).includes(value ?? "") ? (value as FeedKind) : "update";
}

const POST_SELECT = "id,profile_id,title,body,tags,media_urls,view_count,created_at";
const COMMENT_SELECT = "id,post_id,profile_id,body,created_at";

async function fetchAuthors(ids: string[]): Promise<Map<string, FeedAuthor>> {
  const map = new Map<string, FeedAuthor>();
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) return map;
  const { data } = await supabase
    .from("directory_profiles")
    .select("id,display_name,user_type,city,is_verified,avatar_url")
    .in("id", unique);
  for (const row of data ?? []) {
    map.set(row.id, {
      display_name: row.display_name,
      user_type: row.user_type,
      city: row.city,
      is_verified: row.is_verified === true,
      avatar_url: row.avatar_url ?? null,
    });
  }
  return map;
}

export async function fetchNetworkPosts(limit = 50): Promise<{ posts: FeedPost[]; error: string | null }> {
  const { data, error } = await supabase
    .from("problem_posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit * 2); // network posts are a subset; fetch wider then filter
  if (error) return { posts: [], error: error.message };

  const rows = (data ?? []).filter(isNetworkPost).slice(0, limit) as Array<{
    id: string;
    profile_id: string;
    title: string;
    body: string;
    tags: string[] | null;
    media_urls: string[] | null;
    view_count: number;
    created_at: string;
  }>;
  if (rows.length === 0) return { posts: [], error: null };

  const [authors, commentsResult] = await Promise.all([
    fetchAuthors(rows.map((r) => r.profile_id)),
    supabase.from("problem_comments").select(COMMENT_SELECT).in("post_id", rows.map((r) => r.id)).order("created_at", { ascending: true }),
  ]);

  const commentAuthors = await fetchAuthors((commentsResult.data ?? []).map((c: { profile_id: string }) => c.profile_id));

  const commentsByPost = new Map<string, FeedComment[]>();
  for (const comment of (commentsResult.data ?? []) as Array<{ id: string; post_id: string; profile_id: string; body: string; created_at: string }>) {
    const entry: FeedComment = { ...comment, author: commentAuthors.get(comment.profile_id) ?? null };
    const list = commentsByPost.get(comment.post_id) ?? [];
    list.push(entry);
    commentsByPost.set(comment.post_id, list);
  }

  const posts: FeedPost[] = rows.map((row) => ({
    ...row,
    kind: parseKind(row.tags),
    author: authors.get(row.profile_id) ?? null,
    comments: commentsByPost.get(row.id) ?? [],
  }));
  return { posts, error: null };
}

export async function insertNetworkPost(input: {
  profileId: string;
  title: string;
  body: string;
  kind: FeedKind;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from("problem_posts").insert({
    profile_id: input.profileId,
    title: input.title.trim(),
    body: input.body.trim(),
    tags: [NETWORK_TAG, `kind:${input.kind}`],
  });
  return { error: error?.message ?? null };
}

export async function addFeedComment(input: { postId: string; profileId: string; body: string }): Promise<{ error: string | null }> {
  const { error } = await supabase.from("problem_comments").insert({
    post_id: input.postId,
    profile_id: input.profileId,
    body: input.body.trim(),
  });
  return { error: error?.message ?? null };
}

export const KIND_META: Record<FeedKind, { label: string; icon: string; chip: string; prompt: string }> = {
  update: { label: "Update", icon: "newspaper", chip: "bg-primary/10 text-primary", prompt: "Share a field update, harvest news, or market observation…" },
  question: { label: "Ask the network", icon: "help", chip: "bg-secondary/25 text-[#6B4E00]", prompt: "Ask a practical question — thousands of growers and experts can answer…" },
  offer: { label: "Offer", icon: "sell", chip: "bg-emerald-100 text-emerald-800", prompt: "Offer produce, inputs, services, or a collaboration…" },
  achievement: { label: "Milestone", icon: "emoji_events", chip: "bg-amber-100 text-amber-800", prompt: "Share a milestone — certification, export deal, trial result…" },
};

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short" }).format(new Date(iso));
}

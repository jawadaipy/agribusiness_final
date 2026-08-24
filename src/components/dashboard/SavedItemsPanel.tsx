/**
 * Dashboard panel: the member's bookmarked listings and opportunities, with
 * one-click removal and links back to the marketplace / project board.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { fetchSavedItems, toggleSaved, type SavedListing, type SavedProject } from "@/lib/saved-items";

function formatPkr(value: number | null) {
  if (value === null || value === undefined) return "Price on request";
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(Number(value));
}

export function SavedItemsPanel({ profileId }: { profileId: string }) {
  const [listings, setListings] = useState<SavedListing[]>([]);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { listings: savedListings, projects: savedProjects, error: loadError } = await fetchSavedItems(profileId);
    if (loadError && /saved_items|permission|row-level/i.test(loadError)) setUnavailable(true);
    else if (loadError) setError(loadError);
    setListings(savedListings);
    setProjects(savedProjects);
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (kind: "listing" | "project", id: string) => {
    const result = await toggleSaved(profileId, kind, id);
    if (!result.error) await load();
  };

  if (loading) return <p className="rounded-xl bg-surface-container-low p-4 text-xs text-on-surface-variant">Loading your saved items…</p>;
  if (unavailable)
    return (
      <p className="rounded-xl border border-dashed border-outline bg-surface-container-low p-4 text-xs leading-5 text-on-surface-variant">
        Saved items are not available on this database yet. Apply Migration 09 (the <code className="font-bold">saved_items</code> table) to enable bookmarks.
      </p>
    );

  const empty = listings.length === 0 && projects.length === 0;

  return (
    <div className="space-y-5">
      {error ? <p className="rounded-xl border border-error/25 bg-error/10 p-3 text-xs text-error">{error}</p> : null}
      {empty ? (
        <p className="rounded-xl border border-dashed border-outline bg-surface-container-low p-4 text-xs leading-5 text-on-surface-variant">
          Nothing saved yet. Use the bookmark button on any marketplace listing or open opportunity to keep it here for follow-up.
        </p>
      ) : null}

      {listings.length > 0 ? (
        <div>
          <h3 className="mb-3 font-display text-lg text-primary">Saved listings <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{listings.length}</span></h3>
          <div className="grid gap-3 md:grid-cols-2">
            {listings.map((listing) => (
              <article key={listing.id} className="rounded-xl border border-outline-variant bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-bold text-primary">{listing.title}</h4>
                  <span className="h-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase text-primary">{listing.status}</span>
                </div>
                <p className="mt-2 text-xs font-bold text-primary">
                  {formatPkr(listing.price)}{listing.unit ? <span className="text-xs font-medium text-on-surface-variant"> / {listing.unit}</span> : null}
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">{listing.city || "City not set"}</p>
                <div className="mt-3 flex gap-2">
                  <Link to="/marketplace" className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/60 px-2.5 py-1.5 text-xs font-bold text-primary transition hover:bg-surface-container">
                    <span className="material-symbols-outlined text-[13px]">storefront</span> Marketplace
                  </Link>
                  <button type="button" onClick={() => void remove("listing", listing.id)} className="inline-flex items-center gap-1 rounded-lg border border-error/30 px-2.5 py-1.5 text-xs font-bold text-error transition hover:bg-error/10">
                    <span className="material-symbols-outlined text-[13px]">bookmark_remove</span> Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {projects.length > 0 ? (
        <div>
          <h3 className="mb-3 font-display text-lg text-primary">Saved opportunities <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{projects.length}</span></h3>
          <div className="space-y-3">
            {projects.map((project) => (
              <article key={project.id} className="rounded-xl border border-outline-variant bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-primary">{project.title}</h4>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-on-surface-variant">{project.description}</p>
                  </div>
                  <span className="h-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase text-primary">{project.status}</span>
                </div>
                <p className="mt-2 text-xs font-medium text-on-surface-variant">
                  {project.budget_min !== null || project.budget_max !== null
                    ? `${formatPkr(project.budget_min)} – ${formatPkr(project.budget_max)}`
                    : "Budget on request"}
                  {project.city ? ` · ${project.city}` : ""}
                </p>
                <div className="mt-3 flex gap-2">
                  <Link to="/projects/$id" params={{ id: project.id }} className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/60 px-2.5 py-1.5 text-xs font-bold text-primary transition hover:bg-surface-container">
                    <span className="material-symbols-outlined text-[13px]">open_in_new</span> Open
                  </Link>
                  <button type="button" onClick={() => void remove("project", project.id)} className="inline-flex items-center gap-1 rounded-lg border border-error/30 px-2.5 py-1.5 text-xs font-bold text-error transition hover:bg-error/10">
                    <span className="material-symbols-outlined text-[13px]">bookmark_remove</span> Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

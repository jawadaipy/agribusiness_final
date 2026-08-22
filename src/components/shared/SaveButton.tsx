/**
 * Bookmark toggle for listings and projects. Signed-out visitors are sent to
 * onboarding instead of failing silently.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { toggleSaved, type SavedKind } from "@/lib/saved-items";

export function SaveButton({
  kind,
  targetId,
  initiallySaved = false,
  compact = false,
  onToggled,
}: {
  kind: SavedKind;
  targetId: string;
  initiallySaved?: boolean;
  compact?: boolean;
  onToggled?: (saved: boolean) => void;
}) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSaved(initiallySaved);
  }, [initiallySaved, targetId]);

  const handleClick = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      navigate({ to: "/onboarding" });
      return;
    }
    setBusy(true);
    const result = await toggleSaved(authData.user.id, kind, targetId);
    setBusy(false);
    if (result.error) return;
    setSaved(result.saved);
    onToggled?.(result.saved);
  };

  return (
    <button
      type="button"
      onClick={(e) => void handleClick(e)}
      title={saved ? "Remove from saved" : "Save for later"}
      aria-label={saved ? "Remove from saved" : "Save for later"}
      aria-pressed={saved}
      className={`inline-flex items-center justify-center gap-1 rounded-xl border transition ${
        saved ? "border-primary/40 bg-primary/10 text-primary" : "border-outline-variant/60 bg-white text-on-surface-variant hover:border-primary/30 hover:text-primary"
      } ${compact ? "h-8 w-8" : "px-2.5 py-1.5 text-[10px] font-bold"}`}
    >
      <span className="material-symbols-outlined text-[15px]">{saved ? "bookmark_added" : "bookmark_add"}</span>
      {!compact && (saved ? "Saved" : "Save")}
    </button>
  );
}

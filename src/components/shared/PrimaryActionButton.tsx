/**
 * PrimaryActionButton – a split button that lets the user either
 *   • "Save & Publish" (primary action), or
 *   • "Save as Draft"  (dropdown secondary action).
 *
 * Usage:
 *   <PrimaryActionButton
 *     publishLabel="Publish listing"
 *     onPublish={() => handleSubmit('published')}
 *     onDraft={() => handleSubmit('draft')}
 *     loading={submitting}
 *   />
 */
import { useState } from "react";

interface Props {
  publishLabel?: string;
  draftLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onPublish: () => void;
  onDraft: () => void;
}

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold text-on-primary shadow-[0_8px_20px_rgba(15,81,50,0.18)] transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60";

export function PrimaryActionButton({
  publishLabel = "Save & Publish",
  draftLabel = "Save as Draft",
  loading = false,
  disabled = false,
  onPublish,
  onDraft,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-flex items-stretch">
      {/* Main publish button */}
      <button
        type="submit"
        disabled={loading || disabled}
        onClick={onPublish}
        className={`${btnBase} rounded-r-none pr-4`}
      >
        {loading ? (
          <span className="material-symbols-outlined animate-spin text-[16px]">
            progress_activity
          </span>
        ) : (
          <span className="material-symbols-outlined text-[16px]">
            publish
          </span>
        )}
        {loading ? "Saving…" : publishLabel}
      </button>

      {/* Dropdown toggle */}
      <button
        type="button"
        disabled={loading || disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center rounded-l-none rounded-r-xl border-l border-primary-container/40 bg-primary px-2 py-3 text-on-primary transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-[18px]">
          arrow_drop_down
        </span>
      </button>

      {/* Dropdown menu */}
      {open && (
        <>
          {/* Click-away backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <ul className="absolute bottom-full left-0 z-20 mb-1 min-w-[180px] overflow-hidden rounded-xl border border-outline-variant/60 bg-white shadow-xl">
            <li>
              <button
                type="button"
                disabled={loading || disabled}
                onClick={() => {
                  setOpen(false);
                  onDraft();
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-xs font-bold text-primary transition hover:bg-primary/10 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">
                  save
                </span>
                {draftLabel}
              </button>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}

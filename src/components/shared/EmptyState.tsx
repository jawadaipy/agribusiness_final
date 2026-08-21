import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * EmptyState — contextual, specific messaging. Never "No results found."
 *
 * Usage:
 *   <EmptyState
 *     icon="search_off"
 *     title="No consultants match 'wheat rust' yet"
 *     description="Try Plant Clinic to post it as a problem and get expert eyes directly."
 *     actionLabel="Post to Plant Clinic"
 *     actionHref="/apps/plant-clinic"
 *   />
 */
export function EmptyState({
  icon = "inbox",
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-label={title}
      className={cn(
        "flex flex-col items-center justify-center text-center py-20 px-8",
        className
      )}
    >
      <div className="w-20 h-20 rounded-[2rem] bg-surface-container-high flex items-center justify-center mb-8">
        <span
          className="material-symbols-outlined text-[40px] text-on-surface-variant/40"
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>

      <h3 className="font-display text-xl font-bold text-primary mb-3 tracking-tight max-w-sm">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-on-surface-variant leading-relaxed max-w-sm mb-8 font-medium">
          {description}
        </p>
      )}

      {(actionLabel && actionHref) && (
        <Link
          to={actionHref}
          className="px-8 py-4 bg-primary text-on-primary rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-primary-container transition-all shadow-xl shadow-primary/20"
        >
          {actionLabel}
        </Link>
      )}

      {(actionLabel && onAction && !actionHref) && (
        <button
          onClick={onAction}
          className="px-8 py-4 bg-primary text-on-primary rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-primary-container transition-all shadow-xl shadow-primary/20"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

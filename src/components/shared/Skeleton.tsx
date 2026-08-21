import { cn } from "@/lib/utils";

// ----------------------------------------------------------------
// SkeletonCard — for listing and project card placeholders
// ----------------------------------------------------------------
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-white rounded-[2rem] border border-outline-variant/30 overflow-hidden flex flex-col",
        className
      )}
    >
      {/* Image area */}
      <div className="skeleton w-full aspect-[4/3]" />
      {/* Content */}
      <div className="p-8 flex flex-col gap-4">
        <div className="skeleton h-3 w-1/3 rounded-full" />
        <div className="skeleton h-5 w-4/5 rounded-lg" />
        <div className="skeleton h-4 w-2/3 rounded-lg" />
        <div className="skeleton h-4 w-1/2 rounded-lg" />
        <div className="mt-4 skeleton h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// SkeletonText — for body text placeholders
// ----------------------------------------------------------------
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "skeleton h-4 rounded-full",
            i === lines - 1 ? "w-3/5" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

// ----------------------------------------------------------------
// SkeletonAvatar — for profile picture placeholders
// ----------------------------------------------------------------
export function SkeletonAvatar({
  size = "md",
  rounded = "full",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  rounded?: "full" | "2xl" | "3xl";
}) {
  const sizeMap = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-20 h-20",
    xl: "w-36 h-36",
  };
  const radiusMap = {
    full: "rounded-full",
    "2xl": "rounded-2xl",
    "3xl": "rounded-3xl",
  };
  return (
    <div
      aria-hidden="true"
      className={cn("skeleton shrink-0", sizeMap[size], radiusMap[rounded])}
    />
  );
}

// ----------------------------------------------------------------
// SkeletonProfileCard — full profile card skeleton
// ----------------------------------------------------------------
export function SkeletonProfileCard() {
  return (
    <div
      aria-hidden="true"
      className="bg-white rounded-[2.5rem] border border-outline-variant/30 p-8 flex flex-col gap-6"
    >
      <div className="flex items-center gap-4">
        <SkeletonAvatar size="md" />
        <div className="flex-1 space-y-3">
          <div className="skeleton h-4 w-2/3 rounded-full" />
          <div className="skeleton h-3 w-1/2 rounded-full" />
        </div>
      </div>
      <SkeletonText lines={2} />
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-7 w-20 rounded-full" />
        ))}
      </div>
      <div className="skeleton h-10 w-full rounded-xl" />
    </div>
  );
}

// ----------------------------------------------------------------
// SkeletonProjectCard — for project list items
// ----------------------------------------------------------------
export function SkeletonProjectCard() {
  return (
    <div
      aria-hidden="true"
      className="bg-white p-8 rounded-[2.5rem] border border-outline-variant/30 flex flex-col md:flex-row gap-8"
    >
      <div className="flex-1 space-y-4">
        <div className="skeleton h-4 w-24 rounded-full" />
        <div className="skeleton h-6 w-3/4 rounded-lg" />
        <div className="flex gap-4">
          <div className="skeleton h-4 w-28 rounded-full" />
          <div className="skeleton h-4 w-20 rounded-full" />
          <div className="skeleton h-4 w-24 rounded-full" />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="skeleton h-10 w-20 rounded-xl" />
      </div>
    </div>
  );
}

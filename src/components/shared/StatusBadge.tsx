import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusType = "trial" | "active" | "expired" | "pending-approval";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variants = {
    trial: {
      label: "7-Day Trial",
      className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
    },
    active: {
      label: "Active",
      className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
    },
    expired: {
      label: "Expired",
      className: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800"
    },
    "pending-approval": {
      label: "Pending",
      className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
    }
  };

  const current = variants[status];

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "font-bold uppercase tracking-widest text-[10px] px-2 py-0.5 rounded-md border",
        current.className,
        className
      )}
    >
      {current.label}
    </Badge>
  );
}

import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

export type UserType = "student" | "company" | "consultant" | "farmer" | "buyer" | "org";

interface ProfileCardProps {
  id: string;
  type: UserType;
  name: string;
  title: string;
  location: string;
  rating?: number;
  keywords?: string[];
  isVerified?: boolean;
  image?: string;
  className?: string;
}

/** Distinct chip color per role — all six read differently at a glance. */
const typeColors: Record<UserType, string> = {
  student: "bg-surface-container text-on-surface-variant border-outline-variant",
  company: "bg-primary/10 text-primary border-primary/25",
  consultant: "bg-secondary-container text-on-secondary-container border-secondary/30",
  farmer: "bg-success/10 text-success border-success/25",
  buyer: "bg-primary-container text-on-primary-container border-primary-container",
  org: "bg-surface-container-high text-primary border-outline",
};

const typeLabels: Record<UserType, string> = {
  student: "Student",
  company: "Company",
  consultant: "Consultant",
  farmer: "Farmer / Producer",
  buyer: "Buyer / Trader / Miller",
  org: "Organisation",
};

const typeIcons: Record<UserType, string> = {
  student: "school",
  company: "domain",
  consultant: "psychology",
  farmer: "agriculture",
  buyer: "shopping_cart",
  org: "corporate_fare",
};

export function ProfileCard({
  id,
  type,
  name,
  title,
  location,
  rating,
  keywords = [],
  isVerified = false,
  image,
  className,
}: ProfileCardProps) {
  const [imgError, setImgError] = useState(false);

  // Initials fallback (max 2 chars, resilient to double spaces)
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "··";

  return (
    <article
      className={cn(
        "flex flex-col gap-5 rounded-3xl border border-outline-variant/30 bg-white p-6 text-left",
        "transition-shadow duration-300 hover:card-shadow-hover",
        className,
      )}
    >
      {/* Header: avatar + name + verified badge */}
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          {image && !imgError ? (
            <img
              src={image}
              alt={`${name}'s profile photo`}
              onError={() => setImgError(true)}
              loading="lazy"
              className="h-16 w-16 rounded-2xl border-2 border-outline-variant/20 object-cover"
            />
          ) : (
            /* Initials fallback — never shows broken image icon */
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-outline-variant/20 bg-primary">
              <span className="text-lg font-bold text-white">{initials}</span>
            </div>
          )}
          {isVerified && (
            <div
              className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-secondary text-on-secondary shadow"
              aria-label="Verified member"
              title="Verified member"
            >
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">verified</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold tracking-tight text-primary">{name}</h3>
          <p className="line-clamp-1 text-xs font-medium text-on-surface-variant">{title}</p>
          <span
            className={cn(
              "mt-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.12em]",
              typeColors[type],
            )}
          >
            <span className="material-symbols-outlined text-[12px]" aria-hidden="true">{typeIcons[type]}</span>
            {typeLabels[type]}
          </span>
        </div>
      </div>

      {/* Location + Rating */}
      <div className="flex items-center gap-6 text-xs font-medium text-on-surface-variant">
        <span className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">location_on</span>
          {location}
        </span>
        {rating !== undefined && (
          <span className="flex items-center gap-1.5" aria-label={`Rating: ${rating} out of 5`}>
            <span className="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">star</span>
            <span className="font-bold text-primary">{Number(rating).toFixed(1)}</span>
          </span>
        )}
      </div>

      {/* Keywords */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {keywords.slice(0, 4).map((kw) => (
            <span
              key={kw}
              className="rounded-lg border border-outline-variant/20 bg-surface-container-low px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-primary"
            >
              {kw}
            </span>
          ))}
          {keywords.length > 4 && (
            <span className="rounded-lg border border-outline-variant/20 bg-surface-container-low px-2.5 py-1 text-xs font-bold text-on-surface-variant/60">
              +{keywords.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto flex flex-col gap-3 pt-1">
        <Link
          to="/profile/$id"
          params={{ id }}
          className="w-full rounded-2xl bg-primary py-3.5 text-center text-xs font-bold uppercase tracking-widest text-on-primary transition-all hover:bg-primary-container"
          aria-label={`View ${name}'s full profile`}
        >
          View Profile
        </Link>
      </div>
    </article>
  );
}

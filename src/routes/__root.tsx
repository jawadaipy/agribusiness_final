import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { LanguageProvider, useTranslation } from "@/lib/i18n";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";
import { cn } from "@/lib/utils";

function NotFoundComponent() {
  const { t, isRTL } = useTranslation();
  return (
    <div className={cn("flex min-h-screen items-center justify-center bg-background px-4", isRTL && "rtl")}>
      <div className="max-w-md text-center">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-[40px] text-primary">search_off</span>
        </div>
        <h1 className="text-3xl font-display font-bold text-primary tracking-tight">
          {t("not_found_title")}
        </h1>
        <p className="mt-3 text-sm text-on-surface-variant font-medium leading-relaxed">
          {t("not_found_sub")}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-xs font-bold uppercase tracking-widest text-on-primary transition-all hover:bg-primary-container shadow-md"
          >
            {t("not_found_cta")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("Application error:", error);
  const router = useRouter();

  const { t, isRTL } = useTranslation();

  return (
    <div className={cn("flex min-h-screen items-center justify-center bg-background px-4", isRTL && "rtl")}>
      <div className="max-w-md text-center">
        <div className="w-20 h-20 rounded-3xl bg-error/10 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-[40px] text-error">error</span>
        </div>
        <h1 className="text-3xl font-display font-bold text-primary tracking-tight">
          {t("error_title")}
        </h1>
        <p className="mt-3 text-sm text-on-surface-variant font-medium leading-relaxed mb-6">
          {t("error_sub")}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-xs font-bold uppercase tracking-widest text-on-primary transition-all hover:bg-primary-container shadow-md"
          >
            {t("error_retry")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-primary bg-transparent px-6 py-3 text-xs font-bold uppercase tracking-widest text-primary transition-all hover:bg-primary hover:text-on-primary"
          >
            {t("error_home")}
          </a>
        </div>
        <div className="mt-8 pt-6 border-t border-outline-variant/40">
          <p className="text-xs text-on-surface-variant font-medium mb-3">Need assistance?</p>
          <WhatsAppButton phone="+923001234567" variant="ghost" label="Contact AgriBusiness Support" />
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AgriBusiness — Pakistan's Premier Agri-Tech Marketplace" },
      { name: "description", content: "Empowering Pakistan's agriculture sector. Connect with farmers, experts, suppliers, and institutions." },
      { property: "og:title", content: "AgriBusiness Pakistan" },
      { property: "og:description", content: "Pakistan's premier digital agriculture network and B2B marketplace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "alternate icon", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800&display=swap" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <LanguageProvider>
          <OfflineBanner />
          {children}
        </LanguageProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}

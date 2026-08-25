import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useNotifications } from "@/hooks/useNotifications";
import type { User } from "@supabase/supabase-js";

interface NavUser {
  name: string;
  initials: string;
  userType: string;
  email: string;
}

/** Map a Supabase auth user to the navbar identity — the single implementation. */
function mapUser(user: User): NavUser {
  const name =
    (user.user_metadata?.["full_name"] as string) || user.email?.split("@")[0] || "Member";
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "ME";
  return {
    name,
    initials,
    userType: (user.user_metadata?.["user_type"] as string) || "Member",
    email: user.email || "",
  };
}

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [navSearch, setNavSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<NavUser | null>(null);

  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(profileId);

  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t, lang, setLang } = useTranslation();
  const { location } = useRouterState();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 15);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  // Close on outside click or Escape (keyboard users can dismiss too)
  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Load identity from the authenticated Supabase session only.
  // One subscription for the component's lifetime — no re-subscribe per route.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setProfileId(data.session.user.id);
        setCurrentUser(mapUser(data.session.user));
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setProfileId(session.user.id);
        setCurrentUser(mapUser(session.user));
      } else {
        setProfileId(null);
        setCurrentUser(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUserDropdownOpen(false);
    setMobileOpen(false);
    navigate({ to: "/" });
  }, [navigate]);

  const submitSearch = (value: string) => {
    const q = value.trim();
    if (!q) return;
    setMobileOpen(false);
    navigate({ to: "/search", search: { q } });
  };

  const navLinks = [
    { label: t("nav_feed"), to: "/feed" as const, icon: "dynamic_feed" },
    { label: t("nav_marketplace"), to: "/apps/agri-biz" as const, icon: "storefront" },
    { label: t("nav_rates"), to: "/rates" as const, icon: "candlestick_chart" },
    { label: t("nav_projects"), to: "/projects" as const, icon: "engineering" },
    { label: t("nav_schemes"), to: "/resources" as const, icon: "account_balance" },
    { label: t("nav_network"), to: "/search" as const, icon: "groups" },
    { label: t("nav_apps"), to: "/apps" as const, icon: "apps" },
  ];

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <nav
      ref={menuRef}
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300 bg-white/92 backdrop-blur-md border-b h-16",
        isScrolled ? "border-black/10 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" : "border-black/[0.06]",
      )}
      aria-label="Main navigation"
    >
      <div className="flex h-full max-w-container-max items-center justify-between gap-2 px-margin-mobile md:gap-4 md:px-margin-desktop mx-auto">

        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2 shrink-0 group"
          aria-label="AgriBusiness — go to homepage"
        >
          <div className="w-8 h-8 rounded-[10px] bg-primary flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
            <span className="material-symbols-outlined text-[18px] text-secondary" aria-hidden="true">spa</span>
          </div>
          <span className="font-display text-[17px] font-semibold tracking-[-0.02em] text-primary">
            AgriBusiness
            <span className="text-secondary">.pk</span>
          </span>
        </Link>

        {/* Desktop Search */}
        <div className="hidden md:flex flex-1 max-w-xs mx-4 relative">
          <label htmlFor="global-search" className="sr-only">
            Search the network
          </label>
          <span
            className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none text-[18px]"
            aria-hidden="true"
          >
            search
          </span>
          <input
            id="global-search"
            type="search"
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitSearch(navSearch);
            }}
            className={cn(
              "w-full rounded-lg py-2 pl-10 pr-4 text-xs focus:outline-none transition-all font-medium",
              "bg-black/[0.03] border border-black/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 placeholder:text-on-surface-variant/50",
            )}
            placeholder={lang === "ur" ? "تلاش کریں..." : "Search people, produce… press Enter"}
          />
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "press relative flex h-9 items-center rounded-lg px-2.5 text-[13px] font-medium transition-colors duration-150",
                isActive(link.to)
                  ? "text-primary"
                  : "text-black/60 hover:text-black hover:bg-black/[0.04]",
              )}
              aria-current={isActive(link.to) ? "page" : undefined}
            >
              {link.label}
              <span
                className={cn(
                  "absolute inset-x-2.5 bottom-0.5 h-[2px] rounded-full bg-primary transition-all duration-200",
                  isActive(link.to) ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0",
                )}
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-1 sm:ml-2">
          {/* Language toggle — available on every screen size (icon-only on phones) */}
          <button
            onClick={() => setLang(lang === "en" ? "ur" : "en")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold text-black/60 hover:text-primary hover:bg-black/[0.04] transition-colors cursor-pointer sm:w-auto sm:gap-1.5 sm:px-2.5"
            aria-label={`Switch to ${lang === "en" ? "Urdu" : "English"}`}
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">language</span>
            <span className="hidden sm:inline">{t("nav_lang_toggle")}</span>
          </button>

          {/* Notification bell — only shown when logged in */}
          {currentUser && (
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
            />
          )}

          {/* === LOGGED IN STATE === */}
          {currentUser ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                aria-haspopup="menu"
                aria-expanded={userDropdownOpen}
                className="press flex items-center gap-2 h-9 px-1.5 rounded-lg border border-black/10 bg-white hover:bg-black/[0.03] transition-colors cursor-pointer group"
              >
                <div className="w-6 h-6 rounded-md bg-primary text-white flex items-center justify-center font-bold text-xs">
                  {currentUser.initials}
                </div>
                <div className="hidden sm:flex flex-col text-left pr-0.5">
                  <span className="text-xs font-semibold leading-tight line-clamp-1 text-black">
                    {currentUser.name}
                  </span>
                  <span className="text-xs font-medium text-black/50 capitalize">
                    {currentUser.userType}
                  </span>
                </div>
                <span
                  className="material-symbols-outlined text-[16px] text-on-surface-variant transition-transform duration-200"
                  style={{ transform: userDropdownOpen ? "rotate(180deg)" : "none" }}
                  aria-hidden="true"
                >
                  expand_more
                </span>
              </button>

              {/* Profile Dropdown Menu */}
              {userDropdownOpen && (
                <div role="menu" className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl border border-outline-variant/40 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left overflow-hidden">
                  {/* Top accent */}
                  <div className="h-0.5 -mx-2 -mt-2 mb-2 bg-gradient-to-r from-primary via-secondary to-primary opacity-60" aria-hidden="true" />

                  <div className="px-3 py-2.5 border-b border-outline-variant/30 mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl gradient-agri text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                        {currentUser.initials}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-primary truncate">{currentUser.name}</p>
                        <p className="text-xs text-on-surface-variant/60 truncate">
                          {currentUser.email || currentUser.userType}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <Link
                      to={"/profile/me" as string}
                      onClick={() => setUserDropdownOpen(false)}
                      role="menuitem"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-primary hover:bg-primary/8 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-secondary" aria-hidden="true">account_box</span>
                      View &amp; Edit Profile
                    </Link>

                    <Link
                      to="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      role="menuitem"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-primary hover:bg-primary/8 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">dashboard</span>
                      Workspace Dashboard
                    </Link>

                    <Link
                      to="/apps/agri-biz"
                      onClick={() => setUserDropdownOpen(false)}
                      role="menuitem"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-primary hover:bg-primary/8 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">add_business</span>
                      Post a Listing
                    </Link>

                    <Link
                      to="/pricing"
                      onClick={() => setUserDropdownOpen(false)}
                      role="menuitem"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-amber-600" aria-hidden="true">workspace_premium</span>
                      Pricing &amp; Plans
                    </Link>

                    <div className="h-px bg-outline-variant/30 my-1" aria-hidden="true" />

                    <button
                      onClick={handleSignOut}
                      role="menuitem"
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-error hover:bg-error/8 transition-colors text-left cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/onboarding"
                className="hidden md:flex h-9 items-center px-3 rounded-lg text-[13px] font-semibold text-black/70 hover:text-black transition-colors cursor-pointer"
              >
                Sign in
              </Link>
              <Link
                to="/onboarding"
                className="press flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 sm:px-4 text-[13px] font-semibold text-white hover:bg-primary-container transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">person_add</span>
                <span className="hidden sm:inline">Join free</span>
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-black/70 hover:bg-black/[0.05] hover:text-black transition-colors cursor-pointer"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
              {mobileOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          id="mobile-nav"
          role="dialog"
          aria-label="Mobile navigation menu"
          className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-outline-variant/30 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 max-h-[85vh] overflow-y-auto"
        >
          {/* Top gradient accent */}
          <div className="h-0.5 bg-gradient-to-r from-primary via-secondary to-primary opacity-70" aria-hidden="true" />

          {/* If Logged In: show user card */}
          {currentUser && (
            <div className="mx-4 mt-4 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl gradient-agri text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                {currentUser.initials}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-bold text-primary text-sm truncate">{currentUser.name}</div>
                <div className="text-xs text-secondary font-bold uppercase tracking-wider">{currentUser.userType}</div>
              </div>
              <Link
                to={"/profile/me" as string}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold shrink-0"
              >
                Profile
              </Link>
            </div>
          )}

          {/* Search on mobile — wired to /search like the desktop bar */}
          <form
            className="px-4 pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch(mobileSearch);
            }}
          >
            <label htmlFor="mobile-global-search" className="sr-only">
              Search the network
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none text-[18px]" aria-hidden="true">
                search
              </span>
              <input
                id="mobile-global-search"
                type="search"
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:border-primary transition-colors font-medium"
                placeholder={lang === "ur" ? "تلاش کریں..." : "Search people, produce…"}
              />
            </div>
          </form>

          <nav className="px-4 py-3 space-y-1 text-left" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors",
                  isActive(link.to)
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-primary",
                )}
                aria-current={isActive(link.to) ? "page" : undefined}
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="px-4 pb-6 pt-2 border-t border-outline-variant/20 flex flex-col gap-2">
            {currentUser ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-bold text-xs uppercase tracking-wider shadow-md"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">dashboard</span>
                  Workspace Dashboard
                </Link>
                <Link
                  to={"/profile/me" as string}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-outline-variant/50 text-xs font-bold text-primary hover:bg-surface-container-low transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">account_box</span>
                  My Profile
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-error/30 bg-error/5 text-xs font-bold text-error cursor-pointer hover:bg-error/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">logout</span>
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/onboarding"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-primary text-white font-bold text-xs uppercase tracking-wider shadow-md hover:bg-primary-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">person_add</span>
                  Join Free — Sign Up
                </Link>
                <Link
                  to="/onboarding"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-primary/40 text-primary font-bold text-xs uppercase tracking-wider hover:bg-primary/5 transition-colors"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

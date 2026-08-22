import { Link, useRouterState } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useNotifications } from "@/hooks/useNotifications";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    initials: string;
    userType: string;
    email: string;
  } | null>(null);

  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(profileId);

  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t, lang, setLang } = useTranslation();
  const { location } = useRouterState();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 15);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load identity from the authenticated Supabase session only.
  const checkAuthState = () => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const user = data.session.user;
        const name =
          (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "Member";
        const initials =
          name
            .split(" ")
            .map((w: string) => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "ME";

        setProfileId(user.id);
        setCurrentUser({
          name: name,
          initials: initials,
          userType: (user.user_metadata?.user_type as string) || "Member",
          email: user.email || "",
        });
      } else {
        setProfileId(null);
        setCurrentUser(null);
      }
    });
  };

  useEffect(() => {
    checkAuthState();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user = session.user;
        const name =
          (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "Member";
        const initials =
          name
            .split(" ")
            .map((w: string) => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "ME";

        setProfileId(user.id);
        setCurrentUser({
          name: name,
          initials: initials,
          userType: (user.user_metadata?.user_type as string) || "Member",
          email: user.email || "",
        });
      } else {
        setProfileId(null);
        setCurrentUser(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [location.pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUserDropdownOpen(false);
    window.location.href = "/";
  };

  const navLinks = [
    { label: t("nav_feed"), to: "/feed" as const, icon: "dynamic_feed" },
    { label: t("nav_marketplace"), to: "/apps/agri-biz" as const, icon: "storefront" },
    { label: "Browse Listings", to: "/marketplace" as const, icon: "inventory_2" },
    { label: t("nav_projects"), to: "/projects" as const, icon: "engineering" },
    { label: t("nav_schemes"), to: "/resources" as const, icon: "account_balance" },
    { label: t("nav_network"), to: "/search" as const, icon: "groups" },
    { label: "Our Apps", to: "/apps" as const, icon: "apps" },
  ];

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <nav
      ref={menuRef}
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300",
        isScrolled
          ? "bg-white/95 backdrop-blur-xl border-b border-outline-variant/40 shadow-md h-16"
          : "bg-white/90 backdrop-blur-md border-b border-outline-variant/20 shadow-sm h-18",
      )}
      aria-label="Main navigation"
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-primary opacity-80" />

      <div className="flex items-center justify-between px-margin-mobile md:px-margin-desktop h-full max-w-container-max mx-auto gap-4">

        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2.5 font-display text-xl font-bold text-primary tracking-tight shrink-0 group"
          aria-label="AgriBusiness — go to homepage"
        >
          <div className="w-9 h-9 rounded-xl gradient-agri flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-200 relative overflow-hidden">
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0" />
            <span className="material-symbols-outlined text-[20px] text-secondary relative z-10">
              spa
            </span>
          </div>
          <span className="tracking-tight">
            Agri<span className="text-primary">Business</span><span className="text-secondary">.</span>
          </span>
        </Link>

        {/* Desktop Search */}
        <div className="hidden md:flex flex-1 max-w-xs mx-4 relative">
          <label htmlFor="global-search" className="sr-only">
            Search marketplace
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
            className="w-full bg-surface-container-low/70 border border-outline-variant/50 rounded-full py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium placeholder:text-on-surface-variant/50"
            placeholder={lang === "ur" ? "تلاش کریں..." : "Search network, products..."}
            aria-label="Search marketplace"
          />
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "press relative flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 font-bold text-[11px] uppercase tracking-wider transition-all duration-200",
                isActive(link.to)
                  ? "bg-primary/8 text-primary"
                  : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
              )}
              aria-current={isActive(link.to) ? "page" : undefined}
            >
              {link.label}
              <span
                className={cn(
                  "absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-secondary transition-all duration-200",
                  isActive(link.to) ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0",
                )}
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-2">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "en" ? "ur" : "en")}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-outline-variant/50 text-[10px] font-bold text-on-surface-variant hover:border-primary hover:text-primary hover:bg-primary/5 transition-all uppercase tracking-wider cursor-pointer"
            aria-label={`Switch to ${lang === "en" ? "Urdu" : "English"}`}
          >
            <span className="material-symbols-outlined text-[14px]">language</span>
            {t("nav_lang_toggle")}
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
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-outline-variant/50 hover:border-primary/40 bg-surface-container-low hover:bg-white transition-all cursor-pointer shadow-sm hover:shadow-md group"
              >
                <div className="w-7 h-7 rounded-lg gradient-agri text-white flex items-center justify-center font-bold text-[11px] shadow-sm group-hover:scale-105 transition-transform">
                  {currentUser.initials}
                </div>
                <div className="hidden sm:flex flex-col text-left pr-0.5">
                  <span className="text-xs font-bold text-primary leading-tight line-clamp-1">
                    {currentUser.name}
                  </span>
                  <span className="text-[9px] font-semibold text-secondary uppercase tracking-wider">
                    {currentUser.userType}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant transition-transform duration-200" style={{ transform: userDropdownOpen ? "rotate(180deg)" : "none" }}>
                  expand_more
                </span>
              </button>

              {/* Profile Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl border border-outline-variant/40 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left overflow-hidden">
                  {/* Top accent */}
                  <div className="h-0.5 -mx-2 -mt-2 mb-2 bg-gradient-to-r from-primary via-secondary to-primary opacity-60" />

                  <div className="px-3 py-2.5 border-b border-outline-variant/30 mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl gradient-agri text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                        {currentUser.initials}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-primary truncate">{currentUser.name}</p>
                        <p className="text-[10px] text-on-surface-variant/60 truncate">
                          {currentUser.email || currentUser.userType}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <Link
                      to="/profile/me"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-primary hover:bg-primary/8 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-secondary">account_box</span>
                      View & Edit Profile
                    </Link>

                    <Link
                      to="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-primary hover:bg-primary/8 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-primary">dashboard</span>
                      Workspace Dashboard
                    </Link>

                    <Link
                      to="/apps/agri-biz"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-primary hover:bg-primary/8 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-primary">add_business</span>
                      Post a Listing
                    </Link>

                    <div className="h-px bg-outline-variant/30 my-1" />

                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-error hover:bg-error/8 transition-colors text-left cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
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
                className="hidden md:block text-on-surface-variant font-bold text-[11px] uppercase tracking-wider hover:text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-surface-container-low cursor-pointer"
              >
                Sign In
              </Link>
              <Link
                to="/onboarding"
                className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-[11px] uppercase tracking-wider hover:bg-primary-container transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>Join Free</span>
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors cursor-pointer border border-outline-variant/40"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            <span className="material-symbols-outlined text-[22px]">
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
          <div className="h-0.5 bg-gradient-to-r from-primary via-secondary to-primary opacity-70" />

          {/* If Logged In: Show user card */}
          {currentUser && (
            <div className="mx-4 mt-4 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl gradient-agri text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                {currentUser.initials}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-bold text-primary text-sm truncate">{currentUser.name}</div>
                <div className="text-[10px] text-secondary font-bold uppercase tracking-wider">{currentUser.userType}</div>
              </div>
              <Link
                to="/profile/me"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold shrink-0"
              >
                Profile
              </Link>
            </div>
          )}

          {/* Search on mobile */}
          <div className="px-4 pt-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none text-[18px]" aria-hidden="true">
                search
              </span>
              <input
                type="search"
                className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:border-primary transition-colors font-medium"
                placeholder={lang === "ur" ? "تلاش کریں..." : "Search marketplace..."}
              />
            </div>
          </div>

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
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                )}
                aria-current={isActive(link.to) ? "page" : undefined}
              >
                <span className="material-symbols-outlined text-[18px]">{link.icon}</span>
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
                  <span className="material-symbols-outlined text-[16px]">dashboard</span>
                  Workspace Dashboard
                </Link>
                <Link
                  to="/profile/me"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-outline-variant/50 text-xs font-bold text-primary hover:bg-surface-container-low transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">account_box</span>
                  My Profile
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-error/30 bg-error/5 text-xs font-bold text-error cursor-pointer hover:bg-error/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
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
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
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

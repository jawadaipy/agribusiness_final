import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { formatCooldown, getAuthFeedback } from "@/lib/auth-feedback";
import { CITIES } from "@/lib/constants";
import { validatePKPhone } from "@/lib/format";
import { roleDefinition } from "@/lib/roles";
import { recordSessionLogin } from "@/lib/member";

const ROLE_IDS = ["farmer", "buyer", "consultant", "company", "student"] as const;

export const Route = createFileRoute("/onboarding")({
  validateSearch: (search: Record<string, unknown>): { role?: string | undefined } => ({
    role: typeof search["role"] === "string" ? search["role"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Account Portal | AgriBusiness Pakistan" },
      {
        name: "description",
        content:
          "Sign in or register for your AgriBusiness account and join the premium agri-tech ecosystem.",
      },
      { property: "og:title", content: "Join AgriBusiness" },
      {
        property: "og:description",
        content: "Create your professional agricultural profile today.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: OnboardingPage,
});

/** Primary directory sectors requested for the platform. Keywords refine, but never replace, this choice. */
export const PRIMARY_SECTORS = ["Agriculture", "Engineering", "Basic Sciences", "Energy", "DVM", "Nursing"] as const;

export const OFFICIAL_DISCIPLINES = [
  "Agronomy & Crop Production", "Horticulture & Orchards", "Soil & Water Management",
  "Agricultural Engineering", "Civil & Mechanical Engineering", "Electrical & Electronics",
  "Renewable & Solar Energy", "Animal Science & Poultry", "Veterinary Medicine",
  "Food Science & Technology", "Basic Sciences", "Nursing & Health Diagnostics",
  "Business & Agribusiness", "Computer Science & IT", "Research & Education",
  "Seeds & Varieties", "Fertilizers & Crop Nutrition", "Pest & Disease Management",
  "Irrigation & Water Pumps", "Precision Agri-Tech", "Machinery & Equipment",
  "Export & Trade Advisory", "Laboratory Equipment & Chemicals", "Other Specialism",
];

const ROLE_DETAIL_FIELDS: Record<string, { label: string; first: string; second: string; tags: string }> = {
  farmer: { label: "Farm profile", first: "Farm / producer name", second: "Acreage (optional)", tags: "Main crops or livestock" },
  buyer: { label: "Procurement profile", first: "Organization name", second: "Expected volume (optional)", tags: "Commodities you buy" },
  consultant: { label: "Professional profile", first: "Degree / qualification", second: "Years of experience", tags: "Services and technologies" },
  company: { label: "Company profile", first: "Legal company name", second: "Registration number (optional)", tags: "Products, services and technologies" },
  student: { label: "Academic profile", first: "Institution", second: "Programme / degree", tags: "Research interests" },
};

function OnboardingPage() {
  const { t, isRTL } = useTranslation();
  const { role: roleParam } = Route.useSearch();
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [step, setStep] = useState(1);
  const [userRole, setUserRole] = useState<string>(
    roleParam && (ROLE_IDS as readonly string[]).includes(roleParam) ? roleParam : "farmer",
  );
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    city: "Faisalabad",
    primaryDiscipline: "Agriculture",
  });

  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(["Agriculture"]);
  const [roleDetails, setRoleDetails] = useState({ first: "", second: "", tags: "" });
  const [keywordSearch, setKeywordSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setTimeout(() => setCooldownSeconds((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  const roles = [
    {
      id: "farmer",
      label: "Farmer / Producer",
      icon: "agriculture",
      desc: "Sell crops and livestock, post farm RFPs, and access crop advisory.",
    },
    {
      id: "buyer",
      label: "Buyer / Trader / Miller",
      icon: "shopping_cart",
      desc: "Procure bulk commodities, post buying requirements, and find verified producers.",
    },
    {
      id: "consultant",
      label: "Agronomist / Consultant / Vet",
      icon: "psychology",
      desc: "Offer field services, bid on projects, and diagnose crop or livestock cases.",
    },
    {
      id: "company",
      label: "Enterprise / Supplier",
      icon: "domain",
      desc: "Trade inputs and machinery, list services, and post corporate tenders.",
    },
    {
      id: "student",
      label: "Student / Researcher",
      icon: "school",
      desc: "Access agricultural research, university courses, and internships.",
    },
  ];

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords((prev) =>
      prev.includes(kw) ? (prev.length > 1 ? prev.filter((k) => k !== kw) : prev) : [...prev, kw],
    );
  };

  const filteredKeywords = OFFICIAL_DISCIPLINES.filter((k) =>
    k.toLowerCase().includes(keywordSearch.toLowerCase()),
  );

  const handleStep2Submit = () => {
    const newErrors: Record<string, string> = {};
    if (!formData["fullName"] || formData["fullName"].trim().length < 2)
      newErrors["fullName"] = "Please enter your full name.";
    if (!formData["email"] || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData["email"].trim()))
      newErrors["email"] = "Please enter a valid email address.";
    if (!formData["password"] || formData["password"].length < 6)
      newErrors["password"] = "Password must be at least 6 characters.";
    if (!formData["phone"] || !validatePKPhone(formData["phone"]))
      newErrors["phone"] = "Enter a valid Pakistani number, e.g. 03001234567.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setStep(3);
  };

  const handleSignUpSubmit = async () => {
    setIsLoading(true);
    setApiError("");
    setSuccessMessage("");

    try {
      const email = formData["email"].trim();
      const password = formData["password"];

      // 1. Call Supabase Auth signup
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: formData["fullName"].trim(),
            user_type: userRole,
            phone: formData["phone"].trim(),
            city: formData.city,
            primary_discipline: formData.primaryDiscipline,
            keywords: selectedKeywords,
            role_profile: {
              first: roleDetails.first.trim(),
              second: roleDetails.second.trim(),
              tags: roleDetails.tags.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 25),
            },
          },
        },
      });

      if (error) {
        const feedback = getAuthFeedback(error.message);
        setApiError(feedback.message);
        setCooldownSeconds(feedback.retryAfterSeconds ?? 0);
        setIsLoading(false);
        return;
      }

      // If session is returned immediately, record session and redirect to dashboard
      if (data.session) {
        recordSessionLogin();
        navigate({ to: "/dashboard", replace: true });
        return;
      }

      // Automatically sign in with credentials to establish active session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInData?.session) {
        recordSessionLogin();
        navigate({ to: "/dashboard", replace: true });
        return;
      }

      if (signInError) {
        setSuccessMessage(
          "Your account was created successfully! You can now sign in to your dashboard.",
        );
        setAuthMode("login");
      } else {
        recordSessionLogin();
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err: unknown) {
      const feedback = getAuthFeedback(
        err instanceof Error ? err.message : "An unexpected error occurred during signup.",
      );
      setApiError(feedback.message);
      setCooldownSeconds(feedback.retryAfterSeconds ?? 0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setApiError("");
    setSuccessMessage("");

    if (!formData["email"] || !formData["password"]) {
      setApiError("Please enter both email and password.");
      setIsLoading(false);
      return;
    }

    try {
      const email = formData["email"].trim();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: formData["password"],
      });

      if (error) {
        const feedback = getAuthFeedback(error.message);
        setApiError(feedback.message);
        setCooldownSeconds(feedback.retryAfterSeconds ?? 0);
      } else {
        recordSessionLogin();
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err: unknown) {
      setApiError(
        err instanceof Error ? err.message : "Login failed. Please check your credentials.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setApiError("");
    setSuccessMessage("");
    const email = formData["email"].trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setApiError("Enter your email address above first, then tap Forgot password.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      const feedback = getAuthFeedback(error.message);
      setApiError(feedback.message);
    } else {
      setSuccessMessage(`Password reset link sent to ${email} — check your inbox (and spam folder).`);
    }
  };

  return (
    <div className={cn("min-h-screen bg-background flex flex-col md:flex-row", isRTL && "rtl")}>
      {/* Left Panel - Corporate Branding */}
      <div className="hidden lg:flex w-[420px] bg-primary p-12 flex-col justify-between text-white relative overflow-hidden text-left shrink-0">
        <div className="relative z-10">
          <Link
            to="/"
            className="font-display text-2xl font-bold tracking-tight mb-12 block hover:opacity-80 transition-opacity"
          >
            AgriBusiness <span className="text-secondary">PK</span>
          </Link>
          <span className="inline-block px-3 py-1 bg-secondary text-on-secondary font-bold text-xs uppercase tracking-wider rounded-md mb-4">
            Unified Agri-Ecosystem
          </span>
          <h1 className="font-display text-4xl font-bold leading-tight mb-4 tracking-tight">
            Pakistan's Premier Agri-Tech Platform.
          </h1>
          <p className="text-white/80 text-xs leading-relaxed max-w-xs font-medium">
            Join verified agronomists, millers, exporters, and progressive growers nationwide.
          </p>
        </div>

        {/* Step Progress Visual */}
        {authMode === "signup" && (
          <div className="relative z-10 space-y-6">
            {[
              { n: 1, label: "Role & Identity", desc: "Select user classification" },
              { n: 2, label: "Credentials", desc: "Basic details & security" },
              { n: 3, label: "Sector & profile", desc: "Set your speciality and work profile" },
            ].map((s) => (
              <div
                key={s.n}
                className={cn(
                  "flex gap-4 items-start transition-all duration-300",
                  step === s.n ? "opacity-100 translate-x-1" : "opacity-40",
                )}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl border flex items-center justify-center font-black text-xs shrink-0 shadow transition-all",
                    step === s.n
                      ? "border-secondary bg-secondary text-on-secondary font-bold"
                      : "border-white/30 text-white",
                  )}
                >
                  {s.n}
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">{s.label}</div>
                  <div className="text-xs text-white/70 font-medium">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Decorative background glow */}
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary-container rounded-full opacity-40 blur-3xl"></div>
        <div className="absolute top-1/4 -right-20 w-64 h-64 bg-secondary/10 rounded-full blur-2xl"></div>
      </div>

      {/* Right Panel - Form Content */}
      <div className="flex-1 flex flex-col relative text-left">
        {/* Top Bar Switcher */}
        <div className="p-4 sm:p-6 flex justify-between items-center border-b border-outline-variant/30 bg-white">
          <Link to="/" className="lg:hidden font-display font-bold text-primary text-lg">
            AgriBusiness
          </Link>

          <div className="flex items-center gap-2 bg-surface-container-low p-1 rounded-xl border border-outline-variant/40 ml-auto">
            <button
              onClick={() => {
                setAuthMode("signup");
                setApiError("");
                setSuccessMessage("");
              }}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                authMode === "signup"
                  ? "bg-primary text-white shadow-xs"
                  : "text-on-surface-variant hover:text-primary",
              )}
            >
              Sign Up
            </button>
            <button
              onClick={() => {
                setAuthMode("login");
                setApiError("");
              }}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                authMode === "login"
                  ? "bg-primary text-white shadow-xs"
                  : "text-on-surface-variant hover:text-primary",
              )}
            >
              Log In
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
          <div className="w-full max-w-xl">
            {/* Feedback Messages */}
            {successMessage && (
              <div className="mb-6 p-4 rounded-xl bg-success/10 text-success border border-success/25 text-xs font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check_circle</span>
                <span>{successMessage}</span>
              </div>
            )}

            {apiError && (
              <div className="mb-6 p-4 rounded-xl bg-error/10 text-error border border-error/20 text-xs font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{apiError}</span>
              </div>
            )}

            {/* === LOGIN MODE === */}
            {authMode === "login" && (
              <form
                onSubmit={handleLoginSubmit}
                className="space-y-4 animate-in fade-in duration-300"
              >
                <div className="mb-6">
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                    Welcome Back
                  </h2>
                  <p className="text-xs text-on-surface-variant font-medium mt-1">
                    Sign in to your AgriBusiness workspace and active listings.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={formData["email"]}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-xs font-medium text-primary focus:outline-none focus:border-primary transition-all"
                    placeholder="e.g. arshad.khan@agribiz.pk"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="login-password" className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={formData["password"]}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-xs font-medium text-primary focus:outline-none focus:border-primary transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleForgotPassword()}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-primary-container transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? "Signing in..." : "Sign In to Workspace"}
                    <span className="material-symbols-outlined text-[16px]">login</span>
                  </button>
                </div>

                <div className="pt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signup");
                      setStep(1);
                    }}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    Don't have an account? Create a free profile
                  </button>
                </div>
                <div className="pt-5 text-center">
                  <div className="mx-auto mb-3 h-px w-full max-w-xs bg-outline-variant/70" />
                  <Link
                    to="/admin-login"
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant transition hover:bg-surface-container-low hover:text-primary"
                  >
                    <span className="material-symbols-outlined text-[15px]">admin_panel_settings</span>
                    Admin Portal
                  </Link>
                </div>
              </form>
            )}

            {/* === SIGNUP STEP 1: ROLE SELECTION === */}
            {authMode === "signup" && step === 1 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                    Step 1 of 3
                  </span>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary tracking-tight mt-1">
                    Select Your Role
                  </h2>
                  <p className="text-xs text-on-surface-variant font-medium mt-1">
                    Choose how you plan to participate in the agricultural marketplace.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setUserRole(role.id)}
                      className={cn(
                        "flex flex-col items-start p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group cursor-pointer",
                        userRole === role.id
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-outline-variant/40 bg-white hover:border-primary/40 hover:shadow-xs",
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all",
                          userRole === role.id
                            ? "bg-primary text-white"
                            : "bg-surface-container-low text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary",
                        )}
                      >
                        <span className="material-symbols-outlined text-[22px]">{role.icon}</span>
                      </div>
                      <h3 className="text-sm font-bold text-primary mb-1">{role.label}</h3>
                      <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                        {role.desc}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Live capability preview for the selected role */}
                {(() => {
                  const def = roleDefinition(userRole);
                  if (!def) return null;
                  return (
                    <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-primary">
                        As a {def.short}, you will be able to
                      </p>
                      <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
                        {def.capabilities.map((cap) => (
                          <li key={cap.key} className="flex items-start gap-2">
                            <span className="material-symbols-outlined mt-0.5 text-[16px] text-secondary" aria-hidden="true">{cap.icon}</span>
                            <span className="text-xs font-medium leading-5 text-on-surface-variant">{cap.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-8 py-3 bg-primary text-on-primary rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-primary-container transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    Continue to Credentials
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

            {/* === SIGNUP STEP 2: CREDENTIALS === */}
            {authMode === "signup" && step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div>
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                    Step 2 of 3
                  </span>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary tracking-tight mt-1">
                    Account Credentials
                  </h2>
                  <p className="text-xs text-on-surface-variant font-medium mt-1">
                    Provide your name, phone, email, and password.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                      Full Name
                    </label>
                    <input
                      value={formData["fullName"]}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className={cn(
                        "w-full bg-surface-container-low border rounded-xl px-3.5 py-2.5 text-xs font-medium text-primary focus:outline-none transition-all",
                        errors["fullName"]
                          ? "border-error"
                          : "border-outline-variant/40 focus:border-primary",
                      )}
                      placeholder="e.g. Dr. Arshad Khan / Malik Bilal"
                    />
                    {errors["fullName"] && <p className="text-error text-xs">{errors["fullName"]}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData["email"]}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={cn(
                        "w-full bg-surface-container-low border rounded-xl px-3.5 py-2.5 text-xs font-medium text-primary focus:outline-none transition-all",
                        errors["email"]
                          ? "border-error"
                          : "border-outline-variant/40 focus:border-primary",
                      )}
                      placeholder="name@example.com / gmail.com"
                    />
                    {errors["email"] && <p className="text-error text-xs">{errors["email"]}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                      Phone Number (WhatsApp)
                    </label>
                    <input
                      type="tel"
                      value={formData["phone"]}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={cn(
                        "w-full bg-surface-container-low border rounded-xl px-3.5 py-2.5 text-xs font-medium text-primary focus:outline-none transition-all",
                        errors["phone"]
                          ? "border-error"
                          : "border-outline-variant/40 focus:border-primary",
                      )}
                      placeholder="03XXXXXXXXX / +923001234567"
                    />
                    {errors["phone"] && <p className="text-error text-xs">{errors["phone"]}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                      Password
                    </label>
                    <input
                      type="password"
                      value={formData["password"]}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={cn(
                        "w-full bg-surface-container-low border rounded-xl px-3.5 py-2.5 text-xs font-medium text-primary focus:outline-none transition-all",
                        errors["password"]
                          ? "border-error"
                          : "border-outline-variant/40 focus:border-primary",
                      )}
                      placeholder="At least 6 characters"
                    />
                    {errors["password"] && <p className="text-error text-xs">{errors["password"]}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                      City / District
                    </label>
                    <select
                      id="signup-city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 text-xs font-medium text-primary focus:outline-none"
                    >
                      {CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                      Primary Discipline
                    </label>
                    <select
                      value={formData.primaryDiscipline}
                      onChange={(e) =>
                        setFormData({ ...formData, primaryDiscipline: e.target.value })
                      }
                      className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 text-xs font-medium text-primary focus:outline-none"
                    >
                      {OFFICIAL_DISCIPLINES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-bold text-on-surface-variant hover:text-primary flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleStep2Submit}
                    className="px-8 py-3 bg-primary text-on-primary rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-primary-container transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    Select Disciplines & Complete
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

            {/* === SIGNUP STEP 3: 24 OFFICIAL DISCIPLINES SELECTION === */}
            {authMode === "signup" && step === 3 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div>
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                    Step 3 of 3
                  </span>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary tracking-tight mt-1">
                    Sector, Speciality & Profile
                  </h2>
                  <p className="text-xs text-on-surface-variant font-medium mt-1">
                    Choose your primary sector, then add searchable specialities and the details
                    that tell people what you can do on AgriBusiness.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">Primary sector</span>
                    <select
                      value={formData.primaryDiscipline}
                      onChange={(e) => {
                        const primaryDiscipline = e.target.value;
                        setFormData({ ...formData, primaryDiscipline });
                        setSelectedKeywords((current) => current.includes(primaryDiscipline) ? current : [primaryDiscipline, ...current]);
                      }}
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3.5 py-2.5 text-xs font-medium text-primary focus:outline-none focus:border-primary"
                    >
                      {PRIMARY_SECTORS.map((sector) => <option key={sector} value={sector}>{sector}</option>)}
                    </select>
                  </label>
                  <div className="rounded-xl border border-primary/10 bg-primary/5 px-3.5 py-2.5 text-xs leading-5 text-primary/80">
                    Your primary sector controls relevant recommendations, category highlights, and ad targeting. You can still add cross-sector skills below.
                  </div>
                </div>

                {/* Search keywords */}
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">
                    search
                  </span>
                  <input
                    value={keywordSearch}
                    onChange={(e) => setKeywordSearch(e.target.value)}
                    placeholder="Search specialities..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-outline-variant/40 bg-surface-container-low text-xs font-medium text-primary focus:outline-none"
                  />
                </div>

                {/* 24 Disciplines Grid */}
                <div className="max-h-64 overflow-y-auto pr-1 flex flex-wrap gap-2 p-1 border border-outline-variant/30 rounded-2xl bg-white shadow-inner">
                  {filteredKeywords.map((kw) => {
                    const isSelected = selectedKeywords.includes(kw);
                    return (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => toggleKeyword(kw)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left flex items-center gap-1.5",
                          isSelected
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-surface-container-low text-on-surface-variant border-outline-variant/40 hover:border-primary/40 hover:bg-surface-container",
                        )}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {isSelected ? "check_circle" : "add"}
                        </span>
                        <span>{kw}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="bg-primary/5 p-3.5 rounded-xl border border-primary/10 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
                    verified
                  </span>
                  <p className="text-xs text-primary/80 font-medium leading-relaxed">
                    Selected disciplines ({selectedKeywords.length}) will appear on your public
                    profile and qualify you for verified RFP matches and trade leads.
                  </p>
                </div>

                {(() => {
                  const detail = ROLE_DETAIL_FIELDS[userRole] ?? {
                    label: "Farm profile",
                    first: "Farm / producer name",
                    second: "Acreage (optional)",
                    tags: "Main crops or livestock",
                  };
                  return (
                    <section className="rounded-2xl border border-outline-variant/35 bg-white p-4">
                      <div className="mb-3">
                        <h3 className="text-sm font-bold text-primary">{detail.label}</h3>
                        <p className="mt-0.5 text-xs text-on-surface-variant">These details personalize your workspace and make your directory profile useful from day one.</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1"><span className="text-xs font-bold text-on-surface-variant">{detail.first}</span><input value={roleDetails.first} onChange={(e) => setRoleDetails({ ...roleDetails, first: e.target.value })} className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-xs text-primary focus:outline-none focus:border-primary" /></label>
                        <label className="space-y-1"><span className="text-xs font-bold text-on-surface-variant">{detail.second}</span><input value={roleDetails.second} onChange={(e) => setRoleDetails({ ...roleDetails, second: e.target.value })} className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-xs text-primary focus:outline-none focus:border-primary" /></label>
                      </div>
                      <label className="mt-3 block space-y-1"><span className="text-xs font-bold text-on-surface-variant">{detail.tags}</span><input value={roleDetails.tags} onChange={(e) => setRoleDetails({ ...roleDetails, tags: e.target.value })} placeholder="Separate items with commas" className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-xs text-primary focus:outline-none focus:border-primary" /></label>
                    </section>
                  );
                })()}

                <div className="pt-3 flex justify-between items-center">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setStep(2)}
                    className="text-xs font-bold text-on-surface-variant hover:text-primary flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleSignUpSubmit}
                    className="px-8 py-3 bg-secondary text-on-secondary rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-white transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? "Creating Account..." : "Complete Registration"}
                    {!isLoading && (
                      <span className="material-symbols-outlined text-[16px]">task_alt</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

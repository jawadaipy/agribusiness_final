/**
 * Technical Services & Custom Solutions — Professional Agricultural Advisory,
 * Commercial Feasibility Reports, Production Strategies, Seed Analysis, Lab Diagnostics,
 * and Custom Agri-Tech / Web Solutions for Pakistan.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useState } from "react";
import { toast } from "sonner";
import { formatPKR } from "@/lib/format";

export const Route = createFileRoute("/technical-services")({
  head: () => ({
    meta: [
      { title: "Technical Services & Custom Agri Solutions | AgriBusiness Pakistan" },
      {
        name: "description",
        content: "Custom paid agricultural feasibility reports, production strategies, seed variety selection, soil & animal lab testing, and custom agri-tech solutions in Pakistan.",
      },
    ],
  }),
  component: TechnicalServicesPage,
});

const FEASIBILITY_REPORTS = [
  {
    id: "dairy",
    title: "Commercial Dairy Farm Setup (50–100 Cattle)",
    urdu: "کمرشل ڈیری فارم سیٹ اپ (50 تا 100 مویشی)",
    category: "Livestock & Dairy",
    investment: "₨ 15M – 35M",
    roi: "18 – 24 Months",
    icon: "pets",
    points: [
      "Shed architecture, ventilation, and cooling layout",
      "Feed formulation (Silage, TMR, concentrate rations)",
      "Daily milk yield projections & chilling unit ROI",
      "Veterinary health protocols & biosecurity guidelines",
    ],
  },
  {
    id: "poultry",
    title: "Environment-Controlled Poultry Shed (30k–50k Birds)",
    urdu: "کنٹرولڈ پولٹری شیڈ (30 تا 50 ہزار برائلر)",
    category: "Poultry Farming",
    investment: "₨ 25M – 45M",
    roi: "12 – 16 Months",
    icon: "egg",
    points: [
      "Pad & fan evaporative climate cooling design",
      "Feed conversion ratio (FCR) target economics",
      "Vaccination schedule and disease management",
      "Flock cycle cash flow & mandi marketing linkages",
    ],
  },
  {
    id: "orchard",
    title: "High-Density Citrus / Apple / Olive Orchard",
    urdu: "ہائی ڈینسٹی باغات (کنو، سیب، زیتون)",
    category: "Horticulture",
    investment: "₨ 1.5M – 3M / Acre",
    roi: "3 – 4 Years",
    icon: "psychiatry",
    points: [
      "Rootstock & scion variety selection for soil pH",
      "Automated drip fertigation network design",
      "Pruning, tree canopy management & pest cycles",
      "Export grade grading, sorting, and packaging flow",
    ],
  },
  {
    id: "tunnel",
    title: "Controlled Climate Tunnel Vegetable Farming",
    urdu: "ٹنل فارمنگ (بے موسمی سبزیات)",
    category: "High-Value Crops",
    investment: "₨ 800k – 1.8M / Tunnel",
    roi: "1 – 2 Harvests",
    icon: "grass",
    points: [
      "High tunnel vs walk-in tunnel engineering specs",
      "Off-season tomato, cucumber, and capsicum varieties",
      "Micro-climate humidity and solar radiation control",
      "Peak-off-season mandi price arbitrage strategies",
    ],
  },
  {
    id: "silage",
    title: "Commercial Silage Baling & Processing Unit",
    urdu: "کمرشل سائیلج بیلنگ و پروسیسنگ پلانٹ",
    category: "Feed & Forage",
    investment: "₨ 12M – 22M",
    roi: "14 – 18 Months",
    icon: "agriculture",
    points: [
      "Forage harvester machine & baler plant selection",
      "Inoculant treatment & anaerobic fermentation science",
      "Bale wrapping technology (50kg vs 1-Ton bales)",
      "Dairy farm annual contract supply pricing models",
    ],
  },
  {
    id: "feedmill",
    title: "Modern Livestock & Poultry Feed Mill",
    urdu: "جدید فیڈ مل سیٹ اپ (پولٹری و مویشی فیڈ)",
    category: "Agri-Industry",
    investment: "₨ 20M – 50M",
    roi: "24 Months",
    icon: "factory",
    points: [
      "Grinding, mixing, pelleting, and cooling machinery",
      "Raw material sourcing (Maize, SBM, Canola meal, minerals)",
      "Quality assurance and lab proximate analysis",
      "Packaging, dealer network distribution & licensing",
    ],
  },
];

const LAB_SERVICES = [
  {
    id: "soil",
    name: "Complete Soil Fertility & Salinity Analysis",
    urdu: "مٹی کا جامع لیب ٹیسٹ",
    turnaround: "3–4 Working Days",
    icon: "science",
    price: 3500,
    tests: "pH, EC (Salinity), Organic Matter, Nitrogen, Phosphorus, Potassium, Zinc, Boron, Calcium, Texture Class.",
  },
  {
    id: "water",
    name: "Tubewell & Irrigation Water Quality Testing",
    urdu: "ٹیوب ویل و نہری پانی کا کیمیائی ٹیسٹ",
    turnaround: "2–3 Working Days",
    icon: "water_drop",
    price: 2800,
    tests: "TDS, Electrical Conductivity, SAR (Sodium Adsorption Ratio), RSC (Residual Sodium Carbonate), Chlorides.",
  },
  {
    id: "animal",
    name: "Animal Health, Blood & Milk Diagnostic Screen",
    urdu: "مویشیوں کے خون و دودھ کی تشخیصی جانچ",
    turnaround: "24–48 Hours",
    icon: "pets",
    price: 4500,
    tests: "Milk Fat/SNF/Aflatoxin M1, Mastitis CMT test, Complete Blood Count (CBC), Brucellosis & Parasite screen.",
  },
  {
    id: "leaf",
    name: "Plant Pathology & Leaf Tissue Diagnostics",
    urdu: "پودوں کی لیبارٹری جانچ و غذائی تجزیہ",
    turnaround: "3–5 Working Days",
    icon: "biotech",
    price: 3800,
    tests: "Fungal/Bacterial blight identification, Micronutrient tissue deficiency (Fe, Mg, Mn, Cu), pesticide residue.",
  },
];

export function TechnicalServicesPage() {
  const [selectedService, setSelectedService] = useState("feasibility");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [projectType, setProjectType] = useState("Dairy Farming Feasibility");
  const [acreage, setAcreage] = useState("");
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Please enter your name and phone number.");
      return;
    }

    // Compose WhatsApp message
    const msg = `*AgriBusiness Custom Technical Service Request*%0A%0A*Client:* ${encodeURIComponent(name)}%0A*Phone:* ${encodeURIComponent(phone)}%0A*City:* ${encodeURIComponent(city || "Pakistan")}%0A*Service:* ${encodeURIComponent(projectType)}%0A*Land/Scale:* ${encodeURIComponent(acreage || "N/A")}%0A*Details:* ${encodeURIComponent(details || "None")}`;
    const waUrl = `https://wa.me/923001234567?text=${msg}`;

    setSubmitted(true);
    toast.success("Request registered! Opening WhatsApp consultation…");
    window.open(waUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#F4F8F4] text-left">
      <Navbar />

      <main className="pb-24 pt-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Hero Section */}
          <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-[#06180e] via-[#092516] to-[#0c311e] p-8 md:p-14 text-white shadow-xl relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-15 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />

            <div className="relative z-10 max-w-3xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 border border-amber-400/30">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                Professional Advisory &amp; Technical Solutions
              </span>
              <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-5xl">
                Custom Technical Agri Services &amp;{" "}
                <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
                  Business Feasibilities
                </span>
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-emerald-100/80 sm:text-base">
                Bankable investment feasibilities, custom crop production strategies, certified seed analysis, ISO-standard laboratory soil/animal testing, and tailored agri-tech web portals for Pakistani farmers and enterprises.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#request-form"
                  className="press inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-xs font-bold uppercase tracking-wider text-emerald-950 shadow-md hover:bg-amber-300 transition"
                >
                  <span className="material-symbols-outlined text-[18px]">calculate</span>
                  Book Custom Feasibility / Solution
                </a>
                <Link
                  to="/rates"
                  className="press inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-xs font-bold text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">monitoring</span>
                  Check Mandi Benchmarks
                </Link>
              </div>
            </div>
          </div>

          {/* Service Pillar Tabs */}
          <div className="mt-12 flex flex-wrap gap-2 border-b border-emerald-200/80 pb-4">
            {[
              { id: "feasibility", label: "Business Feasibility Reports", icon: "assignment" },
              { id: "production", label: "Production & Crop Strategies", icon: "psychiatry" },
              { id: "seeds", label: "Seed Varieties & Selection", icon: "grain" },
              { id: "lab", label: "Soil & Animal Lab Testing", icon: "biotech" },
              { id: "tech", label: "Custom Agri-Tech & Web Services", icon: "devices" },
            ].map((tab) => {
              const active = selectedService === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedService(tab.id)}
                  className={`press flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition border cursor-pointer ${
                    active
                      ? "bg-emerald-800 text-white border-emerald-800 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-emerald-50"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Section 1: Business Feasibility Reports */}
          {(selectedService === "feasibility" || selectedService === "all") && (
            <div className="mt-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                    Bankable Project Reports
                  </span>
                  <h2 className="mt-1.5 font-display text-2xl font-bold text-slate-900">
                    Commercial Agricultural Feasibility Studies
                  </h2>
                  <p className="text-xs text-slate-600">
                    Detailed capital expenditure (CAPEX), operational costs (OPEX), cash flows, and ROI projections.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {FEASIBILITY_REPORTS.map((f) => (
                  <div
                    key={f.id}
                    className="flex flex-col justify-between rounded-2xl border border-emerald-200/80 bg-white p-6 shadow-xs hover:shadow-md transition"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg bg-emerald-100 p-2 text-emerald-800">
                          <span className="material-symbols-outlined text-[20px]">{f.icon}</span>
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-800 border border-emerald-200">
                          {f.category}
                        </span>
                      </div>

                      <h3 className="mt-4 font-display text-base font-bold text-slate-900 leading-snug">
                        {f.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-emerald-800 font-semibold">{f.urdu}</p>

                      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 text-xs border border-slate-100">
                        <div>
                          <span className="block text-[10px] text-slate-500 font-bold uppercase">Invest Range</span>
                          <span className="font-bold text-slate-900">{f.investment}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-500 font-bold uppercase">Est. Payback</span>
                          <span className="font-bold text-emerald-700">{f.roi}</span>
                        </div>
                      </div>

                      <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                        {f.points.map((p, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="material-symbols-outlined text-[14px] text-emerald-600 mt-0.5 shrink-0">check</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <a
                      href="#request-form"
                      onClick={() => setProjectType(f.title)}
                      className="mt-6 block text-center rounded-xl bg-emerald-800 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-900 shadow-xs"
                    >
                      Request This Feasibility
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Production Strategies & Crop Planning */}
          {(selectedService === "production" || selectedService === "all") && (
            <div className="mt-14 rounded-3xl border border-emerald-200 bg-white p-8 shadow-xs">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                Yield Maximization &amp; IPM
              </span>
              <h2 className="mt-3 font-display text-2xl font-bold text-slate-900">
                Custom Production Strategies &amp; Crop Protocols
              </h2>
              <p className="mt-1 text-xs text-slate-600 max-w-2xl">
                Science-backed crop schedules tailored for Punjab, Sindh, KPK, and Balochistan micro-climates.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    icon: "calendar_month",
                    title: "Sowing to Harvest Schedule",
                    desc: "Optimal sowing windows, seed rates, and plant density calculations.",
                  },
                  {
                    icon: "pest_control",
                    title: "Integrated Pest Management (IPM)",
                    desc: "Targeted bio-controls and chemical rotation reducing spray frequency by 35%.",
                  },
                  {
                    icon: "opacity",
                    title: "Precision Fertigation Regime",
                    desc: "Crop stage N-P-K & micronutrient injection schedules based on soil tests.",
                  },
                  {
                    icon: "inventory",
                    title: "Post-Harvest Quality Care",
                    desc: "Grading, moisture retention, and cold storage shelf-life protocols for export.",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-slate-100 bg-[#F9FBF9] p-5">
                    <span className="material-symbols-outlined text-[24px] text-emerald-700">{item.icon}</span>
                    <h3 className="mt-2 font-display text-sm font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Seed Varieties & Resilience */}
          {(selectedService === "seeds" || selectedService === "all") && (
            <div className="mt-14 rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-emerald-50 p-8 shadow-xs">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-200/80 px-3 py-1 rounded-full border border-amber-300">
                Genetics &amp; Certified Seeds
              </span>
              <h2 className="mt-3 font-display text-2xl font-bold text-slate-900">
                Seed Variety Selection &amp; Performance Index
              </h2>
              <p className="mt-1 text-xs text-slate-600 max-w-2xl">
                Match the highest-performing hybrid and certified seed cultivars with your specific land salinity, water availability, and harvest timelines.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-white p-5 border border-amber-100 shadow-xs">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-amber-600">thermostat</span>
                    Heat &amp; Drought Resilience
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    Evaluated cultivars for South Punjab and Sindh with thermal tolerance during critical flowering and grain-filling stages.
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-5 border border-amber-100 shadow-xs">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-emerald-600">verified</span>
                    FSC&amp;RD Certified Seed Index
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    Direct validation of registered germination rates (85%+), genetic purity, and certified seed tag authentication.
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-5 border border-amber-100 shadow-xs">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-teal-600">trending_up</span>
                    Market Demand Alignment
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    Premium varieties preferred by rice millers, ginners, and export buyers to ensure top mandi price realization.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Laboratory Diagnostics */}
          {(selectedService === "lab" || selectedService === "all") && (
            <div className="mt-14">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                    ISO Testing Standards
                  </span>
                  <h2 className="mt-1.5 font-display text-2xl font-bold text-slate-900">
                    Soil, Water, Animal &amp; Plant Diagnostics
                  </h2>
                  <p className="text-xs text-slate-600">
                    Sample collection courier pickup across Pakistan with certified digital lab reports.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {LAB_SERVICES.map((lab) => (
                  <div
                    key={lab.id}
                    className="flex flex-col justify-between rounded-2xl border border-emerald-200/80 bg-white p-6 shadow-xs hover:shadow-md transition"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg bg-emerald-100 p-2 text-emerald-800">
                          <span className="material-symbols-outlined text-[20px]">{lab.icon}</span>
                        </span>
                        <span className="font-mono text-xs font-extrabold text-emerald-800">
                          {formatPKR(lab.price)}
                        </span>
                      </div>

                      <h3 className="mt-4 font-display text-sm font-bold text-slate-900 leading-snug">
                        {lab.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-emerald-800 font-semibold">{lab.urdu}</p>

                      <div className="mt-3 text-[11px] text-slate-500 font-medium">
                        ⏱ Turnaround: <span className="font-bold text-slate-800">{lab.turnaround}</span>
                      </div>

                      <div className="mt-3 rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-600 leading-relaxed border border-slate-100">
                        {lab.tests}
                      </div>
                    </div>

                    <a
                      href="#request-form"
                      onClick={() => setProjectType(`Lab Test: ${lab.name}`)}
                      className="mt-5 block text-center rounded-xl border border-emerald-700 bg-emerald-50 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100"
                    >
                      Book Test Pickup
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Custom Agri-Tech & Web Services */}
          {(selectedService === "tech" || selectedService === "all") && (
            <div className="mt-14 rounded-3xl border border-emerald-200 bg-white p-8 shadow-xs">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                Digital Agri-Tech
              </span>
              <h2 className="mt-3 font-display text-2xl font-bold text-slate-900">
                Custom Web Portals &amp; Farm Technology Systems
              </h2>
              <p className="mt-1 text-xs text-slate-600 max-w-2xl">
                We design and engineer bespoke web platforms, IoT farm dashboards, and export traceability software.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-[#F9FBF9] p-5">
                  <span className="material-symbols-outlined text-[24px] text-emerald-700">web</span>
                  <h3 className="mt-2 font-display text-sm font-bold text-slate-900">Custom Farm Portals</h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    Custom web management dashboards for large farms, seed dealers, machinery fleets, and cold storage units.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-[#F9FBF9] p-5">
                  <span className="material-symbols-outlined text-[24px] text-emerald-700">sensors</span>
                  <h3 className="mt-2 font-display text-sm font-bold text-slate-900">IoT &amp; Solar Tubewell Automation</h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    Remote mobile control for solar tubewells, soil moisture sensors, and automated drip irrigation valves.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-[#F9FBF9] p-5">
                  <span className="material-symbols-outlined text-[24px] text-emerald-700">qr_code_2</span>
                  <h3 className="mt-2 font-display text-sm font-bold text-slate-900">Batch Traceability &amp; QR Codes</h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    Farm-to-fork origin QR tags, GlobalGAP export compliance paperwork, and pesticide audit logs.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 6: Direct Request / Quotation Form */}
          <div id="request-form" className="mt-16 rounded-3xl border border-emerald-300 bg-white p-8 md:p-12 shadow-md">
            <div className="max-w-2xl">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                Direct Consultation Booking
              </span>
              <h2 className="mt-3 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                Request a Custom Technical Feasibility or Agri Service
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600">
                Fill this quick brief to get an instant quotation and speak with our senior agronomy and feasibility team.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ch. Tariq Mahmood"
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  WhatsApp / Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0300 1234567"
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  City / District *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Multan, Faisalabad, Sargodha, Rahim Yar Khan"
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Service / Feasibility Type *
                </label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option>Commercial Dairy Farm Setup (50–100 Cattle)</option>
                  <option>Environment-Controlled Poultry Shed (30k–50k Birds)</option>
                  <option>High-Density Citrus / Apple Orchard</option>
                  <option>Controlled Climate Tunnel Farming</option>
                  <option>Commercial Silage Baling & Processing</option>
                  <option>Livestock & Poultry Feed Mill</option>
                  <option>Complete Soil Fertility & Salinity Test (₨ 3,500)</option>
                  <option>Tubewell Water Quality Chemical Test (₨ 2,800)</option>
                  <option>Animal Health, Blood & Milk Diagnostic Screen (₨ 4,500)</option>
                  <option>Custom Farm ERP / Web Portal Development</option>
                  <option>IoT Solar Tubewell Automation Setup</option>
                  <option>Other Custom Advisory</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Farm Size / Land Scale (Optional)
                </label>
                <input
                  type="text"
                  value={acreage}
                  onChange={(e) => setAcreage(e.target.value)}
                  placeholder="e.g. 25 Acres, 100 Cows, 2 Tunnels"
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Specific Requirements / Details
                </label>
                <textarea
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Describe your current land status, budget expectations, or specific questions…"
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div className="sm:col-span-2 pt-2">
                <button
                  type="submit"
                  className="press w-full rounded-2xl bg-emerald-800 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-emerald-900 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  Submit Request &amp; Open WhatsApp Consultation
                </button>
                <p className="mt-2 text-center text-[11px] text-slate-500">
                  🔒 Fast response within 2 hours by certified agricultural specialists.
                </p>
              </div>
            </form>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}

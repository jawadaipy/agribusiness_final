import http from "http";

const routes = [
  { path: "/", name: "Homepage" },
  { path: "/feed", name: "Network Feed" },
  { path: "/resources", name: "Government Schemes" },
  { path: "/marketplace", name: "Marketplace" },
  { path: "/apps/agri-biz", name: "Agri-Biz App" },
  { path: "/apps/plant-clinic", name: "Plant Clinic" },
  { path: "/apps/animal-clinic", name: "Animal Clinic" },
  { path: "/projects", name: "Projects & RFPs" },
  { path: "/search", name: "Directory Search" },
  { path: "/onboarding", name: "Onboarding & Login" },
  { path: "/rates", name: "Live Mandi Rates" },
  { path: "/admin-login", name: "Admin Portal Login" },
  { path: "/dashboard", name: "Member Workbench" },
  { path: "/notifications", name: "Notifications" },
  { path: "/messages", name: "Direct Messages" },
  { path: "/categories", name: "Categories Directory" },
  { path: "/categories/wheat-grain", name: "Category Detail (Wheat Grain)" },
  { path: "/projects/40000000-0000-0000-0000-000000000001", name: "Project Detail (RFP)" },
  { path: "/profile/70000000-0000-0000-0000-000000000001", name: "Member Public Profile" },
  { path: "/reset-password", name: "Password Reset" }
];

async function fetchRoute(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:8080${path}`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
  });
}

async function runTests() {
  console.log("=== RUNNING END-TO-END HTTP & SSR WEB ROUTE TESTS ===");
  let passed = 0;
  let failed = 0;

  for (const route of routes) {
    try {
      const res = await fetchRoute(route.path);
      if (res.statusCode >= 200 && res.statusCode < 400) {
        console.log(`[PASS] ${route.path.padEnd(22)} HTTP ${res.statusCode} (${(res.body.length / 1024).toFixed(1)} KB) - ${route.name}`);
        passed++;
      } else {
        console.error(`[FAIL] ${route.path.padEnd(22)} HTTP ${res.statusCode} - ${route.name}`);
        failed++;
      }
    } catch (err) {
      console.error(`[ERR]  ${route.path.padEnd(22)} Error: ${err.message} - ${route.name}`);
      failed++;
    }
  }

  console.log("-------------------------------------------");
  console.log(`Results: ${passed} passed, ${failed} failed out of ${routes.length} routes.`);
  if (failed > 0) process.exit(1);
}

runTests();

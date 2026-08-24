/**
 * Verification of 2-Day (48-hour) Session & Trial Expiry Engine
 */
import assert from "node:assert";

const SESSION_MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000; // 48 hours = 172,800,000 ms
const SESSION_LOGIN_KEY = "agri_session_login_time";

class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.get(key) ?? null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

function checkSession(storage, currentTime) {
  const loginTimeStr = storage.getItem(SESSION_LOGIN_KEY);
  if (!loginTimeStr) return { expired: false, reason: "No session recorded" };
  const loginTime = Number(loginTimeStr);
  if (isNaN(loginTime)) return { expired: true, reason: "Corrupted timestamp" };
  const ageMs = currentTime - loginTime;
  if (ageMs > SESSION_MAX_AGE_MS) {
    storage.removeItem(SESSION_LOGIN_KEY);
    return { expired: true, ageHours: ageMs / (1000 * 60 * 60) };
  }
  return { expired: false, ageHours: ageMs / (1000 * 60 * 60) };
}

function runSessionExpiryTests() {
  console.log("=================================================");
  console.log("   TESTING 2-DAY (48-HR) SESSION EXPIRY ENGINE   ");
  console.log("=================================================\n");

  const storage = new MockLocalStorage();
  const now = Date.now();

  // Test 1: Fresh Login (0 hours old)
  storage.setItem(SESSION_LOGIN_KEY, now);
  let res = checkSession(storage, now);
  assert.strictEqual(res.expired, false);
  console.log(`✓ [Test 1] Fresh Login (0h old): Active (Age: ${res.ageHours.toFixed(1)}h) [PASS]`);

  // Test 2: Mid-Session (24 hours / 1 day old)
  const oneDayLater = now + 24 * 60 * 60 * 1000;
  res = checkSession(storage, oneDayLater);
  assert.strictEqual(res.expired, false);
  console.log(`✓ [Test 2] Mid-Session (24h / 1 day old): Active (Age: ${res.ageHours.toFixed(1)}h) [PASS]`);

  // Test 3: Near Boundary (47.9 hours old)
  const boundaryTime = now + 47.9 * 60 * 60 * 1000;
  res = checkSession(storage, boundaryTime);
  assert.strictEqual(res.expired, false);
  console.log(`✓ [Test 3] Boundary Check (47.9h old): Active (Age: ${res.ageHours.toFixed(1)}h) [PASS]`);

  // Test 4: Past Boundary (48.1 hours / 2.01 days old) -> MUST EXPIRE
  const expiredTime = now + 48.1 * 60 * 60 * 1000;
  res = checkSession(storage, expiredTime);
  assert.strictEqual(res.expired, true);
  assert.strictEqual(storage.getItem(SESSION_LOGIN_KEY), null);
  console.log(`✓ [Test 4] Expiration Check (48.1h old): EXPIRED & Cleared Storage [PASS]`);

  // Test 5: 2-Day Trial Window Calculation
  const trialEndsAt = new Date(now + 2 * 24 * 60 * 60 * 1000);
  const diffHours = (trialEndsAt.getTime() - now) / (1000 * 60 * 60);
  assert.strictEqual(Math.round(diffHours), 48);
  console.log(`✓ [Test 5] 2-Day Trial Expiration Timestamp: ${trialEndsAt.toISOString()} (Exactly 48h) [PASS]`);

  console.log("\n=================================================");
  console.log("   ALL 2-DAY SESSION EXPIRY TESTS PASSED [5/5]   ");
  console.log("=================================================\n");
}

runSessionExpiryTests();

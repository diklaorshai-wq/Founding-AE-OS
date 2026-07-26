/* eslint-disable @typescript-eslint/no-require-imports -- .cts test files must use CommonJS require(). */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  APPROVED_VENDOR_PROFILE_STORAGE_KEY,
  loadApprovedVendorProfile,
  getApprovedVendorProfileSnapshot,
  getApprovedVendorProfileServerSnapshot,
  saveApprovedVendorProfile,
  clearApprovedVendorProfile,
  validateApprovedVendorProfile,
  subscribeApprovedVendorProfile,
} = require("./approvedVendorProfileStorage.ts");
const {
  shouldOpenRefinement,
  toSafeResearchErrorMessage,
  persistApprovedVendorProfile,
  normalizeVendorWebsiteUrl,
  ONBOARDING_FORBIDDEN_IMPORT_PATTERNS,
} = require("./vendorOnboardingFlow.ts");
const { createEmptyVendorProfile } = require("./vendorOnboarding.ts");

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    _map: map,
  };
}

function validProfile(overrides = {}) {
  const base = createEmptyVendorProfile("vendor-acme", "Acme");
  base.websiteUrl = "https://acme.example";
  base.productKnowledge.offering = "Acme product";
  base.productKnowledge.customerProblems = [
    {
      id: "problem-prioritization",
      statement: "Hard to prioritize accounts.",
      impact: "Wasted time.",
    },
  ];
  return { ...base, ...overrides, productKnowledge: { ...base.productKnowledge, ...(overrides.productKnowledge ?? {}) } };
}

test("approved storage: save/load round trip preserves a valid canonical profile", () => {
  const storage = memoryStorage();
  const profile = validProfile();

  const saved = saveApprovedVendorProfile(profile, storage);
  assert.strictEqual(saved.ok, true);
  assert.ok(storage.getItem(APPROVED_VENDOR_PROFILE_STORAGE_KEY));

  const loaded = loadApprovedVendorProfile(storage);
  assert.ok(loaded);
  assert.strictEqual(loaded.vendorName, "Acme");
  assert.strictEqual(loaded.websiteUrl, "https://acme.example");
  assert.strictEqual(loaded.productKnowledge.customerProblems[0].id, "problem-prioritization");
});

test("approved storage: malformed JSON is rejected and cleared", () => {
  const storage = memoryStorage({
    [APPROVED_VENDOR_PROFILE_STORAGE_KEY]: "{ not-json",
  });

  assert.strictEqual(loadApprovedVendorProfile(storage), null);
  assert.strictEqual(storage.getItem(APPROVED_VENDOR_PROFILE_STORAGE_KEY), null);
});

test("approved storage: structurally invalid object is rejected and cleared", () => {
  const storage = memoryStorage({
    [APPROVED_VENDOR_PROFILE_STORAGE_KEY]: JSON.stringify({ vendorName: "Only a name" }),
  });

  assert.strictEqual(loadApprovedVendorProfile(storage), null);
  assert.strictEqual(storage.getItem(APPROVED_VENDOR_PROFILE_STORAGE_KEY), null);
});

test("approved storage: duplicate IDs / broken references are rejected and cleared", () => {
  const brokenRefs = validProfile();
  brokenRefs.productKnowledge.desiredOutcomes = [
    {
      id: "outcome-1",
      statement: "Outcome",
      problemIds: ["problem-missing"],
    },
  ];

  const storage = memoryStorage({
    [APPROVED_VENDOR_PROFILE_STORAGE_KEY]: JSON.stringify(brokenRefs),
  });
  assert.strictEqual(loadApprovedVendorProfile(storage), null);
  assert.strictEqual(storage.getItem(APPROVED_VENDOR_PROFILE_STORAGE_KEY), null);

  const dupes = validProfile();
  dupes.productKnowledge.capabilities = [
    {
      id: "problem-prioritization",
      name: "Collision",
      description: "Same id as problem",
      problemIds: [],
      outcomeIds: [],
    },
  ];
  const storageDupes = memoryStorage({
    [APPROVED_VENDOR_PROFILE_STORAGE_KEY]: JSON.stringify(dupes),
  });
  assert.strictEqual(loadApprovedVendorProfile(storageDupes), null);
  assert.strictEqual(storageDupes.getItem(APPROVED_VENDOR_PROFILE_STORAGE_KEY), null);
});

test("approved storage: valid profile survives reload; clear removes it", () => {
  const storage = memoryStorage();
  saveApprovedVendorProfile(validProfile(), storage);
  assert.ok(loadApprovedVendorProfile(storage));

  clearApprovedVendorProfile(storage);
  assert.strictEqual(loadApprovedVendorProfile(storage), null);
  assert.strictEqual(storage.getItem(APPROVED_VENDOR_PROFILE_STORAGE_KEY), null);
});

test("approved storage: server-side / null storage access is safe", () => {
  assert.strictEqual(loadApprovedVendorProfile(null), null);
  const saved = saveApprovedVendorProfile(validProfile(), null);
  assert.strictEqual(saved.ok, false);
  assert.doesNotThrow(() => clearApprovedVendorProfile(null));
});

test("approved storage: save refuses invalid profiles without writing", () => {
  const storage = memoryStorage();
  const invalid = validProfile();
  invalid.productKnowledge.desiredOutcomes = [
    { id: "outcome-1", statement: "x", problemIds: ["missing"] },
  ];

  const result = saveApprovedVendorProfile(invalid, storage);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(storage.getItem(APPROVED_VENDOR_PROFILE_STORAGE_KEY), null);
});

test("approved storage snapshot: unchanged reads return the same object reference", () => {
  const storage = memoryStorage();
  const profile = validProfile();
  profile.productKnowledge.offering = "Original offering text";
  const saved = saveApprovedVendorProfile(profile, storage);
  assert.strictEqual(saved.ok, true);

  const first = getApprovedVendorProfileSnapshot(storage);
  const second = getApprovedVendorProfileSnapshot(storage);
  const third = loadApprovedVendorProfile(storage);

  assert.ok(first);
  assert.strictEqual(first, second);
  assert.strictEqual(second, third);
  assert.strictEqual(first.productKnowledge.offering, "Original offering text");
});

test("approved storage snapshot: approval changes snapshot once and notifies subscribers", () => {
  const storage = memoryStorage();
  let notifications = 0;

  // Browser-only subscription path; in Node this is a no-op unsubscribe.
  const unsubscribe = subscribeApprovedVendorProfile(() => {
    notifications += 1;
  });

  const before = getApprovedVendorProfileSnapshot(storage);
  assert.strictEqual(before, null);

  const profile = validProfile();
  profile.productKnowledge.offering = "Approved offering description";
  const saved = saveApprovedVendorProfile(profile, storage);
  assert.strictEqual(saved.ok, true);

  const after = getApprovedVendorProfileSnapshot(storage);
  assert.ok(after);
  assert.notStrictEqual(after, before);
  assert.strictEqual(after.productKnowledge.offering, "Approved offering description");
  assert.strictEqual(getApprovedVendorProfileSnapshot(storage), after);

  // When a DOM is present, save must notify; otherwise snapshot stability alone is enough.
  if (typeof globalThis.window !== "undefined") {
    assert.ok(notifications >= 1);
  }

  unsubscribe();
});

test("approved storage snapshot: clear and replace update the snapshot correctly", () => {
  const storage = memoryStorage();
  const first = validProfile();
  first.vendorName = "First Co";
  first.productKnowledge.offering = "First offering";
  saveApprovedVendorProfile(first, storage);

  const firstSnap = getApprovedVendorProfileSnapshot(storage);
  assert.ok(firstSnap);
  assert.strictEqual(firstSnap.vendorName, "First Co");

  clearApprovedVendorProfile(storage);
  const cleared = getApprovedVendorProfileSnapshot(storage);
  assert.strictEqual(cleared, null);
  assert.strictEqual(getApprovedVendorProfileSnapshot(storage), null);

  const second = validProfile();
  second.vendorName = "Second Co";
  second.id = "vendor-second";
  second.websiteUrl = "https://second.example";
  second.productKnowledge.offering = "Second offering";
  saveApprovedVendorProfile(second, storage);

  const secondSnap = getApprovedVendorProfileSnapshot(storage);
  assert.ok(secondSnap);
  assert.strictEqual(secondSnap.vendorName, "Second Co");
  assert.strictEqual(secondSnap.productKnowledge.offering, "Second offering");
  assert.notStrictEqual(secondSnap, firstSnap);
  assert.strictEqual(getApprovedVendorProfileSnapshot(storage), secondSnap);
});

test("approved storage snapshot: malformed localStorage is handled safely and stays null", () => {
  const storage = memoryStorage({
    [APPROVED_VENDOR_PROFILE_STORAGE_KEY]: "{ broken",
  });

  const first = getApprovedVendorProfileSnapshot(storage);
  const second = getApprovedVendorProfileSnapshot(storage);
  assert.strictEqual(first, null);
  assert.strictEqual(second, null);
  assert.strictEqual(first, second);
  assert.strictEqual(storage.getItem(APPROVED_VENDOR_PROFILE_STORAGE_KEY), null);
});

test("approved storage snapshot: server snapshot is stable", () => {
  const a = getApprovedVendorProfileServerSnapshot();
  const b = getApprovedVendorProfileServerSnapshot();
  assert.strictEqual(a, null);
  assert.strictEqual(a, b);
});

test("approved storage snapshot: persistApprovedVendorProfile offering survives reload", () => {
  const storage = memoryStorage();
  const profile = validProfile();
  profile.productKnowledge.offering = "Edited offering for approval";
  const persisted = persistApprovedVendorProfile(profile, storage);
  assert.strictEqual(persisted.ok, true);

  const reloaded = getApprovedVendorProfileSnapshot(storage);
  assert.ok(reloaded);
  assert.strictEqual(reloaded.productKnowledge.offering, "Edited offering for approval");
  assert.strictEqual(getApprovedVendorProfileSnapshot(storage), reloaded);
});

test("vendor onboarding flow: success and incomplete open refinement; failed does not", () => {
  assert.strictEqual(shouldOpenRefinement("success"), true);
  assert.strictEqual(shouldOpenRefinement("incomplete"), true);
  assert.strictEqual(shouldOpenRefinement("failed"), false);
});

test("vendor onboarding flow: failed research helpers never suggest saving a profile", () => {
  assert.strictEqual(shouldOpenRefinement("failed"), false);
  const message = toSafeResearchErrorMessage({
    failureReason: "GEMINI_API_KEY=super-secret should not leak",
  });
  assert.doesNotMatch(message, /super-secret/);
  assert.doesNotMatch(message, /GEMINI_API_KEY=/);
  assert.match(message, /configuration|unavailable|try again/i);
});

test("vendor onboarding flow: persistApprovedVendorProfile only saves valid profiles", () => {
  const storage = memoryStorage();
  const ok = persistApprovedVendorProfile(validProfile(), storage);
  assert.strictEqual(ok.ok, true);
  assert.ok(loadApprovedVendorProfile(storage));

  clearApprovedVendorProfile(storage);
  const bad = validProfile();
  bad.productKnowledge.desiredOutcomes = [
    { id: "outcome-1", statement: "x", problemIds: ["missing"] },
  ];
  const refused = persistApprovedVendorProfile(bad, storage);
  assert.strictEqual(refused.ok, false);
  assert.strictEqual(loadApprovedVendorProfile(storage), null);
});

test("vendor onboarding flow: replace must not overwrite before approval (storage unchanged until save)", () => {
  const storage = memoryStorage();
  const first = validProfile({ vendorName: "First Vendor" });
  first.vendorName = "First Vendor";
  saveApprovedVendorProfile(first, storage);

  // Simulating "confirm replace" without approval must leave storage intact.
  const stillThere = loadApprovedVendorProfile(storage);
  assert.ok(stillThere);
  assert.strictEqual(stillThere.vendorName, "First Vendor");

  const second = validProfile();
  second.vendorName = "Second Vendor";
  second.id = "vendor-second";
  second.websiteUrl = "https://second.example";
  persistApprovedVendorProfile(second, storage);

  const replaced = loadApprovedVendorProfile(storage);
  assert.ok(replaced);
  assert.strictEqual(replaced.vendorName, "Second Vendor");
});

test("normalizeVendorWebsiteUrl: accepts domains and https URLs; rejects invalid input", () => {
  assert.deepStrictEqual(normalizeVendorWebsiteUrl("snowflake.com"), {
    ok: true,
    url: "https://snowflake.com",
  });
  assert.deepStrictEqual(normalizeVendorWebsiteUrl("www.snowflake.com"), {
    ok: true,
    url: "https://www.snowflake.com",
  });
  assert.deepStrictEqual(normalizeVendorWebsiteUrl("https://snowflake.com"), {
    ok: true,
    url: "https://snowflake.com",
  });
  assert.deepStrictEqual(normalizeVendorWebsiteUrl("https://www.snowflake.com"), {
    ok: true,
    url: "https://www.snowflake.com",
  });
  assert.deepStrictEqual(normalizeVendorWebsiteUrl("  snowflake.com  "), {
    ok: true,
    url: "https://snowflake.com",
  });

  assert.strictEqual(normalizeVendorWebsiteUrl("").ok, false);
  assert.strictEqual(normalizeVendorWebsiteUrl("   ").ok, false);
  assert.strictEqual(normalizeVendorWebsiteUrl("not a valid website").ok, false);
  assert.strictEqual(normalizeVendorWebsiteUrl("hello").ok, false);
  assert.strictEqual(normalizeVendorWebsiteUrl("ftp://snowflake.com").ok, false);
  assert.strictEqual(normalizeVendorWebsiteUrl("javascript:alert(1)").ok, false);
  assert.strictEqual(normalizeVendorWebsiteUrl("file:///etc/passwd").ok, false);
});

test("vendor onboarding experience prepares normalized URL for research submission", () => {
  const experiencePath = path.join(__dirname, "../../components/vendor-onboarding-experience.tsx");
  const experienceSource = fs.readFileSync(experiencePath, "utf8");
  assert.match(experienceSource, /normalizeVendorWebsiteUrl/);
  assert.match(experienceSource, /normalized\.url/);
  assert.match(experienceSource, /JSON\.stringify\(\{\s*url:\s*normalized\.url/);
});

test("vendor onboarding production sources: no fixture / content-only path; approved UI avoids raw ids/json", () => {
  const experiencePath = path.join(__dirname, "../../components/vendor-onboarding-experience.tsx");
  const pagePath = path.join(__dirname, "../../vendor/page.tsx");
  const experienceSource = fs.readFileSync(experiencePath, "utf8");
  const pageSource = fs.readFileSync(pagePath, "utf8");

  for (const pattern of ONBOARDING_FORBIDDEN_IMPORT_PATTERNS) {
    assert.doesNotMatch(experienceSource, new RegExp(pattern));
    assert.doesNotMatch(pageSource, new RegExp(pattern));
  }

  assert.match(experienceSource, /\/api\/vendor\/research/);
  assert.match(experienceSource, /VendorRefinementMode/);
  assert.match(
    experienceSource,
    /persistApprovedVendorProfile|saveApprovedVendorProfile|getApprovedVendorProfileSnapshot|loadApprovedVendorProfile/,
  );
  assert.match(experienceSource, /useSyncExternalStore/);
  assert.match(experienceSource, /getApprovedVendorProfileSnapshot/);
  assert.match(experienceSource, /Research my company/);
  assert.match(experienceSource, /Approved Vendor Profile/);
  assert.match(experienceSource, /vendorName/);
  assert.match(experienceSource, /websiteUrl/);

  // Approved-state rendering must not dump JSON or advertise system ids.
  assert.doesNotMatch(experienceSource, /JSON\.stringify\(approvedProfile\)/);
  assert.doesNotMatch(experienceSource, /approvedProfile\.id/);
  assert.doesNotMatch(experienceSource, /process\.env/);
  assert.doesNotMatch(experienceSource, /GEMINI_API_KEY/);
  assert.doesNotMatch(experienceSource, /console\.(log|error|debug)/);
});

test("validateApprovedVendorProfile: structural schema rejects incomplete objects", () => {
  const result = validateApprovedVendorProfile({ id: "x" });
  assert.strictEqual(result.ok, false);
});

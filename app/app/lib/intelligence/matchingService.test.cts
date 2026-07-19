/* eslint-disable @typescript-eslint/no-require-imports -- .cts test files must use CommonJS require(). */
const test = require("node:test");
const assert = require("node:assert/strict");

const { mapToEvaluationInput } = require("./matchingService.ts");
const { generateRecommendation } = require("./recommendationEngine.ts");
const { gtmBrainVendorProfile } = require("./vendorProfile.test-data.ts");
const { fullMatchProfile, partialMatchProfile } = require("./matchingService.test-data.ts");

function gate(status: "passed" | "failed" | "unknown", evidenceIds: string[], context: string) {
  return { status, evidenceIds, context };
}

function mockCallReturning(output: unknown) {
  return async () => ({ text: JSON.stringify(output) });
}

test("all five gates pass -> Recommendation Engine V1 decides Invest", async () => {
  const mockOutput = {
    whyThem: gate("passed", ["firmo-1"], "Matches the named-account ICP criterion."),
    whyNow: gate("passed", ["announce-1"], "Recent territory restructuring found."),
    whyUs: gate("passed", ["core-1"], "Evaluation approach mirrors GTM Brain's differentiation."),
    firmographicDisqualifier: gate("passed", [], "No disqualifying evidence was found."),
    redFlag: gate("passed", [], "No red flag evidence was found."),
  };

  const input = await mapToEvaluationInput(fullMatchProfile, gtmBrainVendorProfile, {
    call: mockCallReturning(mockOutput),
  });

  assert.strictEqual(input.whyThem.length, 2);
  assert.ok(input.whyThem.every((g: { status: string }) => g.status === "pass"));
  assert.strictEqual(input.whyNow.length, 1);
  assert.strictEqual(input.whyNow[0].status, "pass");
  assert.strictEqual(input.whyUs.length, 2);
  assert.ok(input.whyUs.every((g: { status: string }) => g.status === "pass"));

  const result = generateRecommendation(input);
  assert.strictEqual(result.decision, "Invest");
});

test("unknown gates (no AI evidence) never guess pass/fail, decision Monitor", async () => {
  const unknownGate = gate("unknown", [], "No relevant evidence was found in the company profile.");
  const mockOutput = {
    whyThem: unknownGate,
    whyNow: unknownGate,
    whyUs: unknownGate,
    firmographicDisqualifier: unknownGate,
    redFlag: unknownGate,
  };

  const input = await mapToEvaluationInput(partialMatchProfile, gtmBrainVendorProfile, {
    call: mockCallReturning(mockOutput),
  });

  const allStatuses = [...input.whyThem, ...input.whyNow, ...input.whyUs].map(
    (g: { status: string }) => g.status,
  );
  assert.ok(allStatuses.every((status: string) => status === "unknown"));

  const result = generateRecommendation(input);
  assert.strictEqual(result.decision, "Monitor");
});

test("a failed Why Them gate is significant by default, decision Skip", async () => {
  const mockOutput = {
    whyThem: gate("failed", ["firmo-1"], "The company is a consumer app with no enterprise sales motion."),
    whyNow: gate("unknown", [], "No signal evidence found."),
    whyUs: gate("unknown", [], "No differentiation evidence found."),
    firmographicDisqualifier: gate("unknown", [], "No disqualifier evidence found."),
    redFlag: gate("unknown", [], "No red flag evidence found."),
  };

  const input = await mapToEvaluationInput(fullMatchProfile, gtmBrainVendorProfile, {
    call: mockCallReturning(mockOutput),
  });

  const whyThemGate = input.whyThem.find((g: { id: string }) => g.id === "ai-why-them");
  assert.ok(whyThemGate);
  assert.strictEqual(whyThemGate.status, "fail");

  const result = generateRecommendation(input);
  assert.strictEqual(result.decision, "Skip");
});

test("a failed Firmographic Disqualifier gate also triggers Skip via the Why Them group", async () => {
  const mockOutput = {
    whyThem: gate("passed", ["firmo-1"], "Matches the named-account ICP criterion."),
    whyNow: gate("unknown", [], "No signal evidence found."),
    whyUs: gate("unknown", [], "No differentiation evidence found."),
    firmographicDisqualifier: gate(
      "failed",
      ["firmo-1"],
      "The company is self-serve-only with no named enterprise accounts.",
    ),
    redFlag: gate("unknown", [], "No red flag evidence found."),
  };

  const input = await mapToEvaluationInput(fullMatchProfile, gtmBrainVendorProfile, {
    call: mockCallReturning(mockOutput),
  });

  const disqualifierGate = input.whyThem.find(
    (g: { id: string }) => g.id === "ai-firmographic-disqualifier",
  );
  assert.ok(disqualifierGate);
  assert.strictEqual(disqualifierGate.status, "fail");

  const result = generateRecommendation(input);
  assert.strictEqual(result.decision, "Skip");
});

test("evidence chain preserves both the AI's context and the cited claim text, tagged by claimId", async () => {
  const mockOutput = {
    whyThem: gate("passed", ["firmo-1", "firmo-2"], "Matches the named-account ICP criterion."),
    whyNow: gate("unknown", [], "No signal evidence found."),
    whyUs: gate("unknown", [], "No differentiation evidence found."),
    firmographicDisqualifier: gate("unknown", [], "No disqualifier evidence found."),
    redFlag: gate("unknown", [], "No red flag evidence found."),
  };

  const input = await mapToEvaluationInput(fullMatchProfile, gtmBrainVendorProfile, {
    call: mockCallReturning(mockOutput),
  });

  const whyThemGate = input.whyThem.find((g: { id: string }) => g.id === "ai-why-them");
  assert.ok(whyThemGate?.evidence);
  assert.strictEqual(whyThemGate.evidence[0], "Matches the named-account ICP criterion.");
  assert.ok(whyThemGate.evidence.some((e: string) => e.startsWith("[firmo-1]")));
  assert.ok(whyThemGate.evidence.some((e: string) => e.startsWith("[firmo-2]")));
});

test("a hallucinated evidenceId that isn't a real claim in the profile is dropped, not trusted", async () => {
  const mockOutput = {
    whyThem: gate("passed", ["this-claim-id-does-not-exist"], "Matches the named-account ICP criterion."),
    whyNow: gate("unknown", [], "No signal evidence found."),
    whyUs: gate("unknown", [], "No differentiation evidence found."),
    firmographicDisqualifier: gate("unknown", [], "No disqualifier evidence found."),
    redFlag: gate("unknown", [], "No red flag evidence found."),
  };

  const input = await mapToEvaluationInput(fullMatchProfile, gtmBrainVendorProfile, {
    call: mockCallReturning(mockOutput),
  });

  const whyThemGate = input.whyThem.find((g: { id: string }) => g.id === "ai-why-them");
  assert.ok(whyThemGate?.evidence);
  assert.strictEqual(whyThemGate.evidence.length, 1);
  assert.strictEqual(whyThemGate.evidence[0], "Matches the named-account ICP criterion.");
  assert.ok(!whyThemGate.evidence.some((e: string) => e.includes("this-claim-id-does-not-exist")));
});

test("a model call that throws degrades every gate to unknown instead of throwing, decision Monitor", async () => {
  const input = await mapToEvaluationInput(fullMatchProfile, gtmBrainVendorProfile, {
    call: async () => {
      throw new Error("network unreachable");
    },
  });

  const allGates = [...input.whyThem, ...input.whyNow, ...input.whyUs];
  assert.ok(allGates.every((g: { status: string }) => g.status === "unknown"));
  assert.ok(
    allGates.every((g: { evidence: string[] }) => g.evidence[0]?.includes("network unreachable")),
  );

  const result = generateRecommendation(input);
  assert.strictEqual(result.decision, "Monitor");
});

test("malformed JSON from the model degrades every gate to unknown instead of throwing", async () => {
  const input = await mapToEvaluationInput(fullMatchProfile, gtmBrainVendorProfile, {
    call: async () => ({ text: "not json" }),
  });

  const allGates = [...input.whyThem, ...input.whyNow, ...input.whyUs];
  assert.ok(allGates.every((g: { status: string }) => g.status === "unknown"));

  const result = generateRecommendation(input);
  assert.strictEqual(result.decision, "Monitor");
});

test("a response violating the schema degrades every gate to unknown instead of throwing", async () => {
  const input = await mapToEvaluationInput(fullMatchProfile, gtmBrainVendorProfile, {
    call: async () => ({ text: JSON.stringify({ whyThem: { status: "maybe" } }) }),
  });

  const allGates = [...input.whyThem, ...input.whyNow, ...input.whyUs];
  assert.ok(allGates.every((g: { status: string }) => g.status === "unknown"));
});

test("missing GEMINI_API_KEY degrades every gate to unknown without a live call", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const input = await mapToEvaluationInput(fullMatchProfile, gtmBrainVendorProfile);
    const allGates = [...input.whyThem, ...input.whyNow, ...input.whyUs];
    assert.ok(allGates.every((g: { status: string }) => g.status === "unknown"));
    assert.ok(allGates.every((g: { evidence: string[] }) => g.evidence[0]?.includes("GEMINI_API_KEY")));
  } finally {
    if (previousKey !== undefined) {
      process.env.GEMINI_API_KEY = previousKey;
    }
  }
});

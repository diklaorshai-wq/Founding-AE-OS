/* eslint-disable @typescript-eslint/no-require-imports -- .cts test files must use CommonJS require(). */
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  GeminiMatchingOutputSchema,
  MATCHING_RESPONSE_JSON_SCHEMA,
  buildMatchingPrompt,
} = require("./matchingPrompt.ts");

function passedGate(evidenceIds: string[], context: string) {
  return { status: "passed" as const, evidenceIds, context };
}

function unknownGate() {
  return { status: "unknown" as const, evidenceIds: [] as string[], context: "No relevant evidence was found." };
}

function failedGate(evidenceIds: string[], context: string) {
  return { status: "failed" as const, evidenceIds, context };
}

test("GeminiMatchingOutputSchema: parses a fully-populated, well-formed mock response", () => {
  const mockResponse = {
    whyThem: passedGate(["firmo-1"], "The company matches the named-account ICP criterion."),
    whyNow: passedGate(["announce-1"], "A recent territory restructuring was found."),
    whyUs: passedGate(["core-1"], "The company's evaluation approach mirrors GTM Brain's differentiation."),
    firmographicDisqualifier: unknownGate(),
    redFlag: unknownGate(),
  };

  const result = GeminiMatchingOutputSchema.parse(mockResponse);

  assert.strictEqual(result.whyThem.status, "passed");
  assert.deepStrictEqual(result.whyThem.evidenceIds, ["firmo-1"]);
  assert.strictEqual(result.firmographicDisqualifier.status, "unknown");
  assert.deepStrictEqual(result.firmographicDisqualifier.evidenceIds, []);
});

test("GeminiMatchingOutputSchema: parses a response where disqualifier and red flag gates fail", () => {
  const mockResponse = {
    whyThem: unknownGate(),
    whyNow: unknownGate(),
    whyUs: unknownGate(),
    firmographicDisqualifier: failedGate(
      ["firmo-1"],
      "The company is self-serve-only with no named enterprise accounts.",
    ),
    redFlag: failedGate(["firmo-1"], "No named-account enterprise selling motion was found."),
  };

  const result = GeminiMatchingOutputSchema.safeParse(mockResponse);

  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.data.firmographicDisqualifier.status, "failed");
    assert.strictEqual(result.data.redFlag.status, "failed");
  }
});

test("GeminiMatchingOutputSchema: parses an all-unknown response (no evidence at all)", () => {
  const mockResponse = {
    whyThem: unknownGate(),
    whyNow: unknownGate(),
    whyUs: unknownGate(),
    firmographicDisqualifier: unknownGate(),
    redFlag: unknownGate(),
  };

  const result = GeminiMatchingOutputSchema.safeParse(mockResponse);
  assert.strictEqual(result.success, true);
});

test("GeminiMatchingOutputSchema: rejects an invalid status enum value", () => {
  const mockResponse = {
    whyThem: { status: "maybe", evidenceIds: [], context: "not a real status" },
    whyNow: unknownGate(),
    whyUs: unknownGate(),
    firmographicDisqualifier: unknownGate(),
    redFlag: unknownGate(),
  };

  const result = GeminiMatchingOutputSchema.safeParse(mockResponse);
  assert.strictEqual(result.success, false);
});

test("GeminiMatchingOutputSchema: rejects a response missing a required gate", () => {
  const mockResponse = {
    whyThem: unknownGate(),
    whyNow: unknownGate(),
    whyUs: unknownGate(),
    firmographicDisqualifier: unknownGate(),
    // redFlag intentionally omitted
  };

  const result = GeminiMatchingOutputSchema.safeParse(mockResponse);
  assert.strictEqual(result.success, false);
});

test("GeminiMatchingOutputSchema: rejects a gate whose evidenceIds is not an array of strings", () => {
  const mockResponse = {
    whyThem: { status: "passed", evidenceIds: [123], context: "bad evidenceIds type" },
    whyNow: unknownGate(),
    whyUs: unknownGate(),
    firmographicDisqualifier: unknownGate(),
    redFlag: unknownGate(),
  };

  const result = GeminiMatchingOutputSchema.safeParse(mockResponse);
  assert.strictEqual(result.success, false);
});

test("GeminiMatchingOutputSchema: rejects a gate missing the context field", () => {
  const mockResponse = {
    whyThem: { status: "passed", evidenceIds: ["firmo-1"] },
    whyNow: unknownGate(),
    whyUs: unknownGate(),
    firmographicDisqualifier: unknownGate(),
    redFlag: unknownGate(),
  };

  const result = GeminiMatchingOutputSchema.safeParse(mockResponse);
  assert.strictEqual(result.success, false);
});

test("MATCHING_RESPONSE_JSON_SCHEMA: compiles into a JSON Schema object covering all five gates", () => {
  assert.strictEqual(typeof MATCHING_RESPONSE_JSON_SCHEMA, "object");
  const schema = MATCHING_RESPONSE_JSON_SCHEMA as { properties?: Record<string, unknown> };
  const gateNames = ["whyThem", "whyNow", "whyUs", "firmographicDisqualifier", "redFlag"];
  for (const gateName of gateNames) {
    assert.ok(schema.properties?.[gateName], `expected a "${gateName}" property in the JSON schema`);
  }
});

test("buildMatchingPrompt: embeds both the company profile and vendor profile as JSON in the prompt", () => {
  const companyProfile = {
    submittedDomain: "novacart.example",
    accountName: "NovaCart",
    firmographicData: { claims: [] },
    coreBusinessActivities: { claims: [] },
    corporateAnnouncements: { claims: [] },
    hiringAndRoleTrends: { claims: [] },
    observedTechnologies: { claims: [] },
  };
  const vendorProfile = {
    id: "gtm-brain",
    websiteUrl: "https://gtmbrain.example",
    vendorName: "GTM Brain",
    productKnowledge: {
      offering: "",
      customerProblems: [],
      desiredOutcomes: [],
      buyingReasons: [],
      capabilities: [],
      useCases: [],
      commonAlternatives: [],
      relevantDifferentiation: [],
      proofPoints: [],
    },
    decisionStrategy: {
      idealCustomerProfile: { criteria: [], examples: [], firmographicDisqualifiers: [] },
      targetPersonas: [],
      budgetOwners: [],
      whyNowSignals: [],
      redFlags: [],
    },
  };

  // Type-checked as CompanyProfile/VendorProfile at the call site in real
  // usage; using untyped literals here keeps this test file dependency-light.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prompt = buildMatchingPrompt(companyProfile as any, vendorProfile as any);

  assert.match(prompt, /Why Them, Why Now, Why Us, Firmographic Disqualifier, and Red Flag/);
  assert.match(prompt, /"accountName": "NovaCart"/);
  assert.match(prompt, /"vendorName": "GTM Brain"/);
});

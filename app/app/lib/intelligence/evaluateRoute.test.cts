/* eslint-disable @typescript-eslint/no-require-imports -- .cts test files must use CommonJS require(). */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  runCanonicalEvaluate,
  buildDecisionEvidenceBundle,
} = require("./evaluatePipeline.ts");
const { DecisionEvidenceItemSchema, FinalEvaluationResponseSchema } = require("./types/contracts.ts");
const { createEmptyCompanyProfile } = require("./types/companyProfile.ts");
const { gtmBrainVendorProfile } = require("./vendorProfile.test-data.ts");

function finding(overrides: Record<string, unknown> = {}) {
  return {
    claim: "A finding.",
    source: "https://example.com",
    date: "2026-01-01",
    connectedVendorItemId: "unstructured-prioritization",
    natureOfConnection: "explicit_fact",
    decisionImpact: "supportive",
    ...overrides,
  };
}

test("DecisionEvidenceItemSchema: accepts a canonical decision-evidence item", () => {
  const parsed = DecisionEvidenceItemSchema.safeParse({
    decisionGroup: "whyThem",
    claim: "Claim text.",
    source: "https://example.com",
    date: "2026-01-01",
    connectedVendorItemId: "unstructured-prioritization",
    natureOfConnection: "explicit_fact",
    decisionImpact: "supportive",
  });
  assert.strictEqual(parsed.success, true);
});

test("DecisionEvidenceItemSchema: rejects a legacy EvidenceClaim shape", () => {
  const parsed = DecisionEvidenceItemSchema.safeParse({
    claimId: "firmo-1",
    claimNature: "explicit_fact",
    claimSummary: "Legacy claim",
    underlyingSources: [
      {
        sourceUrl: "https://example.com",
        sourceTitle: "Example",
        capturedTimestamp: "2026-01-01T00:00:00.000Z",
      },
    ],
  });
  assert.strictEqual(parsed.success, false);
});

test("FinalEvaluationResponseSchema: evidenceBundle uses DecisionEvidenceItem, not EvidenceClaim", () => {
  const parsed = FinalEvaluationResponseSchema.safeParse({
    executionStatus: "success",
    decisionOutcome: "Monitor",
    curatedReasons: [{ text: "Because.", evaluationId: "business-case", supportingClaimIds: [] }],
    recommendedFirstMove: "Wait.",
    evidenceBundle: [
      {
        decisionGroup: "whyNow",
        claim: "Timing.",
        source: "https://example.com",
        date: "2026-01-01",
        connectedVendorItemId: "new-territories",
        natureOfConnection: "explicit_fact",
        decisionImpact: "supportive",
      },
    ],
  });
  assert.strictEqual(parsed.success, true);
});

test("buildDecisionEvidenceBundle: tags findings by decision group without fabricating fields", () => {
  const profile = {
    ...createEmptyCompanyProfile(),
    relevantBusinessEvidence: [finding({ claim: "Them." })],
    whyNowEvidence: [finding({ claim: "Now.", connectedVendorItemId: "new-territories" })],
    whyUsEvidence: [finding({ claim: "Us.", connectedVendorItemId: "evidence-based-evaluation" })],
  };

  const bundle = buildDecisionEvidenceBundle(profile);
  assert.strictEqual(bundle.length, 3);
  assert.strictEqual(bundle[0].decisionGroup, "whyThem");
  assert.strictEqual(bundle[1].decisionGroup, "whyNow");
  assert.strictEqual(bundle[2].decisionGroup, "whyUs");
  assert.ok(!("claimId" in bundle[0]));
  assert.ok(!("underlyingSources" in bundle[0]));
});

test("runCanonicalEvaluate: failed research produces 502 RESEARCH_FAILED", async () => {
  const result = await runCanonicalEvaluate("example.com", gtmBrainVendorProfile, async () => ({
    status: "failed",
    profileData: null,
    failureReason: "GEMINI_API_KEY is not configured.",
  }));

  assert.strictEqual(result.httpStatus, 502);
  assert.strictEqual(result.body.executionStatus, "failed");
  assert.strictEqual(result.body.errorDetails.code, "RESEARCH_FAILED");
  assert.match(result.body.errorDetails.message, /GEMINI_API_KEY/);
  assert.ok(!JSON.stringify(result.body).includes("AQ."));
});

test("runCanonicalEvaluate: incomplete research produces 200 with empty evidenceBundle", async () => {
  const emptyProfile = createEmptyCompanyProfile();
  emptyProfile.companyIdentity = { name: "EmptyCo", url: "https://empty.example" };

  const result = await runCanonicalEvaluate("empty.example", gtmBrainVendorProfile, async () => ({
    status: "incomplete",
    profileData: emptyProfile,
    failureReason: "No usable vendor-linked evidence was found for empty.example.",
  }));

  assert.strictEqual(result.httpStatus, 200);
  assert.strictEqual(result.body.executionStatus, "success");
  assert.strictEqual(result.body.decisionOutcome, "Monitor");
  assert.deepStrictEqual(result.body.evidenceBundle, []);
});

test("runCanonicalEvaluate: successful research produces canonical decision evidence", async () => {
  const profile = {
    ...createEmptyCompanyProfile(),
    companyIdentity: { name: "NovaCart", url: "https://novacart.example" },
    relevantBusinessEvidence: [finding({ claim: "Manual prioritization." })],
    whyNowEvidence: [finding({ claim: "New territories.", connectedVendorItemId: "new-territories" })],
    whyUsEvidence: [
      finding({ claim: "Capability fit.", connectedVendorItemId: "evidence-based-evaluation" }),
    ],
  };

  const result = await runCanonicalEvaluate("novacart.example", gtmBrainVendorProfile, async () => ({
    status: "success",
    profileData: profile,
  }));

  assert.strictEqual(result.httpStatus, 200);
  assert.strictEqual(result.body.executionStatus, "success");
  assert.strictEqual(result.body.decisionOutcome, "Invest");
  assert.strictEqual(result.body.evidenceBundle.length, 3);
  assert.strictEqual(result.body.evidenceBundle[0].decisionGroup, "whyThem");
  assert.strictEqual(result.body.evidenceBundle[0].claim, "Manual prioritization.");
  assert.strictEqual(result.body.evidenceBundle[0].decisionImpact, "supportive");
});

test("evaluate route source: does not import legacy matchingService (no second Gemini matching call)", () => {
  const routePath = path.join(__dirname, "../../api/evaluate/route.ts");
  const pipelinePath = path.join(__dirname, "evaluatePipeline.ts");
  const routeSource = fs.readFileSync(routePath, "utf8");
  const pipelineSource = fs.readFileSync(pipelinePath, "utf8");

  assert.doesNotMatch(routeSource, /from ["'].*matchingService/);
  assert.doesNotMatch(routeSource, /mapToEvaluationInput/);
  assert.match(routeSource, /runCanonicalEvaluate/);
  assert.doesNotMatch(pipelineSource, /from ["'].*matchingService/);
  assert.doesNotMatch(pipelineSource, /mapToEvaluationInput/);
  assert.match(pipelineSource, /mapEvidenceToDecisionGroups/);
  assert.match(pipelineSource, /researchCompanyFromUrl/);
});

test("request validation helpers: INVALID_JSON / INVALID_BODY / INVALID_URL codes remain defined in the route", () => {
  const routePath = path.join(__dirname, "../../api/evaluate/route.ts");
  const routeSource = fs.readFileSync(routePath, "utf8");
  assert.match(routeSource, /INVALID_JSON/);
  assert.match(routeSource, /INVALID_BODY/);
  assert.match(routeSource, /INVALID_URL/);
  assert.match(routeSource, /Request body must be valid JSON/);
  assert.match(routeSource, /non-empty "url" string/);
});

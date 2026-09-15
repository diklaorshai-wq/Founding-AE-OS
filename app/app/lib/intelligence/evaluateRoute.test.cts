/* eslint-disable @typescript-eslint/no-require-imports -- .cts test files must use CommonJS require(). */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  handleCompanyEvaluatePost,
  sanitizeEvaluateDomain,
} = require("./companyEvaluateApi.ts");
const {
  runCanonicalEvaluate,
  buildDecisionEvidenceBundle,
} = require("./evaluatePipeline.ts");
const {
  toEvaluateResultViewModel,
} = require("./companyEvaluateResult.ts");
const {
  normalizeTargetCompanyUrl,
  missingApprovedVendorMessage,
  toSafeEvaluateErrorMessage,
  parseEvaluateResponseBody,
  requestCompanyEvaluate,
} = require("./companyEvaluateClient.ts");
const { DecisionEvidenceItemSchema, FinalEvaluationResponseSchema } = require("./types/contracts.ts");
const { createEmptyCompanyProfile } = require("./types/companyProfile.ts");
const { gtmBrainVendorProfile } = require("./vendorProfile.test-data.ts");

function finding(overrides = {}) {
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

function jsonRequest(body) {
  return new Request("http://localhost/api/evaluate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function malformedJsonRequest() {
  return new Request("http://localhost/api/evaluate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{ not-json",
  });
}

async function readJson(response) {
  return await response.json();
}

function validVendor() {
  return structuredClone(gtmBrainVendorProfile);
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

test("runCanonicalEvaluate: requires an explicit VendorProfile (no fixture default)", async () => {
  const pipelinePath = path.join(__dirname, "evaluatePipeline.ts");
  const pipelineSource = fs.readFileSync(pipelinePath, "utf8");
  assert.doesNotMatch(pipelineSource, /gtmBrainVendorProfile/);
  assert.doesNotMatch(pipelineSource, /vendorProfile\.test-data/);
  assert.doesNotMatch(pipelineSource, /vendorProfile\s*=\s*gtmBrainVendorProfile/);

  const result = await runCanonicalEvaluate("example.com", validVendor(), async () => ({
    status: "failed",
    profileData: null,
    failureReason: "forced",
  }));
  assert.strictEqual(result.httpStatus, 502);
});

test("runCanonicalEvaluate: failed research produces 502 RESEARCH_FAILED", async () => {
  const result = await runCanonicalEvaluate("example.com", validVendor(), async () => ({
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

  const result = await runCanonicalEvaluate("empty.example", validVendor(), async () => ({
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

  const result = await runCanonicalEvaluate("novacart.example", validVendor(), async () => ({
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

test("evaluate route source: production path has no fixture vendor and no legacy matcher", () => {
  const routePath = path.join(__dirname, "../../api/evaluate/route.ts");
  const apiPath = path.join(__dirname, "companyEvaluateApi.ts");
  const pipelinePath = path.join(__dirname, "evaluatePipeline.ts");
  const routeSource = fs.readFileSync(routePath, "utf8");
  const apiSource = fs.readFileSync(apiPath, "utf8");
  const pipelineSource = fs.readFileSync(pipelinePath, "utf8");

  assert.match(routeSource, /handleCompanyEvaluatePost/);
  assert.doesNotMatch(routeSource, /gtmBrainVendorProfile/);
  assert.doesNotMatch(routeSource, /vendorProfile\.test-data/);
  assert.doesNotMatch(routeSource, /from ["'].*matchingService/);
  assert.doesNotMatch(apiSource, /gtmBrainVendorProfile/);
  assert.doesNotMatch(apiSource, /vendorProfile\.test-data/);
  assert.doesNotMatch(apiSource, /from ["'].*matchingService/);
  assert.doesNotMatch(pipelineSource, /from ["'].*matchingService/);
  assert.doesNotMatch(pipelineSource, /mapToEvaluationInput/);
  assert.match(pipelineSource, /mapEvidenceToDecisionGroups/);
  assert.match(pipelineSource, /researchCompanyFromUrl/);
});

test("evaluate API: malformed JSON returns 400 INVALID_JSON", async () => {
  const response = await handleCompanyEvaluatePost(malformedJsonRequest(), async () => {
    throw new Error("evaluate must not be called");
  });
  const body = await readJson(response);
  assert.strictEqual(response.status, 400);
  assert.strictEqual(body.executionStatus, "failed");
  assert.strictEqual(body.errorDetails.code, "INVALID_JSON");
});

test("evaluate API: missing url returns 400 INVALID_BODY", async () => {
  const response = await handleCompanyEvaluatePost(
    jsonRequest({ vendorProfile: validVendor() }),
    async () => {
      throw new Error("evaluate must not be called");
    },
  );
  const body = await readJson(response);
  assert.strictEqual(response.status, 400);
  assert.strictEqual(body.errorDetails.code, "INVALID_BODY");
});

test("evaluate API: malformed url returns 400 INVALID_URL", async () => {
  const response = await handleCompanyEvaluatePost(
    jsonRequest({ url: "not a valid website", vendorProfile: validVendor() }),
    async () => {
      throw new Error("evaluate must not be called");
    },
  );
  const body = await readJson(response);
  assert.strictEqual(response.status, 400);
  assert.strictEqual(body.errorDetails.code, "INVALID_URL");
});

test("evaluate API: unsupported protocol returns 400 INVALID_URL", async () => {
  const response = await handleCompanyEvaluatePost(
    jsonRequest({ url: "ftp://example.com", vendorProfile: validVendor() }),
    async () => {
      throw new Error("evaluate must not be called");
    },
  );
  const body = await readJson(response);
  assert.strictEqual(response.status, 400);
  assert.strictEqual(body.errorDetails.code, "INVALID_URL");
});

test("evaluate API: missing vendorProfile returns 400 INVALID_VENDOR_PROFILE", async () => {
  const response = await handleCompanyEvaluatePost(
    jsonRequest({ url: "monday.com" }),
    async () => {
      throw new Error("evaluate must not be called");
    },
  );
  const body = await readJson(response);
  assert.strictEqual(response.status, 400);
  assert.strictEqual(body.errorDetails.code, "INVALID_VENDOR_PROFILE");
});

test("evaluate API: structurally invalid vendorProfile is rejected", async () => {
  const response = await handleCompanyEvaluatePost(
    jsonRequest({ url: "monday.com", vendorProfile: { vendorName: "Only a name" } }),
    async () => {
      throw new Error("evaluate must not be called");
    },
  );
  const body = await readJson(response);
  assert.strictEqual(response.status, 400);
  assert.strictEqual(body.errorDetails.code, "INVALID_VENDOR_PROFILE");
});

test("evaluate API: semantically invalid vendorProfile is rejected", async () => {
  const broken = validVendor();
  broken.productKnowledge.desiredOutcomes = [
    { id: "outcome-1", statement: "x", problemIds: ["missing-problem"] },
  ];

  const response = await handleCompanyEvaluatePost(
    jsonRequest({ url: "monday.com", vendorProfile: broken }),
    async () => {
      throw new Error("evaluate must not be called");
    },
  );
  const body = await readJson(response);
  assert.strictEqual(response.status, 400);
  assert.strictEqual(body.errorDetails.code, "INVALID_VENDOR_PROFILE");
});

test("evaluate API: valid request passes submitted VendorProfile to evaluation", async () => {
  const vendor = validVendor();
  vendor.vendorName = "Submitted Vendor Co";

  let receivedDomain = "";
  let receivedVendorName = "";

  const response = await handleCompanyEvaluatePost(
    jsonRequest({ url: "https://www.monday.com/path", vendorProfile: vendor }),
    async (domain, vendorProfile) => {
      receivedDomain = domain;
      receivedVendorName = vendorProfile.vendorName;
      return {
        httpStatus: 200,
        body: {
          executionStatus: "success",
          decisionOutcome: "Monitor",
          curatedReasons: [],
          recommendedFirstMove: "Hold.",
          evidenceBundle: [],
        },
      };
    },
  );

  const body = await readJson(response);
  assert.strictEqual(response.status, 200);
  assert.strictEqual(receivedDomain, "www.monday.com");
  assert.strictEqual(receivedVendorName, "Submitted Vendor Co");
  assert.strictEqual(body.executionStatus, "success");
  assert.strictEqual(body.decisionOutcome, "Monitor");
});

test("evaluate API: research failure returns 502 RESEARCH_FAILED", async () => {
  const response = await handleCompanyEvaluatePost(
    jsonRequest({ url: "monday.com", vendorProfile: validVendor() }),
    async () => ({
      httpStatus: 502,
      body: {
        executionStatus: "failed",
        errorDetails: { code: "RESEARCH_FAILED", message: "AI research did not return a company profile." },
      },
    }),
  );
  const body = await readJson(response);
  assert.strictEqual(response.status, 502);
  assert.strictEqual(body.errorDetails.code, "RESEARCH_FAILED");
});

test("sanitizeEvaluateDomain: accepts domains and https URLs", () => {
  assert.strictEqual(sanitizeEvaluateDomain("monday.com"), "monday.com");
  assert.strictEqual(sanitizeEvaluateDomain("https://www.monday.com/x"), "www.monday.com");
  assert.throws(() => sanitizeEvaluateDomain("hello"));
  assert.throws(() => sanitizeEvaluateDomain("ftp://monday.com"));
});

test("toEvaluateResultViewModel: maps only canonical FinalEvaluationResponse fields", () => {
  const view = toEvaluateResultViewModel({
    executionStatus: "success",
    decisionOutcome: "Invest",
    curatedReasons: [{ text: "Fit.", evaluationId: "business-case", supportingClaimIds: [] }],
    recommendedFirstMove: "Call the champion.",
    evidenceBundle: [
      {
        decisionGroup: "whyThem",
        claim: "Problem fit.",
        source: "https://example.com",
        date: "2026-01-01",
        connectedVendorItemId: "problem-1",
        natureOfConnection: "explicit_fact",
        decisionImpact: "supportive",
      },
    ],
  });

  assert.ok(view);
  assert.strictEqual(view.decisionOutcome, "Invest");
  assert.strictEqual(view.curatedReasons.length, 1);
  assert.strictEqual(view.recommendedFirstMove, "Call the champion.");
  assert.strictEqual(view.evidenceByGroup.whyThem.length, 1);
  assert.strictEqual(view.evidenceByGroup.whyNow.length, 0);
  assert.strictEqual(toEvaluateResultViewModel({ executionStatus: "failed" }), null);
});

test("client helpers: normalize URL and missing-vendor messaging", () => {
  assert.deepStrictEqual(normalizeTargetCompanyUrl("monday.com"), {
    ok: true,
    url: "https://monday.com",
  });
  assert.strictEqual(normalizeTargetCompanyUrl("not a url").ok, false);
  assert.match(missingApprovedVendorMessage(), /\/vendor/);
  assert.match(toSafeEvaluateErrorMessage({ networkError: true }), /connection/i);
  assert.match(
    toSafeEvaluateErrorMessage({ code: "RESEARCH_FAILED", status: 502 }),
    /researching/i,
  );
});

test("requestCompanyEvaluate: posts url + vendorProfile and never invents success", async () => {
  const calls = [];
  const vendor = validVendor();

  const ok = await requestCompanyEvaluate(
    { url: "https://monday.com", vendorProfile: vendor },
    async (input, init) => {
      calls.push({ input, init });
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            executionStatus: "success",
            decisionOutcome: "Monitor",
            curatedReasons: [],
            evidenceBundle: [],
          };
        },
      };
    },
  );

  assert.strictEqual(ok.ok, true);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].input, "/api/evaluate");
  const posted = JSON.parse(calls[0].init.body);
  assert.strictEqual(posted.url, "https://monday.com");
  assert.strictEqual(posted.vendorProfile.vendorName, vendor.vendorName);

  const failed = await requestCompanyEvaluate(
    { url: "https://monday.com", vendorProfile: vendor },
    async () => {
      throw new Error("network down");
    },
  );
  assert.strictEqual(failed.ok, false);
  assert.match(failed.message, /connection/i);
});

test("parseEvaluateResponseBody: rejects non-canonical payloads", () => {
  assert.strictEqual(parseEvaluateResponseBody(null), null);
  assert.strictEqual(parseEvaluateResponseBody({ hello: "world" }), null);
  assert.ok(parseEvaluateResponseBody({ executionStatus: "success", decisionOutcome: "Skip" }));
});

test("home evaluate UI source: real path has no mock brief or hard-coded pass gates", () => {
  const experiencePath = path.join(__dirname, "../../components/gtm-brief-experience.tsx");
  const formPath = path.join(__dirname, "../../components/gtm-brief-form.tsx");
  const resultPath = path.join(__dirname, "../../components/evaluate-result.tsx");
  const experienceSource = fs.readFileSync(experiencePath, "utf8");
  const formSource = fs.readFileSync(formPath, "utf8");
  const resultSource = fs.readFileSync(resultPath, "utf8");

  assert.match(formSource, /target-company-url/);
  assert.match(formSource, /monday\.com/);
  assert.doesNotMatch(formSource, /company name/i);
  assert.match(experienceSource, /requestCompanyEvaluate/);
  assert.match(experienceSource, /getApprovedVendorProfileSnapshot/);
  assert.match(experienceSource, /vendorProfile:\s*approvedProfile/);
  assert.match(experienceSource, /\/vendor/);
  assert.match(experienceSource, /EvaluateResult/);
  assert.doesNotMatch(experienceSource, /getMockGtmBrief/);
  assert.doesNotMatch(experienceSource, /LOADING_DURATION_MS|setTimeout/);
  assert.doesNotMatch(experienceSource, /status:\s*"pass"/);
  assert.doesNotMatch(experienceSource, /gtmBrainVendorProfile/);
  assert.doesNotMatch(experienceSource, /matchingService/);
  assert.doesNotMatch(resultSource, /getMockGtmBrief/);
  assert.doesNotMatch(resultSource, /generateRecommendation/);
  assert.match(resultSource, /FinalEvaluationResponse|decisionOutcome/);
});

/* eslint-disable @typescript-eslint/no-require-imports -- .cts test files must use CommonJS require(). */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { handleVendorResearchPost } = require("./vendorResearchApi.ts");

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/vendor/research", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function malformedJsonRequest(): Request {
  return new Request("http://localhost/api/vendor/research", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{ not-json",
  });
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

function assertSafeResponsePayload(payload: unknown) {
  const serialized = JSON.stringify(payload);
  // Must never leak secret *values*, env dumps, or stack frames.
  assert.doesNotMatch(serialized, /process\.env/);
  assert.doesNotMatch(serialized, /AIza[0-9A-Za-z_-]{20,}/);
  assert.doesNotMatch(serialized, /sk-[a-zA-Z0-9]{20,}/);
  assert.doesNotMatch(serialized, /GEMINI_API_KEY\s*=\s*\S+/);
  assert.doesNotMatch(serialized, /\\n\s+at\s+/);
  assert.doesNotMatch(serialized, /at\s+\w+\s+\([^)]+\.(ts|js):\d+:\d+\)/);
}

test("vendor research route: malformed JSON body returns 400 INVALID_JSON with safe failed shape", async () => {
  const response = await handleVendorResearchPost(malformedJsonRequest(), async () => {
    throw new Error("research must not be called");
  });
  const body = await readJson(response);

  assert.strictEqual(response.status, 400);
  assert.strictEqual(body.status, "failed");
  assert.strictEqual(body.profileData, null);
  assert.deepStrictEqual(body.errorDetails, {
    code: "INVALID_JSON",
    message: "Request body must be valid JSON.",
  });
  assertSafeResponsePayload(body);
});

test("vendor research route: missing url returns 400 INVALID_BODY", async () => {
  const response = await handleVendorResearchPost(jsonRequest({}), async () => {
    throw new Error("research must not be called");
  });
  const body = await readJson(response);

  assert.strictEqual(response.status, 400);
  assert.strictEqual(body.status, "failed");
  assert.strictEqual(body.profileData, null);
  assert.deepStrictEqual(body.errorDetails, {
    code: "INVALID_BODY",
    message: 'Request body must include a non-empty "url" string.',
  });
  assertSafeResponsePayload(body);
});

test("vendor research route: empty url string returns 400 INVALID_BODY", async () => {
  const response = await handleVendorResearchPost(jsonRequest({ url: "" }), async () => {
    throw new Error("research must not be called");
  });
  const body = await readJson(response);

  assert.strictEqual(response.status, 400);
  assert.strictEqual(body.status, "failed");
  assert.strictEqual(body.profileData, null);
  assert.equal((body.errorDetails as { code: string }).code, "INVALID_BODY");
  assertSafeResponsePayload(body);
});

test("vendor research route: malformed URL returns 400 INVALID_URL and does not invoke research", async () => {
  let researchCalled = false;
  const response = await handleVendorResearchPost(jsonRequest({ url: "not a url :::" }), async () => {
    researchCalled = true;
    return { status: "failed", profileData: null, failureReason: "should not run" };
  });
  const body = await readJson(response);

  assert.strictEqual(researchCalled, false);
  assert.strictEqual(response.status, 400);
  assert.strictEqual(body.status, "failed");
  assert.strictEqual(body.profileData, null);
  assert.deepStrictEqual(body.errorDetails, {
    code: "INVALID_URL",
    message: 'The provided "url" could not be parsed as a valid vendor website URL.',
  });
  assertSafeResponsePayload(body);
});

test("vendor research route: unsupported protocol returns 400 INVALID_URL and does not invoke research", async () => {
  let researchCalled = false;
  const response = await handleVendorResearchPost(
    jsonRequest({ url: "ftp://vendor.example" }),
    async () => {
      researchCalled = true;
      return { status: "failed", profileData: null, failureReason: "should not run" };
    },
  );
  const body = await readJson(response);

  assert.strictEqual(researchCalled, false);
  assert.strictEqual(response.status, 400);
  assert.equal((body.errorDetails as { code: string }).code, "INVALID_URL");
  assertSafeResponsePayload(body);
});

test("vendor research route: valid bare domain is accepted and passed as hostname to research", async () => {
  let capturedUrl = "";
  const response = await handleVendorResearchPost(
    jsonRequest({ url: "gtmbrain.example" }),
    async (url) => {
      capturedUrl = url;
      return {
        status: "incomplete",
        profileData: {
          id: "vendor-gtmbrain-example",
          websiteUrl: "https://gtmbrain.example",
          vendorName: "GTM Brain",
          productKnowledge: {
            offering: "A product.",
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
        },
        failureReason: "thin",
      };
    },
  );
  const body = await readJson(response);

  assert.strictEqual(capturedUrl, "gtmbrain.example");
  assert.strictEqual(response.status, 200);
  assert.strictEqual(body.status, "incomplete");
  assertSafeResponsePayload(body);
});

test("vendor research route: valid HTTPS URL is accepted and normalized to hostname for research", async () => {
  let capturedUrl = "";
  const response = await handleVendorResearchPost(
    jsonRequest({ url: "https://gtmbrain.example/product" }),
    async (url) => {
      capturedUrl = url;
      return {
        status: "success",
        profileData: {
          id: "vendor-gtmbrain-example",
          websiteUrl: "https://gtmbrain.example",
          vendorName: "GTM Brain",
          productKnowledge: {
            offering: "Outbound decision workspace.",
            customerProblems: [
              {
                id: "problem-prioritization",
                statement: "Fragmented prioritization.",
                impact: "Wasted time.",
              },
            ],
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
        },
      };
    },
  );
  const body = await readJson(response);

  assert.strictEqual(capturedUrl, "gtmbrain.example");
  assert.strictEqual(response.status, 200);
  assert.strictEqual(body.status, "success");
  assertSafeResponsePayload(body);
});

test("vendor research route: successful canonical research response is returned unchanged", async () => {
  const profileData = {
    id: "vendor-gtmbrain-example",
    websiteUrl: "https://gtmbrain.example",
    vendorName: "GTM Brain",
    productKnowledge: {
      offering: "Outbound decision workspace.",
      customerProblems: [
        {
          id: "problem-prioritization",
          statement: "Fragmented prioritization.",
          impact: "Wasted time.",
        },
      ],
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

  const response = await handleVendorResearchPost(
    jsonRequest({ url: "https://gtmbrain.example" }),
    async () => ({ status: "success", profileData }),
  );
  const body = await readJson(response);

  assert.strictEqual(response.status, 200);
  assert.strictEqual(body.status, "success");
  assert.deepStrictEqual(body.profileData, profileData);
  assert.equal(body.failureReason, undefined);
  assert.equal(body.errorDetails, undefined);
  assertSafeResponsePayload(body);
});

test("vendor research route: incomplete editable research response is returned unchanged", async () => {
  const profileData = {
    id: "vendor-thin-example",
    websiteUrl: "https://thin.example",
    vendorName: "Thin Vendor",
    productKnowledge: {
      offering: "A product.",
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

  const response = await handleVendorResearchPost(jsonRequest({ url: "thin.example" }), async () => ({
    status: "incomplete",
    profileData,
    failureReason: "No usable decision-driving Vendor Profile items were found for thin.example.",
  }));
  const body = await readJson(response);

  assert.strictEqual(response.status, 200);
  assert.strictEqual(body.status, "incomplete");
  assert.ok(body.profileData);
  assert.ok(body.failureReason);
  assert.equal(body.errorDetails, undefined);
  assertSafeResponsePayload(body);
});

test("vendor research route: technical research failure result is returned as canonical failed shape", async () => {
  const response = await handleVendorResearchPost(
    jsonRequest({ url: "https://example.com" }),
    async () => ({
      status: "failed",
      profileData: null,
      failureReason: "GEMINI_API_KEY is not configured.",
    }),
  );
  const body = await readJson(response);

  assert.strictEqual(response.status, 200);
  assert.strictEqual(body.status, "failed");
  assert.strictEqual(body.profileData, null);
  assert.strictEqual(body.failureReason, "GEMINI_API_KEY is not configured.");
  assert.equal(body.errorDetails, undefined);
  assertSafeResponsePayload(body);
});

test("vendor research route: unexpected thrown Error with API key text is sanitized to 500 INTERNAL_ERROR", async () => {
  const response = await handleVendorResearchPost(
    jsonRequest({ url: "https://example.com" }),
    async () => {
      const error = new Error("Missing GEMINI_API_KEY=super-secret-value-should-not-leak");
      error.stack = "Error: boom\n    at researchVendorFromUrl (vendorResearchService.ts:1:1)";
      throw error;
    },
  );
  const body = await readJson(response);

  assert.strictEqual(response.status, 500);
  assert.strictEqual(body.status, "failed");
  assert.strictEqual(body.profileData, null);
  assert.deepStrictEqual(body.errorDetails, {
    code: "INTERNAL_ERROR",
    message: "Vendor research failed due to a configuration error.",
  });
  assert.doesNotMatch(JSON.stringify(body), /super-secret-value/);
  assert.doesNotMatch(JSON.stringify(body), /vendorResearchService\.ts/);
  assertSafeResponsePayload(body);
});

test("vendor research route: handler invokes the injected research function with the normalized hostname", async () => {
  let calledWith = "";
  const response = await handleVendorResearchPost(
    jsonRequest({ url: "https://example.com" }),
    async (url) => {
      calledWith = url;
      return {
        status: "failed",
        profileData: null,
        failureReason: "injected",
      };
    },
  );

  assert.strictEqual(calledWith, "example.com");
  assert.strictEqual(response.status, 200);
});

test("vendor research route source: POST wraps handleVendorResearchPost; no fixture or content-only path", () => {
  const routePath = path.join(__dirname, "../../api/vendor/research/route.ts");
  const apiPath = path.join(__dirname, "vendorResearchApi.ts");
  const routeSource = fs.readFileSync(routePath, "utf8");
  const apiSource = fs.readFileSync(apiPath, "utf8");

  assert.match(routeSource, /handleVendorResearchPost/);
  assert.match(routeSource, /export async function POST/);
  assert.doesNotMatch(routeSource, /researchVendorContent/);
  assert.doesNotMatch(routeSource, /gtmBrainVendorProfile/);
  assert.doesNotMatch(routeSource, /vendorProfile\.test-data/);

  assert.match(apiSource, /researchVendorFromUrl/);
  assert.match(apiSource, /handleVendorResearchPost/);
  assert.match(apiSource, /INVALID_URL/);
  assert.match(apiSource, /sanitizeToDomain/);
  assert.doesNotMatch(apiSource, /researchVendorContent/);
  assert.doesNotMatch(apiSource, /gtmBrainVendorProfile/);
  assert.doesNotMatch(apiSource, /vendorProfile\.test-data/);
  assert.doesNotMatch(apiSource, /console\.(log|info|debug|error|warn)/);
  assert.doesNotMatch(apiSource, /process\.env/);
});

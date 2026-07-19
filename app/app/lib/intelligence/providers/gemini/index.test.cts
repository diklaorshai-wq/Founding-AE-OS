/* eslint-disable @typescript-eslint/no-require-imports -- .cts test files must use CommonJS require(). */
const test = require("node:test");
const assert = require("node:assert/strict");

const { researchCompany, toCompanyResearchResult } = require("./index.ts");

function validClaim(claimId: string, claimSummary: string) {
  return {
    claimId,
    claimNature: "explicit_fact",
    claimSummary,
    underlyingSources: [
      {
        sourceUrl: "https://example.com/about",
        sourceTitle: "About page",
      },
    ],
  };
}

const emptyGroup = { claims: [] as unknown[] };

test("researchCompany: valid structured output maps to a success CompanyResearchResult", async () => {
  const rawProfile = {
    accountName: "NovaCart",
    firmographicData: { claims: [validClaim("firmo-1", "NovaCart has 500 employees.")] },
    coreBusinessActivities: emptyGroup,
    corporateAnnouncements: emptyGroup,
    hiringAndRoleTrends: emptyGroup,
    observedTechnologies: emptyGroup,
  };

  const result = await researchCompany("novacart.example", {
    call: async () => ({ text: JSON.stringify(rawProfile) }),
  });

  assert.strictEqual(result.status, "success");
  assert.ok(result.profileData);
  assert.strictEqual(result.profileData?.submittedDomain, "novacart.example");
  assert.strictEqual(result.profileData?.accountName, "NovaCart");

  const claim = result.profileData?.firmographicData.claims[0];
  assert.strictEqual(claim?.claimId, "firmo-1");
  // capturedTimestamp must be server-generated, never taken from the model.
  assert.ok(claim?.underlyingSources[0]?.capturedTimestamp);
  assert.match(
    claim!.underlyingSources[0]!.capturedTimestamp,
    /^\d{4}-\d{2}-\d{2}T/,
  );
});

test("researchCompany: no evidence in any category resolves to incomplete, not a fabricated success", async () => {
  const rawProfile = {
    accountName: "EmptyCo",
    firmographicData: emptyGroup,
    coreBusinessActivities: emptyGroup,
    corporateAnnouncements: emptyGroup,
    hiringAndRoleTrends: emptyGroup,
    observedTechnologies: emptyGroup,
  };

  const result = await researchCompany("emptyco.example", {
    call: async () => ({ text: JSON.stringify(rawProfile) }),
  });

  assert.strictEqual(result.status, "incomplete");
  assert.ok(result.profileData);
  assert.ok(result.failureReason);
});

test("researchCompany: malformed JSON from the model fails without throwing", async () => {
  const result = await researchCompany("broken.example", {
    call: async () => ({ text: "not json" }),
  });

  assert.strictEqual(result.status, "failed");
  assert.strictEqual(result.profileData, null);
  assert.ok(result.failureReason);
});

test("researchCompany: response violating the schema fails without throwing", async () => {
  const result = await researchCompany("broken.example", {
    call: async () => ({ text: JSON.stringify({ accountName: "Missing Groups" }) }),
  });

  assert.strictEqual(result.status, "failed");
  assert.strictEqual(result.profileData, null);
  assert.ok(result.failureReason);
});

test("researchCompany: a supported_inference claim without inferenceParentIds fails without throwing", async () => {
  const rawProfile = {
    accountName: "BadInference",
    firmographicData: {
      claims: [
        {
          claimId: "firmo-1",
          claimNature: "supported_inference",
          claimSummary: "Likely a mid-market company.",
          underlyingSources: [
            { sourceUrl: "https://example.com/about", sourceTitle: "About" },
          ],
        },
      ],
    },
    coreBusinessActivities: emptyGroup,
    corporateAnnouncements: emptyGroup,
    hiringAndRoleTrends: emptyGroup,
    observedTechnologies: emptyGroup,
  };

  const result = await researchCompany("bad-inference.example", {
    call: async () => ({ text: JSON.stringify(rawProfile) }),
  });

  assert.strictEqual(result.status, "failed");
});

test("researchCompany: duplicate claimId across categories fails without throwing", async () => {
  const rawProfile = {
    accountName: "DupeCo",
    firmographicData: { claims: [validClaim("dup-1", "Claim A")] },
    coreBusinessActivities: { claims: [validClaim("dup-1", "Claim B")] },
    corporateAnnouncements: emptyGroup,
    hiringAndRoleTrends: emptyGroup,
    observedTechnologies: emptyGroup,
  };

  const result = await researchCompany("dupe.example", {
    call: async () => ({ text: JSON.stringify(rawProfile) }),
  });

  assert.strictEqual(result.status, "failed");
});

test("researchCompany: a model call that throws is caught and reported, never rethrown", async () => {
  const result = await researchCompany("throws.example", {
    call: async () => {
      throw new Error("network unreachable");
    },
  });

  assert.strictEqual(result.status, "failed");
  assert.strictEqual(result.profileData, null);
  assert.match(result.failureReason ?? "", /network unreachable/);
});

test("researchCompany: missing GEMINI_API_KEY fails without throwing and without a live call", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const result = await researchCompany("no-key.example");
    assert.strictEqual(result.status, "failed");
    assert.match(result.failureReason ?? "", /GEMINI_API_KEY/);
  } finally {
    if (previousKey !== undefined) {
      process.env.GEMINI_API_KEY = previousKey;
    }
  }
});

test("toCompanyResearchResult: empty model response fails without throwing", () => {
  const result = toCompanyResearchResult("empty-response.example", undefined);

  assert.strictEqual(result.status, "failed");
  assert.strictEqual(result.profileData, null);
});

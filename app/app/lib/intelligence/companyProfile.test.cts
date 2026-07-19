/* eslint-disable @typescript-eslint/no-require-imports -- .cts test files must use CommonJS require(). */
const test = require("node:test");
const assert = require("node:assert/strict");

const { createEmptyCompanyProfile } = require("./types/companyProfile.ts");
const { mockPopulatedCompanyProfile } = require("./companyProfile.test-data.ts");

function assertIsValidEvidenceFinding(finding: {
  claim: unknown;
  source: unknown;
  date: unknown;
  connectedVendorItemId: unknown;
  natureOfConnection: unknown;
  decisionImpact: unknown;
}) {
  assert.strictEqual(typeof finding.claim, "string");
  assert.strictEqual(typeof finding.source, "string");
  assert.strictEqual(typeof finding.date, "string");
  assert.strictEqual(typeof finding.connectedVendorItemId, "string");
  assert.ok(
    finding.natureOfConnection === "explicit_fact" || finding.natureOfConnection === "ai_interpretation",
    `natureOfConnection must be "explicit_fact" or "ai_interpretation", got ${String(finding.natureOfConnection)}`,
  );
  assert.ok(
    finding.decisionImpact === "supportive" ||
      finding.decisionImpact === "contradictory" ||
      finding.decisionImpact === "neutral",
    `decisionImpact must be "supportive", "contradictory", or "neutral", got ${String(finding.decisionImpact)}`,
  );
}

test("createEmptyCompanyProfile: instantiates a structurally valid, empty CompanyProfile", () => {
  const profile = createEmptyCompanyProfile();

  assert.deepStrictEqual(profile.companyIdentity, { name: "", url: "" });
  assert.deepStrictEqual(profile.companyCharacteristics, {
    description: "",
    isMultiCloud: false,
    dataScaleDescription: "",
  });
  assert.deepStrictEqual(profile.relevantBusinessEvidence, []);
  assert.deepStrictEqual(profile.whyNowEvidence, []);
  assert.deepStrictEqual(profile.whyUsEvidence, []);
  assert.deepStrictEqual(profile.relevantRoles, []);
  assert.deepStrictEqual(profile.redFlags, []);
});

test("createEmptyCompanyProfile: returns a fresh object every call, with no shared mutable state", () => {
  const first = createEmptyCompanyProfile();
  first.relevantRoles.push("Should not leak into other calls");
  first.relevantBusinessEvidence.push({
    claim: "Should not leak",
    source: "https://example.com",
    date: "2026-01-01",
    connectedVendorItemId: "problem-example",
    natureOfConnection: "explicit_fact",
    decisionImpact: "supportive",
  });
  first.whyUsEvidence.push({
    claim: "Should not leak",
    source: "https://example.com",
    date: "2026-01-01",
    connectedVendorItemId: "capability-example",
    natureOfConnection: "ai_interpretation",
    decisionImpact: "neutral",
  });

  const second = createEmptyCompanyProfile();
  assert.deepStrictEqual(second.relevantRoles, []);
  assert.deepStrictEqual(second.relevantBusinessEvidence, []);
  assert.deepStrictEqual(second.whyUsEvidence, []);
});

test("mockPopulatedCompanyProfile: a fully-populated profile adheres to the CompanyProfile contract", () => {
  // Type adherence itself is verified at compile time: this fixture is a
  // `CompanyProfile`-typed literal in companyProfile.test-data.ts, so
  // `npm run build` fails if its shape ever drifts from the real contract.
  // This test additionally checks the runtime shape is what we expect.
  assert.strictEqual(typeof mockPopulatedCompanyProfile.companyIdentity.name, "string");
  assert.strictEqual(typeof mockPopulatedCompanyProfile.companyIdentity.url, "string");
  assert.strictEqual(typeof mockPopulatedCompanyProfile.companyCharacteristics.description, "string");
  assert.strictEqual(typeof mockPopulatedCompanyProfile.companyCharacteristics.isMultiCloud, "boolean");
  assert.strictEqual(typeof mockPopulatedCompanyProfile.companyCharacteristics.dataScaleDescription, "string");

  assert.ok(Array.isArray(mockPopulatedCompanyProfile.relevantBusinessEvidence));
  assert.ok(mockPopulatedCompanyProfile.relevantBusinessEvidence.length > 0);
  for (const finding of mockPopulatedCompanyProfile.relevantBusinessEvidence) {
    assertIsValidEvidenceFinding(finding);
  }

  assert.ok(Array.isArray(mockPopulatedCompanyProfile.whyNowEvidence));
  assert.ok(mockPopulatedCompanyProfile.whyNowEvidence.length > 0);
  for (const finding of mockPopulatedCompanyProfile.whyNowEvidence) {
    assertIsValidEvidenceFinding(finding);
  }

  assert.ok(Array.isArray(mockPopulatedCompanyProfile.relevantRoles));
  assert.ok(mockPopulatedCompanyProfile.relevantRoles.every((role: unknown) => typeof role === "string"));

  assert.ok(Array.isArray(mockPopulatedCompanyProfile.redFlags));
  assert.ok(mockPopulatedCompanyProfile.redFlags.every((flag: unknown) => typeof flag === "string"));
});

test("mockPopulatedCompanyProfile: whyUsEvidence (§10 Why Us gate) is present and well-formed", () => {
  assert.ok(Array.isArray(mockPopulatedCompanyProfile.whyUsEvidence));
  assert.ok(
    mockPopulatedCompanyProfile.whyUsEvidence.length > 0,
    "expected at least one Why Us evidence finding (capabilities, use cases, alternatives, or Why Us red flags)",
  );
  for (const finding of mockPopulatedCompanyProfile.whyUsEvidence) {
    assertIsValidEvidenceFinding(finding);
  }
});

test("mockPopulatedCompanyProfile: every evidence finding links back to a Vendor Profile item via connectedVendorItemId", () => {
  const allFindings = [
    ...mockPopulatedCompanyProfile.relevantBusinessEvidence,
    ...mockPopulatedCompanyProfile.whyNowEvidence,
    ...mockPopulatedCompanyProfile.whyUsEvidence,
  ];

  assert.ok(allFindings.length > 0);
  for (const finding of allFindings) {
    assert.ok(
      finding.connectedVendorItemId.length > 0,
      "connectedVendorItemId must reference a real Vendor Profile item id, never be blank",
    );
  }
});

test("mockPopulatedCompanyProfile: both explicit_fact and ai_interpretation natures are represented", () => {
  const allFindings = [
    ...mockPopulatedCompanyProfile.relevantBusinessEvidence,
    ...mockPopulatedCompanyProfile.whyNowEvidence,
    ...mockPopulatedCompanyProfile.whyUsEvidence,
  ];

  const natures = allFindings.map((finding: { natureOfConnection: string }) => finding.natureOfConnection);
  assert.ok(natures.includes("explicit_fact"), "expected at least one explicit_fact finding");
  assert.ok(natures.includes("ai_interpretation"), "expected at least one ai_interpretation finding");
});

test("mockPopulatedCompanyProfile: every finding carries a valid decisionImpact (Contract Alignment)", () => {
  const allFindings = [
    ...mockPopulatedCompanyProfile.relevantBusinessEvidence,
    ...mockPopulatedCompanyProfile.whyNowEvidence,
    ...mockPopulatedCompanyProfile.whyUsEvidence,
  ];

  assert.ok(allFindings.length > 0);
  const impacts = allFindings.map((finding: { decisionImpact: string }) => finding.decisionImpact);
  for (const impact of impacts) {
    assert.ok(
      impact === "supportive" || impact === "contradictory" || impact === "neutral",
      `decisionImpact must be "supportive", "contradictory", or "neutral", got ${String(impact)}`,
    );
  }
  assert.ok(impacts.includes("supportive"), "expected at least one supportive finding");
});

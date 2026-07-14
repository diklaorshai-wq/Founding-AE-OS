/* eslint-disable @typescript-eslint/no-require-imports -- .cts test files must use CommonJS require(). */
const test = require("node:test");
const assert = require("node:assert/strict");

const { gtmBrainVendorProfile } = require("./vendorProfile.test-data.ts");
const { validateVendorProfile } = require("./vendorProfileValidation.ts");
const {
  applyVendorOnboardingResponse,
  createEmptyVendorProfile,
} = require("./vendorOnboarding.ts");

test("seven onboarding stages build the GTM Brain Vendor Profile", () => {
  const knowledge = gtmBrainVendorProfile.productKnowledge;
  const strategy = gtmBrainVendorProfile.decisionStrategy;

  const responses = [
    {
      stage: "offering",
      websiteUrl: gtmBrainVendorProfile.websiteUrl,
      vendorName: gtmBrainVendorProfile.vendorName,
      offering: knowledge.offering,
    },
    {
      stage: "customerValue",
      customerProblems: knowledge.customerProblems,
      desiredOutcomes: knowledge.desiredOutcomes,
      buyingReasons: knowledge.buyingReasons,
    },
    {
      stage: "productFit",
      capabilities: knowledge.capabilities,
      useCases: knowledge.useCases,
      commonAlternatives: knowledge.commonAlternatives,
      relevantDifferentiation: knowledge.relevantDifferentiation,
    },
    {
      stage: "proof",
      proofPoints: knowledge.proofPoints,
    },
    {
      stage: "idealCustomer",
      idealCustomerProfile: strategy.idealCustomerProfile,
    },
    {
      stage: "people",
      targetPersonas: strategy.targetPersonas,
      budgetOwners: strategy.budgetOwners,
    },
    {
      stage: "timingAndRisk",
      whyNowSignals: strategy.whyNowSignals,
      redFlags: strategy.redFlags,
    },
  ];

  const profile = responses.reduce(
    applyVendorOnboardingResponse,
    createEmptyVendorProfile("gtm-brain", "GTM Brain"),
  );

  assert.deepStrictEqual(profile, gtmBrainVendorProfile);
  assert.deepStrictEqual(validateVendorProfile(profile), []);
});

test("an onboarding response updates only its own profile section", () => {
  const profile = createEmptyVendorProfile("gtm-brain", "GTM Brain");
  const updated = applyVendorOnboardingResponse(profile, {
    stage: "offering",
    websiteUrl: "https://gtmbrain.example",
    vendorName: "GTM Brain",
    offering: "Outbound decision workspace",
  });

  assert.strictEqual(updated.websiteUrl, "https://gtmbrain.example");
  assert.strictEqual(updated.vendorName, "GTM Brain");
  assert.strictEqual(updated.productKnowledge.offering, "Outbound decision workspace");
  assert.deepStrictEqual(updated.decisionStrategy, profile.decisionStrategy);
  assert.strictEqual(profile.productKnowledge.offering, "");
});

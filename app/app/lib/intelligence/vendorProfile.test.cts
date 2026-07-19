/* eslint-disable @typescript-eslint/no-require-imports -- .cts test files must use CommonJS require(). */
const test = require("node:test");
const assert = require("node:assert/strict");

const { gtmBrainVendorProfile } = require("./vendorProfile.test-data.ts");
const { validateVendorProfile } = require("./vendorProfileValidation.ts");

test("GTM Brain Vendor Profile has valid internal references", () => {
  assert.deepStrictEqual(validateVendorProfile(gtmBrainVendorProfile), []);
});

test("Vendor Profile validation reports a broken reference", () => {
  const invalidProfile = structuredClone(gtmBrainVendorProfile);
  invalidProfile.productKnowledge.desiredOutcomes[0].problemIds = [
    "missing-problem",
  ];

  assert.deepStrictEqual(validateVendorProfile(invalidProfile), [
    'Desired outcome "focus-ae-time" references unknown problem "missing-problem".',
  ]);
});

test("Vendor Profile validation reports an unknown budget-owner persona", () => {
  const invalidProfile = structuredClone(gtmBrainVendorProfile);
  invalidProfile.decisionStrategy.budgetOwners[0].relatedPersonaIds = [
    "missing-persona",
  ];

  assert.deepStrictEqual(validateVendorProfile(invalidProfile), [
    'Budget owner "vp-sales-budget" references unknown persona "missing-persona".',
  ]);
});

test("Vendor Profile validation: the unmodified GTM Brain fixture has zero duplicate Vendor Item IDs", () => {
  assert.deepStrictEqual(validateVendorProfile(gtmBrainVendorProfile), []);
});

test("Vendor Profile validation reports a Vendor Item ID reused across two different sub-collections", () => {
  const invalidProfile = structuredClone(gtmBrainVendorProfile);
  // Reuses "unstructured-prioritization" (a customerProblems id) as a
  // whyNowSignals id: global uniqueness must catch this even though each
  // sub-collection is internally unique.
  invalidProfile.decisionStrategy.whyNowSignals[0].id = "unstructured-prioritization";

  assert.deepStrictEqual(validateVendorProfile(invalidProfile), [
    'Duplicate Vendor Item ID "unstructured-prioritization" is used 2 times across the Vendor Profile.',
  ]);
});

test("Vendor Profile validation reports a Vendor Item ID reused three times, with the correct count", () => {
  const invalidProfile = structuredClone(gtmBrainVendorProfile);
  invalidProfile.decisionStrategy.whyNowSignals[0].id = "unstructured-prioritization";
  invalidProfile.decisionStrategy.redFlags[0].id = "unstructured-prioritization";

  assert.deepStrictEqual(validateVendorProfile(invalidProfile), [
    'Duplicate Vendor Item ID "unstructured-prioritization" is used 3 times across the Vendor Profile.',
  ]);
});

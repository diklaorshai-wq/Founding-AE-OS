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

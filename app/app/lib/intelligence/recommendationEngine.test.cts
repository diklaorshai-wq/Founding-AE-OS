/* eslint-disable @typescript-eslint/no-require-imports -- .cts test files must use CommonJS require(). */
const test = require("node:test");
const assert = require("node:assert/strict");

const { generateRecommendation } = require("./recommendationEngine.ts");
const { scenarios } = require("./recommendationEngine.test-data.ts");

for (const { input, expectedDecision, expectedConfidence } of scenarios) {
  test(`${input.companyName} -> ${expectedDecision} (confidence ${expectedConfidence})`, () => {
    const result = generateRecommendation(input);

    assert.strictEqual(result.decision, expectedDecision);
    assert.strictEqual(result.confidence, expectedConfidence);
  });
}

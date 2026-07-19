/* eslint-disable @typescript-eslint/no-require-imports -- .cts test files must use CommonJS require(). */
const test = require("node:test");
const assert = require("node:assert/strict");

const { researchVendorContent } = require("./vendorResearchService.ts");

const websiteSource = {
  sourceId: "website-home",
  content: "GTM Brain is an outbound decision workspace for Enterprise AEs deciding which named accounts deserve outbound time.",
  sourceType: "website",
};

const documentSource = {
  sourceId: "internal-positioning-doc",
  content: "Internal doc: AEs currently prioritize accounts with fragmented evidence and inconsistent judgment, wasting scarce outbound time.",
  sourceType: "document",
};

function mockCallReturning(output: unknown) {
  return async () => ({ text: JSON.stringify(output) });
}

/** Runs `fn` with GEMINI_API_KEY guaranteed unset, restoring it afterward, so tests are deterministic regardless of the ambient environment. */
async function withoutApiKey(fn: () => Promise<void>) {
  const previousKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await fn();
  } finally {
    if (previousKey !== undefined) {
      process.env.GEMINI_API_KEY = previousKey;
    }
  }
}

test("researchVendorContent: a mocked successful AI response is parsed and merged into the bootstrapped profile", async () => {
  const mockOutput = {
    offering: "An outbound decision workspace for Enterprise AEs.",
    customerProblems: [
      {
        id: "unstructured-prioritization",
        statement: "AEs prioritize accounts with fragmented evidence.",
        impact: "Account selection is inconsistent.",
      },
    ],
    desiredOutcomes: [
      {
        id: "focus-ae-time",
        statement: "Focus AE time on accounts that deserve it.",
        problemIds: ["unstructured-prioritization"],
      },
    ],
    capabilities: [
      {
        id: "evidence-based-evaluation",
        name: "Evidence-based account evaluation",
        description: "Organizes evidence into decision groups.",
        problemIds: ["unstructured-prioritization"],
        outcomeIds: ["focus-ae-time"],
      },
    ],
    whyNowSignals: [
      {
        id: "new-territories",
        signal: "Sales org reallocates enterprise territories.",
        whyItMatters: "AEs must decide which accounts deserve attention first.",
        problemIds: ["unstructured-prioritization"],
        outcomeIds: ["focus-ae-time"],
        firstMeetingAngle: "Discuss new territory prioritization.",
      },
    ],
    redFlags: [
      {
        id: "no-named-account-motion",
        condition: "The company does not use named-account enterprise selling.",
        whyItMatters: "GTM Brain targets judgment-intensive account prioritization.",
        severity: "disqualifying",
        affectedDecisionGroups: ["whyThem"],
      },
    ],
  };

  const result = await researchVendorContent([websiteSource, documentSource], undefined, {
    call: mockCallReturning(mockOutput),
  });

  assert.strictEqual(result.productKnowledge?.offering, mockOutput.offering);
  assert.deepStrictEqual(result.productKnowledge?.customerProblems, mockOutput.customerProblems);
  assert.deepStrictEqual(result.productKnowledge?.desiredOutcomes, mockOutput.desiredOutcomes);
  assert.deepStrictEqual(result.productKnowledge?.capabilities, mockOutput.capabilities);
  assert.deepStrictEqual(result.decisionStrategy?.whyNowSignals, mockOutput.whyNowSignals);
  assert.deepStrictEqual(result.decisionStrategy?.redFlags, mockOutput.redFlags);

  // Fields this step doesn't extract must still be present and structurally
  // valid (bootstrapped from createEmptyVendorProfile), not missing.
  assert.deepStrictEqual(result.productKnowledge?.buyingReasons, []);
  assert.deepStrictEqual(result.productKnowledge?.useCases, []);
  assert.deepStrictEqual(result.decisionStrategy?.targetPersonas, []);
  assert.deepStrictEqual(result.decisionStrategy?.idealCustomerProfile, {
    criteria: [],
    examples: [],
    firmographicDisqualifiers: [],
  });
});

test("researchVendorContent: aggregates content from every source into the model prompt", async () => {
  let capturedPrompt = "";
  const call = async ({ prompt }: { prompt: string }) => {
    capturedPrompt = prompt;
    return {
      text: JSON.stringify({
        offering: "",
        customerProblems: [],
        desiredOutcomes: [],
        capabilities: [],
        whyNowSignals: [],
        redFlags: [],
      }),
    };
  };

  await researchVendorContent([websiteSource, documentSource], undefined, { call });

  assert.match(capturedPrompt, /website-home/);
  assert.match(capturedPrompt, /outbound decision workspace/);
  assert.match(capturedPrompt, /internal-positioning-doc/);
  assert.match(capturedPrompt, /fragmented evidence/);
});

test("researchVendorContent: malformed JSON from the model falls back to the empty bootstrapped profile", async () => {
  const result = await researchVendorContent([websiteSource], undefined, {
    call: async () => ({ text: "not json" }),
  });

  assert.strictEqual(result.productKnowledge?.offering, "");
  assert.deepStrictEqual(result.productKnowledge?.customerProblems, []);
  assert.deepStrictEqual(result.decisionStrategy?.whyNowSignals, []);
  assert.deepStrictEqual(result.decisionStrategy?.redFlags, []);
});

test("researchVendorContent: a response violating the schema falls back to the empty bootstrapped profile", async () => {
  const result = await researchVendorContent([websiteSource], undefined, {
    call: async () => ({ text: JSON.stringify({ offering: "ok", redFlags: [{ severity: "extreme" }] }) }),
  });

  assert.deepStrictEqual(result.decisionStrategy?.redFlags, []);
});

test("researchVendorContent: a model call that throws falls back to the empty bootstrapped profile instead of throwing", async () => {
  const result = await researchVendorContent([websiteSource], undefined, {
    call: async () => {
      throw new Error("network unreachable");
    },
  });

  assert.strictEqual(result.productKnowledge?.offering, "");
  assert.deepStrictEqual(result.productKnowledge?.customerProblems, []);
});

test("researchVendorContent: a non-gemini provider never calls the model and falls back to the empty bootstrapped profile", async () => {
  let callCount = 0;
  const call = async () => {
    callCount += 1;
    return { text: JSON.stringify({ offering: "should never be used" }) };
  };

  const result = await researchVendorContent([websiteSource], { provider: "openai" }, { call });

  assert.strictEqual(callCount, 0);
  assert.strictEqual(result.productKnowledge?.offering, "");
});

test("researchVendorContent: missing GEMINI_API_KEY falls back to the empty bootstrapped profile without a live call", async () => {
  await withoutApiKey(async () => {
    const result = await researchVendorContent([websiteSource]);

    assert.ok(result.productKnowledge);
    assert.strictEqual(result.productKnowledge?.offering, "");
    assert.deepStrictEqual(result.productKnowledge?.customerProblems, []);
    assert.ok(result.decisionStrategy);
    assert.deepStrictEqual(result.decisionStrategy?.whyNowSignals, []);
    assert.deepStrictEqual(result.decisionStrategy?.redFlags, []);
  });
});

test("researchVendorContent: an empty sources array still resolves to a valid partial Vendor Profile", async () => {
  await withoutApiKey(async () => {
    const result = await researchVendorContent([]);

    assert.ok(result.productKnowledge);
    assert.strictEqual(result.productKnowledge?.offering, "");
    assert.deepStrictEqual(result.productKnowledge?.customerProblems, []);
    assert.deepStrictEqual(result.decisionStrategy?.whyNowSignals, []);
    assert.deepStrictEqual(result.decisionStrategy?.redFlags, []);
  });
});

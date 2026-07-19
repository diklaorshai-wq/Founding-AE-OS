/* eslint-disable @typescript-eslint/no-require-imports -- .cts test files must use CommonJS require(). */
const test = require("node:test");
const assert = require("node:assert/strict");

const { researchCompanyContent } = require("./companyResearchService.ts");
const { gtmBrainVendorProfile } = require("./vendorProfile.test-data.ts");

const websiteSource = {
  sourceId: "novacart-engineering-blog",
  content: "NovaCart's engineering blog describes account prioritization done manually today, spread across spreadsheets and individual AE judgment.",
  sourceType: "website",
};

const newsSource = {
  sourceId: "novacart-newsroom",
  content: "NovaCart's newsroom announced a reorganization of its enterprise sales territories this quarter.",
  sourceType: "news",
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

const validMockOutput = {
  companyIdentity: {
    name: "NovaCart",
    url: "https://novacart.example",
  },
  companyCharacteristics: {
    description: "A mid-market e-commerce platform for specialty retailers.",
    isMultiCloud: true,
    dataScaleDescription: "Processes several million transactions per month.",
  },
  relevantBusinessEvidence: [
    {
      claim: "NovaCart's AEs prioritize accounts manually with spreadsheets and individual judgment.",
      source: "https://novacart.example/engineering-blog",
      date: "2026-05-12",
      connectedVendorItemId: "unstructured-prioritization",
      natureOfConnection: "explicit_fact",
      decisionImpact: "supportive",
    },
  ],
  whyNowEvidence: [
    {
      claim: "NovaCart recently reorganized its enterprise sales territories.",
      source: "https://novacart.example/newsroom",
      date: "2026-06-20",
      connectedVendorItemId: "new-territories",
      natureOfConnection: "explicit_fact",
      decisionImpact: "supportive",
    },
  ],
  whyUsEvidence: [
    {
      claim: "NovaCart's manual, spreadsheet-based process is the kind of alternative this vendor's offering replaces.",
      source: "https://novacart.example/engineering-blog",
      date: "2026-05-12",
      connectedVendorItemId: "spreadsheets-and-instinct",
      natureOfConnection: "ai_interpretation",
      decisionImpact: "supportive",
    },
  ],
  relevantRoles: ["VP Sales", "Enterprise Account Executive"],
  redFlags: ["No named-account enterprise selling motion found."],
};

test("researchCompanyContent: a mocked successful AI response is parsed and merged into the bootstrapped profile", async () => {
  const result = await researchCompanyContent(
    [websiteSource, newsSource],
    gtmBrainVendorProfile,
    undefined,
    { call: mockCallReturning(validMockOutput) },
  );

  assert.deepStrictEqual(result.companyIdentity, validMockOutput.companyIdentity);
  assert.deepStrictEqual(result.companyCharacteristics, validMockOutput.companyCharacteristics);
  assert.deepStrictEqual(result.relevantBusinessEvidence, validMockOutput.relevantBusinessEvidence);
  assert.deepStrictEqual(result.whyNowEvidence, validMockOutput.whyNowEvidence);
  assert.deepStrictEqual(result.whyUsEvidence, validMockOutput.whyUsEvidence);
  assert.deepStrictEqual(result.relevantRoles, validMockOutput.relevantRoles);
  assert.deepStrictEqual(result.redFlags, validMockOutput.redFlags);
});

test("researchCompanyContent: aggregates content from every source, and the vendor's items, into the model prompt", async () => {
  let capturedPrompt = "";
  const call = async ({ prompt }: { prompt: string }) => {
    capturedPrompt = prompt;
    return { text: JSON.stringify(validMockOutput) };
  };

  await researchCompanyContent([websiteSource, newsSource], gtmBrainVendorProfile, undefined, { call });

  assert.match(capturedPrompt, /novacart-engineering-blog/);
  assert.match(capturedPrompt, /account prioritization done manually/);
  assert.match(capturedPrompt, /novacart-newsroom/);
  assert.match(capturedPrompt, /reorganization of its enterprise sales territories/);
  assert.match(capturedPrompt, /unstructured-prioritization/);
  assert.match(capturedPrompt, /new-territories/);
  assert.match(capturedPrompt, /spreadsheets-and-instinct/);
});

test("researchCompanyContent: the model is instructed via the STRICT schema, never the lenient shell schema, as its responseJsonSchema", async () => {
  let capturedSchema: unknown;
  const call = async ({ responseJsonSchema }: { responseJsonSchema: unknown }) => {
    capturedSchema = responseJsonSchema;
    return { text: JSON.stringify(validMockOutput) };
  };

  await researchCompanyContent([websiteSource], gtmBrainVendorProfile, undefined, { call });

  const serializedSchema = JSON.stringify(capturedSchema);
  // The lenient shell types the three evidence arrays as `z.array(z.unknown())`,
  // so it would never mention per-finding field names. If these appear, the
  // model was bound to the STRICT per-finding schema instead.
  assert.match(serializedSchema, /decisionImpact/);
  assert.match(serializedSchema, /connectedVendorItemId/);
  assert.match(serializedSchema, /natureOfConnection/);
});

test("researchCompanyContent: the prompt renders Firmographic Disqualifiers and Red Flags with their ids and affected decision groups", async () => {
  let capturedPrompt = "";
  const call = async ({ prompt }: { prompt: string }) => {
    capturedPrompt = prompt;
    return { text: JSON.stringify(validMockOutput) };
  };

  await researchCompanyContent([websiteSource], gtmBrainVendorProfile, undefined, { call });

  assert.match(capturedPrompt, /Firmographic Disqualifiers/);
  assert.match(capturedPrompt, /self-serve-only/);
  assert.match(capturedPrompt, /Vendor Red Flags/);
  assert.match(capturedPrompt, /no-named-account-motion/);
  assert.match(capturedPrompt, /problem-after-opportunity/);
  assert.match(capturedPrompt, /affects: whyThem/);
  assert.match(capturedPrompt, /affects: whyUs/);
  // Explicit evidence-array routing rules for negative vendor items.
  assert.match(capturedPrompt, /Firmographic Disqualifier.*must appear ONLY in "relevantBusinessEvidence"/);
  assert.match(capturedPrompt, /must NEVER be connected through "whyNowEvidence"/);
});

test("researchCompanyContent: the prompt renders Ideal Customer Profile Criteria and Ideal Customer Examples with their stable ids", async () => {
  let capturedPrompt = "";
  const call = async ({ prompt }: { prompt: string }) => {
    capturedPrompt = prompt;
    return { text: JSON.stringify(validMockOutput) };
  };

  await researchCompanyContent([websiteSource], gtmBrainVendorProfile, undefined, { call });

  assert.match(capturedPrompt, /Ideal Customer Profile Criteria/);
  assert.match(capturedPrompt, /named-enterprise-accounts/);
  assert.match(capturedPrompt, /complex-outbound-decision/);
  assert.match(capturedPrompt, /Ideal Customer Examples/);
  assert.match(capturedPrompt, /snowflake-example/);
  assert.match(capturedPrompt, /Snowflake/);
});

test("researchCompanyContent: the prompt explicitly routes Ideal Customer Profile Criteria and Examples to relevantBusinessEvidence", async () => {
  let capturedPrompt = "";
  const call = async ({ prompt }: { prompt: string }) => {
    capturedPrompt = prompt;
    return { text: JSON.stringify(validMockOutput) };
  };

  await researchCompanyContent([websiteSource], gtmBrainVendorProfile, undefined, { call });

  assert.match(
    capturedPrompt,
    /"relevantBusinessEvidence": findings connected to the vendor's Customer Problems, Desired Outcomes, Buying Reasons, Ideal Customer Profile Criteria, or Ideal Customer Examples above \(Why Them\)/,
  );
});

test("researchCompanyContent: the prompt explicitly routes Proof Points to whyUsEvidence", async () => {
  let capturedPrompt = "";
  const call = async ({ prompt }: { prompt: string }) => {
    capturedPrompt = prompt;
    return { text: JSON.stringify(validMockOutput) };
  };

  await researchCompanyContent([websiteSource], gtmBrainVendorProfile, undefined, { call });

  assert.match(capturedPrompt, /Proof Points/);
  assert.match(capturedPrompt, /engine-v1-scenarios/);
  assert.match(
    capturedPrompt,
    /"whyUsEvidence": findings connected to the vendor's Capabilities, Use Cases, Proof Points, Relevant Differentiation, or Common Alternatives above \(Why Us\)/,
  );
});

test("researchCompanyContent: existing Firmographic Disqualifier, Red Flag, Common Alternative, and decisionImpact instructions remain present", async () => {
  let capturedPrompt = "";
  const call = async ({ prompt }: { prompt: string }) => {
    capturedPrompt = prompt;
    return { text: JSON.stringify(validMockOutput) };
  };

  await researchCompanyContent([websiteSource], gtmBrainVendorProfile, undefined, { call });

  // Firmographic Disqualifier / Red Flag instructions (Contract Alignment).
  assert.match(capturedPrompt, /explicitly permitted to connect a finding here to a Firmographic Disqualifier/);
  assert.match(capturedPrompt, /Vendor Red Flag whose "affects" list includes "whyThem"/);
  assert.match(capturedPrompt, /Vendor Red Flag whose "affects" list includes "whyUs"/);
  // decisionImpact instructions, including the Common Alternative sub-rule.
  assert.match(capturedPrompt, /"decisionImpact" — REQUIRED on every single finding/);
  assert.match(capturedPrompt, /"supportive": the finding strengthens the specific decision group/);
  assert.match(capturedPrompt, /"contradictory": the finding weakens or contradicts that decision group/);
  assert.match(capturedPrompt, /"neutral": the finding provides useful context only/);
  assert.match(capturedPrompt, /For a finding connected to a Common Alternative specifically/);
});

test("researchCompanyContent: the strict response schema remains unchanged and is still the only schema sent to Gemini", async () => {
  let capturedSchema: unknown;
  const call = async ({ responseJsonSchema }: { responseJsonSchema: unknown }) => {
    capturedSchema = responseJsonSchema;
    return { text: JSON.stringify(validMockOutput) };
  };

  await researchCompanyContent([websiteSource], gtmBrainVendorProfile, undefined, { call });

  const schema = capturedSchema as {
    properties?: Record<string, { description?: string }>;
  };
  assert.strictEqual(typeof schema, "object");
  assert.ok(schema.properties?.relevantBusinessEvidence, 'expected a "relevantBusinessEvidence" property');
  assert.ok(schema.properties?.whyNowEvidence, 'expected a "whyNowEvidence" property');
  assert.ok(schema.properties?.whyUsEvidence, 'expected a "whyUsEvidence" property');
  // These schema-level descriptions are untouched by the prompt-only coverage fix.
  assert.match(
    schema.properties?.relevantBusinessEvidence?.description ?? "",
    /Customer Problems, Desired Outcomes, Buying Reasons, Firmographic Disqualifiers, or Red Flags affecting whyThem/,
  );
  assert.match(
    schema.properties?.whyUsEvidence?.description ?? "",
    /Capabilities, Use Cases, Common Alternatives, Relevant Differentiation, or Red Flags affecting whyUs/,
  );
});

test("researchCompanyContent: a malformed individual finding is dropped while valid sibling findings in the same array are preserved", async () => {
  const validFinding = validMockOutput.relevantBusinessEvidence[0];
  const malformedFinding = {
    claim: "Malformed finding missing its required decisionImpact field.",
    source: "https://novacart.example/malformed",
    date: "2026-06-01",
    connectedVendorItemId: "unstructured-prioritization",
    natureOfConnection: "explicit_fact",
    // decisionImpact intentionally omitted: this single finding must be
    // dropped, without failing the whole array or the rest of the profile.
  };

  const output = {
    ...validMockOutput,
    relevantBusinessEvidence: [validFinding, malformedFinding],
  };

  const result = await researchCompanyContent([websiteSource], gtmBrainVendorProfile, undefined, {
    call: mockCallReturning(output),
  });

  assert.deepStrictEqual(result.relevantBusinessEvidence, [validFinding]);
  // Sibling arrays, and the rest of the profile, are entirely unaffected.
  assert.deepStrictEqual(result.whyNowEvidence, validMockOutput.whyNowEvidence);
  assert.deepStrictEqual(result.whyUsEvidence, validMockOutput.whyUsEvidence);
  assert.deepStrictEqual(result.companyIdentity, validMockOutput.companyIdentity);
});

test("researchCompanyContent: a malformed top-level field still degrades the whole profile to empty (unlike a malformed individual finding)", async () => {
  const result = await researchCompanyContent([websiteSource], gtmBrainVendorProfile, undefined, {
    call: async () => ({
      text: JSON.stringify({
        ...validMockOutput,
        companyCharacteristics: {
          description: "A profile",
          isMultiCloud: "yes", // wrong type: schema requires boolean, so the whole shell parse fails.
          dataScaleDescription: "",
        },
      }),
    }),
  });

  assert.deepStrictEqual(result, {
    companyIdentity: { name: "", url: "" },
    companyCharacteristics: { description: "", isMultiCloud: false, dataScaleDescription: "" },
    relevantBusinessEvidence: [],
    whyNowEvidence: [],
    whyUsEvidence: [],
    relevantRoles: [],
    redFlags: [],
  });
});

test("researchCompanyContent: a finding citing a connectedVendorItemId that isn't a real Vendor Profile id is dropped, not trusted", async () => {
  const hallucinatedOutput = {
    ...validMockOutput,
    relevantBusinessEvidence: [
      {
        claim: "A fabricated claim linked to an id that doesn't exist in this Vendor Profile.",
        source: "https://novacart.example/made-up",
        date: "2026-06-01",
        connectedVendorItemId: "this-id-does-not-exist-in-the-vendor-profile",
        natureOfConnection: "ai_interpretation",
        decisionImpact: "supportive",
      },
    ],
  };

  const result = await researchCompanyContent([websiteSource], gtmBrainVendorProfile, undefined, {
    call: mockCallReturning(hallucinatedOutput),
  });

  assert.deepStrictEqual(result.relevantBusinessEvidence, []);
  // Sibling arrays with genuinely valid ids are unaffected.
  assert.deepStrictEqual(result.whyNowEvidence, validMockOutput.whyNowEvidence);
  assert.deepStrictEqual(result.whyUsEvidence, validMockOutput.whyUsEvidence);
});

test("researchCompanyContent: malformed JSON from the model falls back to a clean, empty CompanyProfile", async () => {
  const result = await researchCompanyContent([websiteSource], gtmBrainVendorProfile, undefined, {
    call: async () => ({ text: "not json" }),
  });

  assert.deepStrictEqual(result.companyIdentity, { name: "", url: "" });
  assert.deepStrictEqual(result.companyCharacteristics, {
    description: "",
    isMultiCloud: false,
    dataScaleDescription: "",
  });
  assert.deepStrictEqual(result.relevantBusinessEvidence, []);
  assert.deepStrictEqual(result.whyNowEvidence, []);
  assert.deepStrictEqual(result.whyUsEvidence, []);
  assert.deepStrictEqual(result.relevantRoles, []);
  assert.deepStrictEqual(result.redFlags, []);
});

test("researchCompanyContent: a response violating the schema falls back to a clean, empty CompanyProfile", async () => {
  const result = await researchCompanyContent([websiteSource], gtmBrainVendorProfile, undefined, {
    call: async () => ({
      text: JSON.stringify({
        companyIdentity: { name: "NovaCart" /* missing "url" */ },
        whyNowEvidence: [{ natureOfConnection: "somewhat_true" /* invalid enum value */ }],
      }),
    }),
  });

  assert.deepStrictEqual(result, {
    companyIdentity: { name: "", url: "" },
    companyCharacteristics: { description: "", isMultiCloud: false, dataScaleDescription: "" },
    relevantBusinessEvidence: [],
    whyNowEvidence: [],
    whyUsEvidence: [],
    relevantRoles: [],
    redFlags: [],
  });
});

test("researchCompanyContent: a model call that throws falls back to a clean, empty CompanyProfile instead of throwing", async () => {
  const result = await researchCompanyContent([websiteSource], gtmBrainVendorProfile, undefined, {
    call: async () => {
      throw new Error("network unreachable");
    },
  });

  assert.deepStrictEqual(result.companyIdentity, { name: "", url: "" });
  assert.deepStrictEqual(result.relevantBusinessEvidence, []);
});

test("researchCompanyContent: a non-gemini provider never calls the model and falls back to a clean, empty CompanyProfile", async () => {
  let callCount = 0;
  const call = async () => {
    callCount += 1;
    return { text: JSON.stringify(validMockOutput) };
  };

  const result = await researchCompanyContent([websiteSource], gtmBrainVendorProfile, { provider: "openai" }, { call });

  assert.strictEqual(callCount, 0);
  assert.deepStrictEqual(result.companyIdentity, { name: "", url: "" });
});

test("researchCompanyContent: missing GEMINI_API_KEY falls back to a clean, empty CompanyProfile without a live call", async () => {
  await withoutApiKey(async () => {
    const result = await researchCompanyContent([websiteSource], gtmBrainVendorProfile);

    assert.deepStrictEqual(result.companyIdentity, { name: "", url: "" });
    assert.deepStrictEqual(result.relevantBusinessEvidence, []);
    assert.deepStrictEqual(result.whyNowEvidence, []);
    assert.deepStrictEqual(result.whyUsEvidence, []);
  });
});

test("researchCompanyContent: an empty sources array still resolves to a valid, complete CompanyProfile", async () => {
  await withoutApiKey(async () => {
    const result = await researchCompanyContent([], gtmBrainVendorProfile);

    assert.deepStrictEqual(result, {
      companyIdentity: { name: "", url: "" },
      companyCharacteristics: { description: "", isMultiCloud: false, dataScaleDescription: "" },
      relevantBusinessEvidence: [],
      whyNowEvidence: [],
      whyUsEvidence: [],
      relevantRoles: [],
      redFlags: [],
    });
  });
});

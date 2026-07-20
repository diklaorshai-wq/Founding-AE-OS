/* eslint-disable @typescript-eslint/no-require-imports -- .cts test files must use CommonJS require(). */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  researchVendorContent,
  researchVendorFromUrl,
} = require("./vendorResearchService.ts");
const { validateVendorProfile } = require("./vendorProfileValidation.ts");

const websiteSource = {
  sourceId: "website-home",
  content:
    "GTM Brain is an outbound decision workspace for Enterprise AEs deciding which named accounts deserve outbound time.",
  sourceType: "website",
};

const documentSource = {
  sourceId: "internal-positioning-doc",
  content:
    "Internal doc: AEs currently prioritize accounts with fragmented evidence and inconsistent judgment, wasting scarce outbound time.",
  sourceType: "document",
};

function mockCallReturning(output: unknown) {
  return async () => ({ text: JSON.stringify(output) });
}

/** Runs `fn` with GEMINI_API_KEY guaranteed unset, restoring it afterward. */
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

const fullValidUrlResearchOutput = {
  vendorName: "GTM Brain",
  websiteUrl: "https://gtmbrain.example",
  offering: "An outbound decision workspace for Enterprise AEs.",
  customerProblems: [
    {
      id: "problem-unstructured-prioritization",
      statement: "AEs prioritize accounts with fragmented evidence.",
      impact: "Account selection is inconsistent.",
    },
  ],
  desiredOutcomes: [
    {
      id: "outcome-focus-ae-time",
      statement: "Focus AE time on accounts that deserve it.",
      problemIds: ["problem-unstructured-prioritization"],
    },
  ],
  buyingReasons: [
    {
      id: "buying-reason-protect-capacity",
      statement: "Protect scarce outbound capacity.",
      outcomeIds: ["outcome-focus-ae-time"],
    },
  ],
  capabilities: [
    {
      id: "capability-evidence-evaluation",
      name: "Evidence-based account evaluation",
      description: "Organizes evidence into decision groups.",
      problemIds: ["problem-unstructured-prioritization"],
      outcomeIds: ["outcome-focus-ae-time"],
    },
  ],
  useCases: [
    {
      id: "use-case-territory-planning",
      name: "Territory planning",
      description: "Decide which named accounts deserve outbound this quarter.",
      problemIds: ["problem-unstructured-prioritization"],
      outcomeIds: ["outcome-focus-ae-time"],
      capabilityIds: ["capability-evidence-evaluation"],
    },
  ],
  commonAlternatives: [
    {
      id: "alternative-spreadsheets",
      name: "Spreadsheets",
      description: "Manual account tracking in spreadsheets.",
    },
  ],
  relevantDifferentiation: [
    {
      id: "differentiation-decision-groups",
      statement: "Structures evidence into Why Them / Why Now / Why Us.",
      alternativeIds: ["alternative-spreadsheets"],
      problemIds: ["problem-unstructured-prioritization"],
      outcomeIds: ["outcome-focus-ae-time"],
    },
  ],
  proofPoints: [
    {
      id: "proof-point-pilot-ae-team",
      summary: "Pilot AE team cut wasted outbound time.",
      customerName: "Example Corp",
      industry: "Software",
      metric: "30% less wasted outreach",
      outcomeIds: ["outcome-focus-ae-time"],
      useCaseIds: ["use-case-territory-planning"],
    },
  ],
  idealCustomerProfile: {
    criteria: [
      {
        id: "icp-criterion-named-account-motion",
        description: "Runs a named-account enterprise selling motion.",
      },
    ],
    examples: [
      {
        id: "icp-example-acme",
        companyName: "Acme Enterprise",
        rationale: "Large AE org with named accounts.",
        criterionIds: ["icp-criterion-named-account-motion"],
        relationship: "example-only",
      },
    ],
    firmographicDisqualifiers: [
      {
        id: "firmographic-disqualifier-smb-only",
        condition: "Sells only to SMBs with no named-account motion.",
        whyItMatters: "Product targets judgment-intensive enterprise prioritization.",
      },
    ],
  },
  whyNowSignals: [
    {
      id: "why-now-signal-new-territories",
      signal: "Sales org reallocates enterprise territories.",
      whyItMatters: "AEs must decide which accounts deserve attention first.",
      problemIds: ["problem-unstructured-prioritization"],
      outcomeIds: ["outcome-focus-ae-time"],
      firstMeetingAngle: "Discuss new territory prioritization.",
    },
  ],
  redFlags: [
    {
      id: "red-flag-no-named-account-motion",
      condition: "The company does not use named-account enterprise selling.",
      whyItMatters: "GTM Brain targets judgment-intensive account prioritization.",
      severity: "disqualifying",
      affectedDecisionGroups: ["whyThem"],
    },
  ],
};

const thinValidUrlResearchOutput = {
  vendorName: "Thin Vendor",
  websiteUrl: "https://thin.example",
  offering: "A product.",
  customerProblems: [],
  desiredOutcomes: [],
  buyingReasons: [],
  capabilities: [],
  useCases: [],
  commonAlternatives: [],
  relevantDifferentiation: [],
  proofPoints: [],
  idealCustomerProfile: {
    criteria: [],
    examples: [],
    firmographicDisqualifiers: [],
  },
  whyNowSignals: [],
  redFlags: [],
};

// ---------------------------------------------------------------------------
// researchVendorContent — backward-compatible supplied-content path
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// researchVendorFromUrl — Checkpoint A
// ---------------------------------------------------------------------------

test("researchVendorFromUrl: sends URL Context tools, strict schema, and exactly one model call", async () => {
  let callCount = 0;
  let captured: {
    responseJsonSchema?: unknown;
    tools?: unknown;
    prompt?: string;
  } = {};

  const call = async (input: {
    prompt: string;
    responseJsonSchema: unknown;
    tools?: Array<{ urlContext: Record<string, never> }>;
  }) => {
    callCount += 1;
    captured = input;
    return { text: JSON.stringify(fullValidUrlResearchOutput) };
  };

  const result = await researchVendorFromUrl("https://gtmbrain.example", undefined, { call });

  assert.strictEqual(callCount, 1);
  assert.strictEqual(result.status, "success");
  assert.deepStrictEqual(captured.tools, [{ urlContext: {} }]);
  assert.match(captured.prompt ?? "", /URL context tool/);
  assert.match(captured.prompt ?? "", /gtmbrain\.example/);

  const serializedSchema = JSON.stringify(captured.responseJsonSchema);
  for (const collection of [
    "customerProblems",
    "desiredOutcomes",
    "buyingReasons",
    "capabilities",
    "useCases",
    "proofPoints",
    "relevantDifferentiation",
    "commonAlternatives",
    "idealCustomerProfile",
    "whyNowSignals",
    "redFlags",
    "vendorName",
    "websiteUrl",
    "offering",
  ]) {
    assert.match(serializedSchema, new RegExp(collection));
  }
});

test("researchVendorFromUrl: full valid response produces success with a valid editable VendorProfile", async () => {
  const result = await researchVendorFromUrl("gtmbrain.example", undefined, {
    call: mockCallReturning(fullValidUrlResearchOutput),
  });

  assert.strictEqual(result.status, "success");
  assert.ok(result.profileData);
  assert.strictEqual(result.profileData.vendorName, "GTM Brain");
  assert.strictEqual(result.profileData.productKnowledge.offering, fullValidUrlResearchOutput.offering);
  assert.strictEqual(result.profileData.productKnowledge.customerProblems.length, 1);
  assert.strictEqual(result.profileData.productKnowledge.buyingReasons.length, 1);
  assert.strictEqual(result.profileData.productKnowledge.useCases.length, 1);
  assert.strictEqual(result.profileData.productKnowledge.proofPoints.length, 1);
  assert.strictEqual(result.profileData.decisionStrategy.idealCustomerProfile.criteria.length, 1);
  assert.deepStrictEqual(result.profileData.decisionStrategy.targetPersonas, []);
  assert.deepStrictEqual(result.profileData.decisionStrategy.budgetOwners, []);
  assert.deepStrictEqual(validateVendorProfile(result.profileData), []);
});

test("researchVendorFromUrl: thin valid response produces incomplete and remains editable", async () => {
  const result = await researchVendorFromUrl("thin.example", undefined, {
    call: mockCallReturning(thinValidUrlResearchOutput),
  });

  assert.strictEqual(result.status, "incomplete");
  assert.ok(result.profileData);
  assert.strictEqual(result.profileData.vendorName, "Thin Vendor");
  assert.strictEqual(result.profileData.productKnowledge.offering, "A product.");
  assert.deepStrictEqual(result.profileData.productKnowledge.customerProblems, []);
  assert.deepStrictEqual(validateVendorProfile(result.profileData), []);
  assert.ok(result.failureReason);
});

test("researchVendorFromUrl: missing API key is failed without throwing", async () => {
  await withoutApiKey(async () => {
    const result = await researchVendorFromUrl("gtmbrain.example");

    assert.strictEqual(result.status, "failed");
    assert.strictEqual(result.profileData, null);
    assert.match(result.failureReason ?? "", /GEMINI_API_KEY/);
    assert.doesNotMatch(JSON.stringify(result), /sk-|AIza/);
  });
});

test("researchVendorFromUrl: model throw is failed without throwing to the caller", async () => {
  const result = await researchVendorFromUrl("gtmbrain.example", undefined, {
    call: async () => {
      throw new Error("network unreachable");
    },
  });

  assert.strictEqual(result.status, "failed");
  assert.strictEqual(result.profileData, null);
  assert.match(result.failureReason ?? "", /network unreachable/);
});

test("researchVendorFromUrl: malformed JSON is failed with null profileData", async () => {
  const result = await researchVendorFromUrl("gtmbrain.example", undefined, {
    call: async () => ({ text: "not-json" }),
  });

  assert.strictEqual(result.status, "failed");
  assert.strictEqual(result.profileData, null);
});

test("researchVendorFromUrl: invalid top-level payload is failed", async () => {
  const result = await researchVendorFromUrl("gtmbrain.example", undefined, {
    call: mockCallReturning({ offering: "only offering, missing required collections" }),
  });

  assert.strictEqual(result.status, "failed");
  assert.strictEqual(result.profileData, null);
});

test("researchVendorFromUrl: invalid URL is failed without throwing", async () => {
  const result = await researchVendorFromUrl("not a url :::");

  assert.strictEqual(result.status, "failed");
  assert.strictEqual(result.profileData, null);
  assert.match(result.failureReason ?? "", /URL/);
});

test("researchVendorFromUrl: invalid individual items are dropped while valid siblings survive", async () => {
  const mixed = {
    ...fullValidUrlResearchOutput,
    customerProblems: [
      fullValidUrlResearchOutput.customerProblems[0],
      { id: "problem-broken", statement: 123, impact: "bad" },
      { id: "wrong-prefix-problem", statement: "ok", impact: "ok" },
    ],
    capabilities: [
      fullValidUrlResearchOutput.capabilities[0],
      { id: "capability-missing-fields" },
    ],
  };

  const result = await researchVendorFromUrl("gtmbrain.example", undefined, {
    call: mockCallReturning(mixed),
  });

  assert.strictEqual(result.status, "success");
  assert.ok(result.profileData);
  assert.strictEqual(result.profileData.productKnowledge.customerProblems.length, 1);
  assert.strictEqual(
    result.profileData.productKnowledge.customerProblems[0].id,
    "problem-unstructured-prioritization",
  );
  assert.strictEqual(result.profileData.productKnowledge.capabilities.length, 1);
  assert.strictEqual(
    result.profileData.productKnowledge.capabilities[0].id,
    "capability-evidence-evaluation",
  );
});

test("researchVendorFromUrl: broken references are removed safely without renaming ids", async () => {
  const withBrokenRefs = {
    ...thinValidUrlResearchOutput,
    vendorName: "Ref Vendor",
    websiteUrl: "https://ref.example",
    offering: "Product",
    customerProblems: [
      {
        id: "problem-real",
        statement: "A real problem.",
        impact: "Impact.",
      },
    ],
    desiredOutcomes: [
      {
        id: "outcome-real",
        statement: "A real outcome.",
        problemIds: ["problem-real", "problem-missing", "problem-hallucinated"],
      },
    ],
    capabilities: [
      {
        id: "capability-real",
        name: "Capability",
        description: "Desc",
        problemIds: ["problem-real", "problem-ghost"],
        outcomeIds: ["outcome-real", "outcome-ghost"],
      },
    ],
  };

  const result = await researchVendorFromUrl("ref.example", undefined, {
    call: mockCallReturning(withBrokenRefs),
  });

  assert.strictEqual(result.status, "success");
  assert.ok(result.profileData);
  assert.strictEqual(result.profileData.productKnowledge.desiredOutcomes[0].id, "outcome-real");
  assert.deepStrictEqual(result.profileData.productKnowledge.desiredOutcomes[0].problemIds, [
    "problem-real",
  ]);
  assert.strictEqual(result.profileData.productKnowledge.capabilities[0].id, "capability-real");
  assert.deepStrictEqual(result.profileData.productKnowledge.capabilities[0].problemIds, [
    "problem-real",
  ]);
  assert.deepStrictEqual(result.profileData.productKnowledge.capabilities[0].outcomeIds, [
    "outcome-real",
  ]);
  assert.deepStrictEqual(validateVendorProfile(result.profileData), []);
});

test("researchVendorFromUrl: global duplicate IDs are dropped; unaffected siblings survive", async () => {
  const withDupes = {
    ...thinValidUrlResearchOutput,
    vendorName: "Dupe Vendor",
    websiteUrl: "https://dupe.example",
    offering: "Product",
    customerProblems: [
      {
        id: "problem-shared",
        statement: "First problem.",
        impact: "Impact A.",
      },
      {
        id: "problem-shared",
        statement: "Duplicate id problem.",
        impact: "Impact duplicate.",
      },
      {
        id: "problem-unique",
        statement: "Unique problem.",
        impact: "Impact B.",
      },
    ],
    capabilities: [
      {
        id: "capability-unique",
        name: "Unique capability",
        description: "Survives.",
        problemIds: ["problem-unique", "problem-shared"],
        outcomeIds: [],
      },
    ],
  };

  const result = await researchVendorFromUrl("dupe.example", undefined, {
    call: mockCallReturning(withDupes),
  });

  assert.strictEqual(result.status, "success");
  assert.ok(result.profileData);
  assert.deepStrictEqual(
    result.profileData.productKnowledge.customerProblems.map((item: { id: string }) => item.id),
    ["problem-unique"],
  );
  assert.deepStrictEqual(
    result.profileData.productKnowledge.capabilities.map((item: { id: string }) => item.id),
    ["capability-unique"],
  );
  assert.deepStrictEqual(result.profileData.productKnowledge.capabilities[0].problemIds, [
    "problem-unique",
  ]);
  assert.deepStrictEqual(validateVendorProfile(result.profileData), []);
});

test("researchVendorFromUrl: unsupported collections stay empty rather than fabricated", async () => {
  const result = await researchVendorFromUrl("thin.example", undefined, {
    call: mockCallReturning(thinValidUrlResearchOutput),
  });

  assert.ok(result.profileData);
  assert.deepStrictEqual(result.profileData.decisionStrategy.targetPersonas, []);
  assert.deepStrictEqual(result.profileData.decisionStrategy.budgetOwners, []);
  assert.deepStrictEqual(result.profileData.productKnowledge.buyingReasons, []);
  assert.deepStrictEqual(result.profileData.productKnowledge.useCases, []);
});

test("researchVendorFromUrl: empty model text is failed", async () => {
  const result = await researchVendorFromUrl("gtmbrain.example", undefined, {
    call: async () => ({ text: undefined }),
  });

  assert.strictEqual(result.status, "failed");
  assert.strictEqual(result.profileData, null);
});

test("vendor research route source: validates url, returns canonical status shape, never logs secrets", () => {
  const routePath = path.join(__dirname, "../../api/vendor/research/route.ts");
  const apiPath = path.join(__dirname, "vendorResearchApi.ts");
  const routeSource = fs.readFileSync(routePath, "utf8");
  const apiSource = fs.readFileSync(apiPath, "utf8");

  assert.match(routeSource, /handleVendorResearchPost/);
  assert.match(routeSource, /export async function POST/);
  assert.match(apiSource, /researchVendorFromUrl/);
  assert.match(apiSource, /INVALID_JSON/);
  assert.match(apiSource, /INVALID_BODY/);
  assert.match(apiSource, /INVALID_URL/);
  assert.match(apiSource, /non-empty "url" string/);
  assert.doesNotMatch(apiSource, /console\.(log|info|debug|error|warn)/);
  assert.doesNotMatch(apiSource, /process\.env/);
  assert.doesNotMatch(routeSource, /gtmBrainVendorProfile/);
  assert.doesNotMatch(apiSource, /gtmBrainVendorProfile/);
});

/* eslint-disable @typescript-eslint/no-require-imports -- .cts test files must use CommonJS require(). */
const test = require("node:test");
const assert = require("node:assert/strict");

const { mapEvidenceToDecisionGroups } = require("./evidenceMatchingService.ts");
const { createEmptyCompanyProfile } = require("./types/companyProfile.ts");

/**
 * A purpose-built Vendor Profile exercising every collection this mapper
 * reads from: one item per positive/context collection for each group, plus
 * a Firmographic Disqualifier and one disqualifying + one cautionary Red
 * Flag for each of Why Them / Why Us.
 */
function makeVendorProfile() {
  return {
    id: "test-vendor",
    websiteUrl: "https://vendor.example",
    vendorName: "TestVendor",
    productKnowledge: {
      offering: "A test offering.",
      customerProblems: [{ id: "problem-1", statement: "Problem one.", impact: "Impact one." }],
      desiredOutcomes: [{ id: "outcome-1", statement: "Outcome one.", problemIds: ["problem-1"] }],
      buyingReasons: [{ id: "reason-1", statement: "Reason one.", outcomeIds: ["outcome-1"] }],
      capabilities: [
        {
          id: "capability-1",
          name: "Capability One",
          description: "Does a thing.",
          problemIds: ["problem-1"],
          outcomeIds: ["outcome-1"],
        },
      ],
      useCases: [
        {
          id: "usecase-1",
          name: "Use Case One",
          description: "Used for a thing.",
          problemIds: ["problem-1"],
          outcomeIds: ["outcome-1"],
          capabilityIds: ["capability-1"],
        },
      ],
      commonAlternatives: [{ id: "alternative-1", name: "Alternative One", description: "A common alternative." }],
      relevantDifferentiation: [
        {
          id: "diff-1",
          statement: "Differentiation one.",
          alternativeIds: ["alternative-1"],
          problemIds: ["problem-1"],
          outcomeIds: ["outcome-1"],
        },
      ],
      proofPoints: [
        { id: "proof-1", summary: "Proof point one.", outcomeIds: ["outcome-1"], useCaseIds: ["usecase-1"] },
      ],
    },
    decisionStrategy: {
      idealCustomerProfile: {
        criteria: [{ id: "criterion-1", description: "Criterion one." }],
        examples: [
          {
            id: "example-1",
            companyName: "ExampleCo",
            rationale: "Rationale one.",
            criterionIds: ["criterion-1"],
          },
        ],
        firmographicDisqualifiers: [
          { id: "fd-1", condition: "Firmographic disqualifier condition.", whyItMatters: "Why it matters." },
        ],
      },
      targetPersonas: [],
      budgetOwners: [],
      whyNowSignals: [
        {
          id: "signal-1",
          signal: "Signal one.",
          whyItMatters: "Why it matters.",
          problemIds: ["problem-1"],
          outcomeIds: ["outcome-1"],
          firstMeetingAngle: "Angle.",
        },
      ],
      redFlags: [
        {
          id: "redflag-disqualifying-them",
          condition: "Disqualifying for Why Them.",
          whyItMatters: "Why it matters.",
          severity: "disqualifying",
          affectedDecisionGroups: ["whyThem"],
        },
        {
          id: "redflag-disqualifying-us",
          condition: "Disqualifying for Why Us.",
          whyItMatters: "Why it matters.",
          severity: "disqualifying",
          affectedDecisionGroups: ["whyUs"],
        },
        {
          id: "redflag-cautionary-them",
          condition: "Cautionary for Why Them.",
          whyItMatters: "Why it matters.",
          severity: "cautionary",
          affectedDecisionGroups: ["whyThem"],
        },
        {
          id: "redflag-cautionary-us",
          condition: "Cautionary for Why Us.",
          whyItMatters: "Why it matters.",
          severity: "cautionary",
          affectedDecisionGroups: ["whyUs"],
        },
      ],
    },
  };
}

function makeCompanyProfile(overrides: Record<string, unknown> = {}) {
  return {
    ...createEmptyCompanyProfile(),
    companyIdentity: { name: "TestCo", url: "https://testco.example" },
    ...overrides,
  };
}

function makeFinding(overrides: Record<string, unknown> = {}) {
  return {
    claim: "A claim.",
    source: "https://testco.example/source",
    date: "2026-01-01",
    connectedVendorItemId: "problem-1",
    natureOfConnection: "explicit_fact",
    decisionImpact: "supportive",
    ...overrides,
  };
}

const UNKNOWN_FALLBACK = {
  whyThem: [{ id: "why-them", name: "Why Them", status: "unknown", evidence: [] }],
  whyNow: [{ id: "why-now", name: "Why Now", status: "unknown", evidence: [] }],
  whyUs: [{ id: "why-us", name: "Why Us", status: "unknown", evidence: [] }],
};

test("mapEvidenceToDecisionGroups: an invalid VendorProfile (validation errors present) falls back to one unknown gate per group, preserving names", () => {
  const vendor = makeVendorProfile();
  vendor.decisionStrategy.whyNowSignals[0].problemIds = ["missing-problem"]; // broken reference -> validation error

  const company = makeCompanyProfile({
    relevantBusinessEvidence: [makeFinding({ claim: "Should never be reached." })],
  });

  const result = mapEvidenceToDecisionGroups(company, vendor);

  assert.strictEqual(result.companyName, "TestCo");
  assert.strictEqual(result.productName, "TestVendor");
  assert.deepStrictEqual(result.whyThem, UNKNOWN_FALLBACK.whyThem);
  assert.deepStrictEqual(result.whyNow, UNKNOWN_FALLBACK.whyNow);
  assert.deepStrictEqual(result.whyUs, UNKNOWN_FALLBACK.whyUs);
});

test("mapEvidenceToDecisionGroups: validateVendorProfile throwing on malformed runtime data still falls back without throwing", () => {
  const vendor = { ...makeVendorProfile(), productKnowledge: undefined };
  const company = makeCompanyProfile();

  assert.doesNotThrow(() => {
    const result = mapEvidenceToDecisionGroups(company, vendor as never);
    assert.deepStrictEqual(result.whyThem, UNKNOWN_FALLBACK.whyThem);
    assert.deepStrictEqual(result.whyNow, UNKNOWN_FALLBACK.whyNow);
    assert.deepStrictEqual(result.whyUs, UNKNOWN_FALLBACK.whyUs);
  });
});

test("mapEvidenceToDecisionGroups: companyName and productName come from the canonical fields on a valid VendorProfile", () => {
  const vendor = makeVendorProfile();
  const company = makeCompanyProfile();

  const result = mapEvidenceToDecisionGroups(company, vendor);

  assert.strictEqual(result.companyName, company.companyIdentity.name);
  assert.strictEqual(result.productName, vendor.vendorName);
});

test("mapEvidenceToDecisionGroups: returns exactly one master gate per group, on both the success and fallback paths", () => {
  const vendor = makeVendorProfile();
  const company = makeCompanyProfile();

  const successResult = mapEvidenceToDecisionGroups(company, vendor);
  assert.strictEqual(successResult.whyThem.length, 1);
  assert.strictEqual(successResult.whyNow.length, 1);
  assert.strictEqual(successResult.whyUs.length, 1);

  const brokenVendor = makeVendorProfile();
  brokenVendor.decisionStrategy.whyNowSignals[0].problemIds = ["missing-problem"];
  const fallbackResult = mapEvidenceToDecisionGroups(company, brokenVendor);
  assert.strictEqual(fallbackResult.whyThem.length, 1);
  assert.strictEqual(fallbackResult.whyNow.length, 1);
  assert.strictEqual(fallbackResult.whyUs.length, 1);
});

test("mapEvidenceToDecisionGroups: every allowed Why Them positive/context collection resolves to pass", () => {
  const vendor = makeVendorProfile();
  const whyThemItemIds = ["problem-1", "outcome-1", "reason-1", "criterion-1", "example-1"];

  for (const connectedVendorItemId of whyThemItemIds) {
    const company = makeCompanyProfile({
      relevantBusinessEvidence: [makeFinding({ claim: `Supportive claim for ${connectedVendorItemId}.`, connectedVendorItemId })],
    });

    const result = mapEvidenceToDecisionGroups(company, vendor);
    assert.strictEqual(result.whyThem[0].status, "pass", `expected "pass" for id ${connectedVendorItemId}`);
    assert.deepStrictEqual(result.whyThem[0].evidence, [`Supportive claim for ${connectedVendorItemId}.`]);
  }
});

test("mapEvidenceToDecisionGroups: Why Now Signals is the only allowed Why Now collection and resolves to pass", () => {
  const vendor = makeVendorProfile();
  const company = makeCompanyProfile({
    whyNowEvidence: [makeFinding({ claim: "Timing evidence.", connectedVendorItemId: "signal-1" })],
  });

  const result = mapEvidenceToDecisionGroups(company, vendor);
  assert.strictEqual(result.whyNow[0].status, "pass");
  assert.deepStrictEqual(result.whyNow[0].evidence, ["Timing evidence."]);
});

test("mapEvidenceToDecisionGroups: every allowed Why Us positive/context collection resolves to pass", () => {
  const vendor = makeVendorProfile();
  const whyUsItemIds = ["capability-1", "usecase-1", "proof-1", "diff-1", "alternative-1"];

  for (const connectedVendorItemId of whyUsItemIds) {
    const company = makeCompanyProfile({
      whyUsEvidence: [makeFinding({ claim: `Supportive claim for ${connectedVendorItemId}.`, connectedVendorItemId })],
    });

    const result = mapEvidenceToDecisionGroups(company, vendor);
    assert.strictEqual(result.whyUs[0].status, "pass", `expected "pass" for id ${connectedVendorItemId}`);
    assert.deepStrictEqual(result.whyUs[0].evidence, [`Supportive claim for ${connectedVendorItemId}.`]);
  }
});

test("mapEvidenceToDecisionGroups: a Firmographic Disqualifier fails Why Them, and is ignored (never a disqualifier) if misrouted to Why Us", () => {
  const vendor = makeVendorProfile();

  const companyWhyThem = makeCompanyProfile({
    relevantBusinessEvidence: [makeFinding({ claim: "Fails a firmographic requirement.", connectedVendorItemId: "fd-1" })],
  });
  const whyThemResult = mapEvidenceToDecisionGroups(companyWhyThem, vendor);
  assert.strictEqual(whyThemResult.whyThem[0].status, "fail");
  assert.strictEqual(whyThemResult.whyThem[0].significant, true);

  const companyMisrouted = makeCompanyProfile({
    whyUsEvidence: [makeFinding({ claim: "Fails a firmographic requirement.", connectedVendorItemId: "fd-1" })],
  });
  const whyUsResult = mapEvidenceToDecisionGroups(companyMisrouted, vendor);
  assert.strictEqual(whyUsResult.whyUs[0].status, "unknown");
  assert.deepStrictEqual(whyUsResult.whyUs[0].evidence, []);
});

test("mapEvidenceToDecisionGroups: a disqualifying Red Flag fails its affected group with significant:true", () => {
  const vendor = makeVendorProfile();

  const companyThem = makeCompanyProfile({
    relevantBusinessEvidence: [makeFinding({ claim: "Hits the Why Them disqualifier.", connectedVendorItemId: "redflag-disqualifying-them" })],
  });
  const themResult = mapEvidenceToDecisionGroups(companyThem, vendor);
  assert.strictEqual(themResult.whyThem[0].status, "fail");
  assert.strictEqual(themResult.whyThem[0].significant, true);

  const companyUs = makeCompanyProfile({
    whyUsEvidence: [makeFinding({ claim: "Hits the Why Us disqualifier.", connectedVendorItemId: "redflag-disqualifying-us" })],
  });
  const usResult = mapEvidenceToDecisionGroups(companyUs, vendor);
  assert.strictEqual(usResult.whyUs[0].status, "fail");
  assert.strictEqual(usResult.whyUs[0].significant, true);
});

test("mapEvidenceToDecisionGroups: a cautionary Red Flag never causes fail by itself, even with a contradictory decisionImpact", () => {
  const vendor = makeVendorProfile();
  const company = makeCompanyProfile({
    relevantBusinessEvidence: [
      makeFinding({
        claim: "A cautionary condition was observed.",
        connectedVendorItemId: "redflag-cautionary-them",
        decisionImpact: "contradictory",
      }),
    ],
  });

  const result = mapEvidenceToDecisionGroups(company, vendor);
  assert.notStrictEqual(result.whyThem[0].status, "fail");
  assert.strictEqual(result.whyThem[0].status, "unknown");
  assert.deepStrictEqual(result.whyThem[0].evidence, ["A cautionary condition was observed."]);
});

test("mapEvidenceToDecisionGroups: a Red Flag's affectedDecisionGroups isolates it to only the group(s) it names", () => {
  const vendor = makeVendorProfile();
  // "redflag-disqualifying-them" only affects whyThem; citing it from whyUsEvidence must be ignored for Why Us.
  const company = makeCompanyProfile({
    whyUsEvidence: [
      makeFinding({ claim: "Should be ignored for Why Us.", connectedVendorItemId: "redflag-disqualifying-them" }),
      makeFinding({ claim: "A genuine Why Us signal.", connectedVendorItemId: "capability-1" }),
    ],
  });

  const result = mapEvidenceToDecisionGroups(company, vendor);
  assert.strictEqual(result.whyUs[0].status, "pass");
  assert.deepStrictEqual(result.whyUs[0].evidence, ["A genuine Why Us signal."]);
});

test("mapEvidenceToDecisionGroups: an unknown connectedVendorItemId is ignored completely", () => {
  const vendor = makeVendorProfile();
  const company = makeCompanyProfile({
    relevantBusinessEvidence: [makeFinding({ claim: "Cites an id that does not exist.", connectedVendorItemId: "no-such-id" })],
  });

  const result = mapEvidenceToDecisionGroups(company, vendor);
  assert.strictEqual(result.whyThem[0].status, "unknown");
  assert.deepStrictEqual(result.whyThem[0].evidence, []);
});

test("mapEvidenceToDecisionGroups: a valid id whose collection isn't allowed for that group (misrouted) is ignored", () => {
  const vendor = makeVendorProfile();
  // "signal-1" is a real Why Now Signal id, but cited here from relevantBusinessEvidence (Why Them).
  const company = makeCompanyProfile({
    relevantBusinessEvidence: [makeFinding({ claim: "A Why Now signal cited in the wrong array.", connectedVendorItemId: "signal-1" })],
  });

  const result = mapEvidenceToDecisionGroups(company, vendor);
  assert.strictEqual(result.whyThem[0].status, "unknown");
  assert.deepStrictEqual(result.whyThem[0].evidence, []);
});

test("mapEvidenceToDecisionGroups: supportive only -> pass", () => {
  const vendor = makeVendorProfile();
  const company = makeCompanyProfile({
    relevantBusinessEvidence: [makeFinding({ claim: "Supportive.", decisionImpact: "supportive" })],
  });

  assert.strictEqual(mapEvidenceToDecisionGroups(company, vendor).whyThem[0].status, "pass");
});

test("mapEvidenceToDecisionGroups: supportive + contradictory -> unknown", () => {
  const vendor = makeVendorProfile();
  const company = makeCompanyProfile({
    relevantBusinessEvidence: [
      makeFinding({ claim: "Supportive.", connectedVendorItemId: "problem-1", decisionImpact: "supportive" }),
      makeFinding({ claim: "Contradictory.", connectedVendorItemId: "outcome-1", decisionImpact: "contradictory" }),
    ],
  });

  assert.strictEqual(mapEvidenceToDecisionGroups(company, vendor).whyThem[0].status, "unknown");
});

test("mapEvidenceToDecisionGroups: contradictory only -> unknown", () => {
  const vendor = makeVendorProfile();
  const company = makeCompanyProfile({
    relevantBusinessEvidence: [makeFinding({ claim: "Contradictory.", decisionImpact: "contradictory" })],
  });

  assert.strictEqual(mapEvidenceToDecisionGroups(company, vendor).whyThem[0].status, "unknown");
});

test("mapEvidenceToDecisionGroups: neutral only -> unknown", () => {
  const vendor = makeVendorProfile();
  const company = makeCompanyProfile({
    relevantBusinessEvidence: [makeFinding({ claim: "Neutral.", decisionImpact: "neutral" })],
  });

  assert.strictEqual(mapEvidenceToDecisionGroups(company, vendor).whyThem[0].status, "unknown");
});

test("mapEvidenceToDecisionGroups: supportive + neutral -> pass (neutral never blocks a pass)", () => {
  const vendor = makeVendorProfile();
  const company = makeCompanyProfile({
    relevantBusinessEvidence: [
      makeFinding({ claim: "Supportive.", connectedVendorItemId: "problem-1", decisionImpact: "supportive" }),
      makeFinding({ claim: "Neutral.", connectedVendorItemId: "outcome-1", decisionImpact: "neutral" }),
    ],
  });

  assert.strictEqual(mapEvidenceToDecisionGroups(company, vendor).whyThem[0].status, "pass");
});

test("mapEvidenceToDecisionGroups: empty evidence -> unknown, with empty evidence array", () => {
  const vendor = makeVendorProfile();
  const company = makeCompanyProfile({ relevantBusinessEvidence: [] });

  const result = mapEvidenceToDecisionGroups(company, vendor);
  assert.strictEqual(result.whyThem[0].status, "unknown");
  assert.deepStrictEqual(result.whyThem[0].evidence, []);
});

test("mapEvidenceToDecisionGroups: Why Now never emits fail, under any combination of evidence", () => {
  const vendor = makeVendorProfile();

  const scenarios = [
    [],
    [makeFinding({ claim: "Contradictory timing.", connectedVendorItemId: "signal-1", decisionImpact: "contradictory" })],
    [makeFinding({ claim: "Neutral timing.", connectedVendorItemId: "signal-1", decisionImpact: "neutral" })],
    [
      makeFinding({ claim: "Supportive timing.", connectedVendorItemId: "signal-1", decisionImpact: "supportive" }),
      makeFinding({ claim: "Contradictory timing.", connectedVendorItemId: "signal-1", decisionImpact: "contradictory" }),
    ],
    // Even an id that only exists as a hard-disqualifying vendor item is
    // structurally excluded from Why Now (its collection isn't allowed),
    // so it can never sneak a fail into this group either.
    [makeFinding({ claim: "Misrouted disqualifier.", connectedVendorItemId: "fd-1", decisionImpact: "supportive" })],
  ];

  for (const whyNowEvidence of scenarios) {
    const company = makeCompanyProfile({ whyNowEvidence });
    const status = mapEvidenceToDecisionGroups(company, vendor).whyNow[0].status;
    assert.notStrictEqual(status, "fail");
    assert.ok(status === "pass" || status === "unknown");
  }
});

test("mapEvidenceToDecisionGroups: a hard disqualifier overrides decisionImpact entirely, regardless of its value", () => {
  const vendor = makeVendorProfile();

  for (const decisionImpact of ["supportive", "contradictory", "neutral"]) {
    const company = makeCompanyProfile({
      relevantBusinessEvidence: [makeFinding({ claim: "Disqualifying regardless.", connectedVendorItemId: "fd-1", decisionImpact })],
    });
    assert.strictEqual(mapEvidenceToDecisionGroups(company, vendor).whyThem[0].status, "fail", `decisionImpact=${decisionImpact}`);
  }
});

test("mapEvidenceToDecisionGroups: evidence includes every applicable finding, including neutral and applicable negative findings", () => {
  const vendor = makeVendorProfile();
  const company = makeCompanyProfile({
    relevantBusinessEvidence: [
      makeFinding({ claim: "Supportive claim.", connectedVendorItemId: "problem-1", decisionImpact: "supportive" }),
      makeFinding({ claim: "Neutral claim.", connectedVendorItemId: "outcome-1", decisionImpact: "neutral" }),
      makeFinding({
        claim: "Cautionary but applicable claim.",
        connectedVendorItemId: "redflag-cautionary-them",
        decisionImpact: "contradictory",
      }),
    ],
  });

  const result = mapEvidenceToDecisionGroups(company, vendor);
  assert.deepStrictEqual(result.whyThem[0].evidence, [
    "Supportive claim.",
    "Neutral claim.",
    "Cautionary but applicable claim.",
  ]);
});

test("mapEvidenceToDecisionGroups: evidence preserves the original finding order, including around ignored findings", () => {
  const vendor = makeVendorProfile();
  const company = makeCompanyProfile({
    relevantBusinessEvidence: [
      makeFinding({ claim: "First.", connectedVendorItemId: "reason-1" }),
      makeFinding({ claim: "Ignored (unknown id).", connectedVendorItemId: "no-such-id" }),
      makeFinding({ claim: "Second.", connectedVendorItemId: "problem-1" }),
      makeFinding({ claim: "Third.", connectedVendorItemId: "outcome-1" }),
    ],
  });

  const result = mapEvidenceToDecisionGroups(company, vendor);
  assert.deepStrictEqual(result.whyThem[0].evidence, ["First.", "Second.", "Third."]);
});

test("mapEvidenceToDecisionGroups: exact-duplicate claim strings are removed deterministically, keeping the first occurrence", () => {
  const vendor = makeVendorProfile();
  const company = makeCompanyProfile({
    relevantBusinessEvidence: [
      makeFinding({ claim: "Repeated claim.", connectedVendorItemId: "problem-1" }),
      makeFinding({ claim: "Unique claim.", connectedVendorItemId: "outcome-1" }),
      makeFinding({ claim: "Repeated claim.", connectedVendorItemId: "reason-1" }),
    ],
  });

  const result = mapEvidenceToDecisionGroups(company, vendor);
  assert.deepStrictEqual(result.whyThem[0].evidence, ["Repeated claim.", "Unique claim."]);
});

test("mapEvidenceToDecisionGroups: never mutates the companyProfile or vendorProfile inputs", () => {
  const vendor = makeVendorProfile();
  const company = makeCompanyProfile({
    relevantBusinessEvidence: [makeFinding({ claim: "Some claim.", connectedVendorItemId: "problem-1" })],
    whyNowEvidence: [makeFinding({ claim: "Timing.", connectedVendorItemId: "signal-1" })],
    whyUsEvidence: [makeFinding({ claim: "Fit.", connectedVendorItemId: "capability-1" })],
  });

  const vendorSnapshot = structuredClone(vendor);
  const companySnapshot = structuredClone(company);

  mapEvidenceToDecisionGroups(company, vendor);

  assert.deepStrictEqual(vendor, vendorSnapshot);
  assert.deepStrictEqual(company, companySnapshot);
});

test("mapEvidenceToDecisionGroups: identical inputs produce identical outputs on repeated calls", () => {
  const vendor = makeVendorProfile();
  const company = makeCompanyProfile({
    relevantBusinessEvidence: [makeFinding({ claim: "Some claim.", connectedVendorItemId: "problem-1" })],
    whyNowEvidence: [makeFinding({ claim: "Timing.", connectedVendorItemId: "signal-1" })],
    whyUsEvidence: [makeFinding({ claim: "Fit.", connectedVendorItemId: "capability-1" })],
  });

  const first = mapEvidenceToDecisionGroups(company, vendor);
  const second = mapEvidenceToDecisionGroups(company, vendor);

  assert.deepStrictEqual(first, second);
});

test("mapEvidenceToDecisionGroups: has no network, Gemini, environment, async, or model dependency", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const vendor = makeVendorProfile();
    const company = makeCompanyProfile({
      relevantBusinessEvidence: [makeFinding({ claim: "Some claim.", connectedVendorItemId: "problem-1" })],
    });

    const returned = mapEvidenceToDecisionGroups(company, vendor);
    assert.ok(!(returned instanceof Promise), "mapEvidenceToDecisionGroups must be synchronous, not async");
    assert.strictEqual(returned.whyThem[0].status, "pass");
  } finally {
    if (previousKey !== undefined) {
      process.env.GEMINI_API_KEY = previousKey;
    }
  }
});

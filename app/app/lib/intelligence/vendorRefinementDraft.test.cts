/* eslint-disable @typescript-eslint/no-require-imports -- .cts test files must use CommonJS require(). */
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildRefinementDraft,
  validateRefinementDraft,
  createBlankCustomerProblem,
  createBlankDesiredOutcome,
  createBlankCapability,
  createBlankWhyNowSignal,
  createBlankRedFlag,
  parseIdList,
  formatIdList,
} = require("./vendorRefinementDraft.ts");

/** Mimics the shape `researchVendorContent` (Step A) returns. */
const stepAOutput = {
  productKnowledge: {
    offering: "An outbound decision workspace for Enterprise AEs.",
    customerProblems: [
      { id: "unstructured-prioritization", statement: "AEs prioritize with fragmented evidence.", impact: "Inconsistent selection." },
    ],
    desiredOutcomes: [
      { id: "focus-ae-time", statement: "Focus AE time on the right accounts.", problemIds: ["unstructured-prioritization"] },
    ],
    buyingReasons: [],
    capabilities: [
      {
        id: "evidence-based-evaluation",
        name: "Evidence-based evaluation",
        description: "Organizes evidence into decision groups.",
        problemIds: ["unstructured-prioritization"],
        outcomeIds: ["focus-ae-time"],
      },
    ],
    useCases: [],
    commonAlternatives: [],
    relevantDifferentiation: [],
    proofPoints: [],
  },
  decisionStrategy: {
    idealCustomerProfile: { criteria: [], examples: [], firmographicDisqualifiers: [] },
    targetPersonas: [],
    budgetOwners: [],
    whyNowSignals: [
      {
        id: "new-territories",
        signal: "Sales org reallocates enterprise territories.",
        whyItMatters: "AEs must decide fast.",
        problemIds: ["unstructured-prioritization"],
        outcomeIds: ["focus-ae-time"],
        firstMeetingAngle: "Discuss new territory prioritization.",
      },
    ],
    redFlags: [
      {
        id: "no-named-account-motion",
        condition: "Does not use named-account enterprise selling.",
        whyItMatters: "GTM Brain targets judgment-intensive prioritization.",
        severity: "disqualifying",
        affectedDecisionGroups: ["whyThem"],
      },
    ],
  },
};

test("buildRefinementDraft: layers Step A's partial output onto a structurally complete, empty VendorProfile", () => {
  const draft = buildRefinementDraft(stepAOutput, {
    id: "gtm-brain",
    websiteUrl: "https://gtmbrain.example",
    vendorName: "GTM Brain",
  });

  assert.strictEqual(draft.id, "gtm-brain");
  assert.strictEqual(draft.websiteUrl, "https://gtmbrain.example");
  assert.strictEqual(draft.vendorName, "GTM Brain");
  assert.strictEqual(draft.productKnowledge.offering, stepAOutput.productKnowledge.offering);
  assert.deepStrictEqual(draft.productKnowledge.customerProblems, stepAOutput.productKnowledge.customerProblems);
  assert.deepStrictEqual(draft.decisionStrategy.redFlags, stepAOutput.decisionStrategy.redFlags);

  // Fields Step A never touches must still be present, valid, and empty.
  assert.deepStrictEqual(draft.productKnowledge.useCases, []);
  assert.deepStrictEqual(draft.decisionStrategy.targetPersonas, []);
  assert.deepStrictEqual(draft.decisionStrategy.idealCustomerProfile, {
    criteria: [],
    examples: [],
    firmographicDisqualifiers: [],
  });
});

test("buildRefinementDraft: an empty partial (no AI output at all) still yields a structurally valid draft", () => {
  const draft = buildRefinementDraft({}, { id: "v1", websiteUrl: "", vendorName: "New Vendor" });

  assert.strictEqual(draft.productKnowledge.offering, "");
  assert.deepStrictEqual(draft.productKnowledge.customerProblems, []);
  assert.deepStrictEqual(draft.decisionStrategy.whyNowSignals, []);

  const validation = validateRefinementDraft(draft);
  assert.strictEqual(validation.isValid, true);
  assert.deepStrictEqual(validation.errors, []);
});

test("validateRefinementDraft: a manually-edited draft with valid cross-references passes validation, ready to save", () => {
  const draft = buildRefinementDraft(stepAOutput, { id: "gtm-brain", websiteUrl: "", vendorName: "GTM Brain" });

  // Simulate a manual edit from the UI: the AE tweaks the offering text and
  // adds a brand-new customer problem, referencing it from a new outcome —
  // exactly the "add manually" flow the UI exposes via the blank-row
  // factories below.
  draft.productKnowledge.offering = "An AE-edited description of the offering.";
  const newProblem = createBlankCustomerProblem();
  newProblem.statement = "Manually added problem";
  newProblem.impact = "Manually added impact";
  draft.productKnowledge.customerProblems.push(newProblem);

  const newOutcome = createBlankDesiredOutcome();
  newOutcome.statement = "Manually added outcome";
  newOutcome.problemIds = [newProblem.id];
  draft.productKnowledge.desiredOutcomes.push(newOutcome);

  const result = validateRefinementDraft(draft);

  assert.strictEqual(result.isValid, true);
  assert.deepStrictEqual(result.errors, []);
  assert.strictEqual(result.profile.productKnowledge.offering, "An AE-edited description of the offering.");
  assert.strictEqual(result.profile.productKnowledge.customerProblems.length, 2);
});

test("validateRefinementDraft: deleting an AI-generated row that other rows still reference surfaces a validation error", () => {
  const draft = buildRefinementDraft(stepAOutput, { id: "gtm-brain", websiteUrl: "", vendorName: "GTM Brain" });

  // Simulate the UI's "Remove" action deleting the customer problem that
  // "focus-ae-time" (a desiredOutcome) and "evidence-based-evaluation" (a
  // capability) still reference by id.
  draft.productKnowledge.customerProblems = draft.productKnowledge.customerProblems.filter(
    (problem: { id: string }) => problem.id !== "unstructured-prioritization",
  );

  const result = validateRefinementDraft(draft);

  assert.strictEqual(result.isValid, false);
  assert.ok(result.errors.some((error: string) => error.includes("unstructured-prioritization")));
});

test("createBlank* factories: each produces a unique id and empty editable fields", () => {
  const problem = createBlankCustomerProblem();
  const outcome = createBlankDesiredOutcome();
  const capability = createBlankCapability();
  const signal = createBlankWhyNowSignal();
  const redFlag = createBlankRedFlag();

  assert.ok(problem.id.startsWith("problem-"));
  assert.strictEqual(problem.statement, "");

  assert.ok(outcome.id.startsWith("outcome-"));
  assert.deepStrictEqual(outcome.problemIds, []);

  assert.ok(capability.id.startsWith("capability-"));
  assert.deepStrictEqual(capability.problemIds, []);
  assert.deepStrictEqual(capability.outcomeIds, []);

  assert.ok(signal.id.startsWith("signal-"));
  assert.strictEqual(signal.signal, "");

  assert.ok(redFlag.id.startsWith("red-flag-"));
  assert.strictEqual(redFlag.severity, "cautionary");
  assert.deepStrictEqual(redFlag.affectedDecisionGroups, []);

  const secondProblem = createBlankCustomerProblem();
  assert.notStrictEqual(problem.id, secondProblem.id);
});

test("parseIdList / formatIdList: round-trip a comma-separated id field the same way the UI edits it", () => {
  assert.deepStrictEqual(parseIdList("problem-1, problem-2 ,  problem-3"), [
    "problem-1",
    "problem-2",
    "problem-3",
  ]);
  assert.deepStrictEqual(parseIdList(""), []);
  assert.deepStrictEqual(parseIdList("  ,  ,"), []);
  assert.strictEqual(formatIdList(["problem-1", "problem-2"]), "problem-1, problem-2");
  assert.strictEqual(formatIdList([]), "");

  const roundTripped = parseIdList(formatIdList(["a", "b", "c"]));
  assert.deepStrictEqual(roundTripped, ["a", "b", "c"]);
});

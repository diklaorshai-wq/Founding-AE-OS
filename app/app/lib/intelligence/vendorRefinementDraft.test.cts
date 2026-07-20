/* eslint-disable @typescript-eslint/no-require-imports -- .cts test files must use CommonJS require(). */
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildRefinementDraft,
  buildValuePropositionPreview,
  validateRefinementDraft,
  createBlankCustomerProblem,
  createBlankDesiredOutcome,
  createBlankBuyingReason,
  createBlankCapability,
  createBlankUseCase,
  createBlankCommonAlternative,
  createBlankRelevantDifferentiation,
  createBlankProofPoint,
  createBlankIcpCriterion,
  createBlankIcpExample,
  createBlankFirmographicDisqualifier,
  createBlankWhyNowSignal,
  createBlankRedFlag,
  removeCustomerProblem,
  removeDesiredOutcome,
  removeCapability,
  removeUseCase,
  removeCommonAlternative,
  removeIcpCriterion,
  toggleReferenceId,
  parseIdList,
  formatIdList,
} = require("./vendorRefinementDraft.ts");
const { validateVendorProfile } = require("./vendorProfileValidation.ts");

/** Full mapper-driving draft shaped like researchVendorFromUrl output. */
const fullResearchDraft = {
  id: "vendor-gtmbrain-example",
  websiteUrl: "https://gtmbrain.example",
  vendorName: "GTM Brain",
  productKnowledge: {
    offering: "An outbound decision workspace for Enterprise AEs.",
    customerProblems: [
      {
        id: "problem-unstructured-prioritization",
        statement: "AEs prioritize with fragmented evidence.",
        impact: "Inconsistent selection.",
      },
    ],
    desiredOutcomes: [
      {
        id: "outcome-focus-ae-time",
        statement: "Focus AE time on the right accounts.",
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
        name: "Evidence-based evaluation",
        description: "Organizes evidence into decision groups.",
        problemIds: ["problem-unstructured-prioritization"],
        outcomeIds: ["outcome-focus-ae-time"],
      },
    ],
    useCases: [
      {
        id: "use-case-territory-planning",
        name: "Territory planning",
        description: "Decide which named accounts deserve outbound.",
        problemIds: ["problem-unstructured-prioritization"],
        outcomeIds: ["outcome-focus-ae-time"],
        capabilityIds: ["capability-evidence-evaluation"],
      },
    ],
    commonAlternatives: [
      {
        id: "alternative-spreadsheets",
        name: "Spreadsheets",
        description: "Manual tracking.",
      },
    ],
    relevantDifferentiation: [
      {
        id: "differentiation-decision-groups",
        statement: "Structures evidence into decision groups.",
        alternativeIds: ["alternative-spreadsheets"],
        problemIds: ["problem-unstructured-prioritization"],
        outcomeIds: ["outcome-focus-ae-time"],
      },
    ],
    proofPoints: [
      {
        id: "proof-point-pilot",
        summary: "Pilot AE team cut wasted outreach.",
        outcomeIds: ["outcome-focus-ae-time"],
        useCaseIds: ["use-case-territory-planning"],
      },
    ],
  },
  decisionStrategy: {
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
          rationale: "Large AE org.",
          criterionIds: ["icp-criterion-named-account-motion"],
          relationship: "example-only",
        },
      ],
      firmographicDisqualifiers: [
        {
          id: "firmographic-disqualifier-smb-only",
          condition: "SMB-only with no named accounts.",
          whyItMatters: "Product targets enterprise prioritization.",
        },
      ],
    },
    targetPersonas: [],
    budgetOwners: [],
    whyNowSignals: [
      {
        id: "why-now-signal-new-territories",
        signal: "Sales org reallocates enterprise territories.",
        whyItMatters: "AEs must decide fast.",
        problemIds: ["problem-unstructured-prioritization"],
        outcomeIds: ["outcome-focus-ae-time"],
        firstMeetingAngle: "Discuss new territory prioritization.",
      },
    ],
    redFlags: [
      {
        id: "red-flag-no-named-account-motion",
        condition: "Does not use named-account enterprise selling.",
        whyItMatters: "GTM Brain targets judgment-intensive prioritization.",
        severity: "disqualifying",
        affectedDecisionGroups: ["whyThem"],
      },
    ],
  },
};

test("buildRefinementDraft: represents every V1 mapper-driving collection from research", () => {
  const draft = buildRefinementDraft(fullResearchDraft);

  assert.strictEqual(draft.vendorName, "GTM Brain");
  assert.strictEqual(draft.websiteUrl, "https://gtmbrain.example");
  assert.strictEqual(draft.productKnowledge.offering, fullResearchDraft.productKnowledge.offering);
  assert.strictEqual(draft.productKnowledge.customerProblems.length, 1);
  assert.strictEqual(draft.productKnowledge.desiredOutcomes.length, 1);
  assert.strictEqual(draft.productKnowledge.buyingReasons.length, 1);
  assert.strictEqual(draft.productKnowledge.capabilities.length, 1);
  assert.strictEqual(draft.productKnowledge.useCases.length, 1);
  assert.strictEqual(draft.productKnowledge.commonAlternatives.length, 1);
  assert.strictEqual(draft.productKnowledge.relevantDifferentiation.length, 1);
  assert.strictEqual(draft.productKnowledge.proofPoints.length, 1);
  assert.strictEqual(draft.decisionStrategy.idealCustomerProfile.criteria.length, 1);
  assert.strictEqual(draft.decisionStrategy.idealCustomerProfile.examples.length, 1);
  assert.strictEqual(draft.decisionStrategy.idealCustomerProfile.firmographicDisqualifiers.length, 1);
  assert.strictEqual(draft.decisionStrategy.whyNowSignals.length, 1);
  assert.strictEqual(draft.decisionStrategy.redFlags.length, 1);
  assert.deepStrictEqual(validateVendorProfile(draft), []);
});

test("buildRefinementDraft: does not mutate the original input profile", () => {
  const originalProblemStatement = fullResearchDraft.productKnowledge.customerProblems[0].statement;
  const draft = buildRefinementDraft(fullResearchDraft);

  draft.productKnowledge.customerProblems[0].statement = "MUTATED";
  draft.productKnowledge.offering = "MUTATED OFFERING";

  assert.strictEqual(
    fullResearchDraft.productKnowledge.customerProblems[0].statement,
    originalProblemStatement,
  );
  assert.notStrictEqual(fullResearchDraft.productKnowledge.offering, "MUTATED OFFERING");
});

test("buildRefinementDraft: an empty partial still yields a structurally valid optional draft", () => {
  const draft = buildRefinementDraft({}, { id: "v1", websiteUrl: "", vendorName: "New Vendor" });

  assert.strictEqual(draft.productKnowledge.offering, "");
  assert.deepStrictEqual(draft.productKnowledge.customerProblems, []);
  assert.deepStrictEqual(draft.productKnowledge.buyingReasons, []);
  assert.deepStrictEqual(draft.decisionStrategy.whyNowSignals, []);
  assert.deepStrictEqual(draft.decisionStrategy.idealCustomerProfile.firmographicDisqualifiers, []);

  const validation = validateRefinementDraft(draft);
  assert.strictEqual(validation.isValid, true);
  assert.deepStrictEqual(validation.errors, []);
});

test("buildValuePropositionPreview: derives read-only summary without inventing or persisting a valueProposition field", () => {
  const draft = buildRefinementDraft(fullResearchDraft);
  const preview = buildValuePropositionPreview(draft);

  assert.ok(preview.intendedCustomer.some((item) => item.includes("named-account")));
  assert.ok(preview.topProblems.some((item) => item.includes("fragmented")));
  assert.ok(preview.outcomes.length > 0);
  assert.ok(preview.buyingReasons.length > 0);
  assert.ok(preview.capabilitiesAndUseCases.length > 0);
  assert.ok(preview.differentiationAndProof.length > 0);
  assert.equal("valueProposition" in draft, false);
  assert.equal("valueProposition" in draft.productKnowledge, false);
});

test("createBlank* factories: category-prefixed unique IDs for every mapper collection", () => {
  const factories = [
    [createBlankCustomerProblem(), "problem-"],
    [createBlankDesiredOutcome(), "outcome-"],
    [createBlankBuyingReason(), "buying-reason-"],
    [createBlankCapability(), "capability-"],
    [createBlankUseCase(), "use-case-"],
    [createBlankCommonAlternative(), "alternative-"],
    [createBlankRelevantDifferentiation(), "differentiation-"],
    [createBlankProofPoint(), "proof-point-"],
    [createBlankIcpCriterion(), "icp-criterion-"],
    [createBlankIcpExample(), "icp-example-"],
    [createBlankFirmographicDisqualifier(), "firmographic-disqualifier-"],
    [createBlankWhyNowSignal(), "why-now-signal-"],
    [createBlankRedFlag(), "red-flag-"],
  ];

  const ids = new Set();
  for (const [item, prefix] of factories) {
    assert.ok(item.id.startsWith(prefix), `expected ${prefix}, got ${item.id}`);
    assert.equal(ids.has(item.id), false);
    ids.add(item.id);
  }

  const redFlag = createBlankRedFlag();
  assert.strictEqual(redFlag.severity, "cautionary");
  assert.deepStrictEqual(redFlag.affectedDecisionGroups, []);

  const second = createBlankCustomerProblem();
  assert.notStrictEqual(factories[0][0].id, second.id);
});

test("editing preserves item IDs; adding creates a new unique ID", () => {
  const draft = buildRefinementDraft(fullResearchDraft);
  const originalId = draft.productKnowledge.customerProblems[0].id;

  draft.productKnowledge.customerProblems[0].statement = "Edited statement";
  assert.strictEqual(draft.productKnowledge.customerProblems[0].id, originalId);

  const added = createBlankCustomerProblem();
  added.statement = "New problem";
  draft.productKnowledge.customerProblems.push(added);

  assert.notStrictEqual(added.id, originalId);
  assert.ok(added.id.startsWith("problem-"));
  assert.strictEqual(draft.productKnowledge.customerProblems.length, 2);
});

test("removeCustomerProblem: strips dangling references and preserves unrelated data", () => {
  const draft = buildRefinementDraft(fullResearchDraft);
  const problemId = "problem-unstructured-prioritization";
  const next = removeCustomerProblem(draft, problemId);

  assert.deepStrictEqual(next.productKnowledge.customerProblems, []);
  assert.deepStrictEqual(next.productKnowledge.desiredOutcomes[0].problemIds, []);
  assert.deepStrictEqual(next.productKnowledge.capabilities[0].problemIds, []);
  assert.deepStrictEqual(next.productKnowledge.useCases[0].problemIds, []);
  assert.deepStrictEqual(next.productKnowledge.relevantDifferentiation[0].problemIds, []);
  assert.deepStrictEqual(next.decisionStrategy.whyNowSignals[0].problemIds, []);

  // Unrelated collections and sibling fields survive.
  assert.strictEqual(next.productKnowledge.offering, draft.productKnowledge.offering);
  assert.strictEqual(next.productKnowledge.capabilities[0].id, "capability-evidence-evaluation");
  assert.deepStrictEqual(next.productKnowledge.capabilities[0].outcomeIds, ["outcome-focus-ae-time"]);
  assert.strictEqual(next.decisionStrategy.redFlags[0].severity, "disqualifying");
  assert.deepStrictEqual(next.decisionStrategy.redFlags[0].affectedDecisionGroups, ["whyThem"]);

  // Original draft untouched.
  assert.strictEqual(draft.productKnowledge.customerProblems.length, 1);
  assert.deepStrictEqual(validateVendorProfile(next), []);
});

test("removeDesiredOutcome / removeCapability / removeUseCase / removeCommonAlternative / removeIcpCriterion clean dependents", () => {
  let draft = buildRefinementDraft(fullResearchDraft);

  draft = removeDesiredOutcome(draft, "outcome-focus-ae-time");
  assert.deepStrictEqual(draft.productKnowledge.desiredOutcomes, []);
  assert.deepStrictEqual(draft.productKnowledge.buyingReasons[0].outcomeIds, []);
  assert.deepStrictEqual(draft.productKnowledge.proofPoints[0].outcomeIds, []);

  draft = removeCapability(draft, "capability-evidence-evaluation");
  assert.deepStrictEqual(draft.productKnowledge.capabilities, []);
  assert.deepStrictEqual(draft.productKnowledge.useCases[0].capabilityIds, []);

  draft = removeUseCase(draft, "use-case-territory-planning");
  assert.deepStrictEqual(draft.productKnowledge.useCases, []);
  assert.deepStrictEqual(draft.productKnowledge.proofPoints[0].useCaseIds, []);

  draft = removeCommonAlternative(draft, "alternative-spreadsheets");
  assert.deepStrictEqual(draft.productKnowledge.commonAlternatives, []);
  assert.deepStrictEqual(draft.productKnowledge.relevantDifferentiation[0].alternativeIds, []);

  draft = removeIcpCriterion(draft, "icp-criterion-named-account-motion");
  assert.deepStrictEqual(draft.decisionStrategy.idealCustomerProfile.criteria, []);
  assert.deepStrictEqual(draft.decisionStrategy.idealCustomerProfile.examples[0].criterionIds, []);

  assert.deepStrictEqual(validateVendorProfile(draft), []);
});

test("red-flag severity and affectedDecisionGroups are preserved through draft build and edit", () => {
  const draft = buildRefinementDraft(fullResearchDraft);
  assert.strictEqual(draft.decisionStrategy.redFlags[0].severity, "disqualifying");
  assert.deepStrictEqual(draft.decisionStrategy.redFlags[0].affectedDecisionGroups, ["whyThem"]);

  draft.decisionStrategy.redFlags[0].severity = "cautionary";
  draft.decisionStrategy.redFlags[0].affectedDecisionGroups = ["whyThem", "whyUs"];

  const result = validateRefinementDraft(draft);
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.profile.decisionStrategy.redFlags[0].severity, "cautionary");
  assert.deepStrictEqual(result.profile.decisionStrategy.redFlags[0].affectedDecisionGroups, [
    "whyThem",
    "whyUs",
  ]);
});

test("validateRefinementDraft: approved full draft passes validateVendorProfile", () => {
  const draft = buildRefinementDraft(fullResearchDraft);
  const result = validateRefinementDraft(draft);

  assert.strictEqual(result.isValid, true);
  assert.deepStrictEqual(result.errors, []);
  assert.deepStrictEqual(result.userFacingErrors, []);
  assert.deepStrictEqual(validateVendorProfile(result.profile), []);
});

test("validateRefinementDraft: invalid references block approval with user-facing errors", () => {
  const draft = buildRefinementDraft(fullResearchDraft);
  draft.productKnowledge.desiredOutcomes[0].problemIds = ["problem-does-not-exist"];

  const result = validateRefinementDraft(draft);
  assert.strictEqual(result.isValid, false);
  assert.ok(result.errors.some((error) => error.includes("problem-does-not-exist")));
  assert.ok(result.userFacingErrors.some((error) => error.includes("no longer exists")));
});

test("validateRefinementDraft: duplicate IDs block approval", () => {
  const draft = buildRefinementDraft(fullResearchDraft);
  draft.productKnowledge.capabilities.push({
    ...draft.productKnowledge.capabilities[0],
    id: draft.productKnowledge.customerProblems[0].id,
    name: "Colliding capability",
  });

  const result = validateRefinementDraft(draft);
  assert.strictEqual(result.isValid, false);
  assert.ok(result.errors.some((error) => error.includes("Duplicate Vendor Item ID")));
  assert.ok(result.userFacingErrors.some((error) => error.includes("share the same internal id")));
});

test("toggleReferenceId: selects and deselects without free-text inference", () => {
  assert.deepStrictEqual(toggleReferenceId([], "problem-1", true), ["problem-1"]);
  assert.deepStrictEqual(toggleReferenceId(["problem-1"], "problem-1", true), ["problem-1"]);
  assert.deepStrictEqual(toggleReferenceId(["problem-1", "problem-2"], "problem-1", false), [
    "problem-2",
  ]);
});

test("parseIdList / formatIdList: remain available for compatibility", () => {
  assert.deepStrictEqual(parseIdList("problem-1, problem-2"), ["problem-1", "problem-2"]);
  assert.strictEqual(formatIdList(["problem-1", "problem-2"]), "problem-1, problem-2");
});

test("manual enrichment flow: add linked items and approve", () => {
  const draft = buildRefinementDraft({});
  draft.vendorName = "Manual Vendor";
  draft.websiteUrl = "https://manual.example";

  const problem = createBlankCustomerProblem();
  problem.statement = "Manual problem";
  problem.impact = "Impact";
  draft.productKnowledge.customerProblems.push(problem);

  const outcome = createBlankDesiredOutcome();
  outcome.statement = "Manual outcome";
  outcome.problemIds = [problem.id];
  draft.productKnowledge.desiredOutcomes.push(outcome);

  const reason = createBlankBuyingReason();
  reason.statement = "Manual buying reason";
  reason.outcomeIds = [outcome.id];
  draft.productKnowledge.buyingReasons.push(reason);

  const result = validateRefinementDraft(draft);
  assert.strictEqual(result.isValid, true);
  assert.deepStrictEqual(validateVendorProfile(result.profile), []);
});

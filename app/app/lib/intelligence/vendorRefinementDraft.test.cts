/* eslint-disable @typescript-eslint/no-require-imports -- .cts test files must use CommonJS require(). */
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildRefinementDraft,
  buildValuePropositionPreview,
  buildRefinementSectionSummaries,
  findFirstSectionWithValidationErrors,
  listMapperDrivingCollectionPresence,
  primaryEditableFieldForCollection,
  REFINEMENT_COLLECTION_EDITABLE_FIELDS,
  toggleExpandedItemId,
  toggleOpenSection,
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

test("section summaries: derived from live collection counts without raw IDs", () => {
  const draft = buildRefinementDraft(fullResearchDraft);
  const summaries = buildRefinementSectionSummaries(draft);

  assert.match(summaries.whyThem, /1 Problem/);
  assert.match(summaries.whyThem, /1 Outcome/);
  assert.match(summaries.whyThem, /1 Buying reason/);
  assert.match(summaries.whyNow, /1 Signal/);
  assert.match(summaries.whyUs, /1 Capability/);
  assert.match(summaries.whyUs, /1 Use case/);
  assert.match(summaries.disqualifiers, /1 Disqualifier/);
  assert.match(summaries.disqualifiers, /1 Red flag/);

  const joined = Object.values(summaries).join(" ");
  assert.doesNotMatch(joined, /problem-unstructured/);
  assert.doesNotMatch(joined, /capability-evidence/);
  assert.doesNotMatch(joined, /red-flag-no-named/);
});

test("section summaries and mapper presence: empty draft still represents every collection", () => {
  const draft = buildRefinementDraft({});
  const presence = listMapperDrivingCollectionPresence(draft);
  assert.deepStrictEqual(presence.sort(), [
    "buyingReasons",
    "capabilities",
    "commonAlternatives",
    "customerProblems",
    "desiredOutcomes",
    "firmographicDisqualifiers",
    "icpCriteria",
    "icpExamples",
    "offering",
    "proofPoints",
    "redFlags",
    "relevantDifferentiation",
    "useCases",
    "whyNowSignals",
  ]);

  const summaries = buildRefinementSectionSummaries(draft);
  assert.match(summaries.whyThem, /0 Problems/);
  assert.match(summaries.whyNow, /0 Signals/);
});

test("findFirstSectionWithValidationErrors: maps broken refs to owning section", () => {
  assert.strictEqual(
    findFirstSectionWithValidationErrors([
      'Desired outcome "outcome-1" references unknown problem "missing".',
    ]),
    "whyThem",
  );
  assert.strictEqual(
    findFirstSectionWithValidationErrors([
      'Capability "capability-1" references unknown outcome "missing".',
    ]),
    "whyUs",
  );
  assert.strictEqual(findFirstSectionWithValidationErrors([]), null);
});

test("collapsing/section helpers do not mutate draft data", () => {
  const draft = buildRefinementDraft(fullResearchDraft);
  const before = structuredClone(draft);
  buildRefinementSectionSummaries(draft);
  findFirstSectionWithValidationErrors(["something"]);
  listMapperDrivingCollectionPresence(draft);
  toggleOpenSection("offering", "whyThem");
  toggleExpandedItemId("problem-1", "problem-2");
  assert.deepStrictEqual(draft, before);
});

test("toggleOpenSection: Collapse on open section closes it", () => {
  assert.strictEqual(toggleOpenSection("whyThem", "whyThem"), null);
  assert.strictEqual(toggleOpenSection(null, "whyThem"), "whyThem");
  assert.strictEqual(toggleOpenSection("offering", "whyThem"), "whyThem");
});

test("toggleExpandedItemId: Done/collapse clears only that item", () => {
  assert.strictEqual(toggleExpandedItemId("problem-1", "problem-1"), null);
  assert.strictEqual(toggleExpandedItemId(null, "problem-1"), "problem-1");
  assert.strictEqual(toggleExpandedItemId("problem-1", "problem-2"), "problem-2");
  assert.strictEqual(toggleExpandedItemId(undefined, "problem-1"), "problem-1");
});

test("REFINEMENT_COLLECTION_EDITABLE_FIELDS: every collection lists a primary field first", () => {
  const expectedCollections = [
    "offeringIdentity",
    "customerProblems",
    "desiredOutcomes",
    "buyingReasons",
    "icpCriteria",
    "icpExamples",
    "whyNowSignals",
    "capabilities",
    "useCases",
    "commonAlternatives",
    "relevantDifferentiation",
    "proofPoints",
    "firmographicDisqualifiers",
    "redFlags",
  ];
  assert.deepStrictEqual(
    Object.keys(REFINEMENT_COLLECTION_EDITABLE_FIELDS).sort(),
    [...expectedCollections].sort(),
  );

  for (const collection of expectedCollections) {
    const fields = REFINEMENT_COLLECTION_EDITABLE_FIELDS[collection];
    assert.ok(fields.length >= 1, `${collection} must expose editable fields`);
    assert.strictEqual(primaryEditableFieldForCollection(collection), fields[0]);
    assert.ok(!fields.includes("id"), `${collection} must not expose id as editable`);
  }

  assert.strictEqual(primaryEditableFieldForCollection("customerProblems"), "statement");
  assert.strictEqual(primaryEditableFieldForCollection("capabilities"), "name");
  assert.strictEqual(primaryEditableFieldForCollection("whyNowSignals"), "signal");
  assert.strictEqual(primaryEditableFieldForCollection("proofPoints"), "summary");
  assert.strictEqual(primaryEditableFieldForCollection("icpCriteria"), "description");
  assert.strictEqual(primaryEditableFieldForCollection("firmographicDisqualifiers"), "condition");
});

test("editing primary field preserves item id and relationships", () => {
  const draft = buildRefinementDraft(fullResearchDraft);
  const problem = draft.productKnowledge.customerProblems[0];
  const outcome = draft.productKnowledge.desiredOutcomes[0];
  assert.ok(problem);
  assert.ok(outcome);

  const problemId = problem.id;
  const nextProblems = draft.productKnowledge.customerProblems.map((item) =>
    item.id === problemId ? { ...item, statement: "Edited primary problem text" } : item,
  );
  const editedProblem = nextProblems.find((item) => item.id === problemId);
  assert.ok(editedProblem);
  assert.strictEqual(editedProblem.id, problemId);
  assert.strictEqual(editedProblem.impact, problem.impact);
  assert.strictEqual(editedProblem.statement, "Edited primary problem text");

  const outcomeId = outcome.id;
  const originalProblemIds = [...outcome.problemIds];
  const nextOutcomes = draft.productKnowledge.desiredOutcomes.map((item) =>
    item.id === outcomeId ? { ...item, statement: "Edited outcome primary" } : item,
  );
  const editedOutcome = nextOutcomes.find((item) => item.id === outcomeId);
  assert.ok(editedOutcome);
  assert.strictEqual(editedOutcome.id, outcomeId);
  assert.deepStrictEqual(editedOutcome.problemIds, originalProblemIds);

  const capability = draft.productKnowledge.capabilities[0];
  assert.ok(capability);
  const capabilityId = capability.id;
  const originalCapabilityProblemIds = [...capability.problemIds];
  const originalCapabilityOutcomeIds = [...capability.outcomeIds];
  const editedCapability = {
    ...capability,
    name: "Edited capability name",
  };
  assert.strictEqual(editedCapability.id, capabilityId);
  assert.deepStrictEqual(editedCapability.problemIds, originalCapabilityProblemIds);
  assert.deepStrictEqual(editedCapability.outcomeIds, originalCapabilityOutcomeIds);
});

test("blank and existing items share the same editable-field definition", () => {
  const blankProblem = createBlankCustomerProblem();
  const blankCapability = createBlankCapability();
  const blankSignal = createBlankWhyNowSignal();

  assert.deepStrictEqual(
    Object.keys(blankProblem).filter((key) => key !== "id").sort(),
    [...REFINEMENT_COLLECTION_EDITABLE_FIELDS.customerProblems].sort(),
  );
  assert.deepStrictEqual(
    Object.keys(blankCapability).filter((key) => key !== "id").sort(),
    [...REFINEMENT_COLLECTION_EDITABLE_FIELDS.capabilities].sort(),
  );
  assert.deepStrictEqual(
    Object.keys(blankSignal).filter((key) => key !== "id").sort(),
    [...REFINEMENT_COLLECTION_EDITABLE_FIELDS.whyNowSignals].sort(),
  );

  const draft = buildRefinementDraft(fullResearchDraft);
  const existingProblem = draft.productKnowledge.customerProblems[0];
  assert.ok(existingProblem);
  for (const field of REFINEMENT_COLLECTION_EDITABLE_FIELDS.customerProblems) {
    assert.ok(field in existingProblem);
    assert.ok(field in blankProblem);
  }
});

test("offering description edits update the canonical draft field and survive section toggles", () => {
  const draft = buildRefinementDraft(fullResearchDraft);
  assert.ok(draft.productKnowledge.offering.length > 0);

  const editedOffering = "Edited short product description for the draft";
  const next = {
    ...draft,
    vendorName: "Edited Vendor Name",
    websiteUrl: "https://edited.example",
    productKnowledge: {
      ...draft.productKnowledge,
      offering: editedOffering,
    },
  };

  assert.strictEqual(next.productKnowledge.offering, editedOffering);
  assert.strictEqual(next.vendorName, "Edited Vendor Name");
  assert.strictEqual(next.websiteUrl, "https://edited.example");

  // Collapsing/reopening and switching accordion sections only change UI state —
  // they must not rewrite draft offering fields.
  const openAfterCollapse = toggleOpenSection("offering", "offering");
  assert.strictEqual(openAfterCollapse, null);
  const openWhyThem = toggleOpenSection(openAfterCollapse, "whyThem");
  assert.strictEqual(openWhyThem, "whyThem");
  const reopenOffering = toggleOpenSection(openWhyThem, "offering");
  assert.strictEqual(reopenOffering, "offering");

  assert.strictEqual(next.productKnowledge.offering, editedOffering);
  assert.strictEqual(next.vendorName, "Edited Vendor Name");
  assert.strictEqual(next.websiteUrl, "https://edited.example");

  const validation = validateRefinementDraft(next);
  assert.strictEqual(validation.isValid, true);
  assert.strictEqual(validation.profile.productKnowledge.offering, editedOffering);
});

test("refinement UI documents automatic draft updates for Offering fields", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(
    path.join(__dirname, "../../components/vendor-refinement-mode.tsx"),
    "utf8",
  );
  assert.match(source, /Offering \(short product description\)/);
  assert.match(source, /productKnowledge:\s*\{\s*\.\.\.draft\.productKnowledge,\s*offering:\s*value/);
  assert.match(source, /Changes are saved automatically in this draft\./);
  assert.match(source, /markDirty\(\{\s*\.\.\.draft,\s*vendorName:\s*value\s*\}\)/);
  assert.match(source, /markDirty\(\{\s*\.\.\.draft,\s*websiteUrl:\s*value\s*\}\)/);
});

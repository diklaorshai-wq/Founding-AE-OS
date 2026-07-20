/**
 * Pure, DOM-free state and validation logic for the Vendor Onboarding
 * "Refinement Mode" UI (Checkpoint B). Kept separate from the React component
 * so it can be exercised by a plain Node test (`.test.cts`) without a DOM.
 *
 * Isolation boundaries:
 * - Does not import or modify `recommendationEngine.ts` / matching services.
 * - Does not modify `VendorProfile` types — reuses the canonical contract.
 * - Final approval validation reuses `validateVendorProfile` unchanged.
 */
import type {
  BuyingReason,
  Capability,
  CommonAlternative,
  CustomerProblem,
  DesiredOutcome,
  FirmographicDisqualifier,
  IdealCustomerCriterion,
  IdealCustomerExample,
  IdealCustomerRelationship,
  ProofPoint,
  RedFlag,
  RedFlagSeverity,
  RelevantDifferentiation,
  UseCase,
  VendorProfile,
  WhyNowSignal,
} from "./vendorProfile";
import { createEmptyVendorProfile } from "./vendorOnboarding.ts";
import { validateVendorProfile } from "./vendorProfileValidation.ts";

export interface VendorIdentityDraft {
  id: string;
  websiteUrl: string;
  vendorName: string;
}

/**
 * Builds the full editable draft `VendorProfile` the Refinement Mode UI starts
 * from. Deep-clones so the caller's input object is never mutated.
 */
export function buildRefinementDraft(
  partialProfile: Partial<VendorProfile>,
  identity?: Partial<VendorIdentityDraft>,
): VendorProfile {
  const empty = createEmptyVendorProfile(
    identity?.id ?? partialProfile.id ?? "",
    identity?.vendorName ?? partialProfile.vendorName ?? "",
  );

  const draft: VendorProfile = {
    ...empty,
    id: identity?.id ?? partialProfile.id ?? empty.id,
    websiteUrl: identity?.websiteUrl ?? partialProfile.websiteUrl ?? empty.websiteUrl,
    vendorName: identity?.vendorName ?? partialProfile.vendorName ?? empty.vendorName,
    productKnowledge: {
      ...empty.productKnowledge,
      ...partialProfile.productKnowledge,
      customerProblems: [...(partialProfile.productKnowledge?.customerProblems ?? empty.productKnowledge.customerProblems)],
      desiredOutcomes: [...(partialProfile.productKnowledge?.desiredOutcomes ?? empty.productKnowledge.desiredOutcomes)],
      buyingReasons: [...(partialProfile.productKnowledge?.buyingReasons ?? empty.productKnowledge.buyingReasons)],
      capabilities: [...(partialProfile.productKnowledge?.capabilities ?? empty.productKnowledge.capabilities)],
      useCases: [...(partialProfile.productKnowledge?.useCases ?? empty.productKnowledge.useCases)],
      commonAlternatives: [
        ...(partialProfile.productKnowledge?.commonAlternatives ?? empty.productKnowledge.commonAlternatives),
      ],
      relevantDifferentiation: [
        ...(partialProfile.productKnowledge?.relevantDifferentiation ??
          empty.productKnowledge.relevantDifferentiation),
      ],
      proofPoints: [...(partialProfile.productKnowledge?.proofPoints ?? empty.productKnowledge.proofPoints)],
    },
    decisionStrategy: {
      ...empty.decisionStrategy,
      ...partialProfile.decisionStrategy,
      idealCustomerProfile: {
        criteria: [
          ...(partialProfile.decisionStrategy?.idealCustomerProfile?.criteria ??
            empty.decisionStrategy.idealCustomerProfile.criteria),
        ],
        examples: [
          ...(partialProfile.decisionStrategy?.idealCustomerProfile?.examples ??
            empty.decisionStrategy.idealCustomerProfile.examples),
        ],
        firmographicDisqualifiers: [
          ...(partialProfile.decisionStrategy?.idealCustomerProfile?.firmographicDisqualifiers ??
            empty.decisionStrategy.idealCustomerProfile.firmographicDisqualifiers),
        ],
      },
      targetPersonas: [
        ...(partialProfile.decisionStrategy?.targetPersonas ?? empty.decisionStrategy.targetPersonas),
      ],
      budgetOwners: [
        ...(partialProfile.decisionStrategy?.budgetOwners ?? empty.decisionStrategy.budgetOwners),
      ],
      whyNowSignals: [
        ...(partialProfile.decisionStrategy?.whyNowSignals ?? empty.decisionStrategy.whyNowSignals),
      ],
      redFlags: [...(partialProfile.decisionStrategy?.redFlags ?? empty.decisionStrategy.redFlags)],
    },
  };

  // Deep-clone nested reference arrays so later edits never touch the input.
  return structuredClone(draft);
}

export interface RefinementValidationResult {
  isValid: boolean;
  errors: string[];
  /** User-facing wording of the same errors (never invents new validation rules). */
  userFacingErrors: string[];
  profile: VendorProfile;
}

/** Rewrites technical validation strings into plain language for the UI. */
export function toUserFacingValidationErrors(errors: string[]): string[] {
  return errors.map((error) => {
    if (error.startsWith("Duplicate Vendor Item ID")) {
      return "Two items share the same internal id. Remove the duplicate item and try again.";
    }
    const refMatch = /^(.*) references unknown (.*) "(.*)"\.$/.exec(error);
    if (refMatch) {
      return `${refMatch[1]} still points to a ${refMatch[2]} that no longer exists. Remove that link or restore the missing item.`;
    }
    return error;
  });
}

/**
 * Re-validates the user-edited draft against `validateVendorProfile` before
 * `onApprove` may be called. Does not persist anything.
 */
export function validateRefinementDraft(draft: VendorProfile): RefinementValidationResult {
  const errors = validateVendorProfile(draft);
  return {
    isValid: errors.length === 0,
    errors,
    userFacingErrors: toUserFacingValidationErrors(errors),
    profile: draft,
  };
}

function shortId(prefix: string): string {
  const unique =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${unique.slice(0, 8)}`;
}

function withoutId(ids: string[], removedId: string): string[] {
  return ids.filter((id) => id !== removedId);
}

/** Factories for blank rows the UI appends. Category-prefixed, globally unique ids. */
export function createBlankCustomerProblem(): CustomerProblem {
  return { id: shortId("problem"), statement: "", impact: "" };
}

export function createBlankDesiredOutcome(): DesiredOutcome {
  return { id: shortId("outcome"), statement: "", problemIds: [] };
}

export function createBlankBuyingReason(): BuyingReason {
  return { id: shortId("buying-reason"), statement: "", outcomeIds: [] };
}

export function createBlankCapability(): Capability {
  return { id: shortId("capability"), name: "", description: "", problemIds: [], outcomeIds: [] };
}

export function createBlankUseCase(): UseCase {
  return {
    id: shortId("use-case"),
    name: "",
    description: "",
    problemIds: [],
    outcomeIds: [],
    capabilityIds: [],
  };
}

export function createBlankCommonAlternative(): CommonAlternative {
  return { id: shortId("alternative"), name: "", description: "" };
}

export function createBlankRelevantDifferentiation(): RelevantDifferentiation {
  return {
    id: shortId("differentiation"),
    statement: "",
    alternativeIds: [],
    problemIds: [],
    outcomeIds: [],
  };
}

export function createBlankProofPoint(): ProofPoint {
  return {
    id: shortId("proof-point"),
    summary: "",
    outcomeIds: [],
    useCaseIds: [],
  };
}

export function createBlankIcpCriterion(): IdealCustomerCriterion {
  return { id: shortId("icp-criterion"), description: "" };
}

export function createBlankIcpExample(): IdealCustomerExample {
  return {
    id: shortId("icp-example"),
    companyName: "",
    rationale: "",
    criterionIds: [],
    relationship: "example-only" as IdealCustomerRelationship,
  };
}

export function createBlankFirmographicDisqualifier(): FirmographicDisqualifier {
  return { id: shortId("firmographic-disqualifier"), condition: "", whyItMatters: "" };
}

export function createBlankWhyNowSignal(): WhyNowSignal {
  return {
    id: shortId("why-now-signal"),
    signal: "",
    whyItMatters: "",
    problemIds: [],
    outcomeIds: [],
    firstMeetingAngle: "",
  };
}

export function createBlankRedFlag(): RedFlag {
  return {
    id: shortId("red-flag"),
    condition: "",
    whyItMatters: "",
    severity: "cautionary" as RedFlagSeverity,
    affectedDecisionGroups: [],
  };
}

/** Toggle a canonical id in a reference list without free-text parsing. */
export function toggleReferenceId(ids: string[], id: string, selected: boolean): string[] {
  if (selected) {
    return ids.includes(id) ? ids : [...ids, id];
  }
  return withoutId(ids, id);
}

/**
 * Removes a customer problem and strips its id from every dependent reference
 * list. Does not mutate `profile`.
 */
export function removeCustomerProblem(profile: VendorProfile, problemId: string): VendorProfile {
  const next = structuredClone(profile);
  next.productKnowledge.customerProblems = next.productKnowledge.customerProblems.filter(
    (item) => item.id !== problemId,
  );
  next.productKnowledge.desiredOutcomes = next.productKnowledge.desiredOutcomes.map((item) => ({
    ...item,
    problemIds: withoutId(item.problemIds, problemId),
  }));
  next.productKnowledge.capabilities = next.productKnowledge.capabilities.map((item) => ({
    ...item,
    problemIds: withoutId(item.problemIds, problemId),
  }));
  next.productKnowledge.useCases = next.productKnowledge.useCases.map((item) => ({
    ...item,
    problemIds: withoutId(item.problemIds, problemId),
  }));
  next.productKnowledge.relevantDifferentiation = next.productKnowledge.relevantDifferentiation.map(
    (item) => ({
      ...item,
      problemIds: withoutId(item.problemIds, problemId),
    }),
  );
  next.decisionStrategy.whyNowSignals = next.decisionStrategy.whyNowSignals.map((item) => ({
    ...item,
    problemIds: withoutId(item.problemIds, problemId),
  }));
  next.decisionStrategy.targetPersonas = next.decisionStrategy.targetPersonas.map((item) => ({
    ...item,
    problemIds: withoutId(item.problemIds, problemId),
  }));
  return next;
}

export function removeDesiredOutcome(profile: VendorProfile, outcomeId: string): VendorProfile {
  const next = structuredClone(profile);
  next.productKnowledge.desiredOutcomes = next.productKnowledge.desiredOutcomes.filter(
    (item) => item.id !== outcomeId,
  );
  next.productKnowledge.buyingReasons = next.productKnowledge.buyingReasons.map((item) => ({
    ...item,
    outcomeIds: withoutId(item.outcomeIds, outcomeId),
  }));
  next.productKnowledge.capabilities = next.productKnowledge.capabilities.map((item) => ({
    ...item,
    outcomeIds: withoutId(item.outcomeIds, outcomeId),
  }));
  next.productKnowledge.useCases = next.productKnowledge.useCases.map((item) => ({
    ...item,
    outcomeIds: withoutId(item.outcomeIds, outcomeId),
  }));
  next.productKnowledge.relevantDifferentiation = next.productKnowledge.relevantDifferentiation.map(
    (item) => ({
      ...item,
      outcomeIds: withoutId(item.outcomeIds, outcomeId),
    }),
  );
  next.productKnowledge.proofPoints = next.productKnowledge.proofPoints.map((item) => ({
    ...item,
    outcomeIds: withoutId(item.outcomeIds, outcomeId),
  }));
  next.decisionStrategy.whyNowSignals = next.decisionStrategy.whyNowSignals.map((item) => ({
    ...item,
    outcomeIds: withoutId(item.outcomeIds, outcomeId),
  }));
  next.decisionStrategy.targetPersonas = next.decisionStrategy.targetPersonas.map((item) => ({
    ...item,
    outcomeIds: withoutId(item.outcomeIds, outcomeId),
  }));
  return next;
}

export function removeBuyingReason(profile: VendorProfile, reasonId: string): VendorProfile {
  const next = structuredClone(profile);
  next.productKnowledge.buyingReasons = next.productKnowledge.buyingReasons.filter(
    (item) => item.id !== reasonId,
  );
  return next;
}

export function removeCapability(profile: VendorProfile, capabilityId: string): VendorProfile {
  const next = structuredClone(profile);
  next.productKnowledge.capabilities = next.productKnowledge.capabilities.filter(
    (item) => item.id !== capabilityId,
  );
  next.productKnowledge.useCases = next.productKnowledge.useCases.map((item) => ({
    ...item,
    capabilityIds: withoutId(item.capabilityIds, capabilityId),
  }));
  return next;
}

export function removeUseCase(profile: VendorProfile, useCaseId: string): VendorProfile {
  const next = structuredClone(profile);
  next.productKnowledge.useCases = next.productKnowledge.useCases.filter(
    (item) => item.id !== useCaseId,
  );
  next.productKnowledge.proofPoints = next.productKnowledge.proofPoints.map((item) => ({
    ...item,
    useCaseIds: withoutId(item.useCaseIds, useCaseId),
  }));
  return next;
}

export function removeCommonAlternative(profile: VendorProfile, alternativeId: string): VendorProfile {
  const next = structuredClone(profile);
  next.productKnowledge.commonAlternatives = next.productKnowledge.commonAlternatives.filter(
    (item) => item.id !== alternativeId,
  );
  next.productKnowledge.relevantDifferentiation = next.productKnowledge.relevantDifferentiation.map(
    (item) => ({
      ...item,
      alternativeIds: withoutId(item.alternativeIds, alternativeId),
    }),
  );
  return next;
}

export function removeRelevantDifferentiation(
  profile: VendorProfile,
  differentiationId: string,
): VendorProfile {
  const next = structuredClone(profile);
  next.productKnowledge.relevantDifferentiation =
    next.productKnowledge.relevantDifferentiation.filter((item) => item.id !== differentiationId);
  return next;
}

export function removeProofPoint(profile: VendorProfile, proofPointId: string): VendorProfile {
  const next = structuredClone(profile);
  next.productKnowledge.proofPoints = next.productKnowledge.proofPoints.filter(
    (item) => item.id !== proofPointId,
  );
  return next;
}

export function removeIcpCriterion(profile: VendorProfile, criterionId: string): VendorProfile {
  const next = structuredClone(profile);
  next.decisionStrategy.idealCustomerProfile.criteria =
    next.decisionStrategy.idealCustomerProfile.criteria.filter((item) => item.id !== criterionId);
  next.decisionStrategy.idealCustomerProfile.examples =
    next.decisionStrategy.idealCustomerProfile.examples.map((item) => ({
      ...item,
      criterionIds: withoutId(item.criterionIds, criterionId),
    }));
  return next;
}

export function removeIcpExample(profile: VendorProfile, exampleId: string): VendorProfile {
  const next = structuredClone(profile);
  next.decisionStrategy.idealCustomerProfile.examples =
    next.decisionStrategy.idealCustomerProfile.examples.filter((item) => item.id !== exampleId);
  return next;
}

export function removeFirmographicDisqualifier(
  profile: VendorProfile,
  disqualifierId: string,
): VendorProfile {
  const next = structuredClone(profile);
  next.decisionStrategy.idealCustomerProfile.firmographicDisqualifiers =
    next.decisionStrategy.idealCustomerProfile.firmographicDisqualifiers.filter(
      (item) => item.id !== disqualifierId,
    );
  return next;
}

export function removeWhyNowSignal(profile: VendorProfile, signalId: string): VendorProfile {
  const next = structuredClone(profile);
  next.decisionStrategy.whyNowSignals = next.decisionStrategy.whyNowSignals.filter(
    (item) => item.id !== signalId,
  );
  return next;
}

export function removeRedFlag(profile: VendorProfile, redFlagId: string): VendorProfile {
  const next = structuredClone(profile);
  next.decisionStrategy.redFlags = next.decisionStrategy.redFlags.filter(
    (item) => item.id !== redFlagId,
  );
  return next;
}

export interface ValuePropositionPreview {
  intendedCustomer: string[];
  topProblems: string[];
  outcomes: string[];
  buyingReasons: string[];
  capabilitiesAndUseCases: string[];
  differentiationAndProof: string[];
}

/**
 * Read-only Value Proposition summary derived only from existing structured
 * fields. Never invents content and never persists a new field.
 */
export function buildValuePropositionPreview(profile: VendorProfile): ValuePropositionPreview {
  const knowledge = profile.productKnowledge;
  const icp = profile.decisionStrategy.idealCustomerProfile;

  return {
    intendedCustomer: [
      ...icp.criteria.map((item) => item.description).filter((text) => text.trim().length > 0),
      ...icp.examples
        .map((item) => item.companyName.trim())
        .filter((text) => text.length > 0)
        .map((name) => `Example: ${name}`),
    ],
    topProblems: knowledge.customerProblems
      .map((item) => item.statement)
      .filter((text) => text.trim().length > 0),
    outcomes: knowledge.desiredOutcomes
      .map((item) => item.statement)
      .filter((text) => text.trim().length > 0),
    buyingReasons: knowledge.buyingReasons
      .map((item) => item.statement)
      .filter((text) => text.trim().length > 0),
    capabilitiesAndUseCases: [
      ...knowledge.capabilities
        .map((item) => item.name || item.description)
        .filter((text) => text.trim().length > 0),
      ...knowledge.useCases
        .map((item) => item.name || item.description)
        .filter((text) => text.trim().length > 0),
    ],
    differentiationAndProof: [
      ...knowledge.relevantDifferentiation
        .map((item) => item.statement)
        .filter((text) => text.trim().length > 0),
      ...knowledge.proofPoints
        .map((item) => item.summary)
        .filter((text) => text.trim().length > 0),
    ],
  };
}

/** @deprecated Prefer checkbox-based reference editing in the UI. Kept for tests. */
export function parseIdList(rawValue: string): string[] {
  return rawValue
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

/** @deprecated Prefer checkbox-based reference editing in the UI. Kept for tests. */
export function formatIdList(ids: string[]): string {
  return ids.join(", ");
}

/** Labels used by reference pickers — never exposes raw ids as the primary label. */
export function labelForProblem(item: CustomerProblem): string {
  return item.statement.trim() || "(Untitled problem)";
}

export function labelForOutcome(item: DesiredOutcome): string {
  return item.statement.trim() || "(Untitled outcome)";
}

export function labelForCapability(item: Capability): string {
  return item.name.trim() || item.description.trim() || "(Untitled capability)";
}

export function labelForUseCase(item: UseCase): string {
  return item.name.trim() || item.description.trim() || "(Untitled use case)";
}

export function labelForAlternative(item: CommonAlternative): string {
  return item.name.trim() || item.description.trim() || "(Untitled alternative)";
}

export function labelForCriterion(item: IdealCustomerCriterion): string {
  return item.description.trim() || "(Untitled criterion)";
}

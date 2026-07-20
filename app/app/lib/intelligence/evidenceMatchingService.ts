/**
 * The deterministic V1 evidence mapper (Contract Alignment → Mapping
 * Implementation phase). Turns a canonical `CompanyProfile`'s structured
 * evidence findings into the exact `CompanyEvaluationInput` shape the
 * stabilized `recommendationEngine.ts` expects — using only structural
 * lookups against the `VendorProfile` (ids, collection membership, red flag
 * severity/affectedDecisionGroups). It never parses free text and never
 * infers `decisionImpact` or severity itself; those are supplied upstream
 * by the research model under its own constrained schema.
 *
 * Pure, synchronous, and side-effect free:
 * - No network, AI provider, environment variable, or `async` anywhere in
 *   this file.
 * - Never mutates `companyProfile` or `vendorProfile`.
 * - Two calls with the same inputs always produce the same output.
 * - Never throws: `validateVendorProfile` is called defensively, and any
 *   error it reports (or any exception it itself raises on malformed
 *   runtime data) degrades to a clean, all-"unknown" fallback rather than
 *   propagating.
 *
 * Fully isolated:
 * - Does not import, modify, or replace `matchingService.ts` (the existing
 *   AI-based semantic matcher) — both paths coexist. This is a NEW,
 *   additional path, not a migration.
 * - Does not modify `recommendationEngine.ts`, `companyResearchService.ts`,
 *   or any canonical type in `types/companyProfile.ts` / `vendorProfile.ts`.
 * - Not wired into any API route or script; callers must opt in explicitly.
 * - Introduces no numeric scoring.
 */
import { validateVendorProfile } from "./vendorProfileValidation.ts";
import type { CompanyEvaluationInput, EvaluationGate, GateStatus } from "./recommendationEngine";
import type { CompanyEvidenceFinding, CompanyProfile } from "./types/companyProfile";
import type { EntityId, RedFlag, RedFlagDecisionGroup, VendorProfile } from "./vendorProfile";

type DecisionGroup = "whyThem" | "whyNow" | "whyUs";

/**
 * Which structural Vendor Profile collection an item id belongs to. Built
 * once per call from `VendorProfile` ids alone — never from descriptions or
 * any other free text.
 */
type VendorItemCollection =
  | "customerProblems"
  | "desiredOutcomes"
  | "buyingReasons"
  | "icpCriteria"
  | "icpExamples"
  | "firmographicDisqualifier"
  | "redFlag"
  | "whyNowSignals"
  | "capabilities"
  | "useCases"
  | "proofPoints"
  | "relevantDifferentiation"
  | "commonAlternatives";

interface VendorItemLookupEntry {
  collection: VendorItemCollection;
  /** Present only when `collection` is "redFlag"; carries `severity` and `affectedDecisionGroups` for status resolution. */
  redFlag?: RedFlag;
}

/** Every collection each decision group may draw evidence from — supportive/contextual and negative alike. */
const ALLOWED_COLLECTIONS: Record<DecisionGroup, ReadonlySet<VendorItemCollection>> = {
  whyThem: new Set<VendorItemCollection>([
    "customerProblems",
    "desiredOutcomes",
    "buyingReasons",
    "icpCriteria",
    "icpExamples",
    "firmographicDisqualifier",
    "redFlag",
  ]),
  whyNow: new Set<VendorItemCollection>(["whyNowSignals"]),
  whyUs: new Set<VendorItemCollection>([
    "capabilities",
    "useCases",
    "proofPoints",
    "relevantDifferentiation",
    "commonAlternatives",
    "redFlag",
  ]),
};

const MASTER_GATE_META: Record<DecisionGroup, { id: string; name: string }> = {
  whyThem: { id: "why-them", name: "Why Them" },
  whyNow: { id: "why-now", name: "Why Now" },
  whyUs: { id: "why-us", name: "Why Us" },
};

/** Builds a pure, local id -> collection-membership lookup from `VendorProfile` ids alone. */
function buildVendorItemLookup(vendor: VendorProfile): Map<EntityId, VendorItemLookupEntry> {
  const lookup = new Map<EntityId, VendorItemLookupEntry>();
  const add = (items: Array<{ id: EntityId }>, collection: VendorItemCollection) => {
    for (const item of items) {
      lookup.set(item.id, { collection });
    }
  };

  add(vendor.productKnowledge.customerProblems, "customerProblems");
  add(vendor.productKnowledge.desiredOutcomes, "desiredOutcomes");
  add(vendor.productKnowledge.buyingReasons, "buyingReasons");
  add(vendor.productKnowledge.capabilities, "capabilities");
  add(vendor.productKnowledge.useCases, "useCases");
  add(vendor.productKnowledge.proofPoints, "proofPoints");
  add(vendor.productKnowledge.relevantDifferentiation, "relevantDifferentiation");
  add(vendor.productKnowledge.commonAlternatives, "commonAlternatives");
  add(vendor.decisionStrategy.idealCustomerProfile.criteria, "icpCriteria");
  add(vendor.decisionStrategy.idealCustomerProfile.examples, "icpExamples");
  add(vendor.decisionStrategy.idealCustomerProfile.firmographicDisqualifiers, "firmographicDisqualifier");
  add(vendor.decisionStrategy.whyNowSignals, "whyNowSignals");

  for (const redFlag of vendor.decisionStrategy.redFlags) {
    lookup.set(redFlag.id, { collection: "redFlag", redFlag });
  }

  return lookup;
}

/**
 * A finding is applicable to a group only when its id is known, its
 * collection is allowed for that group, and — for a Red Flag specifically —
 * the flag's own `affectedDecisionGroups` includes that group. Every other
 * finding is ignored completely for this group: it affects neither status
 * nor evidence.
 */
function isFindingApplicableToGroup(
  finding: CompanyEvidenceFinding,
  group: DecisionGroup,
  lookup: Map<EntityId, VendorItemLookupEntry>,
): boolean {
  const entry = lookup.get(finding.connectedVendorItemId);
  if (!entry) {
    return false;
  }
  if (!ALLOWED_COLLECTIONS[group].has(entry.collection)) {
    return false;
  }
  if (entry.collection === "redFlag") {
    // ALLOWED_COLLECTIONS only ever includes "redFlag" for "whyThem" and
    // "whyUs" (never "whyNow"), so `group` is structurally guaranteed to be
    // a RedFlagDecisionGroup whenever this branch runs.
    return entry.redFlag!.affectedDecisionGroups.includes(group as RedFlagDecisionGroup);
  }
  return true;
}

/**
 * Whether an (already-applicable) finding's linked Vendor item is a hard
 * disqualifier for this group: any Firmographic Disqualifier (which only
 * ever applies to Why Them), or a Red Flag whose `severity` is
 * "disqualifying". A "cautionary" Red Flag is never a hard disqualifier —
 * its effect is governed only by `decisionImpact`, like any other finding.
 */
function isHardDisqualifierEntry(entry: VendorItemLookupEntry, group: DecisionGroup): boolean {
  if (entry.collection === "firmographicDisqualifier") {
    return group === "whyThem";
  }
  if (entry.collection === "redFlag" && entry.redFlag) {
    return entry.redFlag.severity === "disqualifying";
  }
  return false;
}

interface GroupClassification {
  /** Every finding applicable to this group, in original input order. */
  applicableFindings: CompanyEvidenceFinding[];
  hasHardDisqualifier: boolean;
  hasSupportive: boolean;
  hasContradictory: boolean;
}

function classifyFindingsForGroup(
  findings: CompanyEvidenceFinding[],
  group: DecisionGroup,
  lookup: Map<EntityId, VendorItemLookupEntry>,
): GroupClassification {
  const classification: GroupClassification = {
    applicableFindings: [],
    hasHardDisqualifier: false,
    hasSupportive: false,
    hasContradictory: false,
  };

  for (const finding of findings) {
    if (!isFindingApplicableToGroup(finding, group, lookup)) {
      continue;
    }
    classification.applicableFindings.push(finding);

    const entry = lookup.get(finding.connectedVendorItemId)!;
    if (isHardDisqualifierEntry(entry, group)) {
      classification.hasHardDisqualifier = true;
    }
    if (finding.decisionImpact === "supportive") {
      classification.hasSupportive = true;
    } else if (finding.decisionImpact === "contradictory") {
      classification.hasContradictory = true;
    }
    // "neutral" findings never influence status.
  }

  return classification;
}

/**
 * V1 status precedence (Contract Alignment): for Why Them / Why Us,
 * (1) an applicable hard disqualifier always wins with "fail"; (2)
 * supportive-and-contradictory both present is an unresolved contradiction,
 * "unknown"; (3) supportive alone is "pass"; (4) anything else (including no
 * applicable evidence at all) is "unknown". Why Now never has a hard
 * disqualifier collection and can only ever resolve to "pass" or "unknown" —
 * it never emits "fail".
 */
function resolveGateStatus(
  classification: GroupClassification,
  group: DecisionGroup,
): { status: GateStatus; significant?: true } {
  if (group !== "whyNow" && classification.hasHardDisqualifier) {
    return { status: "fail", significant: true };
  }

  if (group === "whyNow") {
    if (classification.hasSupportive && !classification.hasContradictory) {
      return { status: "pass" };
    }
    return { status: "unknown" };
  }

  if (classification.hasSupportive && classification.hasContradictory) {
    return { status: "unknown" };
  }
  if (classification.hasSupportive) {
    return { status: "pass" };
  }
  return { status: "unknown" };
}

/** Removes exact-duplicate claim strings, keeping each claim's first occurrence and preserving original relative order. */
function dedupeClaimsPreservingOrder(claims: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const claim of claims) {
    if (!seen.has(claim)) {
      seen.add(claim);
      deduped.push(claim);
    }
  }
  return deduped;
}

/**
 * Builds the single master `EvaluationGate` for one decision group: status
 * is calculated from the full set of applicable findings first, then
 * evidence is derived from the same set (original `claim` strings, original
 * order) with only exact-duplicate strings removed afterward.
 */
function buildMasterGate(
  group: DecisionGroup,
  findings: CompanyEvidenceFinding[],
  lookup: Map<EntityId, VendorItemLookupEntry>,
): EvaluationGate {
  const { id, name } = MASTER_GATE_META[group];
  const classification = classifyFindingsForGroup(findings, group, lookup);
  const { status, significant } = resolveGateStatus(classification, group);
  const evidence = dedupeClaimsPreservingOrder(classification.applicableFindings.map((finding) => finding.claim));

  const gate: EvaluationGate = { id, name, status, evidence };
  if (significant) {
    gate.significant = true;
  }
  return gate;
}

function buildUnknownFallbackGate(group: DecisionGroup): EvaluationGate {
  const { id, name } = MASTER_GATE_META[group];
  return { id, name, status: "unknown", evidence: [] };
}

/** Reads a company's display name defensively: never throws even if `companyProfile` is malformed at runtime. */
function safeCompanyName(companyProfile: CompanyProfile): string {
  return companyProfile?.companyIdentity?.name ?? "";
}

/** Reads the vendor's name (used as `productName`, matching the existing precedent in `matchingService.ts`) defensively. */
function safeProductName(vendorProfile: VendorProfile): string | undefined {
  return vendorProfile?.vendorName;
}

/**
 * The fallback returned when `validateVendorProfile` reports any error, or
 * throws on malformed runtime data: exactly one gate per group, every gate
 * "unknown" with empty evidence, no lookup or status logic executed at all.
 * `companyName` / `productName` are still populated when safely available.
 */
function buildValidationFailureFallback(
  companyProfile: CompanyProfile,
  vendorProfile: VendorProfile,
): CompanyEvaluationInput {
  return {
    companyName: safeCompanyName(companyProfile),
    productName: safeProductName(vendorProfile),
    whyThem: [buildUnknownFallbackGate("whyThem")],
    whyNow: [buildUnknownFallbackGate("whyNow")],
    whyUs: [buildUnknownFallbackGate("whyUs")],
  };
}

/**
 * Deterministically maps a canonical `CompanyProfile`'s evidence findings
 * onto the `CompanyEvaluationInput` contract the stabilized
 * `recommendationEngine.ts` expects, using only structural Vendor Profile
 * lookups (never AI, never free-text parsing).
 *
 * `companyName` comes from `companyProfile.companyIdentity.name`;
 * `productName` comes from `vendorProfile.vendorName` (matching the
 * existing precedent used by `matchingService.ts`).
 *
 * Defensively validates `vendorProfile` first via `validateVendorProfile`.
 * If that reports any error — or throws on malformed runtime data — this
 * returns the clean, all-"unknown" fallback instead of performing any
 * lookup or decision logic. This function itself never throws.
 */
export function mapEvidenceToDecisionGroups(
  companyProfile: CompanyProfile,
  vendorProfile: VendorProfile,
): CompanyEvaluationInput {
  let validationErrors: string[];
  try {
    validationErrors = validateVendorProfile(vendorProfile);
  } catch {
    return buildValidationFailureFallback(companyProfile, vendorProfile);
  }

  if (validationErrors.length > 0) {
    return buildValidationFailureFallback(companyProfile, vendorProfile);
  }

  const lookup = buildVendorItemLookup(vendorProfile);

  return {
    companyName: safeCompanyName(companyProfile),
    productName: safeProductName(vendorProfile),
    whyThem: [buildMasterGate("whyThem", companyProfile.relevantBusinessEvidence, lookup)],
    whyNow: [buildMasterGate("whyNow", companyProfile.whyNowEvidence, lookup)],
    whyUs: [buildMasterGate("whyUs", companyProfile.whyUsEvidence, lookup)],
  };
}

export type GateStatus = "pass" | "fail" | "unknown";

export type EvaluationGate = {
  id: string;
  name: string;
  status: GateStatus;
  /** When status is fail, defaults to true. Significant fails in Why Them or Why Us can trigger Skip. */
  significant?: boolean;
  evidence?: string[];
};

export type CompanyEvaluationInput = {
  companyName: string;
  productName?: string;
  whyThem: EvaluationGate[];
  whyNow: EvaluationGate[];
  whyUs: EvaluationGate[];
};

export type RecommendationDecision = "Invest" | "Monitor" | "Skip";

export type RecommendationResult = {
  decision: RecommendationDecision;
  confidence: number;
  businessCase: string;
  supportingEvidence: string[];
  recommendedNextBestAction: string;
};

function getAllGates(input: CompanyEvaluationInput): EvaluationGate[] {
  return [...input.whyThem, ...input.whyNow, ...input.whyUs];
}

function isSignificantFail(gate: EvaluationGate): boolean {
  return gate.status === "fail" && gate.significant !== false;
}

function hasSignificantFail(gates: EvaluationGate[]): boolean {
  return gates.some(isSignificantFail);
}

/** A decision group passes only when it contains at least one assessment and every assessment passed. */
function groupPasses(gates: EvaluationGate[]): boolean {
  return gates.length > 0 && gates.every((gate) => gate.status === "pass");
}

function countByStatus(gates: EvaluationGate[]) {
  return gates.reduce(
    (counts, gate) => {
      counts[gate.status] += 1;
      return counts;
    },
    { pass: 0, fail: 0, unknown: 0 },
  );
}

/**
 * Confidence reflects evidence completeness, not account score. An empty
 * decision group has no evidence at all, so for confidence purposes it counts
 * as one missing (not known) assessment rather than being skipped entirely.
 */
function calculateConfidence(input: CompanyEvaluationInput): number {
  const groups = [input.whyThem, input.whyNow, input.whyUs];

  let totalAssessments = 0;
  let knownAssessments = 0;

  for (const group of groups) {
    if (group.length === 0) {
      totalAssessments += 1;
      continue;
    }

    const { pass, fail } = countByStatus(group);
    totalAssessments += group.length;
    knownAssessments += pass + fail;
  }

  return Math.round((knownAssessments / totalAssessments) * 100);
}

function collectSupportingEvidence(gates: EvaluationGate[]): string[] {
  return gates.flatMap((gate) => gate.evidence ?? []);
}

/**
 * Why Them and Why Us are gating groups: a significant fail in either means the
 * account does not deserve outbound time right now, regardless of Why Now.
 * Why Now only ever raises or lowers urgency, so a fail or unknown there never
 * blocks the account on its own.
 */
function resolveDecision(input: CompanyEvaluationInput): RecommendationDecision {
  const { whyThem, whyNow, whyUs } = input;

  if (hasSignificantFail(whyThem) || hasSignificantFail(whyUs)) {
    return "Skip";
  }

  if (groupPasses(whyThem) && groupPasses(whyNow) && groupPasses(whyUs)) {
    return "Invest";
  }

  return "Monitor";
}

function buildBusinessCase(
  input: CompanyEvaluationInput,
  decision: RecommendationDecision,
  gates: EvaluationGate[],
): string {
  const { pass, fail, unknown } = countByStatus(gates);
  const productLabel = input.productName ?? "this product";

  switch (decision) {
    case "Skip": {
      const failedGroup = hasSignificantFail(input.whyThem) ? "Why Them" : "Why Us";
      return `${input.companyName} is not recommended for immediate pursuit for ${productLabel}. A significant ${failedGroup} failure indicates the account is unlikely to justify enterprise sales investment at this time.`;
    }
    case "Invest":
      return `${input.companyName} shows strong evidence across Why Them, Why Now, and Why Us for ${productLabel}. ${pass} of ${gates.length} gates passed with no significant failures, supporting prioritization for active outreach.`;
    case "Monitor":
      return `${input.companyName} may be worth tracking for ${productLabel}, but the evaluation is not strong enough to prioritize immediate investment. ${unknown} of ${gates.length} gates remain unknown and ${fail} failed without triggering a skip.`;
  }
}

function buildRecommendedNextBestAction(
  decision: RecommendationDecision,
  input: CompanyEvaluationInput,
): string {
  switch (decision) {
    case "Invest":
      return `Prioritize ${input.companyName} for discovery outreach and validate the strongest passing gates with a relevant executive stakeholder.`;
    case "Monitor":
      return `Add ${input.companyName} to monitor status, gather missing evidence on unknown gates, and re-evaluate when new signals emerge.`;
    case "Skip":
      return `Deprioritize ${input.companyName} for now and focus AE time on accounts with stronger Why Them, Why Now, and Why Us evidence.`;
  }
}

export function generateRecommendation(
  input: CompanyEvaluationInput,
): RecommendationResult {
  const gates = getAllGates(input);
  const decision = resolveDecision(input);
  const confidence = calculateConfidence(input);
  const supportingEvidence = collectSupportingEvidence(gates);

  return {
    decision,
    confidence,
    businessCase: buildBusinessCase(input, decision, gates),
    supportingEvidence,
    recommendedNextBestAction: buildRecommendedNextBestAction(decision, input),
  };
}

export type GateStatus = "pass" | "fail" | "unknown";

export type EvaluationGate = {
  id: string;
  name: string;
  status: GateStatus;
  /** When status is fail, defaults to true. Significant fails can trigger Skip. */
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

const UNKNOWN_MAJORITY_THRESHOLD = 0.5;
const PASS_MAJORITY_THRESHOLD = 0.5;

function getAllGates(input: CompanyEvaluationInput): EvaluationGate[] {
  return [...input.whyThem, ...input.whyNow, ...input.whyUs];
}

function isSignificantFail(gate: EvaluationGate): boolean {
  return gate.status === "fail" && gate.significant !== false;
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

function calculateConfidence(gates: EvaluationGate[]): number {
  if (gates.length === 0) {
    return 0;
  }

  const { pass, fail } = countByStatus(gates);
  const knownCount = pass + fail;

  return Math.round((knownCount / gates.length) * 100);
}

function collectSupportingEvidence(gates: EvaluationGate[]): string[] {
  return gates.flatMap((gate) => gate.evidence ?? []);
}

function resolveDecision(gates: EvaluationGate[]): RecommendationDecision {
  if (gates.length === 0) {
    return "Monitor";
  }

  const { pass, unknown } = countByStatus(gates);
  const significantFails = gates.filter(isSignificantFail);

  if (significantFails.length > 0) {
    return "Skip";
  }

  const unknownRatio = unknown / gates.length;
  if (unknownRatio >= UNKNOWN_MAJORITY_THRESHOLD) {
    return "Monitor";
  }

  const passRatio = pass / gates.length;
  if (passRatio > PASS_MAJORITY_THRESHOLD) {
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
  const significantFails = gates.filter(isSignificantFail);

  switch (decision) {
    case "Skip":
      return `${input.companyName} is not recommended for immediate pursuit for ${productLabel}. ${significantFails.length} significant evaluation gate(s) failed, indicating the account is unlikely to justify enterprise sales investment at this time.`;
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
  const decision = resolveDecision(gates);
  const confidence = calculateConfidence(gates);
  const supportingEvidence = collectSupportingEvidence(gates);

  return {
    decision,
    confidence,
    businessCase: buildBusinessCase(input, decision, gates),
    supportingEvidence,
    recommendedNextBestAction: buildRecommendedNextBestAction(decision, input),
  };
}

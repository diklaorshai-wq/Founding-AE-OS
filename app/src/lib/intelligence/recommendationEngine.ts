import {
  AssessmentStatus,
  ConfidenceLevel,
  Recommendation,
  type GateAssessment,
} from "../domain/evaluation";

export type AccountRecommendationInput = {
  companyName: string;
  productName?: string;
  whyThem: GateAssessment;
  whyNow: GateAssessment;
  whyUs: GateAssessment;
};

export type RecommendationResult = {
  decision: Recommendation;
  confidence: ConfidenceLevel;
  businessCase: string;
  supportingEvidence: string[];
  recommendedNextBestAction: string;
};

function getAllGates(input: AccountRecommendationInput): GateAssessment[] {
  return [input.whyThem, input.whyNow, input.whyUs];
}

/**
 * V1 decision logic uses explicit gate rules rather than majority thresholds
 * or significant-failure weighting:
 * - Why Them fail -> Skip
 * - Why Us fail -> Skip
 * - Why Now fail never triggers Skip by itself
 * - All three gates pass -> Invest
 * - Every other valid combination -> Monitor
 */
function resolveDecision(input: AccountRecommendationInput): Recommendation {
  if (
    input.whyThem.status === AssessmentStatus.Fail ||
    input.whyUs.status === AssessmentStatus.Fail
  ) {
    return Recommendation.Skip;
  }

  const allGatesPass =
    input.whyThem.status === AssessmentStatus.Pass &&
    input.whyNow.status === AssessmentStatus.Pass &&
    input.whyUs.status === AssessmentStatus.Pass;

  if (allGatesPass) {
    return Recommendation.Invest;
  }

  return Recommendation.Monitor;
}

/**
 * Confidence is derived only from the three gate-level confidence values:
 * - all high -> high
 * - any low (or missing) -> low
 * - otherwise -> medium
 */
function calculateConfidence(gates: GateAssessment[]): ConfidenceLevel {
  if (gates.some((gate) => gate.confidence === ConfidenceLevel.Low || !gate.confidence)) {
    return ConfidenceLevel.Low;
  }

  if (gates.every((gate) => gate.confidence === ConfidenceLevel.High)) {
    return ConfidenceLevel.High;
  }

  return ConfidenceLevel.Medium;
}

function collectSupportingEvidence(gates: GateAssessment[]): string[] {
  return gates.flatMap((gate) =>
    gate.criteria.flatMap((criterion) => criterion.evidence ?? []),
  );
}

function buildBusinessCase(
  input: AccountRecommendationInput,
  decision: Recommendation,
): string {
  const productLabel = input.productName ?? "this product";

  switch (decision) {
    case Recommendation.Skip:
      return `${input.companyName} is not recommended for immediate pursuit for ${productLabel}. The Why Them or Why Us gate failed, indicating the account is unlikely to justify enterprise sales investment at this time.`;
    case Recommendation.Invest:
      return `${input.companyName} shows strong evidence across Why Them, Why Now, and Why Us for ${productLabel}. All three decision gates passed, supporting prioritization for active outreach.`;
    case Recommendation.Monitor:
      return `${input.companyName} may be worth tracking for ${productLabel}, but the evaluation is not strong enough to prioritize immediate investment. Not every decision gate passed cleanly, so further evidence is needed before committing to active outreach.`;
  }
}

function buildRecommendedNextBestAction(
  decision: Recommendation,
  input: AccountRecommendationInput,
): string {
  switch (decision) {
    case Recommendation.Invest:
      return `Prioritize ${input.companyName} for discovery outreach and validate the strongest passing gates with a relevant executive stakeholder.`;
    case Recommendation.Monitor:
      return `Add ${input.companyName} to monitor status, gather missing evidence on unknown gates, and re-evaluate when new signals emerge.`;
    case Recommendation.Skip:
      return `Deprioritize ${input.companyName} for now and focus AE time on accounts with stronger Why Them, Why Now, and Why Us evidence.`;
  }
}

export function generateRecommendation(
  input: AccountRecommendationInput,
): RecommendationResult {
  const gates = getAllGates(input);
  const decision = resolveDecision(input);
  const confidence = calculateConfidence(gates);
  const supportingEvidence = collectSupportingEvidence(gates);

  return {
    decision,
    confidence,
    businessCase: buildBusinessCase(input, decision),
    supportingEvidence,
    recommendedNextBestAction: buildRecommendedNextBestAction(decision, input),
  };
}

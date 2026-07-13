/**
 * Output model of the Enterprise Decision Framework (EDF).
 * Represents the account evaluation produced from Company Profile + Decision Strategy.
 *
 * Architecture:
 * Criterion Assessment -> Gate Assessment -> Recommendation Engine -> Invest / Monitor / Skip
 */

export enum Recommendation {
  Invest = "Invest",
  Monitor = "Monitor",
  Skip = "Skip",
}

export enum AssessmentStatus {
  Pass = "pass",
  Fail = "fail",
  Unknown = "unknown",
}

export enum ConfidenceLevel {
  High = "high",
  Medium = "medium",
  Low = "low",
}

export enum RiskSeverity {
  High = "high",
  Medium = "medium",
  Low = "low",
}

export enum EvidenceStrength {
  Strong = "strong",
  Moderate = "moderate",
  Weak = "weak",
}

/**
 * The result of evaluating a single criterion (e.g. Strategic Initiative,
 * Business Trigger, Product Differentiation) within a decision gate.
 */
export interface CriterionAssessment {
  criterionId: string;
  criterionName: string;
  status: AssessmentStatus;
  evidence?: string[];
}

/**
 * The aggregated result of a decision gate (Why Them / Why Now / Why Us),
 * derived from its underlying criterion assessments.
 */
export interface GateAssessment {
  id: string;
  name: string;
  status: AssessmentStatus;
  confidence?: ConfidenceLevel;
  criteria: CriterionAssessment[];
}

export interface ExecutiveDecisionNarrative {
  whyThem: string[];
  whyNow: string[];
  whyUs: string[];
}

export interface SupportingEvidenceItem {
  statement: string;
  source?: string;
  gate?: string;
  criterion?: string;
  strength?: EvidenceStrength;
}

export interface RiskItem {
  description: string;
  severity?: RiskSeverity;
  mitigatingFactors?: string[];
}

export interface MissingInformationItem {
  topic: string;
  impact?: string;
  suggestedResearch?: string;
}

export interface AccountEvaluation {
  recommendation: Recommendation;
  confidence: ConfidenceLevel;
  executiveDecisionNarrative: ExecutiveDecisionNarrative;
  businessCase: string;
  supportingEvidence: SupportingEvidenceItem[];
  risks: RiskItem[];
  missingInformation: MissingInformationItem[];
  recommendedNextBestAction: string;
  evaluatedAt?: string;
  companyName?: string;
}

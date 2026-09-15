import type {
  CuratedReason,
  DecisionEvidenceItem,
  FinalEvaluationResponse,
} from "./types/contracts.ts";

export type EvaluateResultViewModel = {
  decisionOutcome: "Invest" | "Monitor" | "Skip";
  curatedReasons: CuratedReason[];
  recommendedFirstMove?: string;
  evidenceByGroup: {
    whyThem: DecisionEvidenceItem[];
    whyNow: DecisionEvidenceItem[];
    whyUs: DecisionEvidenceItem[];
  };
};

/**
 * Pure adapter: maps a successful FinalEvaluationResponse to display props.
 * Only surfaces fields that exist on the canonical response — never invents copy.
 */
export function toEvaluateResultViewModel(
  response: FinalEvaluationResponse,
): EvaluateResultViewModel | null {
  if (response.executionStatus !== "success" || !response.decisionOutcome) {
    return null;
  }

  const evidenceBundle = response.evidenceBundle ?? [];
  return {
    decisionOutcome: response.decisionOutcome,
    curatedReasons: response.curatedReasons ?? [],
    recommendedFirstMove: response.recommendedFirstMove,
    evidenceByGroup: {
      whyThem: evidenceBundle.filter((item) => item.decisionGroup === "whyThem"),
      whyNow: evidenceBundle.filter((item) => item.decisionGroup === "whyNow"),
      whyUs: evidenceBundle.filter((item) => item.decisionGroup === "whyUs"),
    },
  };
}

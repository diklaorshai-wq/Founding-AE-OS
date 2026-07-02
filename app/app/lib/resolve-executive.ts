import type { GtmBrief, GtmBriefExecutive } from "../types/gtm-brief";

export function resolveExecutive(brief: GtmBrief): GtmBriefExecutive {
  if (brief.executive) {
    return brief.executive;
  }

  return {
    opportunityScore: brief.opportunityScore,
    priority: brief.priority,
    opportunityExplanation: brief.opportunityExplanation,
    whyThisAccount: brief.whyThisAccount,
    topPain: brief.topPain,
    firstPersona: brief.firstPersona,
    recommendedNextAction: brief.recommendedNextAction,
    opportunityLabel: brief.priority,
    bestFirstPersona: brief.firstPersona,
  };
}

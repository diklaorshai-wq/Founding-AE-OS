export type GtmBriefPersona = {
  title: string;
  whyTheyMatter: string;
  whatTheyCareAbout: string;
  relevantPain: string;
  messageAngle: string;
  discoveryQuestion: string;
};

export type GtmBriefPersonaRef = {
  title: string;
  whyTheyMatter: string;
};

export type GtmBriefExecutive = {
  opportunityScore: number;
  priority: string;
  opportunityExplanation: string;
  whyThisAccount: string[];
  topPain: string[];
  firstPersona: GtmBriefPersonaRef;
  recommendedNextAction: string;
  /** @deprecated Use `priority`. Kept for existing UI bindings. */
  opportunityLabel: string;
  /** @deprecated Use `firstPersona`. Kept for existing UI bindings. */
  bestFirstPersona: GtmBriefPersonaRef;
};

export type GtmBrief = {
  companyName: string;
  opportunityScore: number;
  priority: string;
  opportunityExplanation: string;
  whyThisAccount: string[];
  topPain: string[];
  firstPersona: GtmBriefPersonaRef;
  recommendedNextAction: string;
  executive?: GtmBriefExecutive;
  executiveSummary: string;
  icpFit: string;
  whyNow: string;
  whyUs: string;
  buyingSignals: string[];
  peopleToTalkTo: GtmBriefPersona[];
  suggestedOutreach: string;
  discoveryQuestions: string[];
};

export type GtmBriefStatus = "idle" | "loading" | "complete";

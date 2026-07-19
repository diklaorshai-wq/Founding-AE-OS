/**
 * Company Profile data contract (Project State §8).
 *
 * After receiving a company URL, AI Research builds an internal Company
 * Profile. This file is a pure data contract: interfaces, a discriminating
 * evidence sub-type, and an `createEmptyCompanyProfile()` bootstrap for
 * initialization and fallback execution states. No functions here perform
 * research, scoring, or recommendation logic.
 *
 * Fully isolated:
 * - Does not import or modify `recommendationEngine.ts`.
 * - Does not modify the existing vendor types/profiles in `contracts.ts`.
 */

export interface CompanyIdentity {
  name: string;
  url: string;
}

export interface CompanyCharacteristics {
  description: string;
  isMultiCloud: boolean;
  dataScaleDescription: string;
}

/**
 * Whether a finding is a fact directly stated by the source, or a
 * conclusion the AI drew from the surrounding evidence.
 */
export type NatureOfConnection = "explicit_fact" | "ai_interpretation";

/**
 * How a finding affects the decision group whose evidence array it appears
 * in (Contract Alignment phase, per §10 Matching):
 * - "supportive": strengthens that decision group.
 * - "contradictory": weakens or contradicts that decision group, but is not
 *   itself an explicit hard vendor disqualifier (a Firmographic
 *   Disqualifier or a disqualifying-severity Red Flag) — those are
 *   resolved separately via `connectedVendorItemId`, not via this field.
 * - "neutral": useful context that contributes to neither pass, fail, nor
 *   contradiction.
 * Assigned by the research model under a constrained response schema —
 * deterministic TypeScript never infers this from free text.
 */
export type DecisionImpact = "supportive" | "contradictory" | "neutral";

/**
 * One research finding. Per §8, each important finding tracks the claim,
 * its source, the relevant date, its connection to the Vendor Profile, and
 * whether it is an explicit fact or an AI interpretation. Failure to find
 * information is not proof that the information is false — the absence of
 * a finding, not a false one, is how that is represented (an empty array),
 * never a fabricated claim.
 */
export interface CompanyEvidenceFinding {
  claim: string;
  source: string;
  date: string;
  /**
   * The Vendor Profile item this finding connects to, per §10 Matching
   * (e.g. a `CustomerProblem.id` or `WhyNowSignal.id` for Why Them/Why Now
   * evidence, or a `Capability.id` / `UseCase.id` for Why Us evidence).
   * Matching uses this link to produce evidence-backed gate inputs for
   * Recommendation Engine V1 — it never redesigns the engine itself.
   */
  connectedVendorItemId: string;
  natureOfConnection: NatureOfConnection;
  decisionImpact: DecisionImpact;
}

export interface CompanyProfile {
  companyIdentity: CompanyIdentity;
  companyCharacteristics: CompanyCharacteristics;
  relevantBusinessEvidence: CompanyEvidenceFinding[];
  whyNowEvidence: CompanyEvidenceFinding[];
  /**
   * Evidence for the Why Us gate (§10): capabilities, use cases, current
   * alternatives, and Why Us red flags observed in the company's own
   * context, each connected back to the relevant Vendor Profile item.
   */
  whyUsEvidence: CompanyEvidenceFinding[];
  relevantRoles: string[];
  redFlags: string[];
}

/**
 * Returns a valid, schema-compliant, empty `CompanyProfile` for
 * initialization and fallback execution states (e.g. before research runs,
 * or when research fails and callers still need a structurally valid
 * object to work with). Always returns a fresh object — no shared mutable
 * state between calls.
 */
export function createEmptyCompanyProfile(): CompanyProfile {
  return {
    companyIdentity: {
      name: "",
      url: "",
    },
    companyCharacteristics: {
      description: "",
      isMultiCloud: false,
      dataScaleDescription: "",
    },
    relevantBusinessEvidence: [],
    whyNowEvidence: [],
    whyUsEvidence: [],
    relevantRoles: [],
    redFlags: [],
  };
}

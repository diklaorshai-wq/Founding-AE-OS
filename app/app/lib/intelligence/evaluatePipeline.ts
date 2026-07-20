/**
 * Canonical evaluate pipeline shared by the live API route and offline tests.
 *
 * researchCompanyFromUrl → mapEvidenceToDecisionGroups → generateRecommendation
 *
 * Does not import the legacy AI matcher (`matchingService.ts`).
 */
import type {
  CuratedReason,
  DecisionEvidenceItem,
  FinalEvaluationResponse,
} from "./types/contracts.ts";
import type {
  CanonicalCompanyResearchResult,
  CompanyProfile,
} from "./types/companyProfile.ts";
import { researchCompanyFromUrl } from "./companyResearchService.ts";
import { mapEvidenceToDecisionGroups } from "./evidenceMatchingService.ts";
import { generateRecommendation } from "./recommendationEngine.ts";
import type { VendorProfile } from "./vendorProfile.ts";
import { gtmBrainVendorProfile } from "./vendorProfile.test-data.ts";

function toErrorBody(code: string, message: string): FinalEvaluationResponse {
  return {
    executionStatus: "failed",
    errorDetails: { code, message },
  };
}

function buildCuratedReasons(
  businessCase: string,
  supportingEvidence: string[],
): CuratedReason[] {
  const reasons: CuratedReason[] = [
    { text: businessCase, evaluationId: "business-case", supportingClaimIds: [] },
  ];

  for (const [index, evidence] of supportingEvidence.slice(0, 3).entries()) {
    reasons.push({
      text: evidence,
      evaluationId: `supporting-evidence-${index + 1}`,
      supportingClaimIds: [],
    });
  }

  return reasons;
}

/** Deterministically projects the three canonical evidence arrays into the API `evidenceBundle` (Option A). */
export function buildDecisionEvidenceBundle(profile: CompanyProfile): DecisionEvidenceItem[] {
  return [
    ...profile.relevantBusinessEvidence.map((finding) => ({
      decisionGroup: "whyThem" as const,
      claim: finding.claim,
      source: finding.source,
      date: finding.date,
      connectedVendorItemId: finding.connectedVendorItemId,
      natureOfConnection: finding.natureOfConnection,
      decisionImpact: finding.decisionImpact,
    })),
    ...profile.whyNowEvidence.map((finding) => ({
      decisionGroup: "whyNow" as const,
      claim: finding.claim,
      source: finding.source,
      date: finding.date,
      connectedVendorItemId: finding.connectedVendorItemId,
      natureOfConnection: finding.natureOfConnection,
      decisionImpact: finding.decisionImpact,
    })),
    ...profile.whyUsEvidence.map((finding) => ({
      decisionGroup: "whyUs" as const,
      claim: finding.claim,
      source: finding.source,
      date: finding.date,
      connectedVendorItemId: finding.connectedVendorItemId,
      natureOfConnection: finding.natureOfConnection,
      decisionImpact: finding.decisionImpact,
    })),
  ];
}

type ResearchFn = (
  urlOrDomain: string,
  vendorProfile: VendorProfile,
) => Promise<CanonicalCompanyResearchResult>;

export type CanonicalEvaluateResult = {
  httpStatus: number;
  body: FinalEvaluationResponse;
};

/**
 * Canonical evaluate pipeline. Inject `research` in tests; production uses
 * live `researchCompanyFromUrl`.
 */
export async function runCanonicalEvaluate(
  domain: string,
  vendorProfile: VendorProfile = gtmBrainVendorProfile,
  research: ResearchFn = researchCompanyFromUrl,
): Promise<CanonicalEvaluateResult> {
  const researchResult = await research(domain, vendorProfile);

  if (researchResult.status === "failed" || !researchResult.profileData) {
    return {
      httpStatus: 502,
      body: toErrorBody(
        "RESEARCH_FAILED",
        researchResult.failureReason ?? "AI research did not return a company profile.",
      ),
    };
  }

  // "success" and "incomplete" both continue: incomplete → unknown gates
  // (normally Monitor) and an empty evidenceBundle.
  const evaluationInput = mapEvidenceToDecisionGroups(
    researchResult.profileData,
    vendorProfile,
  );
  const recommendation = generateRecommendation(evaluationInput);

  return {
    httpStatus: 200,
    body: {
      executionStatus: "success",
      decisionOutcome: recommendation.decision,
      curatedReasons: buildCuratedReasons(recommendation.businessCase, recommendation.supportingEvidence),
      recommendedFirstMove: recommendation.recommendedNextBestAction,
      evidenceBundle: buildDecisionEvidenceBundle(researchResult.profileData),
    },
  };
}

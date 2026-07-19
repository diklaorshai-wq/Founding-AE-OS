import { z } from "zod";
import type { CuratedReason, FinalEvaluationResponse } from "../../lib/intelligence/types/contracts";
import { researchCompany } from "../../lib/intelligence/providers/gemini";
import { mapToEvaluationInput } from "../../lib/intelligence/matchingService";
import { generateRecommendation } from "../../lib/intelligence/recommendationEngine";
import { gtmBrainVendorProfile } from "../../lib/intelligence/vendorProfile.test-data";

const RequestBodySchema = z.object({
  url: z.string().min(1),
});

function toErrorResponse(code: string, message: string, status: number): Response {
  const body: FinalEvaluationResponse = {
    executionStatus: "failed",
    errorDetails: { code, message },
  };
  return Response.json(body, { status });
}

/** Sanitizes an arbitrary submitted string down to a bare, https-only hostname. */
function sanitizeToDomain(rawUrl: string): string {
  const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const parsed = new URL(withProtocol);

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Unsupported URL protocol");
  }
  if (!parsed.hostname) {
    throw new Error("URL is missing a hostname");
  }

  return parsed.hostname.toLowerCase();
}

/**
 * Builds the MVP's "three or four short reasons": the business case plus up
 * to three supporting evidence snippets from Recommendation Engine V1's
 * output. Recommendation Engine V1 is not modified to produce this shape.
 */
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

export async function POST(request: Request): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return toErrorResponse("INVALID_JSON", "Request body must be valid JSON.", 400);
  }

  const parsedBody = RequestBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return toErrorResponse(
      "INVALID_BODY",
      'Request body must include a non-empty "url" string.',
      400,
    );
  }

  let domain: string;
  try {
    domain = sanitizeToDomain(parsedBody.data.url);
  } catch {
    return toErrorResponse(
      "INVALID_URL",
      'The provided "url" could not be parsed as a valid company URL.',
      400,
    );
  }

  try {
    const researchResult = await researchCompany(domain);

    if (researchResult.status === "failed" || !researchResult.profileData) {
      return toErrorResponse(
        "RESEARCH_FAILED",
        researchResult.failureReason ?? "AI research did not return a company profile.",
        502,
      );
    }

    // NOTE: Vendor Onboarding has no persisted-profile storage yet (see
    // GTM-BRAIN-PROJECT-STATE.md section 7), so this endpoint evaluates every
    // submitted company against the single GTM Brain vendor fixture until a
    // real Vendor Profile store exists.
    const evaluationInput = await mapToEvaluationInput(researchResult.profileData, gtmBrainVendorProfile);
    const recommendation = generateRecommendation(evaluationInput);

    const evidenceBundle = [
      ...researchResult.profileData.firmographicData.claims,
      ...researchResult.profileData.coreBusinessActivities.claims,
      ...researchResult.profileData.corporateAnnouncements.claims,
      ...researchResult.profileData.hiringAndRoleTrends.claims,
      ...researchResult.profileData.observedTechnologies.claims,
    ];

    const response: FinalEvaluationResponse = {
      executionStatus: "success",
      decisionOutcome: recommendation.decision,
      curatedReasons: buildCuratedReasons(recommendation.businessCase, recommendation.supportingEvidence),
      recommendedFirstMove: recommendation.recommendedNextBestAction,
      evidenceBundle,
    };

    return Response.json(response, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return toErrorResponse("INTERNAL_ERROR", message, 500);
  }
}

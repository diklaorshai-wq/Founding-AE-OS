/**
 * Gate-neutral domain contracts for the GTM Brain vertical slice.
 *
 * These types describe research evidence and final evaluation output.
 * They must remain provider-agnostic: nothing here may reference a
 * specific AI vendor's request/response shapes.
 */
import { z } from "zod";

export const EvidenceSourceSchema = z.object({
  sourceUrl: z.string().url(),
  sourceTitle: z.string(),
  publicationDate: z.string().optional(),
  /** Server-generated ISO 8601 timestamp. Never trust an AI-provided value here. */
  capturedTimestamp: z.string(),
});
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;

export const ClaimNatureSchema = z.enum(["explicit_fact", "supported_inference"]);
export type ClaimNature = z.infer<typeof ClaimNatureSchema>;

export const EvidenceClaimSchema = z
  .object({
    claimId: z.string(),
    claimNature: ClaimNatureSchema,
    claimSummary: z.string(),
    underlyingSources: z.array(EvidenceSourceSchema).min(1),
    /** Required when claimNature is "supported_inference". */
    inferenceParentIds: z.array(z.string()).optional(),
    eventTimeframe: z.string().optional(),
  })
  .refine(
    (claim) =>
      claim.claimNature !== "supported_inference" ||
      (claim.inferenceParentIds?.length ?? 0) > 0,
    {
      message: "supported_inference claims require inferenceParentIds",
      path: ["inferenceParentIds"],
    },
  );
export type EvidenceClaim = z.infer<typeof EvidenceClaimSchema>;

const EvidenceClaimGroupSchema = z.object({
  claims: z.array(EvidenceClaimSchema),
});
export type EvidenceClaimGroup = z.infer<typeof EvidenceClaimGroupSchema>;

export const CompanyProfileSchema = z.object({
  submittedDomain: z.string(),
  /** Falls back to a domain-derived label when the AI cannot resolve a formal account name. */
  accountName: z.string(),
  firmographicData: EvidenceClaimGroupSchema,
  coreBusinessActivities: EvidenceClaimGroupSchema,
  corporateAnnouncements: EvidenceClaimGroupSchema,
  hiringAndRoleTrends: EvidenceClaimGroupSchema,
  observedTechnologies: EvidenceClaimGroupSchema,
});
export type CompanyProfile = z.infer<typeof CompanyProfileSchema>;

export const CompanyResearchResultSchema = z.object({
  status: z.enum(["success", "incomplete", "failed"]),
  profileData: CompanyProfileSchema.nullable(),
  failureReason: z.string().optional(),
});
export type CompanyResearchResult = z.infer<typeof CompanyResearchResultSchema>;

export const CuratedReasonSchema = z.object({
  text: z.string(),
  evaluationId: z.string(),
  supportingClaimIds: z.array(z.string()),
});
export type CuratedReason = z.infer<typeof CuratedReasonSchema>;

export const ErrorDetailsSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type ErrorDetails = z.infer<typeof ErrorDetailsSchema>;

export const FinalEvaluationResponseSchema = z.object({
  executionStatus: z.enum(["success", "failed"]),
  errorDetails: ErrorDetailsSchema.optional(),
  decisionOutcome: z.enum(["Invest", "Monitor", "Skip"]).optional(),
  curatedReasons: z.array(CuratedReasonSchema).optional(),
  recommendedFirstMove: z.string().optional(),
  evidenceBundle: z.array(EvidenceClaimSchema).optional(),
});
export type FinalEvaluationResponse = z.infer<typeof FinalEvaluationResponseSchema>;

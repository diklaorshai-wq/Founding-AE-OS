/**
 * Canonical runtime Zod schema for VendorProfile.
 * Matches vendorProfile.ts — no parallel domain model.
 */
import { z } from "zod";
import type { VendorProfile } from "./vendorProfile.ts";

const EntityIdSchema = z.string();

const CustomerProblemSchema = z.object({
  id: EntityIdSchema,
  statement: z.string(),
  impact: z.string(),
});

const DesiredOutcomeSchema = z.object({
  id: EntityIdSchema,
  statement: z.string(),
  problemIds: z.array(EntityIdSchema),
});

const BuyingReasonSchema = z.object({
  id: EntityIdSchema,
  statement: z.string(),
  outcomeIds: z.array(EntityIdSchema),
});

const CapabilitySchema = z.object({
  id: EntityIdSchema,
  name: z.string(),
  description: z.string(),
  problemIds: z.array(EntityIdSchema),
  outcomeIds: z.array(EntityIdSchema),
});

const UseCaseSchema = z.object({
  id: EntityIdSchema,
  name: z.string(),
  description: z.string(),
  problemIds: z.array(EntityIdSchema),
  outcomeIds: z.array(EntityIdSchema),
  capabilityIds: z.array(EntityIdSchema),
});

const CommonAlternativeSchema = z.object({
  id: EntityIdSchema,
  name: z.string(),
  description: z.string(),
});

const RelevantDifferentiationSchema = z.object({
  id: EntityIdSchema,
  statement: z.string(),
  alternativeIds: z.array(EntityIdSchema),
  problemIds: z.array(EntityIdSchema),
  outcomeIds: z.array(EntityIdSchema),
});

const ProofPointSchema = z.object({
  id: EntityIdSchema,
  summary: z.string(),
  customerName: z.string().optional(),
  industry: z.string().optional(),
  metric: z.string().optional(),
  outcomeIds: z.array(EntityIdSchema),
  useCaseIds: z.array(EntityIdSchema),
});

const IdealCustomerCriterionSchema = z.object({
  id: EntityIdSchema,
  description: z.string(),
});

const IdealCustomerExampleSchema = z.object({
  id: EntityIdSchema,
  companyName: z.string(),
  rationale: z.string(),
  criterionIds: z.array(EntityIdSchema),
  relationship: z.enum(["customer", "prospect", "example-only"]).optional(),
});

const FirmographicDisqualifierSchema = z.object({
  id: EntityIdSchema,
  condition: z.string(),
  whyItMatters: z.string(),
});

const TargetPersonaSchema = z.object({
  id: EntityIdSchema,
  roleOrTitle: z.string(),
  problemIds: z.array(EntityIdSchema),
  outcomeIds: z.array(EntityIdSchema),
  whyThisPersonaMatters: z.string(),
  firstMeetingAngle: z.string(),
});

const BudgetOwnerSchema = z.object({
  id: EntityIdSchema,
  roleOrFunction: z.string(),
  responsibilities: z.array(z.enum(["owns", "approves", "influences"])),
  relatedPersonaIds: z.array(EntityIdSchema),
  whyItMatters: z.string(),
});

const WhyNowSignalSchema = z.object({
  id: EntityIdSchema,
  signal: z.string(),
  whyItMatters: z.string(),
  problemIds: z.array(EntityIdSchema),
  outcomeIds: z.array(EntityIdSchema),
  firstMeetingAngle: z.string(),
});

const RedFlagSchema = z.object({
  id: EntityIdSchema,
  condition: z.string(),
  whyItMatters: z.string(),
  severity: z.enum(["cautionary", "disqualifying"]),
  affectedDecisionGroups: z.array(z.enum(["whyThem", "whyUs"])),
});

export const VendorProfileSchema = z.object({
  id: EntityIdSchema,
  websiteUrl: z.string(),
  vendorName: z.string(),
  productKnowledge: z.object({
    offering: z.string(),
    customerProblems: z.array(CustomerProblemSchema),
    desiredOutcomes: z.array(DesiredOutcomeSchema),
    buyingReasons: z.array(BuyingReasonSchema),
    capabilities: z.array(CapabilitySchema),
    useCases: z.array(UseCaseSchema),
    commonAlternatives: z.array(CommonAlternativeSchema),
    relevantDifferentiation: z.array(RelevantDifferentiationSchema),
    proofPoints: z.array(ProofPointSchema),
  }),
  decisionStrategy: z.object({
    idealCustomerProfile: z.object({
      criteria: z.array(IdealCustomerCriterionSchema),
      examples: z.array(IdealCustomerExampleSchema),
      firmographicDisqualifiers: z.array(FirmographicDisqualifierSchema),
    }),
    targetPersonas: z.array(TargetPersonaSchema),
    budgetOwners: z.array(BudgetOwnerSchema),
    whyNowSignals: z.array(WhyNowSignalSchema),
    redFlags: z.array(RedFlagSchema),
  }),
});

export type VendorProfileSchemaType = z.infer<typeof VendorProfileSchema>;

/** Structural parse only — does not run referential validateVendorProfile. */
export function parseVendorProfileStructurally(
  value: unknown,
): { success: true; data: VendorProfile } | { success: false; error: string } {
  const parsed = VendorProfileSchema.safeParse(value);
  if (!parsed.success) {
    return { success: false, error: "Vendor Profile does not match the expected structure." };
  }
  return { success: true, data: parsed.data as VendorProfile };
}

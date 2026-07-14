/**
 * Vendor-level knowledge used to interpret account evidence.
 *
 * This profile does not contain account evidence, territory ownership,
 * recommendations, confidence, or numeric account scores.
 */

export type EntityId = string;

export type CustomerProblem = {
  id: EntityId;
  statement: string;
};

export type DesiredOutcome = {
  id: EntityId;
  statement: string;
  problemIds: EntityId[];
};

export type BuyingReason = {
  id: EntityId;
  statement: string;
  outcomeIds: EntityId[];
};

export type Capability = {
  id: EntityId;
  name: string;
  description: string;
  problemIds: EntityId[];
  outcomeIds: EntityId[];
};

export type UseCase = {
  id: EntityId;
  name: string;
  description: string;
  problemIds: EntityId[];
  outcomeIds: EntityId[];
  capabilityIds: EntityId[];
};

export type CommonAlternative = {
  id: EntityId;
  name: string;
  description: string;
};

export type RelevantDifferentiation = {
  id: EntityId;
  statement: string;
  alternativeIds: EntityId[];
  problemIds: EntityId[];
  outcomeIds: EntityId[];
};

export type ProofPoint = {
  id: EntityId;
  summary: string;
  customerName?: string;
  industry?: string;
  metric?: string;
  outcomeIds: EntityId[];
  useCaseIds: EntityId[];
};

export type ProductKnowledge = {
  offering: string;
  customerProblems: CustomerProblem[];
  desiredOutcomes: DesiredOutcome[];
  buyingReasons: BuyingReason[];
  capabilities: Capability[];
  useCases: UseCase[];
  commonAlternatives: CommonAlternative[];
  relevantDifferentiation: RelevantDifferentiation[];
  proofPoints: ProofPoint[];
};

export type IdealCustomerCriterion = {
  id: EntityId;
  description: string;
};

export type IdealCustomerRelationship =
  | "customer"
  | "prospect"
  | "example-only";

export type IdealCustomerExample = {
  id: EntityId;
  companyName: string;
  rationale: string;
  criterionIds: EntityId[];
  relationship?: IdealCustomerRelationship;
};

export type FirmographicDisqualifier = {
  id: EntityId;
  condition: string;
  whyItMatters: string;
};

export type IdealCustomerProfile = {
  criteria: IdealCustomerCriterion[];
  examples: IdealCustomerExample[];
  firmographicDisqualifiers: FirmographicDisqualifier[];
};

/**
 * Personas guide who to engage and how to earn a first meeting.
 * They are not independent Invest / Monitor / Skip gates.
 */
export type TargetPersona = {
  id: EntityId;
  roleOrTitle: string;
  problemIds: EntityId[];
  outcomeIds: EntityId[];
  whyThisPersonaMatters: string;
  firstMeetingAngle: string;
};

export type WhyNowSignal = {
  id: EntityId;
  signal: string;
  whyItMatters: string;
  problemIds: EntityId[];
  outcomeIds: EntityId[];
  firstMeetingAngle: string;
};

export type RedFlagSeverity = "cautionary" | "disqualifying";
export type RedFlagDecisionGroup = "whyThem" | "whyUs";

export type RedFlag = {
  id: EntityId;
  condition: string;
  whyItMatters: string;
  severity: RedFlagSeverity;
  affectedDecisionGroups: RedFlagDecisionGroup[];
};

export type DecisionStrategy = {
  idealCustomerProfile: IdealCustomerProfile;
  targetPersonas: TargetPersona[];
  whyNowSignals: WhyNowSignal[];
  redFlags: RedFlag[];
};

export type VendorProfile = {
  id: EntityId;
  vendorName: string;
  productKnowledge: ProductKnowledge;
  decisionStrategy: DecisionStrategy;
};

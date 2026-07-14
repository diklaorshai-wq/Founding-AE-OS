import type {
  Capability,
  BudgetOwner,
  BuyingReason,
  CommonAlternative,
  CustomerProblem,
  DesiredOutcome,
  IdealCustomerProfile,
  ProofPoint,
  RedFlag,
  RelevantDifferentiation,
  TargetPersona,
  UseCase,
  VendorProfile,
  WhyNowSignal,
} from "./vendorProfile";

export type VendorOnboardingStageId =
  | "offering"
  | "customerValue"
  | "productFit"
  | "proof"
  | "idealCustomer"
  | "people"
  | "timingAndRisk";

export type VendorOnboardingResponse =
  | {
      stage: "offering";
      websiteUrl: string;
      vendorName: string;
      offering: string;
    }
  | {
      stage: "customerValue";
      customerProblems: CustomerProblem[];
      desiredOutcomes: DesiredOutcome[];
      buyingReasons: BuyingReason[];
    }
  | {
      stage: "productFit";
      capabilities: Capability[];
      useCases: UseCase[];
      commonAlternatives: CommonAlternative[];
      relevantDifferentiation: RelevantDifferentiation[];
    }
  | {
      stage: "proof";
      proofPoints: ProofPoint[];
    }
  | {
      stage: "idealCustomer";
      idealCustomerProfile: IdealCustomerProfile;
    }
  | {
      stage: "people";
      targetPersonas: TargetPersona[];
      budgetOwners: BudgetOwner[];
    }
  | {
      stage: "timingAndRisk";
      whyNowSignals: WhyNowSignal[];
      redFlags: RedFlag[];
    };

export function createEmptyVendorProfile(
  id: string,
  vendorName: string,
): VendorProfile {
  return {
    id,
    websiteUrl: "",
    vendorName,
    productKnowledge: {
      offering: "",
      customerProblems: [],
      desiredOutcomes: [],
      buyingReasons: [],
      capabilities: [],
      useCases: [],
      commonAlternatives: [],
      relevantDifferentiation: [],
      proofPoints: [],
    },
    decisionStrategy: {
      idealCustomerProfile: {
        criteria: [],
        examples: [],
        firmographicDisqualifiers: [],
      },
      targetPersonas: [],
      budgetOwners: [],
      whyNowSignals: [],
      redFlags: [],
    },
  };
}

/** Applies one conversational stage without evaluating an account. */
export function applyVendorOnboardingResponse(
  profile: VendorProfile,
  response: VendorOnboardingResponse,
): VendorProfile {
  switch (response.stage) {
    case "offering":
      return {
        ...profile,
        websiteUrl: response.websiteUrl,
        vendorName: response.vendorName,
        productKnowledge: {
          ...profile.productKnowledge,
          offering: response.offering,
        },
      };
    case "customerValue":
      return {
        ...profile,
        productKnowledge: {
          ...profile.productKnowledge,
          customerProblems: response.customerProblems,
          desiredOutcomes: response.desiredOutcomes,
          buyingReasons: response.buyingReasons,
        },
      };
    case "productFit":
      return {
        ...profile,
        productKnowledge: {
          ...profile.productKnowledge,
          capabilities: response.capabilities,
          useCases: response.useCases,
          commonAlternatives: response.commonAlternatives,
          relevantDifferentiation: response.relevantDifferentiation,
        },
      };
    case "proof":
      return {
        ...profile,
        productKnowledge: {
          ...profile.productKnowledge,
          proofPoints: response.proofPoints,
        },
      };
    case "idealCustomer":
      return {
        ...profile,
        decisionStrategy: {
          ...profile.decisionStrategy,
          idealCustomerProfile: response.idealCustomerProfile,
        },
      };
    case "people":
      return {
        ...profile,
        decisionStrategy: {
          ...profile.decisionStrategy,
          targetPersonas: response.targetPersonas,
          budgetOwners: response.budgetOwners,
        },
      };
    case "timingAndRisk":
      return {
        ...profile,
        decisionStrategy: {
          ...profile.decisionStrategy,
          whyNowSignals: response.whyNowSignals,
          redFlags: response.redFlags,
        },
      };
  }
}

import type {
  Capability,
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
  | "value"
  | "proof"
  | "idealCustomer"
  | "personas"
  | "whyNow"
  | "redFlags";

export type VendorOnboardingResponse =
  | {
      stage: "offering";
      offering: string;
    }
  | {
      stage: "value";
      customerProblems: CustomerProblem[];
      desiredOutcomes: DesiredOutcome[];
      buyingReasons: BuyingReason[];
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
      stage: "personas";
      targetPersonas: TargetPersona[];
    }
  | {
      stage: "whyNow";
      whyNowSignals: WhyNowSignal[];
    }
  | {
      stage: "redFlags";
      redFlags: RedFlag[];
    };

export function createEmptyVendorProfile(
  id: string,
  vendorName: string,
): VendorProfile {
  return {
    id,
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
        productKnowledge: {
          ...profile.productKnowledge,
          offering: response.offering,
        },
      };
    case "value":
      return {
        ...profile,
        productKnowledge: {
          ...profile.productKnowledge,
          customerProblems: response.customerProblems,
          desiredOutcomes: response.desiredOutcomes,
          buyingReasons: response.buyingReasons,
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
    case "personas":
      return {
        ...profile,
        decisionStrategy: {
          ...profile.decisionStrategy,
          targetPersonas: response.targetPersonas,
        },
      };
    case "whyNow":
      return {
        ...profile,
        decisionStrategy: {
          ...profile.decisionStrategy,
          whyNowSignals: response.whyNowSignals,
        },
      };
    case "redFlags":
      return {
        ...profile,
        decisionStrategy: {
          ...profile.decisionStrategy,
          redFlags: response.redFlags,
        },
      };
  }
}

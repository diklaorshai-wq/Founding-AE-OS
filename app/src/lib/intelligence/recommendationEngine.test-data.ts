import {
  generateRecommendation,
  type AccountRecommendationInput,
} from "./recommendationEngine";
import { AssessmentStatus, ConfidenceLevel } from "../domain/evaluation";

const highPriorityAccount: AccountRecommendationInput = {
  companyName: "NovaCart",
  productName: "GTM Brain",
  whyThem: {
    id: "why-them",
    name: "Why Them",
    status: AssessmentStatus.Pass,
    confidence: ConfidenceLevel.High,
    criteria: [
      {
        criterionId: "enterprise-complexity",
        criterionName: "Enterprise sales complexity",
        status: AssessmentStatus.Pass,
        evidence: [
          "Large enterprise sales team managing many strategic accounts.",
        ],
      },
      {
        criterionId: "territory-ramp-pain",
        criterionName: "Territory ramp pain",
        status: AssessmentStatus.Pass,
        evidence: [
          "New AEs need to quickly understand which accounts deserve time.",
        ],
      },
    ],
  },
  whyNow: {
    id: "why-now",
    name: "Why Now",
    status: AssessmentStatus.Pass,
    confidence: ConfidenceLevel.High,
    criteria: [
      {
        criterionId: "new-market-expansion",
        criterionName: "New market expansion",
        status: AssessmentStatus.Pass,
        evidence: [
          "Company is expanding into new regions and needs faster territory prioritization.",
        ],
      },
    ],
  },
  whyUs: {
    id: "why-us",
    name: "Why Us",
    status: AssessmentStatus.Pass,
    confidence: ConfidenceLevel.Medium,
    criteria: [
      {
        criterionId: "fits-pre-crm-workflow",
        criterionName: "Fits pre-CRM workflow",
        status: AssessmentStatus.Pass,
        evidence: [
          "The problem happens before CRM execution, where GTM Brain is designed to operate.",
        ],
      },
    ],
  },
};

const interestingButNotUrgent: AccountRecommendationInput = {
  companyName: "CloudLedger",
  productName: "GTM Brain",
  whyThem: {
    id: "why-them",
    name: "Why Them",
    status: AssessmentStatus.Pass,
    confidence: ConfidenceLevel.High,
    criteria: [
      {
        criterionId: "enterprise-sales-team",
        criterionName: "Enterprise sales team",
        status: AssessmentStatus.Pass,
        evidence: ["Has an enterprise sales motion with named accounts."],
      },
      {
        criterionId: "territory-complexity",
        criterionName: "Territory complexity",
        status: AssessmentStatus.Pass,
        evidence: ["AEs manage mixed territories with different account sizes."],
      },
    ],
  },
  whyNow: {
    id: "why-now",
    name: "Why Now",
    status: AssessmentStatus.Unknown,
    confidence: ConfidenceLevel.Low,
    criteria: [
      {
        criterionId: "urgent-trigger",
        criterionName: "Urgent buying trigger",
        status: AssessmentStatus.Unknown,
      },
      {
        criterionId: "active-reorg",
        criterionName: "Active GTM reorg",
        status: AssessmentStatus.Unknown,
      },
    ],
  },
  whyUs: {
    id: "why-us",
    name: "Why Us",
    status: AssessmentStatus.Pass,
    confidence: ConfidenceLevel.Medium,
    criteria: [
      {
        criterionId: "pre-crm-fit",
        criterionName: "Pre-CRM workflow fit",
        status: AssessmentStatus.Pass,
        evidence: ["Account prioritization appears to happen before CRM execution."],
      },
    ],
  },
};

const whyNowFailStillMonitor: AccountRecommendationInput = {
  companyName: "GreenFleet Logistics",
  productName: "GTM Brain",
  whyThem: {
    id: "why-them",
    name: "Why Them",
    status: AssessmentStatus.Pass,
    confidence: ConfidenceLevel.High,
    criteria: [
      {
        criterionId: "enterprise-sales-team",
        criterionName: "Enterprise sales team",
        status: AssessmentStatus.Pass,
        evidence: ["Runs a dedicated enterprise sales organization."],
      },
    ],
  },
  whyNow: {
    id: "why-now",
    name: "Why Now",
    status: AssessmentStatus.Fail,
    confidence: ConfidenceLevel.High,
    criteria: [
      {
        criterionId: "business-trigger",
        criterionName: "Business trigger",
        status: AssessmentStatus.Fail,
        evidence: ["No recent funding, reorg, or expansion signals found."],
      },
    ],
  },
  whyUs: {
    id: "why-us",
    name: "Why Us",
    status: AssessmentStatus.Pass,
    confidence: ConfidenceLevel.Medium,
    criteria: [
      {
        criterionId: "pre-crm-fit",
        criterionName: "Pre-CRM workflow fit",
        status: AssessmentStatus.Pass,
        evidence: ["Account prioritization happens before CRM execution."],
      },
    ],
  },
};

const whyThemFailSkip: AccountRecommendationInput = {
  companyName: "Legacy Manufacturing Corp",
  productName: "GTM Brain",
  whyThem: {
    id: "why-them",
    name: "Why Them",
    status: AssessmentStatus.Fail,
    confidence: ConfidenceLevel.High,
    criteria: [
      {
        criterionId: "enterprise-sales-team",
        criterionName: "Enterprise sales team",
        status: AssessmentStatus.Fail,
        evidence: ["No enterprise sales motion; sells exclusively through resellers."],
      },
    ],
  },
  whyNow: {
    id: "why-now",
    name: "Why Now",
    status: AssessmentStatus.Pass,
    confidence: ConfidenceLevel.Medium,
    criteria: [
      {
        criterionId: "business-trigger",
        criterionName: "Business trigger",
        status: AssessmentStatus.Pass,
        evidence: ["Recently announced a GTM reorg."],
      },
    ],
  },
  whyUs: {
    id: "why-us",
    name: "Why Us",
    status: AssessmentStatus.Pass,
    confidence: ConfidenceLevel.Medium,
    criteria: [
      {
        criterionId: "pre-crm-fit",
        criterionName: "Pre-CRM workflow fit",
        status: AssessmentStatus.Pass,
        evidence: ["Account prioritization happens before CRM execution."],
      },
    ],
  },
};

const whyUsFailSkip: AccountRecommendationInput = {
  companyName: "StaticStack Inc",
  productName: "GTM Brain",
  whyThem: {
    id: "why-them",
    name: "Why Them",
    status: AssessmentStatus.Pass,
    confidence: ConfidenceLevel.High,
    criteria: [
      {
        criterionId: "enterprise-sales-team",
        criterionName: "Enterprise sales team",
        status: AssessmentStatus.Pass,
        evidence: ["Runs a dedicated enterprise sales organization."],
      },
    ],
  },
  whyNow: {
    id: "why-now",
    name: "Why Now",
    status: AssessmentStatus.Pass,
    confidence: ConfidenceLevel.Medium,
    criteria: [
      {
        criterionId: "business-trigger",
        criterionName: "Business trigger",
        status: AssessmentStatus.Pass,
        evidence: ["Recently expanded into new regions."],
      },
    ],
  },
  whyUs: {
    id: "why-us",
    name: "Why Us",
    status: AssessmentStatus.Fail,
    confidence: ConfidenceLevel.High,
    criteria: [
      {
        criterionId: "pre-crm-fit",
        criterionName: "Pre-CRM workflow fit",
        status: AssessmentStatus.Fail,
        evidence: ["Already has an entrenched pre-CRM prioritization tool with no plans to switch."],
      },
    ],
  },
};

const scenarios = [
  highPriorityAccount,
  interestingButNotUrgent,
  whyNowFailStillMonitor,
  whyThemFailSkip,
  whyUsFailSkip,
];

for (const scenario of scenarios) {
  const result = generateRecommendation(scenario);

  console.log("Company:", scenario.companyName);
  console.log("Decision:", result.decision);
  console.log("Confidence:", result.confidence);
  console.log("Business Case:", result.businessCase);
  console.log("---");
}

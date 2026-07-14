import {
  generateRecommendation,
  type CompanyEvaluationInput,
  type RecommendationDecision,
} from "./recommendationEngine";

const highPriorityAccount: CompanyEvaluationInput = {
  companyName: "NovaCart",
  productName: "GTM Brain",
  whyThem: [
    {
      id: "enterprise-complexity",
      name: "Enterprise sales complexity",
      status: "pass",
      evidence: [
        "Large enterprise sales team managing many strategic accounts.",
      ],
    },
    {
      id: "territory-ramp-pain",
      name: "Territory ramp pain",
      status: "pass",
      evidence: [
        "New AEs need to quickly understand which accounts deserve time.",
      ],
    },
  ],
  whyNow: [
    {
      id: "new-market-expansion",
      name: "New market expansion",
      status: "pass",
      evidence: [
        "Company is expanding into new regions and needs faster territory prioritization.",
      ],
    },
  ],
  whyUs: [
    {
      id: "fits-pre-crm-workflow",
      name: "Fits pre-CRM workflow",
      status: "pass",
      evidence: [
        "The problem happens before CRM execution, where GTM Brain is designed to operate.",
      ],
    },
  ],
};

const interestingButNotUrgent: CompanyEvaluationInput = {
  companyName: "CloudLedger",
  productName: "GTM Brain",
  whyThem: [
    {
      id: "enterprise-sales-team",
      name: "Enterprise sales team",
      status: "pass",
      evidence: ["Has an enterprise sales motion with named accounts."],
    },
    {
      id: "territory-complexity",
      name: "Territory complexity",
      status: "pass",
      evidence: ["AEs manage mixed territories with different account sizes."],
    },
  ],
  whyNow: [
    {
      id: "urgent-trigger",
      name: "Urgent buying trigger",
      status: "unknown",
    },
    {
      id: "active-reorg",
      name: "Active GTM reorg",
      status: "unknown",
    },
  ],
  whyUs: [
    {
      id: "pre-crm-fit",
      name: "Pre-CRM workflow fit",
      status: "pass",
      evidence: ["Account prioritization appears to happen before CRM execution."],
    },
  ],
};

const whyThemFailBlocksSkip: CompanyEvaluationInput = {
  companyName: "PixelForge",
  productName: "GTM Brain",
  whyThem: [
    {
      id: "no-enterprise-motion",
      name: "No enterprise sales motion",
      status: "fail",
      evidence: [
        "Company relies on a self-serve PLG motion with no named enterprise AEs.",
      ],
    },
  ],
  whyNow: [
    {
      id: "recent-funding-round",
      name: "Recent funding round",
      status: "pass",
      evidence: ["Closed a Series C round two months ago."],
    },
  ],
  whyUs: [
    {
      id: "fits-pre-crm-workflow",
      name: "Fits pre-CRM workflow",
      status: "pass",
      evidence: ["Account prioritization happens before CRM execution."],
    },
  ],
};

const whyUsFailBlocksSkip: CompanyEvaluationInput = {
  companyName: "Harborlight Freight",
  productName: "GTM Brain",
  whyThem: [
    {
      id: "enterprise-sales-team",
      name: "Enterprise sales team",
      status: "pass",
      evidence: ["Has a dedicated enterprise sales team with named accounts."],
    },
  ],
  whyNow: [
    {
      id: "active-reorg",
      name: "Active GTM reorg",
      status: "pass",
      evidence: ["Recently restructured their sales org into new territories."],
    },
  ],
  whyUs: [
    {
      id: "post-crm-workflow",
      name: "Problem lives inside CRM",
      status: "fail",
      evidence: [
        "Their prioritization problem happens after opportunities are already created in CRM.",
      ],
    },
  ],
};

const whyNowFailStaysMonitor: CompanyEvaluationInput = {
  companyName: "GraniteWorks Manufacturing",
  productName: "GTM Brain",
  whyThem: [
    {
      id: "enterprise-sales-team",
      name: "Enterprise sales team",
      status: "pass",
      evidence: ["Has an established enterprise sales team with named accounts."],
    },
  ],
  whyNow: [
    {
      id: "no-trigger-event",
      name: "No near-term trigger event",
      status: "fail",
      evidence: [
        "No funding, reorg, or expansion signals in the last two quarters.",
      ],
    },
  ],
  whyUs: [
    {
      id: "fits-pre-crm-workflow",
      name: "Fits pre-CRM workflow",
      status: "pass",
      evidence: ["Account prioritization happens before CRM execution."],
    },
  ],
};

const whyNowEmptyStaysMonitor: CompanyEvaluationInput = {
  companyName: "Solstice Analytics",
  productName: "GTM Brain",
  whyThem: [
    {
      id: "enterprise-sales-team",
      name: "Enterprise sales team",
      status: "pass",
      evidence: ["Has an enterprise sales motion with named accounts."],
    },
  ],
  whyNow: [],
  whyUs: [
    {
      id: "fits-pre-crm-workflow",
      name: "Fits pre-CRM workflow",
      status: "pass",
      evidence: ["Account prioritization happens before CRM execution."],
    },
  ],
};

type Scenario = {
  input: CompanyEvaluationInput;
  expectedDecision: RecommendationDecision;
  expectedConfidence: number;
};

const scenarios: Scenario[] = [
  { input: highPriorityAccount, expectedDecision: "Invest", expectedConfidence: 100 },
  { input: interestingButNotUrgent, expectedDecision: "Monitor", expectedConfidence: 60 },
  { input: whyThemFailBlocksSkip, expectedDecision: "Skip", expectedConfidence: 100 },
  { input: whyUsFailBlocksSkip, expectedDecision: "Skip", expectedConfidence: 100 },
  { input: whyNowFailStaysMonitor, expectedDecision: "Monitor", expectedConfidence: 100 },
  { input: whyNowEmptyStaysMonitor, expectedDecision: "Monitor", expectedConfidence: 67 },
];

for (const { input, expectedDecision, expectedConfidence } of scenarios) {
  const result = generateRecommendation(input);
  const decisionMatch = result.decision === expectedDecision;
  const confidenceMatch = result.confidence === expectedConfidence;

  console.log("Company:", input.companyName);
  console.log("Expected Decision:", expectedDecision);
  console.log("Actual Decision:", result.decision);
  console.log("Decision Match:", decisionMatch);
  console.log("Expected Confidence:", expectedConfidence);
  console.log("Actual Confidence:", result.confidence);
  console.log("Confidence Match:", confidenceMatch);
  console.log("Business Case:", result.businessCase);
  console.log("---");
}

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

type Scenario = {
  input: CompanyEvaluationInput;
  expectedDecision: RecommendationDecision;
};

const scenarios: Scenario[] = [
  { input: highPriorityAccount, expectedDecision: "Invest" },
  { input: interestingButNotUrgent, expectedDecision: "Monitor" },
];

for (const { input, expectedDecision } of scenarios) {
  const result = generateRecommendation(input);
  const match = result.decision === expectedDecision;

  console.log("Company:", input.companyName);
  console.log("Expected Decision:", expectedDecision);
  console.log("Actual Decision:", result.decision);
  console.log("Match:", match);
  console.log("Confidence:", result.confidence);
  console.log("Business Case:", result.businessCase);
  console.log("---");
}

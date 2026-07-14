import type { VendorProfile } from "./vendorProfile";

export const gtmBrainVendorProfile: VendorProfile = {
  id: "gtm-brain",
  vendorName: "GTM Brain",
  productKnowledge: {
    offering:
      "An outbound decision workspace that helps Enterprise AEs decide which accounts deserve their time before an opportunity exists.",
    customerProblems: [
      {
        id: "unstructured-prioritization",
        statement:
          "Enterprise AEs prioritize named accounts using fragmented evidence and inconsistent judgment.",
      },
      {
        id: "wasted-outbound-time",
        statement:
          "AEs spend scarce outbound time on accounts without enough fit, timing, or vendor relevance.",
      },
    ],
    desiredOutcomes: [
      {
        id: "focus-ae-time",
        statement: "Focus AE time on accounts that deserve active outbound investment now.",
        problemIds: ["unstructured-prioritization", "wasted-outbound-time"],
      },
      {
        id: "earn-meaningful-meeting",
        statement: "Earn a meaningful first meeting with a relevant company.",
        problemIds: ["wasted-outbound-time"],
      },
    ],
    buyingReasons: [
      {
        id: "protect-selling-capacity",
        statement:
          "Enterprise selling capacity is scarce, so account selection must justify the time invested.",
        outcomeIds: ["focus-ae-time", "earn-meaningful-meeting"],
      },
    ],
    capabilities: [
      {
        id: "evidence-based-evaluation",
        name: "Evidence-based account evaluation",
        description:
          "Organizes account evidence into Why Them, Why Now, and Why Us decision groups.",
        problemIds: ["unstructured-prioritization"],
        outcomeIds: ["focus-ae-time"],
      },
      {
        id: "explainable-recommendation",
        name: "Explainable recommendation",
        description:
          "Produces Invest, Monitor, or Skip with a business case, evidence, and next best action.",
        problemIds: ["unstructured-prioritization", "wasted-outbound-time"],
        outcomeIds: ["focus-ae-time", "earn-meaningful-meeting"],
      },
    ],
    useCases: [
      {
        id: "pre-crm-account-prioritization",
        name: "Pre-CRM account prioritization",
        description:
          "Evaluate a named account before opportunity creation and decide whether to invest outbound time.",
        problemIds: ["unstructured-prioritization", "wasted-outbound-time"],
        outcomeIds: ["focus-ae-time", "earn-meaningful-meeting"],
        capabilityIds: [
          "evidence-based-evaluation",
          "explainable-recommendation",
        ],
      },
    ],
    commonAlternatives: [
      {
        id: "spreadsheets-and-instinct",
        name: "Spreadsheets and AE instinct",
        description:
          "Account lists are prioritized manually using scattered research and individual judgment.",
      },
    ],
    relevantDifferentiation: [
      {
        id: "decision-before-crm",
        statement:
          "GTM Brain focuses on the decision before CRM and opportunity management, using explicit evidence instead of an opaque account score.",
        alternativeIds: ["spreadsheets-and-instinct"],
        problemIds: ["unstructured-prioritization"],
        outcomeIds: ["focus-ae-time"],
      },
    ],
    proofPoints: [
      {
        id: "engine-v1-scenarios",
        summary:
          "Recommendation Engine V1 consistently applies the approved decision behavior across automated scenarios.",
        metric: "6 automated scenarios passing",
        outcomeIds: ["focus-ae-time"],
        useCaseIds: ["pre-crm-account-prioritization"],
      },
    ],
  },
  decisionStrategy: {
    idealCustomerProfile: {
      criteria: [
        {
          id: "named-enterprise-accounts",
          description:
            "A vendor with Enterprise AEs responsible for a defined set of named accounts.",
        },
        {
          id: "complex-outbound-decision",
          description:
            "Account selection requires meaningful research and judgment before outreach.",
        },
      ],
      examples: [
        {
          id: "snowflake-example",
          companyName: "Snowflake",
          rationale:
            "Illustrates a complex enterprise sales motion where AEs manage strategic named accounts and must prioritize outbound investment.",
          criterionIds: [
            "named-enterprise-accounts",
            "complex-outbound-decision",
          ],
          relationship: "example-only",
        },
      ],
      firmographicDisqualifiers: [
        {
          id: "self-serve-only",
          condition:
            "The vendor has a self-serve-only motion with no Enterprise AEs or named accounts.",
          whyItMatters:
            "There is no enterprise account-prioritization workflow for GTM Brain to support.",
        },
      ],
    },
    targetPersonas: [
      {
        id: "enterprise-ae",
        roleOrTitle: "Enterprise Account Executive",
        problemIds: ["unstructured-prioritization", "wasted-outbound-time"],
        outcomeIds: ["focus-ae-time", "earn-meaningful-meeting"],
        whyThisPersonaMatters:
          "Owns the daily decision about which named accounts deserve outbound time.",
        firstMeetingAngle:
          "Show how evidence-based prioritization can protect time and improve the quality of first meetings.",
      },
      {
        id: "vp-sales",
        roleOrTitle: "VP Sales",
        problemIds: ["unstructured-prioritization"],
        outcomeIds: ["focus-ae-time"],
        whyThisPersonaMatters:
          "Owns sales productivity and the consistency of territory execution.",
        firstMeetingAngle:
          "Explore whether AEs apply a consistent standard when choosing accounts for outbound investment.",
      },
    ],
    whyNowSignals: [
      {
        id: "new-territories",
        signal: "The sales organization creates or reallocates enterprise territories.",
        whyItMatters:
          "AEs must quickly decide which unfamiliar accounts deserve attention first.",
        problemIds: ["unstructured-prioritization"],
        outcomeIds: ["focus-ae-time"],
        firstMeetingAngle:
          "Discuss how the team is prioritizing accounts across the new territory design.",
      },
      {
        id: "enterprise-expansion",
        signal: "The vendor is expanding its enterprise sales motion into a new market.",
        whyItMatters:
          "New-market AEs need a repeatable way to identify accounts that justify outbound investment.",
        problemIds: ["unstructured-prioritization", "wasted-outbound-time"],
        outcomeIds: ["focus-ae-time", "earn-meaningful-meeting"],
        firstMeetingAngle:
          "Explore how the new team will decide where to invest its first outbound cycles.",
      },
    ],
    redFlags: [
      {
        id: "no-named-account-motion",
        condition: "The company does not use named-account enterprise selling.",
        whyItMatters:
          "GTM Brain is designed for judgment-intensive enterprise account prioritization.",
        severity: "disqualifying",
        affectedDecisionGroups: ["whyThem"],
      },
      {
        id: "problem-after-opportunity",
        condition:
          "The prioritization problem exists only after an opportunity has already been created.",
        whyItMatters:
          "That workflow belongs inside CRM or opportunity management, outside GTM Brain's purpose.",
        severity: "disqualifying",
        affectedDecisionGroups: ["whyUs"],
      },
    ],
  },
};

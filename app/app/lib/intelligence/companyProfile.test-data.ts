/**
 * A fully-populated `CompanyProfile` literal, type-annotated against the
 * real contract in `./types/companyProfile.ts`. Its purpose is compile-time
 * verification: if this file fails to type-check during `npm run build`,
 * the CompanyProfile contract has a defect. `companyProfile.test.cts`
 * imports it to additionally check the runtime shape.
 *
 * The `connectedVendorItemId` values below are illustrative Vendor Profile
 * item ids (a `CustomerProblem.id` / `WhyNowSignal.id` / `Capability.id` /
 * `UseCase.id` from `vendorProfile.ts`) — this fixture does not depend on
 * any real Vendor Profile instance, per §10 Matching.
 */
import type { CompanyProfile } from "./types/companyProfile";

export const mockPopulatedCompanyProfile: CompanyProfile = {
  companyIdentity: {
    name: "NovaCart",
    url: "https://novacart.example",
  },
  companyCharacteristics: {
    description: "A mid-market e-commerce platform for specialty retailers.",
    isMultiCloud: true,
    dataScaleDescription: "Processes several million transactions per month across two cloud providers.",
  },
  relevantBusinessEvidence: [
    {
      claim: "NovaCart runs a multi-cloud architecture spanning AWS and GCP.",
      source: "https://novacart.example/engineering-blog/multi-cloud",
      date: "2026-05-12",
      connectedVendorItemId: "problem-multi-cloud-visibility",
      natureOfConnection: "explicit_fact",
      decisionImpact: "supportive",
    },
    {
      claim: "NovaCart is likely investing further in its data platform to support continued growth.",
      source: "https://novacart.example/careers",
      date: "2026-06-01",
      connectedVendorItemId: "problem-multi-cloud-visibility",
      natureOfConnection: "ai_interpretation",
      decisionImpact: "supportive",
    },
  ],
  whyNowEvidence: [
    {
      claim: "NovaCart recently opened a new enterprise sales territory.",
      source: "https://novacart.example/newsroom/new-territory",
      date: "2026-06-20",
      connectedVendorItemId: "signal-new-territory-expansion",
      natureOfConnection: "explicit_fact",
      decisionImpact: "supportive",
    },
  ],
  whyUsEvidence: [
    {
      claim: "NovaCart's engineering blog references struggling to unify cost and usage data across cloud providers, matching our unified cost-visibility capability.",
      source: "https://novacart.example/engineering-blog/multi-cloud",
      date: "2026-05-12",
      connectedVendorItemId: "capability-unified-cost-visibility",
      natureOfConnection: "ai_interpretation",
      decisionImpact: "supportive",
    },
    {
      claim: "NovaCart currently relies on a manual spreadsheet-based process for cross-cloud cost allocation, a common alternative our product replaces.",
      source: "https://novacart.example/careers/data-platform-engineer",
      date: "2026-06-01",
      connectedVendorItemId: "alternative-manual-spreadsheets",
      natureOfConnection: "ai_interpretation",
      decisionImpact: "neutral",
    },
  ],
  relevantRoles: ["VP Engineering", "Director of Data Platform"],
  redFlags: ["No named-account enterprise selling motion found."],
};

import type { GtmBriefExecutive } from "../../types/gtm-brief";
import type { DecisionEngineInput } from "./types";

export function generateMockDecision(input: DecisionEngineInput): GtmBriefExecutive {
  const name = input.companyName.trim() || "this account";

  const firstPersona = {
    title: "VP Engineering",
    whyTheyMatter:
      "Owns engineering velocity and is best positioned to validate whether deployment friction is blocking the roadmap.",
  };

  return {
    opportunityScore: 91,
    priority: "High Priority",
    opportunityExplanation: `${name} shows strong ICP alignment, active modernization signals, and a credible path to a first meeting within the next 30 days.`,
    whyThisAccount: [
      `${name} operates at enterprise scale with multiple product lines and a distributed engineering org.`,
      "Platform modernization and deployment efficiency are likely board-level priorities.",
      "Budget and complexity suggest meaningful upside for a unified delivery platform.",
    ],
    topPain: [
      "Deployment pipelines are fragmented across teams, slowing release cadence.",
      "Global latency and edge performance are becoming customer-visible issues.",
      "Platform teams are stretched thin supporting multiple stacks and AI workloads.",
    ],
    firstPersona,
    recommendedNextAction: `Request a 20-minute discovery call with the VP Engineering to validate deployment bottlenecks and explore how ${name} is supporting AI initiatives at scale.`,
    opportunityLabel: "High Priority",
    bestFirstPersona: firstPersona,
  };
}

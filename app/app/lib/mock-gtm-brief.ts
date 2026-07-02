import type { GtmBrief, GtmBriefExecutive } from "../types/gtm-brief";

function buildExecutive(name: string): GtmBriefExecutive {
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

export function getMockGtmBrief(companyName: string): GtmBrief {
  const name = companyName.trim() || "this account";
  const executive = buildExecutive(name);

  const peopleToTalkTo = [
    {
      title: "VP Engineering",
      whyTheyMatter: "Owns engineering velocity and platform investment priorities.",
      whatTheyCareAbout: "Release speed, team productivity, and predictable delivery at scale.",
      relevantPain: "Fragmented tooling and slow deployment cycles blocking roadmap execution.",
      messageAngle:
        "Show how a unified platform reduces coordination overhead and accelerates time-to-market.",
      discoveryQuestion:
        "Where do deployment or infrastructure bottlenecks most often delay your product roadmap?",
    },
    {
      title: "Head of Platform / Infrastructure",
      whyTheyMatter: "Evaluates architecture decisions and operational trade-offs.",
      whatTheyCareAbout: "Reliability, cost efficiency, and a sustainable platform strategy.",
      relevantPain: "Managing complexity across regions, stacks, and growing AI workloads.",
      messageAngle:
        "Position edge-native infrastructure as a way to simplify operations while improving performance.",
      discoveryQuestion:
        "How are you balancing global performance requirements with platform team capacity today?",
    },
    {
      title: "Head of AI / Product Engineering",
      whyTheyMatter: "Driving AI features that depend on fast, reliable delivery infrastructure.",
      whatTheyCareAbout: "Shipping AI experiences quickly without compromising security or UX.",
      relevantPain: "Prototype-to-production gaps and inconsistent deployment patterns for AI workloads.",
      messageAngle:
        "Connect platform modernization to faster iteration on AI-powered customer experiences.",
      discoveryQuestion:
        "What is slowing your team from moving AI experiments into production reliably?",
    },
  ];

  return {
    companyName: name,
    opportunityScore: executive.opportunityScore,
    priority: executive.priority,
    opportunityExplanation: executive.opportunityExplanation,
    whyThisAccount: executive.whyThisAccount,
    topPain: executive.topPain,
    firstPersona: executive.firstPersona,
    recommendedNextAction: executive.recommendedNextAction,
    executive,
    executiveSummary: `${name} is a growth-stage enterprise scaling digital products across multiple regions. Engineering teams are shipping faster, but platform complexity, deployment friction, and rising infrastructure costs are creating pressure to modernize how they build and deliver software at scale.`,
    icpFit: `Strong fit. ${name} operates at enterprise scale with multiple product lines, a distributed engineering organization, and clear signs of platform modernization. They match the profile of companies investing in developer velocity, edge performance, and infrastructure efficiency.`,
    whyNow: `Recent hiring in platform and infrastructure roles, public emphasis on AI-powered product experiences, and typical enterprise renewal cycles suggest a near-term window to influence architecture decisions before commitments harden.`,
    whyUs: `We help enterprises like ${name} ship faster with a unified platform for frontend, edge, and AI workloads — reducing operational overhead while improving performance, security, and developer experience across teams.`,
    buyingSignals: [
      "Open roles for platform, DevOps, or developer experience leadership.",
      "Public statements about digital transformation or product velocity.",
      "Signs of multi-region expansion or increased traffic expectations.",
      "Engineering blog posts discussing modernization, microservices, or edge strategy.",
    ],
    peopleToTalkTo,
    suggestedOutreach: `Lead with a point of view on how companies like ${name} are reducing deployment friction while scaling globally. Reference a relevant signal — hiring, product expansion, or public modernization themes — and offer a concise perspective on where platform investments typically unlock the fastest ROI.`,
    discoveryQuestions: peopleToTalkTo.map((persona) => persona.discoveryQuestion),
  };
}

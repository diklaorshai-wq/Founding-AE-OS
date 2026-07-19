import type { CompanyProfile, EvidenceClaim } from "./types/contracts";

function claim(claimId: string, claimSummary: string): EvidenceClaim {
  return {
    claimId,
    claimNature: "explicit_fact",
    claimSummary,
    underlyingSources: [
      {
        sourceUrl: "https://example.com/about",
        sourceTitle: "About page",
        capturedTimestamp: "2026-07-16T00:00:00.000Z",
      },
    ],
  };
}

const emptyGroup = { claims: [] as EvidenceClaim[] };

/**
 * Every ICP criterion, why-now signal, and differentiation has matching evidence;
 * no red flag triggers. Each claim intentionally contains the vendor's exact
 * phrase (matched case-insensitively, including trailing punctuation) followed
 * by a separate sentence, since the adapter's matcher requires an unbroken
 * substring match rather than semantic similarity.
 */
export const fullMatchProfile: CompanyProfile = {
  submittedDomain: "novacart.example",
  accountName: "NovaCart",
  firmographicData: {
    claims: [
      claim(
        "firmo-1",
        "NovaCart is a vendor with Enterprise AEs responsible for a defined set of named accounts. This structure supports enterprise-scale outbound programs.",
      ),
      claim(
        "firmo-2",
        "Account selection requires meaningful research and judgment before outreach. NovaCart applies this consistently across its named accounts.",
      ),
    ],
  },
  coreBusinessActivities: {
    claims: [
      claim(
        "core-1",
        "Public materials indicate that GTM Brain focuses on the decision before CRM and opportunity management, using explicit evidence instead of an opaque account score. NovaCart's evaluation approach mirrors this framework.",
      ),
    ],
  },
  corporateAnnouncements: {
    claims: [
      claim(
        "announce-1",
        "The sales organization creates or reallocates enterprise territories. NovaCart completed this restructuring this quarter.",
      ),
    ],
  },
  hiringAndRoleTrends: {
    claims: [
      claim(
        "hiring-1",
        "The vendor is expanding its enterprise sales motion into a new market. NovaCart is hiring aggressively to support this expansion.",
      ),
    ],
  },
  observedTechnologies: emptyGroup,
};

/** Only firmographic evidence exists; corporate announcements and hiring trends are missing entirely. */
export const partialMatchProfile: CompanyProfile = {
  submittedDomain: "cloudledger.example",
  accountName: "CloudLedger",
  firmographicData: {
    claims: [
      claim(
        "firmo-1",
        "CloudLedger is a vendor with Enterprise AEs responsible for a defined set of named accounts. This is a long-standing structure.",
      ),
    ],
  },
  coreBusinessActivities: {
    claims: [
      claim(
        "core-1",
        "Public materials indicate that GTM Brain focuses on the decision before CRM and opportunity management, using explicit evidence instead of an opaque account score. CloudLedger emphasizes a similar approach.",
      ),
    ],
  },
  corporateAnnouncements: emptyGroup,
  hiringAndRoleTrends: emptyGroup,
  observedTechnologies: emptyGroup,
};

/** Contains direct evidence of a disqualifying red flag condition ("no-named-account-motion"). */
export const disqualifyingRedFlagProfile: CompanyProfile = {
  submittedDomain: "pixelforge.example",
  accountName: "PixelForge",
  firmographicData: {
    claims: [
      claim(
        "firmo-1",
        "PixelForge relies on a self-serve PLG motion. The company does not use named-account enterprise selling.",
      ),
    ],
  },
  coreBusinessActivities: emptyGroup,
  corporateAnnouncements: emptyGroup,
  hiringAndRoleTrends: emptyGroup,
  observedTechnologies: emptyGroup,
};

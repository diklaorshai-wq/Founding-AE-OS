/**
 * Pure, DOM-free state and validation logic for the Vendor Onboarding
 * "Refinement Mode" UI (Step B). Kept separate from the React component
 * (`app/components/vendor-refinement-mode.tsx`) so it can be exercised by a
 * plain Node test (`.test.cts`) without a DOM or JSX runtime, following this
 * repository's existing test convention.
 *
 * Isolation boundaries:
 * - Does not import or modify `recommendationEngine.ts`.
 * - Does not modify `types/contracts.ts` or the `VendorProfile` type
 *   definitions in `vendorProfile.ts`.
 * - "Final validation against the actual VendorProfile schema" reuses the
 *   existing `validateVendorProfile` referential-integrity checks
 *   unchanged — no new Zod schema or VendorProfile shape is introduced.
 */
import type {
  Capability,
  CustomerProblem,
  DesiredOutcome,
  RedFlag,
  RedFlagSeverity,
  VendorProfile,
  WhyNowSignal,
} from "./vendorProfile";
import { createEmptyVendorProfile } from "./vendorOnboarding.ts";
import { validateVendorProfile } from "./vendorProfileValidation.ts";

export interface VendorIdentityDraft {
  id: string;
  websiteUrl: string;
  vendorName: string;
}

/**
 * Builds the full editable draft `VendorProfile` the Refinement Mode UI
 * starts from: Step A's AI-derived `Partial<VendorProfile>` (offering,
 * capabilities, customerProblems, desiredOutcomes, whyNowSignals, redFlags)
 * layered onto a structurally valid, empty bootstrap. Vendor identity
 * (id/websiteUrl/vendorName) belongs to a separate, earlier onboarding
 * stage — it's accepted here only so a complete `VendorProfile` can be
 * assembled for validation and saving.
 */
export function buildRefinementDraft(
  partialProfile: Partial<VendorProfile>,
  identity?: Partial<VendorIdentityDraft>,
): VendorProfile {
  const empty = createEmptyVendorProfile(identity?.id ?? "", identity?.vendorName ?? "");

  return {
    ...empty,
    websiteUrl: identity?.websiteUrl ?? empty.websiteUrl,
    productKnowledge: partialProfile.productKnowledge ?? empty.productKnowledge,
    decisionStrategy: partialProfile.decisionStrategy ?? empty.decisionStrategy,
  };
}

export interface RefinementValidationResult {
  isValid: boolean;
  errors: string[];
  profile: VendorProfile;
}

/**
 * The "Approve & Save" action: re-validates the user-edited draft against
 * the real `VendorProfile` referential-integrity rules (unchanged from
 * `vendorProfileValidation.ts`) before it is allowed to be saved. The save
 * mechanism itself is intentionally the caller's responsibility (see the
 * `onApprove` prop on `VendorRefinementMode`) since no persisted-profile
 * store exists yet.
 */
export function validateRefinementDraft(draft: VendorProfile): RefinementValidationResult {
  const errors = validateVendorProfile(draft);
  return { isValid: errors.length === 0, errors, profile: draft };
}

function shortId(prefix: string): string {
  const unique =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${unique.slice(0, 8)}`;
}

/** Factories for the blank rows the UI appends when the user clicks "Add". Each gets a fresh, unique id so it never collides with an AI-generated one. */
export function createBlankCustomerProblem(): CustomerProblem {
  return { id: shortId("problem"), statement: "", impact: "" };
}

export function createBlankDesiredOutcome(): DesiredOutcome {
  return { id: shortId("outcome"), statement: "", problemIds: [] };
}

export function createBlankCapability(): Capability {
  return { id: shortId("capability"), name: "", description: "", problemIds: [], outcomeIds: [] };
}

export function createBlankWhyNowSignal(): WhyNowSignal {
  return {
    id: shortId("signal"),
    signal: "",
    whyItMatters: "",
    problemIds: [],
    outcomeIds: [],
    firstMeetingAngle: "",
  };
}

export function createBlankRedFlag(): RedFlag {
  return {
    id: shortId("red-flag"),
    condition: "",
    whyItMatters: "",
    severity: "cautionary" as RedFlagSeverity,
    affectedDecisionGroups: [],
  };
}

/** Parses a comma-separated id list from a text input back into a string array, trimming whitespace and dropping empties. Used for the (simplified, text-based) editing of cross-reference fields like `problemIds`/`outcomeIds`. */
export function parseIdList(rawValue: string): string[] {
  return rawValue
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

/** Inverse of `parseIdList`, for populating a comma-separated text input from an existing id array. */
export function formatIdList(ids: string[]): string {
  return ids.join(", ");
}

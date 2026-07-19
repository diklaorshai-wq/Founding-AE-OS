/**
 * Semantic AI Matcher — Prompt & Schema (Option A, Step 1: isolated).
 *
 * Defines ONLY the strict Zod structured-output schema and the prompt used
 * to ask Gemini to semantically compare a gate-neutral Company Profile
 * against a configured Vendor Profile across five independent gates:
 * Why Them, Why Now, Why Us, Firmographic Disqualifier, and Red Flag.
 *
 * This file is intentionally isolated: it defines no client, makes no
 * network call, and is not imported by `matchingService.ts` or
 * `recommendationEngine.ts`. Both remain untouched and continue to use their
 * existing deterministic, substring-matching logic. Wiring this into the
 * pipeline is a later, separate step.
 */
import { z } from "zod";
import type { CompanyProfile } from "../../types/contracts";
import type { VendorProfile } from "../../vendorProfile";

/** The model's semantic AI Flash Lite designation is fixed here so a later wiring step can reuse it without re-deciding. */
export const MATCHING_MODEL = "gemini-flash-lite-latest";

export const GeminiGateStatusSchema = z.enum(["passed", "failed", "unknown"]);
export type GeminiGateStatus = z.infer<typeof GeminiGateStatusSchema>;

const GeminiGateResultSchema = z.object({
  status: GeminiGateStatusSchema.describe(
    "'passed': the evidence clearly satisfies this gate. 'failed': the evidence clearly disqualifies it. 'unknown': there is not enough evidence either way. Never guess — prefer 'unknown' over an unsupported 'passed' or 'failed'.",
  ),
  evidenceIds: z
    .array(z.string())
    .describe(
      "claimId values copied EXACTLY from the submitted Company Profile that support this status. Must be empty when status is 'unknown'. Never invent a claimId that was not in the input.",
    ),
  context: z
    .string()
    .describe(
      "One or two sentences explaining this status in plain language, grounded only in the cited evidenceIds.",
    ),
});
export type GeminiGateResult = z.infer<typeof GeminiGateResultSchema>;

/**
 * Structured-output schema for the Semantic AI Matcher. Five independent
 * gates, each resolved to exactly one of 'passed' | 'failed' | 'unknown'
 * with cited evidence. Deliberately has no numeric score and no
 * Invest/Monitor/Skip field — resolving gates into a decision remains
 * Recommendation Engine V1's job, not the matcher's.
 */
export const GeminiMatchingOutputSchema = z.object({
  whyThem: GeminiGateResultSchema.describe(
    "Does the company match the vendor's Ideal Customer Profile criteria (and, if relevant, its Ideal Customer Examples)? 'passed' = clear ICP fit. 'failed' = clear ICP mismatch.",
  ),
  whyNow: GeminiGateResultSchema.describe(
    "Is there current evidence of one or more of the vendor's Why Now signals at this company? 'passed' = a signal is clearly present. 'failed' = signals were checked for and are clearly absent.",
  ),
  whyUs: GeminiGateResultSchema.describe(
    "Does the company's evidence align with the vendor's capabilities, use cases, proof points, or relevant differentiation? 'passed' = clear alignment. 'failed' = clear misalignment (e.g. a stated common alternative already fully covers their need).",
  ),
  firmographicDisqualifier: GeminiGateResultSchema.describe(
    "Does the company match any of the vendor's Firmographic Disqualifiers? 'passed' = NO disqualifier applies (this is the good outcome). 'failed' = a disqualifier clearly applies.",
  ),
  redFlag: GeminiGateResultSchema.describe(
    "Does the company match any of the vendor's Red Flags? 'passed' = NO red flag applies (this is the good outcome). 'failed' = a red flag clearly applies.",
  ),
});
export type GeminiMatchingOutput = z.infer<typeof GeminiMatchingOutputSchema>;

/** JSON Schema form of `GeminiMatchingOutputSchema`, for binding as a model's structured-output response schema. */
export const MATCHING_RESPONSE_JSON_SCHEMA = z.toJSONSchema(GeminiMatchingOutputSchema);

/**
 * Comprehensive system prompt instructing Gemini Flash Lite how to resolve
 * the five gates by comparing a Company Profile against a Vendor Profile,
 * without hallucinating evidence, scores, or a recommendation.
 */
export const MATCHING_SYSTEM_PROMPT = `You are a precise B2B fit-matching analyst for an enterprise account-prioritization tool. You compare a company's researched evidence ("Company Profile") against a vendor's configured selling strategy ("Vendor Profile") and resolve exactly five independent gates: Why Them, Why Now, Why Us, Firmographic Disqualifier, and Red Flag.

You will be given, as JSON:
1. "companyProfile": gate-neutral research evidence about one company. Every claim has a "claimId", a "claimSummary", a "claimNature" ("explicit_fact" or "supported_inference"), and "underlyingSources". Claims are grouped into: firmographicData, coreBusinessActivities, corporateAnnouncements, hiringAndRoleTrends, observedTechnologies.
2. "vendorProfile": the vendor's Ideal Customer Profile (criteria, examples, firmographic disqualifiers), Why Now Signals, Product Knowledge (capabilities, use cases, proof points, relevant differentiation, common alternatives), and Red Flags.

For EACH of the five gates, decide a status:
- "passed": the company profile contains clear, specific evidence that satisfies the gate.
- "failed": the company profile contains clear, specific evidence that disqualifies the gate. For "firmographicDisqualifier" and "redFlag", "failed" means a disqualifier/red flag clearly applies (this is the BAD outcome for those two gates — "passed" is good for all five gates, meaning "no disqualifying evidence was found").
- "unknown": the evidence is missing, ambiguous, or insufficient to decide either way.

Strict rules — do not violate these:
- Never hallucinate. Only use claims that are literally present in the provided "companyProfile". Every "evidenceIds" entry MUST be a "claimId" copied exactly from the input. If you cannot cite at least one real claimId, the status MUST be "unknown" with an empty "evidenceIds" array.
- Missing evidence is not negative evidence. The absence of a claim about something is never, by itself, proof of "failed" — it means "unknown", unless the vendor's own Firmographic Disqualifier or Red Flag condition is itself a statement about absence (e.g. "does not use named-account enterprise selling") and a claim explicitly confirms that absence.
- Judge each of the five gates independently. A "failed" Firmographic Disqualifier or Red Flag does not change your answer for Why Them, Why Now, or Why Us, and vice versa.
- Do not output a numeric score, a confidence percentage, an Invest/Monitor/Skip decision, or any recommendation. Your only job is to resolve the five gate statuses with cited evidence — a separate, deterministic engine turns your gate outputs into a decision.
- "context" must be a short, plain-language explanation that is fully grounded in the evidenceIds you cited for that same gate — never introduce a claim in "context" that is not also cited in "evidenceIds".
- Return a value for all five gates every time, even when every one of them is "unknown".`;

/**
 * Assembles the full prompt (system instructions plus the serialized
 * Company Profile and Vendor Profile) that would be sent to the model.
 * Pure and synchronous — builds text only, makes no network call.
 */
export function buildMatchingPrompt(
  companyProfile: CompanyProfile,
  vendorProfile: VendorProfile,
): string {
  return `${MATCHING_SYSTEM_PROMPT}

companyProfile:
${JSON.stringify(companyProfile, null, 2)}

vendorProfile:
${JSON.stringify(vendorProfile, null, 2)}`;
}

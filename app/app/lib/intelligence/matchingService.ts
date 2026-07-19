/**
 * Semantic AI adapter from AI-derived research (CompanyProfile) plus static
 * vendor configuration (VendorProfile) to the Recommendation Engine V1 input
 * contract (CompanyEvaluationInput). Recommendation Engine V1 itself
 * (./recommendationEngine.ts) is not modified by this file.
 *
 * Option A: this now resolves the five semantic gates (Why Them, Why Now,
 * Why Us, Firmographic Disqualifier, Red Flag) with a single structured
 * Gemini Flash Lite call, using the strict schema and system prompt defined
 * in `./providers/gemini/matchingPrompt.ts`, instead of the earlier
 * deterministic substring-matching heuristic.
 *
 * Rules enforced here:
 * - A gate with no supporting AI evidence resolves to "unknown", never
 *   guessed as "pass" or "fail". This is now enforced by instructing the
 *   model (see `MATCHING_SYSTEM_PROMPT`) rather than by string-matching, but
 *   the contract with callers is unchanged.
 * - Every "evidenceIds" value the model cites is verified against the real
 *   claims in the submitted CompanyProfile before being trusted; any id that
 *   does not exist in the profile is silently dropped rather than trusted.
 * - `mapToEvaluationInput` never throws: a missing API key, network error,
 *   malformed response, or schema violation degrades every gate to
 *   "unknown" (with a `context` explaining why) instead of failing the
 *   caller, matching `researchCompany`'s error-handling philosophy.
 */
import { GoogleGenAI } from "@google/genai";
import type { CompanyEvaluationInput, EvaluationGate, GateStatus } from "./recommendationEngine";
import type { CompanyProfile } from "./types/contracts";
import type { VendorProfile } from "./vendorProfile";
import {
  GeminiMatchingOutputSchema,
  MATCHING_MODEL,
  MATCHING_RESPONSE_JSON_SCHEMA,
  buildMatchingPrompt,
  type GeminiGateResult,
  type GeminiMatchingOutput,
} from "./providers/gemini/matchingPrompt.ts";

type ClaimLike = CompanyProfile["firmographicData"]["claims"][number];

function collectAllClaims(profile: CompanyProfile): ClaimLike[] {
  return [
    ...profile.firmographicData.claims,
    ...profile.coreBusinessActivities.claims,
    ...profile.corporateAnnouncements.claims,
    ...profile.hiringAndRoleTrends.claims,
    ...profile.observedTechnologies.claims,
  ];
}

interface MatchModelCallInput {
  prompt: string;
  responseJsonSchema: unknown;
}

interface MatchModelCallResult {
  text: string | undefined;
}

type MatchModelCaller = (input: MatchModelCallInput) => Promise<MatchModelCallResult>;

/** No tools (URL context, Search Grounding) are needed here: the model only reasons over the profile/vendor JSON already embedded in the prompt. */
function createLiveMatchModelCaller(apiKey: string, model: string): MatchModelCaller {
  const client = new GoogleGenAI({ apiKey });

  return async ({ prompt, responseJsonSchema }) => {
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema,
      },
    });

    return { text: response.text };
  };
}

function parseMatchingOutput(rawText: string | undefined): GeminiMatchingOutput | null {
  if (!rawText) {
    return null;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    return null;
  }

  const parsed = GeminiMatchingOutputSchema.safeParse(parsedJson);
  return parsed.success ? parsed.data : null;
}

/** Every gate degrades to this when the model can't be called or returns something unusable, so a caller never receives a fabricated pass/fail. */
function degradedMatchingOutput(reason: string): GeminiMatchingOutput {
  const gate: GeminiGateResult = { status: "unknown", evidenceIds: [], context: reason };
  return {
    whyThem: gate,
    whyNow: gate,
    whyUs: gate,
    firmographicDisqualifier: gate,
    redFlag: gate,
  };
}

async function resolveMatchingOutput(
  profile: CompanyProfile,
  vendor: VendorProfile,
  call: MatchModelCaller | undefined,
): Promise<GeminiMatchingOutput> {
  let caller = call;

  if (!caller) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return degradedMatchingOutput(
        "GEMINI_API_KEY is not configured, so the AI matcher could not be called.",
      );
    }
    caller = createLiveMatchModelCaller(apiKey, process.env.GEMINI_MATCHING_MODEL ?? MATCHING_MODEL);
  }

  try {
    const { text } = await caller({
      prompt: buildMatchingPrompt(profile, vendor),
      responseJsonSchema: MATCHING_RESPONSE_JSON_SCHEMA,
    });

    const parsed = parseMatchingOutput(text);
    if (!parsed) {
      return degradedMatchingOutput(
        "The AI matcher returned an empty response or one that did not match the expected schema.",
      );
    }
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return degradedMatchingOutput(`The AI matcher request failed: ${message}`);
  }
}

const STATUS_MAP: Record<GeminiGateResult["status"], GateStatus> = {
  passed: "pass",
  failed: "fail",
  unknown: "unknown",
};

/**
 * Converts one semantic gate result into Recommendation Engine V1's
 * `EvaluationGate` shape, keeping both the AI's short reasoning (`context`)
 * and the evidence chain (`evidenceIds`, resolved to their claim text and
 * tagged with the claimId) inside the fixed `evidence: string[]` field.
 * Any cited evidenceId that isn't a real claim in this CompanyProfile is
 * dropped rather than trusted.
 */
function toEvaluationGate(
  id: string,
  name: string,
  result: GeminiGateResult,
  claimSummaryById: Map<string, string>,
): EvaluationGate {
  const citedEvidence = result.evidenceIds
    .filter((claimId) => claimSummaryById.has(claimId))
    .map((claimId) => `[${claimId}] ${claimSummaryById.get(claimId)}`);

  return {
    id,
    name,
    status: STATUS_MAP[result.status],
    evidence: [result.context, ...citedEvidence],
  };
}

/**
 * Maps AI-derived company research and static vendor configuration onto
 * Recommendation Engine V1's input contract via a single structured Gemini
 * Flash Lite call. Pass `overrides.call` to inject a fake model call (e.g.
 * for offline tests or the mock smoke run) instead of hitting the live API.
 */
export async function mapToEvaluationInput(
  profile: CompanyProfile,
  vendor: VendorProfile,
  overrides?: { call?: MatchModelCaller },
): Promise<CompanyEvaluationInput> {
  const claimSummaryById = new Map(
    collectAllClaims(profile).map((claim) => [claim.claimId, claim.claimSummary]),
  );

  const matchResult = await resolveMatchingOutput(profile, vendor, overrides?.call);

  const whyThem: EvaluationGate[] = [
    toEvaluationGate("ai-why-them", "Why Them (AI-assessed ICP fit)", matchResult.whyThem, claimSummaryById),
    toEvaluationGate(
      "ai-firmographic-disqualifier",
      "Firmographic Disqualifier (AI-assessed)",
      matchResult.firmographicDisqualifier,
      claimSummaryById,
    ),
  ];

  const whyNow: EvaluationGate[] = [
    toEvaluationGate("ai-why-now", "Why Now (AI-assessed signal)", matchResult.whyNow, claimSummaryById),
  ];

  const whyUs: EvaluationGate[] = [
    toEvaluationGate("ai-why-us", "Why Us (AI-assessed product fit)", matchResult.whyUs, claimSummaryById),
    toEvaluationGate("ai-red-flag", "Red Flag (AI-assessed)", matchResult.redFlag, claimSummaryById),
  ];

  return {
    companyName: profile.accountName,
    productName: vendor.vendorName,
    whyThem,
    whyNow,
    whyUs,
  };
}

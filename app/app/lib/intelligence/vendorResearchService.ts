/**
 * Step A of the two-stage Vendor Onboarding pipeline: turns raw text
 * evidence about a vendor (website copy, uploaded documents, news, job
 * posts) into a partial Vendor Profile.
 *
 * Model-agnostic and fully isolated:
 * - Does not import or modify `recommendationEngine.ts` or its deterministic
 *   decision logic.
 * - Does not change any Zod schema in `types/contracts.ts`, nor the
 *   `VendorProfile` structures in `vendorProfile.ts`. The AI-facing
 *   structured-output schema below is defined and owned locally, matching
 *   the convention in `providers/gemini/index.ts`.
 * - `ResearchOptions.provider` is a plain string union ('gemini' | 'openai'
 *   | 'claude'). Only "gemini" is wired to a real call today; any other
 *   value (or a Gemini call that fails for any reason: missing API key,
 *   network error, malformed JSON, schema violation) degrades to the same
 *   empty-but-valid bootstrapped profile rather than throwing, so this
 *   function is always safe to call. This keeps swapping in OpenAI or
 *   Claude later a matter of adding another branch, not changing the
 *   contract or any caller.
 */
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { VendorProfile } from "./vendorProfile";
import { createEmptyVendorProfile } from "./vendorOnboarding.ts";

export type ResearchSourceType = "website" | "document" | "news" | "job_post";

/** One raw text source to research, e.g. a scraped website page, an uploaded document, a news article, or a job posting. */
export interface ResearchSource {
  sourceId: string;
  content: string;
  sourceType: ResearchSourceType;
}

export type ResearchProvider = "gemini" | "openai" | "claude";

export interface ResearchOptions {
  /** Defaults to "gemini" when omitted. */
  provider?: ResearchProvider;
}

const DEFAULT_PROVIDER: ResearchProvider = "gemini";
const DEFAULT_MODEL = "gemini-flash-lite-latest";

/**
 * AI-facing structured-output schema. Narrower than `VendorProfile`: it only
 * covers the fields this step is responsible for extracting (offering,
 * capabilities, customerProblems, desiredOutcomes, whyNowSignals, redFlags).
 * The model must invent its own short, kebab-case ids and may only
 * cross-reference ids it also defines in this same response — mirroring how
 * `providers/gemini/index.ts` has claims self-reference via
 * `inferenceParentIds`.
 */
const GeminiCustomerProblemSchema = z.object({
  id: z.string().describe("Short, unique, kebab-case id, e.g. 'unstructured-prioritization'."),
  statement: z.string(),
  impact: z.string(),
});

const GeminiDesiredOutcomeSchema = z.object({
  id: z.string(),
  statement: z.string(),
  problemIds: z
    .array(z.string())
    .describe("Must reference \"id\" values from \"customerProblems\" in this same response."),
});

const GeminiCapabilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  problemIds: z.array(z.string()).describe("Must reference ids already defined in this same response."),
  outcomeIds: z.array(z.string()).describe("Must reference ids already defined in this same response."),
});

const GeminiWhyNowSignalSchema = z.object({
  id: z.string(),
  signal: z.string(),
  whyItMatters: z.string(),
  problemIds: z.array(z.string()).describe("Must reference ids already defined in this same response."),
  outcomeIds: z.array(z.string()).describe("Must reference ids already defined in this same response."),
  firstMeetingAngle: z.string(),
});

const GeminiRedFlagSchema = z.object({
  id: z.string(),
  condition: z.string(),
  whyItMatters: z.string(),
  severity: z.enum(["cautionary", "disqualifying"]),
  affectedDecisionGroups: z.array(z.enum(["whyThem", "whyUs"])),
});

const GeminiVendorResearchOutputSchema = z.object({
  offering: z.string(),
  customerProblems: z.array(GeminiCustomerProblemSchema),
  desiredOutcomes: z.array(GeminiDesiredOutcomeSchema),
  capabilities: z.array(GeminiCapabilitySchema),
  whyNowSignals: z.array(GeminiWhyNowSignalSchema),
  redFlags: z.array(GeminiRedFlagSchema),
});
type GeminiVendorResearchOutput = z.infer<typeof GeminiVendorResearchOutputSchema>;

const RESEARCH_RESPONSE_JSON_SCHEMA = z.toJSONSchema(GeminiVendorResearchOutputSchema);

function buildResearchPrompt(sources: ResearchSource[]): string {
  const aggregatedSources = sources
    .map((source) => `--- Source: ${source.sourceId} (${source.sourceType}) ---\n${source.content}`)
    .join("\n\n");

  return `You are a meticulous B2B vendor research analyst. Extract ONLY what is explicitly stated or reasonably inferable from the sources below about this vendor's OWN product and go-to-market strategy. Never invent facts that are not grounded in the sources.

Sources:
${aggregatedSources || "(no sources were provided)"}

Extract and return:
- "offering": one or two sentences describing what the vendor sells.
- "customerProblems": the customer problems this vendor's offering addresses. Assign each a short, unique, kebab-case "id".
- "desiredOutcomes": outcomes customers want. Each entry's "problemIds" MUST reference "id" values from "customerProblems" above, from this same response.
- "capabilities": product capabilities. Each entry's "problemIds"/"outcomeIds" MUST reference ids already defined above in this same response.
- "whyNowSignals": timing signals suggesting a customer should act now. Each entry's "problemIds"/"outcomeIds" MUST reference ids already defined above in this same response.
- "redFlags": conditions that would disqualify or caution against pursuing a customer. Each needs a "severity" of "cautionary" or "disqualifying" and "affectedDecisionGroups" chosen from "whyThem"/"whyUs".

Rules:
- If the sources give no evidence for a field, return an empty array for it (or an empty string for "offering"). Never fabricate to fill a gap.
- Every id you invent must be short, unique, and kebab-case.
- Do not include any recommendation, score, or account-specific judgment. This is vendor-level knowledge only, never an evaluation of a specific prospect account.`;
}

interface ResearchModelCallInput {
  prompt: string;
  responseJsonSchema: unknown;
}

interface ResearchModelCallResult {
  text: string | undefined;
}

type ResearchModelCaller = (input: ResearchModelCallInput) => Promise<ResearchModelCallResult>;

function createLiveResearchModelCaller(apiKey: string, model: string): ResearchModelCaller {
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

function parseResearchOutput(rawText: string | undefined): GeminiVendorResearchOutput | null {
  if (!rawText) {
    return null;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    return null;
  }

  const parsed = GeminiVendorResearchOutputSchema.safeParse(parsedJson);
  return parsed.success ? parsed.data : null;
}

/**
 * Resolves the AI-extracted fields, or `null` on any failure (unimplemented
 * provider, missing API key, network error, malformed JSON, schema
 * violation). Never throws.
 */
async function resolveResearchOutput(
  sources: ResearchSource[],
  provider: ResearchProvider,
  call: ResearchModelCaller | undefined,
): Promise<GeminiVendorResearchOutput | null> {
  if (provider !== "gemini") {
    // Only Gemini is wired in today. Other providers are accepted by the
    // public `ResearchOptions` type but degrade to the empty stub in
    // `researchVendorContent` until they're implemented.
    return null;
  }

  let caller = call;
  if (!caller) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    caller = createLiveResearchModelCaller(
      apiKey,
      process.env.GEMINI_VENDOR_RESEARCH_MODEL ?? DEFAULT_MODEL,
    );
  }

  try {
    const { text } = await caller({
      prompt: buildResearchPrompt(sources),
      responseJsonSchema: RESEARCH_RESPONSE_JSON_SCHEMA,
    });
    return parseResearchOutput(text);
  } catch {
    return null;
  }
}

/**
 * Processes one or more raw text sources into a partial Vendor Profile.
 *
 * Always resolves to a structurally valid `Partial<VendorProfile>`: it
 * bootstraps from `createEmptyVendorProfile` so every required
 * sub-structure (`productKnowledge`, `decisionStrategy`) is present, then
 * merges in whatever the AI call successfully extracted. On any failure it
 * simply returns the untouched bootstrapped structure, never throwing.
 *
 * Pass `overrides.call` to inject a fake model call (e.g. for offline
 * tests) instead of hitting the live Gemini API.
 */
export async function researchVendorContent(
  sources: ResearchSource[],
  options?: ResearchOptions,
  overrides?: { call?: ResearchModelCaller },
): Promise<Partial<VendorProfile>> {
  const provider = options?.provider ?? DEFAULT_PROVIDER;
  const emptyProfile = createEmptyVendorProfile("", "");

  const extracted = await resolveResearchOutput(sources, provider, overrides?.call);
  if (!extracted) {
    return {
      productKnowledge: emptyProfile.productKnowledge,
      decisionStrategy: emptyProfile.decisionStrategy,
    };
  }

  return {
    productKnowledge: {
      ...emptyProfile.productKnowledge,
      offering: extracted.offering,
      customerProblems: extracted.customerProblems,
      desiredOutcomes: extracted.desiredOutcomes,
      capabilities: extracted.capabilities,
    },
    decisionStrategy: {
      ...emptyProfile.decisionStrategy,
      whyNowSignals: extracted.whyNowSignals,
      redFlags: extracted.redFlags,
    },
  };
}

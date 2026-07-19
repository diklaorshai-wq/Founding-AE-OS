/**
 * Gemini provider boundary.
 *
 * This is the ONLY module allowed to know about Gemini-specific request/response
 * shapes (URL Context tool config, Structured Output schema binding, Search
 * Grounding, retries, timeouts, SDK types). Everything outside this
 * `providers/gemini/` folder must depend only on the domain contract
 * `CompanyResearchResult` from `../../types/contracts`.
 *
 * `researchCompany` never throws: any failure (missing API key, network error,
 * malformed model output, schema validation failure) is reported through the
 * returned `CompanyResearchResult.status`/`failureReason` fields instead.
 */
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
// NOTE: only `import type` is used for cross-file references (matching this
// codebase's convention), since type-only imports are erased entirely by
// TypeScript and never need runtime module resolution. Zod schema *values*
// are intentionally NOT imported from the shared contract module below —
// they are redefined locally as the AI-facing request/response shape, which
// is this module's own concern per the file header above.
import type { CompanyProfile, CompanyResearchResult, EvidenceClaim } from "../../types/contracts";

/** Falls back to the current recommended Gemini Flash model when unset. */
const DEFAULT_MODEL = "gemini-flash-latest";

/**
 * Structured-output schema describing what we ask the model to produce.
 * Deliberately narrower than the domain contract: `submittedDomain` is
 * supplied by the caller (never asked of the model), and `capturedTimestamp`
 * is server-generated (never trust an AI-provided value there). The model
 * still assigns its own `claimId`, since `supported_inference` claims must be
 * able to reference sibling claims from the same response via
 * `inferenceParentIds`.
 */
const GeminiEvidenceSourceSchema = z.object({
  sourceUrl: z.string().url(),
  sourceTitle: z.string(),
  publicationDate: z.string().optional(),
});

const GeminiEvidenceClaimSchema = z
  .object({
    claimId: z
      .string()
      .describe("Short, unique, kebab-case id, e.g. 'firmo-1'."),
    claimNature: z.enum(["explicit_fact", "supported_inference"]),
    claimSummary: z.string(),
    underlyingSources: z.array(GeminiEvidenceSourceSchema).min(1),
    inferenceParentIds: z
      .array(z.string())
      .optional()
      .describe("Must reference claimId values also present in this response."),
    eventTimeframe: z.string().optional(),
  })
  .refine(
    (claim) =>
      claim.claimNature !== "supported_inference" ||
      (claim.inferenceParentIds?.length ?? 0) > 0,
    {
      message: "supported_inference claims require inferenceParentIds",
      path: ["inferenceParentIds"],
    },
  );

const GeminiEvidenceClaimGroupSchema = z.object({
  claims: z.array(GeminiEvidenceClaimSchema),
});

const GeminiCompanyProfileSchema = z.object({
  accountName: z
    .string()
    .describe("The company's formal or commonly used name."),
  firmographicData: GeminiEvidenceClaimGroupSchema,
  coreBusinessActivities: GeminiEvidenceClaimGroupSchema,
  corporateAnnouncements: GeminiEvidenceClaimGroupSchema,
  hiringAndRoleTrends: GeminiEvidenceClaimGroupSchema,
  observedTechnologies: GeminiEvidenceClaimGroupSchema,
});

type GeminiCompanyProfile = z.infer<typeof GeminiCompanyProfileSchema>;

const RESPONSE_JSON_SCHEMA = z.toJSONSchema(GeminiCompanyProfileSchema);

/**
 * TODO: Google Search Grounding is temporarily disabled (see the `tools`
 * array in `createLiveModelCaller` below) to bypass a 429 quota error
 * without setting up Google Cloud billing. While disabled, this prompt only
 * asks for URL-context-grounded evidence. Once Search Grounding is
 * re-enabled, restore the second research step: "Google Search for current,
 * publicly available information not on the site itself (recent news,
 * funding, hiring, leadership changes, technology mentions)."
 */
function buildPrompt(domain: string): string {
  return `You are a meticulous B2B research analyst gathering evidence for an enterprise account-prioritization tool. Your job is ONLY to gather and cite evidence — never to score, rank, recommend, or judge whether this company is a good fit for anything.

Research the company at https://${domain} using the URL context tool on https://${domain} and any linked pages you need, such as About, Careers, Newsroom, or product pages.

Return evidence organized into exactly these five categories:
- firmographicData: company identity and characteristics (size, ownership/funding stage, industry, business model, organizational structure).
- coreBusinessActivities: what the company does, sells, and the markets or customers it serves.
- corporateAnnouncements: recent news, restructuring, market expansion, executive/leadership changes, funding events.
- hiringAndRoleTrends: hiring activity, new or changing roles, team growth or contraction signals.
- observedTechnologies: technologies, platforms, or tools the company appears to use (from job postings, engineering content, or public stack mentions).

Rules:
- Every claim must be backed by at least one real source URL you actually retrieved. Never invent a URL.
- Classify each claim's "claimNature" as "explicit_fact" (directly stated by a source) or "supported_inference" (your reasonable inference from one or more facts). A "supported_inference" claim MUST set "inferenceParentIds" to the "claimId" values of the facts it is inferred from, from this same response.
- Assign each claim a short, unique, kebab-case "claimId" (e.g. "firmo-1", "hiring-2").
- If you find no public evidence for a category, return an empty "claims" array for it. Do not guess or fabricate evidence to fill a category.
- Keep each "claimSummary" a single, concise, concrete statement.
- Do not include any recommendation, score, priority, or judgment anywhere in your response.`;
}

interface ModelCallInput {
  prompt: string;
  responseJsonSchema: unknown;
}

interface ModelCallResult {
  text: string | undefined;
}

type ModelCaller = (input: ModelCallInput) => Promise<ModelCallResult>;

function createLiveModelCaller(apiKey: string, model: string): ModelCaller {
  const client = new GoogleGenAI({ apiKey });

  return async ({ prompt, responseJsonSchema }) => {
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        // TODO: Google Search Grounding ({ googleSearch: {} }) is temporarily
        // disabled to bypass a 429 quota error without setting up Google
        // Cloud billing. Re-add it to the tools array (and restore the
        // matching prompt step in `buildPrompt` above) once billing/quota
        // is sorted out.
        tools: [{ urlContext: {} }],
        responseMimeType: "application/json",
        responseJsonSchema,
      },
    });

    return { text: response.text };
  };
}

function isEmptyProfile(profile: GeminiCompanyProfile): boolean {
  return (
    profile.firmographicData.claims.length === 0 &&
    profile.coreBusinessActivities.claims.length === 0 &&
    profile.corporateAnnouncements.claims.length === 0 &&
    profile.hiringAndRoleTrends.claims.length === 0 &&
    profile.observedTechnologies.claims.length === 0
  );
}

function findDuplicateClaimId(profile: GeminiCompanyProfile): string | undefined {
  const seen = new Set<string>();
  const allClaims = [
    ...profile.firmographicData.claims,
    ...profile.coreBusinessActivities.claims,
    ...profile.corporateAnnouncements.claims,
    ...profile.hiringAndRoleTrends.claims,
    ...profile.observedTechnologies.claims,
  ];

  for (const claim of allClaims) {
    if (seen.has(claim.claimId)) {
      return claim.claimId;
    }
    seen.add(claim.claimId);
  }
  return undefined;
}

/** Injects the server-controlled `capturedTimestamp` into every source in a claim. */
function withCapturedTimestamp(
  claim: GeminiCompanyProfile["firmographicData"]["claims"][number],
  capturedTimestamp: string,
): EvidenceClaim {
  return {
    ...claim,
    underlyingSources: claim.underlyingSources.map((source) => ({
      ...source,
      capturedTimestamp,
    })),
  };
}

/**
 * Validates the model's structured output and maps it onto the gate-neutral
 * `CompanyProfile` domain contract. Pure and synchronous so it can be unit
 * tested without a live model call.
 */
export function toCompanyResearchResult(
  domain: string,
  rawText: string | undefined,
): CompanyResearchResult {
  if (!rawText) {
    return {
      status: "failed",
      profileData: null,
      failureReason: "Gemini returned an empty response.",
    };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    return {
      status: "failed",
      profileData: null,
      failureReason: "Gemini's response was not valid JSON.",
    };
  }

  const parsed = GeminiCompanyProfileSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return {
      status: "failed",
      profileData: null,
      failureReason: `Gemini's response did not match the expected schema: ${parsed.error.message}`,
    };
  }

  const duplicateClaimId = findDuplicateClaimId(parsed.data);
  if (duplicateClaimId) {
    return {
      status: "failed",
      profileData: null,
      failureReason: `Gemini's response reused claimId "${duplicateClaimId}" across multiple claims.`,
    };
  }

  const capturedTimestamp = new Date().toISOString();
  const profileData: CompanyProfile = {
    submittedDomain: domain,
    accountName: parsed.data.accountName,
    firmographicData: {
      claims: parsed.data.firmographicData.claims.map((claim) =>
        withCapturedTimestamp(claim, capturedTimestamp),
      ),
    },
    coreBusinessActivities: {
      claims: parsed.data.coreBusinessActivities.claims.map((claim) =>
        withCapturedTimestamp(claim, capturedTimestamp),
      ),
    },
    corporateAnnouncements: {
      claims: parsed.data.corporateAnnouncements.claims.map((claim) =>
        withCapturedTimestamp(claim, capturedTimestamp),
      ),
    },
    hiringAndRoleTrends: {
      claims: parsed.data.hiringAndRoleTrends.claims.map((claim) =>
        withCapturedTimestamp(claim, capturedTimestamp),
      ),
    },
    observedTechnologies: {
      claims: parsed.data.observedTechnologies.claims.map((claim) =>
        withCapturedTimestamp(claim, capturedTimestamp),
      ),
    },
  };

  return {
    status: isEmptyProfile(parsed.data) ? "incomplete" : "success",
    profileData,
    ...(isEmptyProfile(parsed.data)
      ? { failureReason: `No public evidence was found for ${domain}.` }
      : {}),
  };
}

/**
 * Researches a company from its domain and returns a gate-neutral profile.
 *
 * Uses the URL Context tool (to ground directly on the submitted domain) and
 * binds the model's output to a strict Zod-derived JSON schema so the result
 * is always gate-neutral evidence, never a score or recommendation.
 *
 * Google Search Grounding is temporarily disabled — see the TODOs in
 * `buildPrompt` and `createLiveModelCaller` above.
 */
export async function researchCompany(
  domain: string,
  overrides?: { call?: ModelCaller },
): Promise<CompanyResearchResult> {
  let call = overrides?.call;

  if (!call) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        status: "failed",
        profileData: null,
        failureReason: "GEMINI_API_KEY is not configured.",
      };
    }
    call = createLiveModelCaller(apiKey, process.env.GEMINI_MODEL ?? DEFAULT_MODEL);
  }

  try {
    const { text } = await call({
      prompt: buildPrompt(domain),
      responseJsonSchema: RESPONSE_JSON_SCHEMA,
    });
    return toCompanyResearchResult(domain, text);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      status: "failed",
      profileData: null,
      failureReason: `Gemini research request failed: ${message}`,
    };
  }
}

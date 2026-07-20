/**
 * Step 5 of the sequence: the Company AI Research engine (Project State §8,
 * §9). Turns raw text evidence about a target company (website copy, news,
 * job posts, documents) — read against a specific Vendor Profile — into a
 * structurally valid Company Profile.
 *
 * Also exposes `researchCompanyFromUrl` for the live evaluate path: one
 * Gemini call with URL Context + the canonical structured schema, returning
 * a `CanonicalCompanyResearchResult` (success | incomplete | failed).
 *
 * Model-agnostic and fully isolated:
 * - Does not import or modify `recommendationEngine.ts` or its deterministic
 *   decision logic.
 * - Does not change Zod schemas in `types/contracts.ts` beyond what the
 *   evaluate API owns. The AI-facing structured-output schema below is
 *   defined and owned locally.
 * - `researchCompanyContent` remains the supplied-content path and is
 *   unchanged in behavior (always returns a CompanyProfile, never throws).
 */
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { VendorProfile } from "./vendorProfile";
import { createEmptyCompanyProfile } from "./types/companyProfile.ts";
import type {
  CanonicalCompanyResearchResult,
  CompanyEvidenceFinding,
  CompanyProfile,
} from "./types/companyProfile.ts";

/** One raw text source to research, e.g. a scraped website page, a news article, a job posting, or an uploaded document. */
export type ResearchSourceType = "website" | "document" | "news" | "job_post";

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
 * Strict, AI-facing structured-output schema for one finding. Mirrors the
 * canonical `CompanyEvidenceFinding` contract field-for-field. This is the
 * schema the model is instructed to satisfy (via `RESEARCH_RESPONSE_JSON_SCHEMA`
 * below) and the schema each raw finding is individually re-validated
 * against once the shell parse succeeds.
 */
const GeminiCompanyEvidenceFindingSchema = z.object({
  claim: z.string(),
  source: z.string(),
  date: z.string(),
  connectedVendorItemId: z
    .string()
    .describe("Must be an id copied EXACTLY from the Vendor Profile context provided in the prompt. Never invent a new id."),
  natureOfConnection: z
    .enum(["explicit_fact", "ai_interpretation"])
    .describe("'explicit_fact' if the source states this directly; 'ai_interpretation' if it is a reasonable inference."),
  decisionImpact: z
    .enum(["supportive", "contradictory", "neutral"])
    .describe(
      "How this finding affects the decision group it appears in. 'supportive': strengthens the group. 'contradictory': weakens or contradicts the group, but is NOT itself an explicit hard vendor disqualifier. 'neutral': useful context only, contributes to neither pass, fail, nor contradiction.",
    ),
});

/**
 * The STRICT schema. Used ONLY to generate the `responseJsonSchema` sent to
 * Gemini — never used directly to parse the returned payload (see
 * `GeminiCompanyResearchShellSchema` below for that).
 */
const GeminiCompanyResearchOutputSchema = z.object({
  companyIdentity: z.object({
    name: z.string(),
    url: z.string(),
  }),
  companyCharacteristics: z.object({
    description: z.string(),
    isMultiCloud: z.boolean(),
    dataScaleDescription: z.string(),
  }),
  relevantBusinessEvidence: z
    .array(GeminiCompanyEvidenceFindingSchema)
    .describe(
      "Why Them evidence: connects to the vendor's Customer Problems, Desired Outcomes, Buying Reasons, Firmographic Disqualifiers, or Red Flags affecting whyThem.",
    ),
  whyNowEvidence: z
    .array(GeminiCompanyEvidenceFindingSchema)
    .describe(
      "Why Now evidence: connects to the vendor's Why Now Signals ONLY. A general company event is not automatically a Why Now signal. Never connect a Firmographic Disqualifier or a Red Flag here.",
    ),
  whyUsEvidence: z
    .array(GeminiCompanyEvidenceFindingSchema)
    .describe(
      "Why Us evidence: connects to the vendor's Capabilities, Use Cases, Common Alternatives, Relevant Differentiation, or Red Flags affecting whyUs.",
    ),
  relevantRoles: z.array(z.string()),
  redFlags: z.array(z.string()),
});

/** JSON Schema form of the STRICT schema — the only schema ever bound as the model's structured-output response schema. */
const RESEARCH_RESPONSE_JSON_SCHEMA = z.toJSONSchema(GeminiCompanyResearchOutputSchema);

/**
 * The LENIENT shell schema. Identical to the strict schema for
 * companyIdentity / companyCharacteristics / relevantRoles / redFlags, but
 * the three evidence arrays are typed loosely so that a single malformed
 * finding can never fail the parse of the whole payload. Never used to
 * generate a `responseJsonSchema` — only to parse a returned payload.
 */
const GeminiCompanyResearchShellSchema = z.object({
  companyIdentity: z.object({
    name: z.string(),
    url: z.string(),
  }),
  companyCharacteristics: z.object({
    description: z.string(),
    isMultiCloud: z.boolean(),
    dataScaleDescription: z.string(),
  }),
  relevantBusinessEvidence: z.array(z.unknown()),
  whyNowEvidence: z.array(z.unknown()),
  whyUsEvidence: z.array(z.unknown()),
  relevantRoles: z.array(z.string()),
  redFlags: z.array(z.string()),
});
type GeminiCompanyResearchShellOutput = z.infer<typeof GeminiCompanyResearchShellSchema>;

/** The fully-resolved research output: shell fields as-is, evidence arrays replaced by individually-validated, schema-compliant findings. */
interface ResolvedCompanyResearchOutput {
  companyIdentity: GeminiCompanyResearchShellOutput["companyIdentity"];
  companyCharacteristics: GeminiCompanyResearchShellOutput["companyCharacteristics"];
  relevantBusinessEvidence: CompanyEvidenceFinding[];
  whyNowEvidence: CompanyEvidenceFinding[];
  whyUsEvidence: CompanyEvidenceFinding[];
  relevantRoles: string[];
  redFlags: string[];
}

/** All Vendor Profile item ids the model is allowed to reference via `connectedVendorItemId`. */
function collectAllVendorItemIds(vendor: VendorProfile): Set<string> {
  const ids = new Set<string>();
  const add = (items: Array<{ id: string }>) => {
    for (const item of items) {
      ids.add(item.id);
    }
  };

  add(vendor.productKnowledge.customerProblems);
  add(vendor.productKnowledge.desiredOutcomes);
  add(vendor.productKnowledge.buyingReasons);
  add(vendor.productKnowledge.capabilities);
  add(vendor.productKnowledge.useCases);
  add(vendor.productKnowledge.commonAlternatives);
  add(vendor.productKnowledge.relevantDifferentiation);
  add(vendor.productKnowledge.proofPoints);
  add(vendor.decisionStrategy.idealCustomerProfile.criteria);
  add(vendor.decisionStrategy.idealCustomerProfile.examples);
  add(vendor.decisionStrategy.idealCustomerProfile.firmographicDisqualifiers);
  add(vendor.decisionStrategy.targetPersonas);
  add(vendor.decisionStrategy.budgetOwners);
  add(vendor.decisionStrategy.whyNowSignals);
  add(vendor.decisionStrategy.redFlags);

  return ids;
}

/** Renders the Vendor Profile as a human-readable, id-labeled list for the prompt, so the model can only cite ids that genuinely exist. */
function summarizeVendorProfile(vendor: VendorProfile): string {
  const lines: string[] = [];
  const listItems = <T extends { id: string }>(label: string, items: T[], describe: (item: T) => string) => {
    if (items.length === 0) {
      return;
    }
    lines.push(`${label}:`);
    for (const item of items) {
      lines.push(`  - id="${item.id}": ${describe(item)}`);
    }
  };

  listItems("Customer Problems", vendor.productKnowledge.customerProblems, (p) => p.statement);
  listItems("Desired Outcomes", vendor.productKnowledge.desiredOutcomes, (o) => o.statement);
  listItems("Buying Reasons", vendor.productKnowledge.buyingReasons, (r) => r.statement);
  listItems(
    "Ideal Customer Profile Criteria",
    vendor.decisionStrategy.idealCustomerProfile.criteria,
    (c) => c.description,
  );
  listItems(
    "Ideal Customer Examples",
    vendor.decisionStrategy.idealCustomerProfile.examples,
    (e) => `${e.companyName} — ${e.rationale}`,
  );
  listItems("Capabilities", vendor.productKnowledge.capabilities, (c) => `${c.name} — ${c.description}`);
  listItems("Use Cases", vendor.productKnowledge.useCases, (u) => `${u.name} — ${u.description}`);
  listItems("Common Alternatives", vendor.productKnowledge.commonAlternatives, (a) => `${a.name} — ${a.description}`);
  listItems("Relevant Differentiation", vendor.productKnowledge.relevantDifferentiation, (d) => d.statement);
  listItems("Proof Points", vendor.productKnowledge.proofPoints, (p) => p.summary);
  listItems("Why Now Signals", vendor.decisionStrategy.whyNowSignals, (s) => `${s.signal} — ${s.whyItMatters}`);
  listItems("Target Personas", vendor.decisionStrategy.targetPersonas, (p) => p.roleOrTitle);
  listItems("Budget Owners", vendor.decisionStrategy.budgetOwners, (b) => b.roleOrFunction);
  listItems(
    "Firmographic Disqualifiers",
    vendor.decisionStrategy.idealCustomerProfile.firmographicDisqualifiers,
    (f) => f.condition,
  );
  listItems(
    "Vendor Red Flags",
    vendor.decisionStrategy.redFlags,
    (r) => `${r.condition} — severity: ${r.severity}; affects: ${r.affectedDecisionGroups.join(", ")}`,
  );

  return lines.length > 0 ? lines.join("\n") : "(this Vendor Profile has no items yet)";
}

/** Shared extract/routing/decisionImpact instructions used by both supplied-content and URL research prompts. */
function buildResearchInstructionsBody(): string {
  return `Extract and return:
- "companyIdentity": the company's "name" and primary "url", as stated in the sources.
- "companyCharacteristics": a short "description" of what the company does, whether it is "isMultiCloud" (best-effort boolean; false if there is no evidence either way), and a "dataScaleDescription" of its data footprint.
- "relevantBusinessEvidence": findings connected to the vendor's Customer Problems, Desired Outcomes, Buying Reasons, Ideal Customer Profile Criteria, or Ideal Customer Examples above (Why Them). You are also explicitly permitted to connect a finding here to a Firmographic Disqualifier, or to a Vendor Red Flag whose "affects" list includes "whyThem".
- "whyNowEvidence": findings connected to the vendor's Why Now Signals above (Why Now) ONLY. A general company event is not automatically a Why Now signal — it must be relevant to this specific Vendor Profile. NEVER connect a finding here to a Firmographic Disqualifier or a Vendor Red Flag — those two categories must never appear in "whyNowEvidence".
- "whyUsEvidence": findings connected to the vendor's Capabilities, Use Cases, Proof Points, Relevant Differentiation, or Common Alternatives above (Why Us). You are also explicitly permitted to connect a finding here to a Vendor Red Flag whose "affects" list includes "whyUs".
- "relevantRoles": role or title strings at the company relevant to the vendor's Target Personas or Budget Owners above.
- "redFlags": plain-text conditions observed at the company that caution against or disqualify pursuing it.

Evidence-array routing rules (strict):
- A finding connected to a Firmographic Disqualifier must appear ONLY in "relevantBusinessEvidence" — never in "whyNowEvidence" or "whyUsEvidence".
- A finding connected to a Vendor Red Flag whose "affects" list includes "whyThem" must appear in "relevantBusinessEvidence".
- A finding connected to a Vendor Red Flag whose "affects" list includes "whyUs" must appear in "whyUsEvidence".
- If a Vendor Red Flag affects BOTH "whyThem" and "whyUs", and the same underlying fact about the company is genuinely relevant to both, you may output a corresponding finding in both "relevantBusinessEvidence" and "whyUsEvidence".
- Firmographic Disqualifiers and Vendor Red Flags must NEVER be connected through "whyNowEvidence", under any circumstances.

For every entry in "relevantBusinessEvidence", "whyNowEvidence", and "whyUsEvidence", you MUST include ALL of these fields:
- "connectedVendorItemId" MUST be an id copied EXACTLY from the Vendor Profile context above. Never invent a new id, and never leave a finding disconnected from the Vendor Profile.
- "natureOfConnection" is "explicit_fact" when the claim states something a source says directly, or "ai_interpretation" when you are drawing a reasonable but non-literal conclusion from the evidence.
- "decisionImpact" — REQUIRED on every single finding, exactly one of "supportive", "contradictory", or "neutral":
  - "supportive": the finding strengthens the specific decision group it belongs to.
  - "contradictory": the finding weakens or contradicts that decision group, but is NOT itself an explicit hard vendor disqualifier (a Firmographic Disqualifier or a disqualifying Red Flag are never expressed through "decisionImpact" — they are identified only by "connectedVendorItemId").
  - "neutral": the finding provides useful context only, and does not itself strengthen or weaken the group.
  - For a finding connected to a Common Alternative specifically: classify "contradictory" for satisfied, entrenched, or committed use of that alternative; classify "supportive" for active replacement intent or documented pain with that alternative; classify "neutral" for mere use or mention with no evidence of satisfaction, commitment, pain, or replacement intent. Do NOT classify a Common Alternative connection based on its identity or vendor-provided description alone — base it only on what the sources say about the company's own relationship to that alternative.

Rules:
- If the sources give no evidence for a field, return an empty array for it (or an empty string for text fields).
- Do not calculate any score, decision, or recommendation. This is research only, never an evaluation.`;
}

function buildCompanyResearchPrompt(sources: ResearchSource[], vendor: VendorProfile): string {
  const aggregatedSources = sources
    .map((source) => `--- Source: ${source.sourceId} (${source.sourceType}) ---\n${source.content}`)
    .join("\n\n");

  return `You are a meticulous B2B account research analyst. Read the sources below about a target company and build a Company Profile evaluated strictly against the Vendor Profile context, per this vendor's own definition of fit, timing, and differentiation. Never invent facts that are not grounded in the sources, and never fabricate to fill a gap — failure to find information is not proof that the information is false.

Vendor Profile context (the ONLY ids you may cite in "connectedVendorItemId"):
${summarizeVendorProfile(vendor)}

Sources about the target company:
${aggregatedSources || "(no sources were provided)"}

${buildResearchInstructionsBody()}`;
}

function buildCompanyResearchFromUrlPrompt(domain: string, vendor: VendorProfile): string {
  return `You are a meticulous B2B account research analyst. Research the company at https://${domain} using the URL context tool on https://${domain} and any linked public pages you need (About, Careers, Newsroom, product pages). Build a Company Profile evaluated strictly against the Vendor Profile context, per this vendor's own definition of fit, timing, and differentiation. Never invent facts that are not grounded in pages you retrieved, and never fabricate to fill a gap — failure to find information is not proof that the information is false.

Vendor Profile context (the ONLY ids you may cite in "connectedVendorItemId"):
${summarizeVendorProfile(vendor)}

${buildResearchInstructionsBody()}`;
}

interface ResearchModelCallInput {
  prompt: string;
  responseJsonSchema: unknown;
  /** When set (URL research), Gemini URL Context is enabled for this single call. */
  tools?: Array<{ urlContext: Record<string, never> }>;
}

interface ResearchModelCallResult {
  text: string | undefined;
}

type ResearchModelCaller = (input: ResearchModelCallInput) => Promise<ResearchModelCallResult>;

function createLiveResearchModelCaller(apiKey: string, model: string): ResearchModelCaller {
  const client = new GoogleGenAI({ apiKey });

  return async ({ prompt, responseJsonSchema, tools }) => {
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        ...(tools ? { tools } : {}),
        responseMimeType: "application/json",
        responseJsonSchema,
      },
    });

    return { text: response.text };
  };
}

/**
 * Validates each raw array item individually against the strict per-finding
 * schema. Any item that fails (missing/invalid `decisionImpact`, or any
 * other defect) is silently dropped rather than failing the whole array.
 */
function parseFindingsIndividually(rawValue: unknown): CompanyEvidenceFinding[] {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  const findings: CompanyEvidenceFinding[] = [];
  for (const rawItem of rawValue) {
    const parsed = GeminiCompanyEvidenceFindingSchema.safeParse(rawItem);
    if (parsed.success) {
      findings.push(parsed.data);
    }
  }
  return findings;
}

/**
 * Parses the model's raw response text. First parses the LENIENT shell —
 * if that fails (malformed top-level JSON, or `companyIdentity` /
 * `companyCharacteristics` / `relevantRoles` / `redFlags` themselves
 * malformed), the whole result is `null`, exactly as before. Once the
 * shell succeeds, each finding inside the three evidence arrays is
 * validated individually against the STRICT per-finding schema; malformed
 * findings are dropped without affecting the rest of the profile.
 */
function parseResearchOutput(rawText: string | undefined): ResolvedCompanyResearchOutput | null {
  if (!rawText) {
    return null;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    return null;
  }

  const shellParsed = GeminiCompanyResearchShellSchema.safeParse(parsedJson);
  if (!shellParsed.success) {
    return null;
  }

  const shell = shellParsed.data;
  return {
    companyIdentity: shell.companyIdentity,
    companyCharacteristics: shell.companyCharacteristics,
    relevantBusinessEvidence: parseFindingsIndividually(shell.relevantBusinessEvidence),
    whyNowEvidence: parseFindingsIndividually(shell.whyNowEvidence),
    whyUsEvidence: parseFindingsIndividually(shell.whyUsEvidence),
    relevantRoles: shell.relevantRoles,
    redFlags: shell.redFlags,
  };
}

/**
 * Resolves the AI-extracted fields, or `null` on any failure (unimplemented
 * provider, missing API key, network error, malformed JSON, shell schema
 * violation). Never throws. A malformed *individual* finding does not
 * cause `null` here — it is dropped inside `parseResearchOutput` while the
 * rest of the result is preserved.
 */
async function resolveResearchOutput(
  sources: ResearchSource[],
  vendor: VendorProfile,
  provider: ResearchProvider,
  call: ResearchModelCaller | undefined,
): Promise<ResolvedCompanyResearchOutput | null> {
  if (provider !== "gemini") {
    // Only Gemini is wired in today. Other providers are accepted by the
    // public `ResearchOptions` type but degrade to the empty stub in
    // `researchCompanyContent` until they're implemented.
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
      process.env.GEMINI_COMPANY_RESEARCH_MODEL ?? DEFAULT_MODEL,
    );
  }

  try {
    const { text } = await caller({
      prompt: buildCompanyResearchPrompt(sources, vendor),
      responseJsonSchema: RESEARCH_RESPONSE_JSON_SCHEMA,
    });
    return parseResearchOutput(text);
  } catch {
    return null;
  }
}

/** Drops any finding whose `connectedVendorItemId` isn't a real id in this Vendor Profile — a hallucinated link is never trusted. */
function sanitizeEvidence(findings: CompanyEvidenceFinding[], validVendorItemIds: Set<string>): CompanyEvidenceFinding[] {
  return findings.filter((finding) => validVendorItemIds.has(finding.connectedVendorItemId));
}

function toSanitizedCompanyProfile(
  extracted: ResolvedCompanyResearchOutput,
  vendorProfile: VendorProfile,
): CompanyProfile {
  const validVendorItemIds = collectAllVendorItemIds(vendorProfile);
  return {
    companyIdentity: extracted.companyIdentity,
    companyCharacteristics: extracted.companyCharacteristics,
    relevantBusinessEvidence: sanitizeEvidence(extracted.relevantBusinessEvidence, validVendorItemIds),
    whyNowEvidence: sanitizeEvidence(extracted.whyNowEvidence, validVendorItemIds),
    whyUsEvidence: sanitizeEvidence(extracted.whyUsEvidence, validVendorItemIds),
    relevantRoles: extracted.relevantRoles,
    redFlags: extracted.redFlags,
  };
}

function hasUsableVendorLinkedEvidence(profile: CompanyProfile): boolean {
  return (
    profile.relevantBusinessEvidence.length > 0 ||
    profile.whyNowEvidence.length > 0 ||
    profile.whyUsEvidence.length > 0
  );
}

function sanitizeToDomain(rawUrl: string): string {
  const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const parsed = new URL(withProtocol);

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Unsupported URL protocol");
  }
  if (!parsed.hostname) {
    throw new Error("URL is missing a hostname");
  }

  return parsed.hostname.toLowerCase();
}

function failedResearch(failureReason: string): CanonicalCompanyResearchResult {
  return { status: "failed", profileData: null, failureReason };
}

/**
 * Processes one or more raw text sources about a target company, evaluated
 * against a specific Vendor Profile, into a structurally valid
 * `CompanyProfile`.
 *
 * Always resolves to a complete `CompanyProfile`: it bootstraps from
 * `createEmptyCompanyProfile()`, then merges in whatever the AI call
 * successfully extracted. Every evidence finding must cite a real Vendor
 * Profile item id; any that cite an id this Vendor Profile doesn't actually
 * have are dropped rather than trusted. On any failure (bad JSON, thrown
 * error, missing API key, unsupported provider) this simply returns the
 * clean, empty bootstrapped profile — it never throws.
 *
 * Pass `overrides.call` to inject a fake model call (e.g. for offline
 * tests) instead of hitting the live Gemini API.
 */
export async function researchCompanyContent(
  sources: ResearchSource[],
  vendorProfile: VendorProfile,
  options?: ResearchOptions,
  overrides?: { call?: ResearchModelCaller },
): Promise<CompanyProfile> {
  const provider = options?.provider ?? DEFAULT_PROVIDER;
  const emptyProfile = createEmptyCompanyProfile();

  const extracted = await resolveResearchOutput(sources, vendorProfile, provider, overrides?.call);
  if (!extracted) {
    return emptyProfile;
  }

  return toSanitizedCompanyProfile(extracted, vendorProfile);
}

/**
 * Researches a company from a submitted URL/domain against a Vendor Profile
 * using Gemini URL Context and the canonical Company Profile schema.
 *
 * Exactly one Gemini call. Never throws. Returns a
 * `CanonicalCompanyResearchResult` that distinguishes success, incomplete
 * (valid but no usable vendor-linked findings), and technical failure.
 *
 * Does not replace `researchCompanyContent`, which remains the
 * supplied-content / offline path.
 */
export async function researchCompanyFromUrl(
  urlOrDomain: string,
  vendorProfile: VendorProfile,
  options?: ResearchOptions,
  overrides?: { call?: ResearchModelCaller },
): Promise<CanonicalCompanyResearchResult> {
  const provider = options?.provider ?? DEFAULT_PROVIDER;

  let domain: string;
  try {
    domain = sanitizeToDomain(urlOrDomain);
  } catch {
    return failedResearch("The provided URL could not be parsed as a valid company URL.");
  }

  if (provider !== "gemini") {
    return failedResearch(`Research provider "${provider}" is not implemented.`);
  }

  let caller = overrides?.call;
  if (!caller) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return failedResearch("GEMINI_API_KEY is not configured.");
    }
    caller = createLiveResearchModelCaller(
      apiKey,
      process.env.GEMINI_COMPANY_RESEARCH_MODEL ?? DEFAULT_MODEL,
    );
  }

  let text: string | undefined;
  try {
    const result = await caller({
      prompt: buildCompanyResearchFromUrlPrompt(domain, vendorProfile),
      responseJsonSchema: RESEARCH_RESPONSE_JSON_SCHEMA,
      tools: [{ urlContext: {} }],
    });
    text = result.text;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return failedResearch(`Gemini research request failed: ${message}`);
  }

  if (!text) {
    return failedResearch("Gemini returned an empty response.");
  }

  const extracted = parseResearchOutput(text);
  if (!extracted) {
    return failedResearch("Gemini's response was not valid JSON or did not match the expected top-level schema.");
  }

  const profileData = toSanitizedCompanyProfile(extracted, vendorProfile);

  if (!hasUsableVendorLinkedEvidence(profileData)) {
    return {
      status: "incomplete",
      profileData,
      failureReason: `No usable vendor-linked evidence was found for ${domain}.`,
    };
  }

  return { status: "success", profileData };
}

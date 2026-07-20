/**
 * Vendor research: turns public vendor evidence into a canonical VendorProfile draft.
 *
 * Two entry points:
 * - `researchVendorContent` — supplied-content / offline path (partial profile merge).
 * - `researchVendorFromUrl` — Checkpoint A primary path: one Gemini URL Context call
 *   producing a full editable VendorProfile with success / incomplete / failed status.
 *
 * Isolation:
 * - Does not import or modify recommendationEngine / evidenceMatchingService.
 * - Uses the existing VendorProfile contract — no parallel domain model.
 * - Never throws from the public research functions.
 */
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type {
  BuyingReason,
  Capability,
  CommonAlternative,
  CustomerProblem,
  DesiredOutcome,
  FirmographicDisqualifier,
  IdealCustomerCriterion,
  IdealCustomerExample,
  ProofPoint,
  RedFlag,
  RelevantDifferentiation,
  UseCase,
  VendorProfile,
  WhyNowSignal,
} from "./vendorProfile";
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

/**
 * Outcome of canonical Vendor URL research.
 *
 * - "success": structurally valid draft with usable decision-driving information.
 * - "incomplete": structurally valid editable draft, but insufficient decision-driving information.
 * - "failed": technical failure; profileData is null.
 */
export type CanonicalVendorResearchStatus = "success" | "incomplete" | "failed";

export interface CanonicalVendorResearchResult {
  status: CanonicalVendorResearchStatus;
  profileData: VendorProfile | null;
  failureReason?: string;
}

const DEFAULT_PROVIDER: ResearchProvider = "gemini";
const DEFAULT_MODEL = "gemini-flash-lite-latest";

const ID_PREFIX = {
  customerProblem: "problem-",
  desiredOutcome: "outcome-",
  buyingReason: "buying-reason-",
  capability: "capability-",
  useCase: "use-case-",
  proofPoint: "proof-point-",
  alternative: "alternative-",
  differentiation: "differentiation-",
  icpCriterion: "icp-criterion-",
  icpExample: "icp-example-",
  firmographicDisqualifier: "firmographic-disqualifier-",
  whyNowSignal: "why-now-signal-",
  redFlag: "red-flag-",
} as const;

// ---------------------------------------------------------------------------
// Supplied-content path schema (narrow; kept for researchVendorContent compat)
// ---------------------------------------------------------------------------

const ContentCustomerProblemSchema = z.object({
  id: z.string().describe("Short, unique, kebab-case id, e.g. 'unstructured-prioritization'."),
  statement: z.string(),
  impact: z.string(),
});

const ContentDesiredOutcomeSchema = z.object({
  id: z.string(),
  statement: z.string(),
  problemIds: z
    .array(z.string())
    .describe('Must reference "id" values from "customerProblems" in this same response.'),
});

const ContentCapabilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  problemIds: z.array(z.string()).describe("Must reference ids already defined in this same response."),
  outcomeIds: z.array(z.string()).describe("Must reference ids already defined in this same response."),
});

const ContentWhyNowSignalSchema = z.object({
  id: z.string(),
  signal: z.string(),
  whyItMatters: z.string(),
  problemIds: z.array(z.string()).describe("Must reference ids already defined in this same response."),
  outcomeIds: z.array(z.string()).describe("Must reference ids already defined in this same response."),
  firstMeetingAngle: z.string(),
});

const ContentRedFlagSchema = z.object({
  id: z.string(),
  condition: z.string(),
  whyItMatters: z.string(),
  severity: z.enum(["cautionary", "disqualifying"]),
  affectedDecisionGroups: z.array(z.enum(["whyThem", "whyUs"])),
});

const ContentVendorResearchOutputSchema = z.object({
  offering: z.string(),
  customerProblems: z.array(ContentCustomerProblemSchema),
  desiredOutcomes: z.array(ContentDesiredOutcomeSchema),
  capabilities: z.array(ContentCapabilitySchema),
  whyNowSignals: z.array(ContentWhyNowSignalSchema),
  redFlags: z.array(ContentRedFlagSchema),
});
type ContentVendorResearchOutput = z.infer<typeof ContentVendorResearchOutputSchema>;

const CONTENT_RESEARCH_RESPONSE_JSON_SCHEMA = z.toJSONSchema(ContentVendorResearchOutputSchema);

// ---------------------------------------------------------------------------
// URL research: strict per-item schemas + lenient shell
// ---------------------------------------------------------------------------

const UrlCustomerProblemSchema = z.object({
  id: z.string().describe('Must start with "problem-", e.g. "problem-unstructured-prioritization".'),
  statement: z.string(),
  impact: z.string(),
});

const UrlDesiredOutcomeSchema = z.object({
  id: z.string().describe('Must start with "outcome-".'),
  statement: z.string(),
  problemIds: z.array(z.string()).describe('Must reference "problem-*" ids from customerProblems.'),
});

const UrlBuyingReasonSchema = z.object({
  id: z.string().describe('Must start with "buying-reason-".'),
  statement: z.string(),
  outcomeIds: z.array(z.string()).describe('Must reference "outcome-*" ids from desiredOutcomes.'),
});

const UrlCapabilitySchema = z.object({
  id: z.string().describe('Must start with "capability-".'),
  name: z.string(),
  description: z.string(),
  problemIds: z.array(z.string()),
  outcomeIds: z.array(z.string()),
});

const UrlUseCaseSchema = z.object({
  id: z.string().describe('Must start with "use-case-".'),
  name: z.string(),
  description: z.string(),
  problemIds: z.array(z.string()),
  outcomeIds: z.array(z.string()),
  capabilityIds: z.array(z.string()),
});

const UrlCommonAlternativeSchema = z.object({
  id: z.string().describe('Must start with "alternative-".'),
  name: z.string(),
  description: z.string(),
});

const UrlRelevantDifferentiationSchema = z.object({
  id: z.string().describe('Must start with "differentiation-".'),
  statement: z.string(),
  alternativeIds: z.array(z.string()),
  problemIds: z.array(z.string()),
  outcomeIds: z.array(z.string()),
});

const UrlProofPointSchema = z.object({
  id: z.string().describe('Must start with "proof-point-".'),
  summary: z.string(),
  customerName: z.string().optional(),
  industry: z.string().optional(),
  metric: z.string().optional(),
  outcomeIds: z.array(z.string()),
  useCaseIds: z.array(z.string()),
});

const UrlIcpCriterionSchema = z.object({
  id: z.string().describe('Must start with "icp-criterion-".'),
  description: z.string(),
});

const UrlIcpExampleSchema = z.object({
  id: z.string().describe('Must start with "icp-example-".'),
  companyName: z.string(),
  rationale: z.string(),
  criterionIds: z.array(z.string()),
  relationship: z.enum(["customer", "prospect", "example-only"]).optional(),
});

const UrlFirmographicDisqualifierSchema = z.object({
  id: z.string().describe('Must start with "firmographic-disqualifier-".'),
  condition: z.string(),
  whyItMatters: z.string(),
});

const UrlWhyNowSignalSchema = z.object({
  id: z.string().describe('Must start with "why-now-signal-".'),
  signal: z.string(),
  whyItMatters: z.string(),
  problemIds: z.array(z.string()),
  outcomeIds: z.array(z.string()),
  firstMeetingAngle: z.string(),
});

const UrlRedFlagSchema = z.object({
  id: z.string().describe('Must start with "red-flag-".'),
  condition: z.string(),
  whyItMatters: z.string(),
  severity: z.enum(["cautionary", "disqualifying"]),
  affectedDecisionGroups: z.array(z.enum(["whyThem", "whyUs"])),
});

/** Strict full-shape schema used as Gemini responseJsonSchema for URL research. */
const UrlVendorResearchStrictSchema = z.object({
  vendorName: z.string(),
  websiteUrl: z.string(),
  offering: z.string(),
  customerProblems: z.array(UrlCustomerProblemSchema),
  desiredOutcomes: z.array(UrlDesiredOutcomeSchema),
  buyingReasons: z.array(UrlBuyingReasonSchema),
  capabilities: z.array(UrlCapabilitySchema),
  useCases: z.array(UrlUseCaseSchema),
  commonAlternatives: z.array(UrlCommonAlternativeSchema),
  relevantDifferentiation: z.array(UrlRelevantDifferentiationSchema),
  proofPoints: z.array(UrlProofPointSchema),
  idealCustomerProfile: z.object({
    criteria: z.array(UrlIcpCriterionSchema),
    examples: z.array(UrlIcpExampleSchema),
    firmographicDisqualifiers: z.array(UrlFirmographicDisqualifierSchema),
  }),
  whyNowSignals: z.array(UrlWhyNowSignalSchema),
  redFlags: z.array(UrlRedFlagSchema),
});

const URL_RESEARCH_RESPONSE_JSON_SCHEMA = z.toJSONSchema(UrlVendorResearchStrictSchema);

/** Lenient shell: top-level shape required; array items validated individually afterward. */
const UrlVendorResearchShellSchema = z.object({
  vendorName: z.string(),
  websiteUrl: z.string(),
  offering: z.string(),
  customerProblems: z.array(z.unknown()),
  desiredOutcomes: z.array(z.unknown()),
  buyingReasons: z.array(z.unknown()),
  capabilities: z.array(z.unknown()),
  useCases: z.array(z.unknown()),
  commonAlternatives: z.array(z.unknown()),
  relevantDifferentiation: z.array(z.unknown()),
  proofPoints: z.array(z.unknown()),
  idealCustomerProfile: z.object({
    criteria: z.array(z.unknown()),
    examples: z.array(z.unknown()),
    firmographicDisqualifiers: z.array(z.unknown()),
  }),
  whyNowSignals: z.array(z.unknown()),
  redFlags: z.array(z.unknown()),
});

interface ParsedUrlVendorResearch {
  vendorName: string;
  websiteUrl: string;
  offering: string;
  customerProblems: CustomerProblem[];
  desiredOutcomes: DesiredOutcome[];
  buyingReasons: BuyingReason[];
  capabilities: Capability[];
  useCases: UseCase[];
  commonAlternatives: CommonAlternative[];
  relevantDifferentiation: RelevantDifferentiation[];
  proofPoints: ProofPoint[];
  idealCustomerProfile: {
    criteria: IdealCustomerCriterion[];
    examples: IdealCustomerExample[];
    firmographicDisqualifiers: FirmographicDisqualifier[];
  };
  whyNowSignals: WhyNowSignal[];
  redFlags: RedFlag[];
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

function buildContentResearchPrompt(sources: ResearchSource[]): string {
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

function buildVendorResearchFromUrlPrompt(domain: string): string {
  return `You are a meticulous B2B vendor research analyst. Research the vendor at https://${domain} using the URL context tool on https://${domain} and any linked public pages you need (product, solutions, customers, about, pricing). Build a Vendor Profile of this vendor's OWN product and go-to-market strategy. Never invent facts that are not grounded in pages you retrieved, and never fabricate to fill a gap — failure to find information is not proof that the information is false.

Extract and return:
- "vendorName": the vendor's public product or company name.
- "websiteUrl": the canonical https URL for this vendor (prefer https://${domain}).
- "offering": one or two sentences describing what the vendor sells (product summary only — not a full marketing value-proposition essay).
- "customerProblems": important customer problems the offering addresses. Each id MUST start with "problem-".
- "desiredOutcomes": business outcomes the offering enables. Each id MUST start with "outcome-". Each "problemIds" MUST reference "problem-*" ids from this same response.
- "buyingReasons": why customers buy. Each id MUST start with "buying-reason-". Each "outcomeIds" MUST reference "outcome-*" ids from this same response.
- "capabilities": product capabilities that deliver value. Each id MUST start with "capability-". Cross-reference problem/outcome ids from this response.
- "useCases": concrete use cases. Each id MUST start with "use-case-". Cross-reference problem, outcome, and capability ids from this response.
- "commonAlternatives": relevant alternatives buyers compare against. Each id MUST start with "alternative-".
- "relevantDifferentiation": how this vendor differs from those alternatives. Each id MUST start with "differentiation-". Cross-reference alternative, problem, and outcome ids.
- "proofPoints": customer or public proof that substantiates claims. Each id MUST start with "proof-point-". Cross-reference outcome and use-case ids. Optional customerName/industry/metric when stated.
- "idealCustomerProfile.criteria": who the product is for. Each id MUST start with "icp-criterion-".
- "idealCustomerProfile.examples": named example companies when publicly stated. Each id MUST start with "icp-example-". Each "criterionIds" MUST reference "icp-criterion-*" ids. Optional relationship: "customer" | "prospect" | "example-only".
- "idealCustomerProfile.firmographicDisqualifiers": firmographic conditions that make a company a poor fit. Each id MUST start with "firmographic-disqualifier-".
- "whyNowSignals": timing signals that suggest a prospect should act now. Each id MUST start with "why-now-signal-". Cross-reference problem/outcome ids.
- "redFlags": conditions that caution against or disqualify pursuing a prospect. Each id MUST start with "red-flag-". severity is "cautionary" or "disqualifying"; affectedDecisionGroups is a subset of ["whyThem","whyUs"].

ID rules (strict):
- Every item id MUST use its category prefix above and be globally unique across the entire response.
- Only cross-reference ids that you also define in this same response. Never invent dangling references. Never infer references from free text alone.
- Do not reuse the same id for two items.

Content rules:
- If public evidence does not support a collection, return an empty array for it (or an empty string for "offering" / "vendorName" when unknown). Never fabricate to fill a gap.
- Represent the complete Value Proposition through ICP, problems, outcomes, buying reasons, capabilities, use cases, differentiation, alternatives, and proof — not by stuffing a long essay into "offering".
- Do not include target personas or budget owners.
- Do not include any recommendation, score, numeric match, or account-specific judgment.`;
}

function parseItemsIndividually<T>(
  rawValue: unknown,
  schema: z.ZodType<T>,
  idPrefix: string,
): T[] {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  const items: T[] = [];
  for (const rawItem of rawValue) {
    const parsed = schema.safeParse(rawItem);
    if (!parsed.success) {
      continue;
    }
    const id = (parsed.data as { id: string }).id;
    if (typeof id !== "string" || !id.startsWith(idPrefix) || id.length <= idPrefix.length) {
      continue;
    }
    items.push(parsed.data);
  }
  return items;
}

function parseUrlResearchOutput(rawText: string | undefined): ParsedUrlVendorResearch | null {
  if (!rawText) {
    return null;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    return null;
  }

  const shellParsed = UrlVendorResearchShellSchema.safeParse(parsedJson);
  if (!shellParsed.success) {
    return null;
  }

  const shell = shellParsed.data;
  return {
    vendorName: shell.vendorName,
    websiteUrl: shell.websiteUrl,
    offering: shell.offering,
    customerProblems: parseItemsIndividually(
      shell.customerProblems,
      UrlCustomerProblemSchema,
      ID_PREFIX.customerProblem,
    ),
    desiredOutcomes: parseItemsIndividually(
      shell.desiredOutcomes,
      UrlDesiredOutcomeSchema,
      ID_PREFIX.desiredOutcome,
    ),
    buyingReasons: parseItemsIndividually(
      shell.buyingReasons,
      UrlBuyingReasonSchema,
      ID_PREFIX.buyingReason,
    ),
    capabilities: parseItemsIndividually(shell.capabilities, UrlCapabilitySchema, ID_PREFIX.capability),
    useCases: parseItemsIndividually(shell.useCases, UrlUseCaseSchema, ID_PREFIX.useCase),
    commonAlternatives: parseItemsIndividually(
      shell.commonAlternatives,
      UrlCommonAlternativeSchema,
      ID_PREFIX.alternative,
    ),
    relevantDifferentiation: parseItemsIndividually(
      shell.relevantDifferentiation,
      UrlRelevantDifferentiationSchema,
      ID_PREFIX.differentiation,
    ),
    proofPoints: parseItemsIndividually(shell.proofPoints, UrlProofPointSchema, ID_PREFIX.proofPoint),
    idealCustomerProfile: {
      criteria: parseItemsIndividually(
        shell.idealCustomerProfile.criteria,
        UrlIcpCriterionSchema,
        ID_PREFIX.icpCriterion,
      ),
      examples: parseItemsIndividually(
        shell.idealCustomerProfile.examples,
        UrlIcpExampleSchema,
        ID_PREFIX.icpExample,
      ),
      firmographicDisqualifiers: parseItemsIndividually(
        shell.idealCustomerProfile.firmographicDisqualifiers,
        UrlFirmographicDisqualifierSchema,
        ID_PREFIX.firmographicDisqualifier,
      ),
    },
    whyNowSignals: parseItemsIndividually(
      shell.whyNowSignals,
      UrlWhyNowSignalSchema,
      ID_PREFIX.whyNowSignal,
    ),
    redFlags: parseItemsIndividually(shell.redFlags, UrlRedFlagSchema, ID_PREFIX.redFlag),
  };
}

function filterRefs(ids: string[], valid: Set<string>): string[] {
  return ids.filter((id) => valid.has(id));
}

/**
 * Drops items whose ids collide globally, strips dangling references, and
 * never renames an id. Unaffected valid siblings are preserved.
 */
function sanitizeParsedUrlResearch(extracted: ParsedUrlVendorResearch): VendorProfile {
  type IdItem = { id: string };

  const occurrence = new Map<string, number>();
  const allItems: IdItem[] = [
    ...extracted.customerProblems,
    ...extracted.desiredOutcomes,
    ...extracted.buyingReasons,
    ...extracted.capabilities,
    ...extracted.useCases,
    ...extracted.commonAlternatives,
    ...extracted.relevantDifferentiation,
    ...extracted.proofPoints,
    ...extracted.idealCustomerProfile.criteria,
    ...extracted.idealCustomerProfile.examples,
    ...extracted.idealCustomerProfile.firmographicDisqualifiers,
    ...extracted.whyNowSignals,
    ...extracted.redFlags,
  ];

  for (const item of allItems) {
    occurrence.set(item.id, (occurrence.get(item.id) ?? 0) + 1);
  }

  const duplicateIds = new Set(
    [...occurrence.entries()].filter(([, count]) => count > 1).map(([id]) => id),
  );

  const keep = <T extends IdItem>(items: T[]): T[] =>
    items.filter((item) => !duplicateIds.has(item.id));

  const customerProblems = keep(extracted.customerProblems);
  let desiredOutcomes = keep(extracted.desiredOutcomes);
  let buyingReasons = keep(extracted.buyingReasons);
  let capabilities = keep(extracted.capabilities);
  let useCases = keep(extracted.useCases);
  const commonAlternatives = keep(extracted.commonAlternatives);
  let relevantDifferentiation = keep(extracted.relevantDifferentiation);
  let proofPoints = keep(extracted.proofPoints);
  const criteria = keep(extracted.idealCustomerProfile.criteria);
  let examples = keep(extracted.idealCustomerProfile.examples);
  const firmographicDisqualifiers = keep(
    extracted.idealCustomerProfile.firmographicDisqualifiers,
  );
  let whyNowSignals = keep(extracted.whyNowSignals);
  const redFlags = keep(extracted.redFlags);

  const problemIds = new Set(customerProblems.map((item) => item.id));
  const outcomeIds = new Set(desiredOutcomes.map((item) => item.id));
  const capabilityIds = new Set(capabilities.map((item) => item.id));
  const useCaseIds = new Set(useCases.map((item) => item.id));
  const alternativeIds = new Set(commonAlternatives.map((item) => item.id));
  const criterionIds = new Set(criteria.map((item) => item.id));

  desiredOutcomes = desiredOutcomes.map((item) => ({
    ...item,
    problemIds: filterRefs(item.problemIds, problemIds),
  }));

  buyingReasons = buyingReasons.map((item) => ({
    ...item,
    outcomeIds: filterRefs(item.outcomeIds, outcomeIds),
  }));

  capabilities = capabilities.map((item) => ({
    ...item,
    problemIds: filterRefs(item.problemIds, problemIds),
    outcomeIds: filterRefs(item.outcomeIds, outcomeIds),
  }));

  useCases = useCases.map((item) => ({
    ...item,
    problemIds: filterRefs(item.problemIds, problemIds),
    outcomeIds: filterRefs(item.outcomeIds, outcomeIds),
    capabilityIds: filterRefs(item.capabilityIds, capabilityIds),
  }));

  relevantDifferentiation = relevantDifferentiation.map((item) => ({
    ...item,
    alternativeIds: filterRefs(item.alternativeIds, alternativeIds),
    problemIds: filterRefs(item.problemIds, problemIds),
    outcomeIds: filterRefs(item.outcomeIds, outcomeIds),
  }));

  proofPoints = proofPoints.map((item) => ({
    ...item,
    outcomeIds: filterRefs(item.outcomeIds, outcomeIds),
    useCaseIds: filterRefs(item.useCaseIds, useCaseIds),
  }));

  examples = examples.map((item) => ({
    ...item,
    criterionIds: filterRefs(item.criterionIds, criterionIds),
  }));

  whyNowSignals = whyNowSignals.map((item) => ({
    ...item,
    problemIds: filterRefs(item.problemIds, problemIds),
    outcomeIds: filterRefs(item.outcomeIds, outcomeIds),
  }));

  const websiteUrl = extracted.websiteUrl.trim();
  const vendorName = extracted.vendorName.trim();
  const profileId = deriveVendorId(websiteUrl, vendorName);

  const profile: VendorProfile = {
    id: profileId,
    websiteUrl,
    vendorName,
    productKnowledge: {
      offering: extracted.offering.trim(),
      customerProblems,
      desiredOutcomes,
      buyingReasons,
      capabilities,
      useCases,
      commonAlternatives,
      relevantDifferentiation,
      proofPoints,
    },
    decisionStrategy: {
      idealCustomerProfile: {
        criteria,
        examples,
        firmographicDisqualifiers,
      },
      targetPersonas: [],
      budgetOwners: [],
      whyNowSignals,
      redFlags,
    },
  };

  return profile;
}

function deriveVendorId(websiteUrl: string, vendorName: string): string {
  try {
    const withProtocol = /^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`;
    const host = new URL(withProtocol).hostname.toLowerCase().replace(/^www\./, "");
    if (host) {
      return `vendor-${host.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
    }
  } catch {
    // fall through
  }

  const fromName = vendorName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return fromName ? `vendor-${fromName}` : "vendor-unknown";
}

/** True when the draft has at least one mapper-driving item the AE can evaluate against. */
function hasUsableDecisionDrivingInformation(profile: VendorProfile): boolean {
  const knowledge = profile.productKnowledge;
  const strategy = profile.decisionStrategy;
  return (
    knowledge.customerProblems.length > 0 ||
    knowledge.desiredOutcomes.length > 0 ||
    knowledge.buyingReasons.length > 0 ||
    knowledge.capabilities.length > 0 ||
    knowledge.useCases.length > 0 ||
    knowledge.proofPoints.length > 0 ||
    knowledge.relevantDifferentiation.length > 0 ||
    knowledge.commonAlternatives.length > 0 ||
    strategy.idealCustomerProfile.criteria.length > 0 ||
    strategy.idealCustomerProfile.examples.length > 0 ||
    strategy.idealCustomerProfile.firmographicDisqualifiers.length > 0 ||
    strategy.whyNowSignals.length > 0 ||
    strategy.redFlags.length > 0
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

function failedVendorResearch(failureReason: string): CanonicalVendorResearchResult {
  return { status: "failed", profileData: null, failureReason };
}

function parseContentResearchOutput(rawText: string | undefined): ContentVendorResearchOutput | null {
  if (!rawText) {
    return null;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    return null;
  }

  const parsed = ContentVendorResearchOutputSchema.safeParse(parsedJson);
  return parsed.success ? parsed.data : null;
}

/**
 * Resolves the AI-extracted fields for the supplied-content path, or `null`
 * on any failure. Never throws.
 */
async function resolveContentResearchOutput(
  sources: ResearchSource[],
  provider: ResearchProvider,
  call: ResearchModelCaller | undefined,
): Promise<ContentVendorResearchOutput | null> {
  if (provider !== "gemini") {
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
      prompt: buildContentResearchPrompt(sources),
      responseJsonSchema: CONTENT_RESEARCH_RESPONSE_JSON_SCHEMA,
    });
    return parseContentResearchOutput(text);
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

  const extracted = await resolveContentResearchOutput(sources, provider, overrides?.call);
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

/**
 * Researches a vendor from a submitted website URL using Gemini URL Context
 * and a strict structured schema aligned with the canonical VendorProfile.
 *
 * Exactly one Gemini call. Never throws. Returns a
 * `CanonicalVendorResearchResult` that distinguishes success, incomplete
 * (valid but thin draft), and technical failure.
 *
 * Does not replace `researchVendorContent`, which remains the
 * supplied-content / offline path.
 */
export async function researchVendorFromUrl(
  urlOrDomain: string,
  options?: ResearchOptions,
  overrides?: { call?: ResearchModelCaller },
): Promise<CanonicalVendorResearchResult> {
  const provider = options?.provider ?? DEFAULT_PROVIDER;

  let domain: string;
  try {
    domain = sanitizeToDomain(urlOrDomain);
  } catch {
    return failedVendorResearch("The provided URL could not be parsed as a valid vendor website URL.");
  }

  if (provider !== "gemini") {
    return failedVendorResearch(`Research provider "${provider}" is not implemented.`);
  }

  let caller = overrides?.call;
  if (!caller) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return failedVendorResearch("GEMINI_API_KEY is not configured.");
    }
    caller = createLiveResearchModelCaller(
      apiKey,
      process.env.GEMINI_VENDOR_RESEARCH_MODEL ?? DEFAULT_MODEL,
    );
  }

  let text: string | undefined;
  try {
    const result = await caller({
      prompt: buildVendorResearchFromUrlPrompt(domain),
      responseJsonSchema: URL_RESEARCH_RESPONSE_JSON_SCHEMA,
      tools: [{ urlContext: {} }],
    });
    text = result.text;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return failedVendorResearch(`Gemini research request failed: ${message}`);
  }

  if (!text) {
    return failedVendorResearch("Gemini returned an empty response.");
  }

  const extracted = parseUrlResearchOutput(text);
  if (!extracted) {
    return failedVendorResearch(
      "Gemini's response was not valid JSON or did not match the expected top-level schema.",
    );
  }

  const profileData = sanitizeParsedUrlResearch(extracted);

  // Prefer the researched website URL when present; otherwise pin to the
  // normalized https domain the caller submitted.
  if (!profileData.websiteUrl) {
    profileData.websiteUrl = `https://${domain}`;
  }

  if (!hasUsableDecisionDrivingInformation(profileData)) {
    return {
      status: "incomplete",
      profileData,
      failureReason: `No usable decision-driving Vendor Profile items were found for ${domain}.`,
    };
  }

  return { status: "success", profileData };
}

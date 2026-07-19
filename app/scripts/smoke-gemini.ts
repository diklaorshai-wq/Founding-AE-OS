/**
 * Standalone, manually-run smoke test for the live Gemini research
 * connection. This makes a REAL network call and consumes a REAL
 * GEMINI_API_KEY — it is intentionally NOT part of `npm test`, which must
 * stay fully offline and deterministic.
 *
 * Usage (from the `app/` directory):
 *   npm run smoke:gemini -- <domain-or-url> [--json] [--mock]
 * or directly:
 *   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/smoke-gemini.ts <domain-or-url> [--json] [--mock]
 *
 * `--mock` mode (no live internet access to the target site required):
 * The Gemini `urlContext` tool has no mechanism to accept injected/mock page
 * content — it only works by the model fetching a real, live, publicly
 * reachable URL itself, so there is no "payload" to seed it with text. With
 * `--mock`, this script instead disables the URL/Search tools for that one
 * call and passes a small, realistic mock source snapshot (see
 * `MOCK_SOURCE_SNAPSHOTS` below) directly as input text, instructing the
 * model to extract claims only from that text. This still exercises the
 * real Gemini API and the real structured-output schema end to end; it just
 * doesn't depend on Google being able to fetch the target site live.
 * Domain defaults to "vercel.com" (matching the current mock snapshot) when
 * `--mock` is passed without an explicit domain.
 *
 * Reads GEMINI_API_KEY (and optional GEMINI_MODEL) from `.env.local` in this
 * package's root, without ever printing the key itself.
 *
 * NOTE: this file is excluded from `tsconfig.json` (see its `exclude`
 * field) and is NOT type-checked by `next build`. It is executed directly
 * by Node, whose ESM loader requires explicit ".ts" extensions on relative
 * dynamic imports below — a pattern TypeScript's checker otherwise forbids
 * unless "allowImportingTsExtensions" is enabled project-wide, which we
 * intentionally avoid doing just for this one standalone dev script.
 *
 * After research, this script also runs the SAME end-to-end pipeline as
 * `app/api/evaluate/route.ts`: `mapToEvaluationInput` (the Semantic AI
 * Matcher — see `matchingService.ts`) then `generateRecommendation`
 * (Recommendation Engine V1), against the same `gtmBrainVendorProfile`
 * fixture the route currently uses, and prints a `FinalEvaluationResponse`-
 * shaped result (Decision, reasons, Recommended First Move). Neither
 * `matchingService.ts` nor `recommendationEngine.ts` is modified by this
 * script — it only calls their existing exports.
 *
 * NOTE: `--mock` only affects the research step above. The matching step
 * always makes a real, live Gemini Flash Lite call (no tools required, so
 * it isn't subject to the same Search Grounding quota), since exercising
 * the real Semantic AI Matcher end to end is the point of this script.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";

const scriptDir = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal(): void {
  const envPath = join(scriptDir, "..", ".env.local");
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function sanitizeToDomain(rawInput: string): string {
  const withProtocol = /^https?:\/\//i.test(rawInput) ? rawInput : `https://${rawInput}`;
  return new URL(withProtocol).hostname.toLowerCase();
}

/**
 * A small, hand-written, illustrative snapshot of publicly-known information
 * — NOT a verified, up-to-date data pull — used only to give the model
 * something concrete to extract structured claims from in `--mock` mode.
 * Keyed by domain so more fixtures can be added later without new flags.
 */
const MOCK_SOURCE_SNAPSHOTS: Record<string, string> = {
  "vercel.com": `Vercel is a cloud platform for frontend developers, providing hosting and serverless infrastructure optimized for Next.js and other modern web frameworks.
Core platform capabilities include: Git-based deployments with automatic preview environments for every pull request, a global edge network for static and serverless content, Edge Functions and Serverless Functions for backend logic, built-in image optimization, and native support for Next.js features such as Incremental Static Regeneration.
Vercel's hosting offering spans a free Hobby tier for individual developers, a paid Pro tier for small teams and growing businesses, and an Enterprise tier with custom SLAs, SAML SSO, and dedicated support for large organizations.
Vercel has continued to expand its enterprise go-to-market motion, growing its sales team and investing in enterprise-focused features (SSO, audit logs, dedicated infrastructure) to support larger customers migrating from self-hosted infrastructure.
Vercel is also the company behind Next.js, the open-source React framework, which drives significant developer adoption and top-of-funnel awareness for the commercial platform.`,
};

function getMockSourceSnapshot(domain: string): string {
  const snapshot = MOCK_SOURCE_SNAPSHOTS[domain];
  if (!snapshot) {
    const available = Object.keys(MOCK_SOURCE_SNAPSHOTS).join(", ");
    throw new Error(
      `No mock source snapshot is defined for "${domain}". Available: ${available}.`,
    );
  }
  return snapshot;
}

/**
 * Builds a `researchCompany` model-call override (see the `overrides.call`
 * parameter on `researchCompany`) that, instead of letting the model use
 * live tools, appends a fixed mock source snapshot to the same prompt and
 * schema the real provider already built, and disables tools entirely.
 * Structurally matches the provider's internal `ModelCaller` type without
 * needing to import it.
 */
function createMockModelCaller(domain: string, apiKey: string, model: string) {
  const client = new GoogleGenAI({ apiKey });
  const sourceSnapshot = getMockSourceSnapshot(domain);

  return async ({
    prompt,
    responseJsonSchema,
  }: {
    prompt: string;
    responseJsonSchema: unknown;
  }) => {
    const augmentedPrompt = `${prompt}

IMPORTANT — MOCK MODE OVERRIDE: no tools (URL context, Google Search) are available in this run. Ignore any instruction above to use them. Instead, extract claims ONLY from the source content below, and cite "https://${domain}" as the sourceUrl for every claim.

SOURCE CONTENT (assume this was retrieved from https://${domain}):
"""
${sourceSnapshot}
"""`;

    const response = await client.models.generateContent({
      model,
      contents: augmentedPrompt,
      config: {
        // Deliberately no `tools` here — this call must not depend on live
        // internet access to the target site.
        responseMimeType: "application/json",
        responseJsonSchema,
      },
    });

    return { text: response.text };
  };
}

interface CuratedReasonLike {
  text: string;
  evaluationId: string;
  supportingClaimIds: string[];
}

/**
 * Mirrors `buildCuratedReasons` in `app/api/evaluate/route.ts` exactly, so
 * this script's printed output matches what the real endpoint would return.
 * Recommendation Engine V1 itself is not modified — this only reshapes its
 * existing `businessCase`/`supportingEvidence` output fields.
 */
function buildCuratedReasons(
  businessCase: string,
  supportingEvidence: string[],
): CuratedReasonLike[] {
  const reasons: CuratedReasonLike[] = [
    { text: businessCase, evaluationId: "business-case", supportingClaimIds: [] },
  ];

  for (const [index, evidence] of supportingEvidence.slice(0, 3).entries()) {
    reasons.push({
      text: evidence,
      evaluationId: `supporting-evidence-${index + 1}`,
      supportingClaimIds: [],
    });
  }

  return reasons;
}

async function main(): Promise<void> {
  loadEnvLocal();

  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const useMock = args.includes("--mock");
  const target = args.find((arg) => !arg.startsWith("--"));

  if (!target && !useMock) {
    console.error("Usage: node scripts/smoke-gemini.ts <domain-or-url> [--json] [--mock]");
    process.exitCode = 1;
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error(
      "GEMINI_API_KEY is not set. Add it to app/.env.local (see app/.env.local for the placeholder) and re-run.",
    );
    process.exitCode = 1;
    return;
  }

  // Defaults to "vercel.com" in --mock mode, matching the current mock
  // snapshot, when no explicit domain is given.
  const domain = sanitizeToDomain(target ?? "vercel.com");
  const model = process.env.GEMINI_MODEL ?? "gemini-flash-latest";

  // Imported lazily, after the env var check above, so this script never
  // constructs a live client with a missing key. Explicit file extensions
  // are required throughout: Node's ESM loader does not support directory
  // imports (ERR_UNSUPPORTED_DIR_IMPORT) or extensionless relative
  // specifiers the way CommonJS require() does.
  const { researchCompany } = await import(
    "../app/lib/intelligence/providers/gemini/index.ts"
  );
  const { mapToEvaluationInput } = await import(
    "../app/lib/intelligence/matchingService.ts"
  );
  const { generateRecommendation } = await import(
    "../app/lib/intelligence/recommendationEngine.ts"
  );
  const { gtmBrainVendorProfile } = await import(
    "../app/lib/intelligence/vendorProfile.test-data.ts"
  );

  console.log(
    useMock
      ? `Researching ${domain} with Gemini using a mock source snapshot (no live internet access to ${domain} required)...`
      : `Researching ${domain} with Gemini (this makes a live network call)...`,
  );
  const result = await researchCompany(
    domain,
    useMock
      ? { call: createMockModelCaller(domain, process.env.GEMINI_API_KEY, model) }
      : undefined,
  );

  if (result.status === "failed" || !result.profileData) {
    // Mirrors app/api/evaluate/route.ts: research must succeed before
    // matching and Recommendation Engine V1 can run at all.
    if (asJson) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`\nStatus: ${result.status}`);
    console.log(`Reason: ${result.failureReason ?? "(none reported)"}`);
    console.log("\nResearch did not produce a company profile, so the matching and Recommendation Engine V1 steps were skipped.");
    process.exitCode = 1;
    return;
  }

  if (!asJson) {
    console.log(`\nStatus: ${result.status}`);
    if (result.failureReason) {
      console.log(`Reason: ${result.failureReason}`);
    }
    console.log(`Account name: ${result.profileData.accountName}`);
    const groups: Array<[string, { claims: unknown[] }]> = [
      ["firmographicData", result.profileData.firmographicData],
      ["coreBusinessActivities", result.profileData.coreBusinessActivities],
      ["corporateAnnouncements", result.profileData.corporateAnnouncements],
      ["hiringAndRoleTrends", result.profileData.hiringAndRoleTrends],
      ["observedTechnologies", result.profileData.observedTechnologies],
    ];
    for (const [name, group] of groups) {
      console.log(`  ${name}: ${group.claims.length} claim(s)`);
    }
  }

  // NOTE (same stopgap as app/api/evaluate/route.ts): Vendor Onboarding has
  // no persisted-profile storage yet, so this evaluates against the single
  // GTM Brain vendor fixture rather than a real, submitted Vendor Profile.
  console.log("\nMatching against the Semantic AI Matcher (Gemini Flash Lite)...");
  const evaluationInput = await mapToEvaluationInput(result.profileData, gtmBrainVendorProfile);
  const recommendation = generateRecommendation(evaluationInput);

  const evidenceBundle = [
    ...result.profileData.firmographicData.claims,
    ...result.profileData.coreBusinessActivities.claims,
    ...result.profileData.corporateAnnouncements.claims,
    ...result.profileData.hiringAndRoleTrends.claims,
    ...result.profileData.observedTechnologies.claims,
  ];

  const finalEvaluationResponse = {
    executionStatus: "success" as const,
    decisionOutcome: recommendation.decision,
    curatedReasons: buildCuratedReasons(recommendation.businessCase, recommendation.supportingEvidence),
    recommendedFirstMove: recommendation.recommendedNextBestAction,
    evidenceBundle,
  };

  if (asJson) {
    console.log(JSON.stringify(finalEvaluationResponse, null, 2));
    return;
  }

  console.log("\n--- Final Evaluation Response (app/api/evaluate contract) ---");
  console.log(`Decision: ${finalEvaluationResponse.decisionOutcome}`);
  console.log("Reasons:");
  for (const reason of finalEvaluationResponse.curatedReasons) {
    console.log(`  - ${reason.text}`);
  }
  console.log(`Recommended First Move: ${finalEvaluationResponse.recommendedFirstMove}`);
  console.log(`\nFull final evaluation response (--json for the raw contract only):`);
  console.log(JSON.stringify(finalEvaluationResponse, null, 2));
}

main().catch((error) => {
  console.error("Unexpected error running the smoke script:", error);
  process.exitCode = 1;
});

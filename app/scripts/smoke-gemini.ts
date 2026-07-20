/**
 * Standalone, manually-run smoke test for the live canonical Gemini research
 * + deterministic matching pipeline. This makes a REAL network call and
 * consumes a REAL GEMINI_API_KEY — it is intentionally NOT part of
 * `npm test`, which must stay fully offline and deterministic.
 *
 * Usage (from the `app/` directory):
 *   npm run smoke:gemini -- <domain-or-url> [--json] [--mock]
 *
 * `--mock` mode: disables URL Context for that one call and injects a fixed
 * source snapshot into the prompt (same idea as the previous smoke path).
 *
 * Pipeline (mirrors `app/api/evaluate/route.ts`):
 *   researchCompanyFromUrl → mapEvidenceToDecisionGroups → generateRecommendation
 *
 * Exactly one Gemini call (research). Matching is pure/synchronous.
 * Prints only safe operational output — never API keys or env values.
 *
 * NOTE: this file is excluded from `tsconfig.json` and is NOT type-checked
 * by `next build`. Explicit ".ts" extensions are required for Node ESM.
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
 * A small, hand-written, illustrative snapshot used only in `--mock` mode.
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
 * Override for `researchCompanyFromUrl`: ignores URL Context tools and
 * injects a mock source snapshot into the prompt so the strict canonical
 * schema can still be exercised without live site fetching.
 */
function createMockUrlResearchCaller(domain: string, apiKey: string, model: string) {
  const client = new GoogleGenAI({ apiKey });
  const sourceSnapshot = getMockSourceSnapshot(domain);

  return async ({
    prompt,
    responseJsonSchema,
  }: {
    prompt: string;
    responseJsonSchema: unknown;
    tools?: unknown;
  }) => {
    const augmentedPrompt = `${prompt}

IMPORTANT — MOCK MODE OVERRIDE: no tools (URL context) are available in this run. Ignore any instruction above to use them. Instead, extract findings ONLY from the source content below, and cite "https://${domain}" as the source for every finding.

SOURCE CONTENT (assume this was retrieved from https://${domain}):
"""
${sourceSnapshot}
"""`;

    const response = await client.models.generateContent({
      model,
      contents: augmentedPrompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema,
      },
    });

    return { text: response.text };
  };
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
      "GEMINI_API_KEY is not set. Add it to app/.env.local and re-run.",
    );
    process.exitCode = 1;
    return;
  }

  const domain = sanitizeToDomain(target ?? "vercel.com");
  const model = process.env.GEMINI_COMPANY_RESEARCH_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest";

  const { researchCompanyFromUrl } = await import(
    "../app/lib/intelligence/companyResearchService.ts"
  );
  const { mapEvidenceToDecisionGroups } = await import(
    "../app/lib/intelligence/evidenceMatchingService.ts"
  );
  const { generateRecommendation } = await import(
    "../app/lib/intelligence/recommendationEngine.ts"
  );
  const { gtmBrainVendorProfile } = await import(
    "../app/lib/intelligence/vendorProfile.test-data.ts"
  );

  console.log(
    useMock
      ? `Researching ${domain} with canonical URL research using a mock source snapshot...`
      : `Researching ${domain} with canonical URL research (one live Gemini call with URL Context)...`,
  );

  const researchResult = await researchCompanyFromUrl(
    domain,
    gtmBrainVendorProfile,
    undefined,
    useMock
      ? { call: createMockUrlResearchCaller(domain, process.env.GEMINI_API_KEY, model) }
      : undefined,
  );

  if (asJson) {
    // Safe operational summary only — never dump env or keys.
    const summary = {
      researchStatus: researchResult.status,
      failureReason: researchResult.failureReason,
      evidenceCounts: researchResult.profileData
        ? {
            whyThem: researchResult.profileData.relevantBusinessEvidence.length,
            whyNow: researchResult.profileData.whyNowEvidence.length,
            whyUs: researchResult.profileData.whyUsEvidence.length,
          }
        : null,
    };
    if (researchResult.status === "failed" || !researchResult.profileData) {
      console.log(JSON.stringify(summary, null, 2));
      process.exitCode = 1;
      return;
    }

    const evaluationInput = mapEvidenceToDecisionGroups(
      researchResult.profileData,
      gtmBrainVendorProfile,
    );
    const recommendation = generateRecommendation(evaluationInput);
    console.log(
      JSON.stringify(
        {
          ...summary,
          decision: recommendation.decision,
          confidence: recommendation.confidence,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`\nResearch status: ${researchResult.status}`);
  if (researchResult.failureReason) {
    console.log(`Research note: ${researchResult.failureReason}`);
  }

  if (researchResult.status === "failed" || !researchResult.profileData) {
    console.log("\nResearch failed technically — matching was not run.");
    process.exitCode = 1;
    return;
  }

  const profile = researchResult.profileData;
  console.log(`Company: ${profile.companyIdentity.name || "(unnamed)"}`);
  console.log(
    `Evidence counts — whyThem: ${profile.relevantBusinessEvidence.length}, whyNow: ${profile.whyNowEvidence.length}, whyUs: ${profile.whyUsEvidence.length}`,
  );

  console.log("\nRunning deterministic mapEvidenceToDecisionGroups (no Gemini call)...");
  const evaluationInput = mapEvidenceToDecisionGroups(profile, gtmBrainVendorProfile);
  const recommendation = generateRecommendation(evaluationInput);

  console.log("\n--- Recommendation ---");
  console.log(`Decision: ${recommendation.decision}`);
  console.log(`Confidence: ${recommendation.confidence}`);
  console.log(`Next action: ${recommendation.recommendedNextBestAction}`);
}

main().catch((error) => {
  console.error("Unexpected error running the smoke script:", error);
  process.exitCode = 1;
});

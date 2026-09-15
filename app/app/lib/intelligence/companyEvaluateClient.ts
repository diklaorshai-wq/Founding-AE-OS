/**
 * Client helpers for the home target-company evaluate flow.
 * DOM-light pure helpers stay testable from Node `.test.cts` files.
 */
import type { FinalEvaluationResponse } from "./types/contracts.ts";
import type { VendorProfile } from "./vendorProfile.ts";
import { normalizeVendorWebsiteUrl } from "./vendorOnboardingFlow.ts";

export type EvaluateExperienceStatus = "idle" | "loading" | "complete" | "error";

export type CompanyEvaluateRequest = {
  url: string;
  vendorProfile: VendorProfile;
};

export type CompanyEvaluateClientResult =
  | { ok: true; response: FinalEvaluationResponse }
  | { ok: false; message: string; code?: string };

const MISSING_VENDOR_MESSAGE =
  "Approve a Vendor Profile before evaluating accounts. Onboard your product at /vendor.";

/**
 * Reuses vendor website normalization for target-company domains.
 * Returns a normalized https URL suitable for the evaluate API body.
 */
export function normalizeTargetCompanyUrl(rawInput: string): {
  ok: true;
  url: string;
} | {
  ok: false;
  message: string;
} {
  const result = normalizeVendorWebsiteUrl(rawInput);
  if (!result.ok) {
    return {
      ok: false,
      message:
        "Enter a normal company website or domain, such as monday.com or https://www.monday.com.",
    };
  }
  return result;
}

export function missingApprovedVendorMessage(): string {
  return MISSING_VENDOR_MESSAGE;
}

/** Maps API / network failures to user-facing copy without leaking secrets. */
export function toSafeEvaluateErrorMessage(input: {
  status?: number;
  code?: string;
  message?: string;
  networkError?: boolean;
}): string {
  if (input.networkError) {
    return "We could not reach GTM Brain to evaluate that company. Check your connection and try again.";
  }

  const code = (input.code ?? "").trim();
  const message = (input.message ?? "").trim();

  if (/GEMINI_API_KEY|api[_-]?key|process\.env/i.test(message)) {
    return "Account evaluation is temporarily unavailable due to a configuration issue. Please try again later.";
  }

  if (code === "INVALID_URL" || (input.status === 400 && /url/i.test(message))) {
    return "That website address does not look valid. Enter a normal company website or domain and try again.";
  }

  if (code === "INVALID_VENDOR_PROFILE") {
    return "Your approved Vendor Profile is missing or invalid. Re-approve it at /vendor, then try again.";
  }

  if (code === "RESEARCH_FAILED" || input.status === 502) {
    return "We could not finish researching that company website. Please try again in a moment.";
  }

  if (code === "INVALID_JSON" || code === "INVALID_BODY") {
    return "The evaluation request was incomplete. Enter a company website and try again.";
  }

  if (message.length > 0 && message.length < 200 && !/at\s+\S+\s+\(/.test(message)) {
    return message;
  }

  return "We could not finish evaluating that company. Please try again in a moment.";
}

/**
 * Offline-safe parse of an evaluate API JSON body into FinalEvaluationResponse.
 */
export function parseEvaluateResponseBody(body: unknown): FinalEvaluationResponse | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }
  const record = body as Record<string, unknown>;
  if (record.executionStatus !== "success" && record.executionStatus !== "failed") {
    return null;
  }
  return body as FinalEvaluationResponse;
}

export async function requestCompanyEvaluate(
  payload: CompanyEvaluateRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<CompanyEvaluateClientResult> {
  let response: Response;
  try {
    response = await fetchImpl("/api/evaluate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: payload.url,
        vendorProfile: payload.vendorProfile,
      }),
    });
  } catch {
    return {
      ok: false,
      message: toSafeEvaluateErrorMessage({ networkError: true }),
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      ok: false,
      message: toSafeEvaluateErrorMessage({ status: response.status }),
      code: "INVALID_RESPONSE",
    };
  }

  const parsed = parseEvaluateResponseBody(body);
  if (!parsed) {
    return {
      ok: false,
      message: toSafeEvaluateErrorMessage({ status: response.status }),
      code: "INVALID_RESPONSE",
    };
  }

  if (!response.ok || parsed.executionStatus === "failed") {
    return {
      ok: false,
      message: toSafeEvaluateErrorMessage({
        status: response.status,
        code: parsed.errorDetails?.code,
        message: parsed.errorDetails?.message,
      }),
      code: parsed.errorDetails?.code,
    };
  }

  return { ok: true, response: parsed };
}

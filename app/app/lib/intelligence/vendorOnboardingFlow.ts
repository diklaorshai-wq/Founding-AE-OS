/**
 * Pure helpers for Vendor Onboarding flow decisions (Checkpoint C).
 * DOM-free so Node tests can cover research → refine → approve transitions.
 */
import type { VendorProfile } from "./vendorProfile.ts";
import type { CanonicalVendorResearchResult } from "./vendorResearchService.ts";
import {
  saveApprovedVendorProfile,
  type SaveApprovedVendorProfileResult,
  type StorageLike,
} from "./approvedVendorProfileStorage.ts";

export type VendorOnboardingPhase =
  | "idle"
  | "researching"
  | "failed"
  | "refining"
  | "confirmReplace"
  | "approved";

export type NormalizeVendorUrlResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

const INVALID_VENDOR_URL_MESSAGE =
  "Enter a normal company website or domain, such as snowflake.com or https://www.snowflake.com.";

/**
 * Normalizes a vendor website/domain for research submission.
 * Accepts bare domains and http(s) URLs; rejects unsupported protocols and free text.
 */
export function normalizeVendorWebsiteUrl(rawInput: string): NormalizeVendorUrlResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { ok: false, message: "Enter a company website or domain to continue." };
  }

  if (/^(javascript|data|file|ftp|blob):/i.test(trimmed)) {
    return { ok: false, message: INVALID_VENDOR_URL_MESSAGE };
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return { ok: false, message: INVALID_VENDOR_URL_MESSAGE };
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return { ok: false, message: INVALID_VENDOR_URL_MESSAGE };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, message: INVALID_VENDOR_URL_MESSAGE };
  }

  const hostname = parsed.hostname.trim().toLowerCase();
  if (!hostname || hostname.includes(" ")) {
    return { ok: false, message: INVALID_VENDOR_URL_MESSAGE };
  }

  // Require a dotted domain (or localhost) so free text like "hello" is rejected.
  if (hostname !== "localhost" && !hostname.includes(".")) {
    return { ok: false, message: INVALID_VENDOR_URL_MESSAGE };
  }

  const path = parsed.pathname === "/" ? "" : parsed.pathname;
  return {
    ok: true,
    url: `${parsed.protocol}//${parsed.host}${path}${parsed.search}${parsed.hash}`,
  };
}

/** Whether a research API status should open refinement (never for failed). */
export function shouldOpenRefinement(status: CanonicalVendorResearchResult["status"]): boolean {
  return status === "success" || status === "incomplete";
}

/**
 * Maps research / network failures to a plain-language message.
 * Never echoes stack traces, API keys, or environment dumps.
 */
export function toSafeResearchErrorMessage(input: {
  status?: number;
  failureReason?: string;
  networkError?: boolean;
}): string {
  if (input.networkError) {
    return "We could not reach GTM Brain to research that website. Check your connection and try again.";
  }

  const reason = (input.failureReason ?? "").trim();

  if (/GEMINI_API_KEY|api[_-]?key|process\.env/i.test(reason)) {
    return "Vendor research is temporarily unavailable due to a configuration issue. Please try again later.";
  }

  if (input.status === 400) {
    return "That website address does not look valid. Enter a normal company website URL or domain and try again.";
  }

  if (/URL|parse|hostname|protocol/i.test(reason)) {
    return "That website address does not look valid. Enter a normal company website URL or domain and try again.";
  }

  if (/empty response|not valid JSON|schema|Gemini research request failed/i.test(reason)) {
    return "We could not finish researching that website. Please try again in a moment.";
  }

  if (reason.length > 0 && reason.length < 180 && !/at\s+\S+\s+\(/.test(reason)) {
    return "We could not finish researching that website. Please try again in a moment.";
  }

  return "We could not finish researching that website. Please try again in a moment.";
}

/**
 * Persists an approved profile only when structural + semantic validation pass.
 * Used by the onboarding UI after VendorRefinementMode's onApprove.
 */
export function persistApprovedVendorProfile(
  profile: VendorProfile,
  storage?: StorageLike | null,
): SaveApprovedVendorProfileResult {
  return saveApprovedVendorProfile(profile, storage);
}

/** Source-path guards used by tests — production onboarding must not import fixtures. */
export const ONBOARDING_FORBIDDEN_IMPORT_PATTERNS = [
  "gtmBrainVendorProfile",
  "vendorProfile.test-data",
  "researchVendorContent",
] as const;

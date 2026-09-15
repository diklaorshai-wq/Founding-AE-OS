/**
 * HTTP request handling for `POST /api/evaluate`.
 *
 * Kept under `lib/intelligence` so Node `.test.cts` files can require it.
 * The App Router file remains a thin `POST` wrapper.
 *
 * Production never falls back to fixture vendor data.
 */
import { z } from "zod";
import { validateApprovedVendorProfile } from "./approvedVendorProfileStorage.ts";
import {
  runCanonicalEvaluate,
  type CanonicalEvaluateResult,
} from "./evaluatePipeline.ts";
import type { FinalEvaluationResponse } from "./types/contracts.ts";
import type { VendorProfile } from "./vendorProfile.ts";

const RequestBodySchema = z.object({
  url: z.string().min(1),
  vendorProfile: z.unknown(),
});

type EvaluateFn = (
  domain: string,
  vendorProfile: VendorProfile,
) => Promise<CanonicalEvaluateResult>;

function toErrorResponse(code: string, message: string, status: number): Response {
  const body: FinalEvaluationResponse = {
    executionStatus: "failed",
    errorDetails: { code, message },
  };
  return Response.json(body, { status });
}

/**
 * Same acceptance semantics as vendor research: normal website URL or bare
 * domain normalized to an http(s) hostname. Explicit non-http(s) schemes rejected.
 */
export function sanitizeEvaluateDomain(rawUrl: string): string {
  const trimmed = rawUrl.trim();

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    throw new Error("Unsupported URL protocol");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Unsupported URL protocol");
  }
  if (!parsed.hostname) {
    throw new Error("URL is missing a hostname");
  }

  // Align with vendor URL rules: reject free text like "hello".
  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== "localhost" && !hostname.includes(".")) {
    throw new Error("URL is missing a hostname");
  }

  return hostname;
}

/**
 * Canonical evaluate HTTP contract. Production route calls this with the
 * live `runCanonicalEvaluate` default (no fixture vendor).
 */
export async function handleCompanyEvaluatePost(
  request: Request,
  evaluate: EvaluateFn = runCanonicalEvaluate,
): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return toErrorResponse("INVALID_JSON", "Request body must be valid JSON.", 400);
  }

  const parsedBody = RequestBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    const issuePath = parsedBody.error.issues[0]?.path?.[0];
    if (issuePath === "vendorProfile") {
      return toErrorResponse(
        "INVALID_VENDOR_PROFILE",
        'Request body must include a "vendorProfile" object.',
        400,
      );
    }
    return toErrorResponse(
      "INVALID_BODY",
      'Request body must include a non-empty "url" string and a "vendorProfile" object.',
      400,
    );
  }

  if (
    parsedBody.data.vendorProfile === null ||
    parsedBody.data.vendorProfile === undefined ||
    typeof parsedBody.data.vendorProfile !== "object" ||
    Array.isArray(parsedBody.data.vendorProfile)
  ) {
    return toErrorResponse(
      "INVALID_VENDOR_PROFILE",
      'Request body must include a "vendorProfile" object.',
      400,
    );
  }

  let domain: string;
  try {
    domain = sanitizeEvaluateDomain(parsedBody.data.url);
  } catch {
    return toErrorResponse(
      "INVALID_URL",
      'The provided "url" could not be parsed as a valid company URL.',
      400,
    );
  }

  const validatedVendor = validateApprovedVendorProfile(parsedBody.data.vendorProfile);
  if (!validatedVendor.ok) {
    return toErrorResponse(
      "INVALID_VENDOR_PROFILE",
      validatedVendor.errors[0] ??
        "The submitted Vendor Profile is invalid. Approve a valid profile before evaluating accounts.",
      400,
    );
  }

  try {
    const result = await evaluate(domain, validatedVendor.profile);
    return Response.json(result.body, { status: result.httpStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const safeMessage = /GEMINI_API_KEY|api[_-]?key|process\.env/i.test(message)
      ? "Account evaluation failed due to a configuration error."
      : "Account evaluation failed due to an unexpected error.";
    return toErrorResponse("INTERNAL_ERROR", safeMessage, 500);
  }
}

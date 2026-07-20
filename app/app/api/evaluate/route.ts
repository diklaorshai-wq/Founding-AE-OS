import { z } from "zod";
import type { FinalEvaluationResponse } from "../../lib/intelligence/types/contracts";
import { runCanonicalEvaluate } from "../../lib/intelligence/evaluatePipeline";
import { gtmBrainVendorProfile } from "../../lib/intelligence/vendorProfile.test-data";

const RequestBodySchema = z.object({
  url: z.string().min(1),
});

function toErrorResponse(code: string, message: string, status: number): Response {
  const body: FinalEvaluationResponse = {
    executionStatus: "failed",
    errorDetails: { code, message },
  };
  return Response.json(body, { status });
}

/** Sanitizes an arbitrary submitted string down to a bare, https-only hostname. */
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

export async function POST(request: Request): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return toErrorResponse("INVALID_JSON", "Request body must be valid JSON.", 400);
  }

  const parsedBody = RequestBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return toErrorResponse(
      "INVALID_BODY",
      'Request body must include a non-empty "url" string.',
      400,
    );
  }

  let domain: string;
  try {
    domain = sanitizeToDomain(parsedBody.data.url);
  } catch {
    return toErrorResponse(
      "INVALID_URL",
      'The provided "url" could not be parsed as a valid company URL.',
      400,
    );
  }

  try {
    // NOTE: Vendor Onboarding has no persisted-profile storage yet (see
    // GTM-BRAIN-PROJECT-STATE.md section 7), so this endpoint evaluates every
    // submitted company against the single GTM Brain vendor fixture until a
    // real Vendor Profile store exists.
    const result = await runCanonicalEvaluate(domain, gtmBrainVendorProfile);
    return Response.json(result.body, { status: result.httpStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return toErrorResponse("INTERNAL_ERROR", message, 500);
  }
}

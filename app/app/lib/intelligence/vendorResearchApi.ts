/**
 * HTTP request handling for `POST /api/vendor/research`.
 *
 * Kept under `lib/intelligence` so Node `.test.cts` files can require it with
 * an explicit `.ts` extension (Next route modules cannot be required the same way).
 * The App Router file remains a thin `POST` wrapper.
 */
import { z } from "zod";
import {
  researchVendorFromUrl,
  type CanonicalVendorResearchResult,
} from "./vendorResearchService.ts";

const RequestBodySchema = z.object({
  url: z.string().min(1),
});

type VendorResearchFn = (url: string) => Promise<CanonicalVendorResearchResult>;

function toRequestError(code: string, message: string, status: number): Response {
  const body: CanonicalVendorResearchResult & {
    errorDetails: { code: string; message: string };
  } = {
    status: "failed",
    profileData: null,
    failureReason: message,
    errorDetails: { code, message },
  };
  return Response.json(body, { status });
}

/**
 * Same acceptance semantics as the company evaluate route: a normal website URL
 * or bare domain that can be safely normalized to http(s) with a hostname.
 * Explicit non-http(s) `scheme://` values are rejected before https-prefixing
 * (otherwise `ftp://host` would become `https://ftp://host`).
 */
function sanitizeToDomain(rawUrl: string): string {
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

  return parsed.hostname.toLowerCase();
}

/**
 * Checkpoint A vendor-research HTTP contract. Production route calls this with
 * the canonical `researchVendorFromUrl` default.
 */
export async function handleVendorResearchPost(
  request: Request,
  research: VendorResearchFn = researchVendorFromUrl,
): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return toRequestError("INVALID_JSON", "Request body must be valid JSON.", 400);
  }

  const parsedBody = RequestBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return toRequestError(
      "INVALID_BODY",
      'Request body must include a non-empty "url" string.',
      400,
    );
  }

  let domain: string;
  try {
    domain = sanitizeToDomain(parsedBody.data.url);
  } catch {
    return toRequestError(
      "INVALID_URL",
      'The provided "url" could not be parsed as a valid vendor website URL.',
      400,
    );
  }

  try {
    // Pass the validated hostname form so research always receives a safe domain.
    const result = await research(domain);
    return Response.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const safeMessage = /GEMINI_API_KEY|api[_-]?key/i.test(message)
      ? "Vendor research failed due to a configuration error."
      : message;
    return toRequestError("INTERNAL_ERROR", safeMessage, 500);
  }
}

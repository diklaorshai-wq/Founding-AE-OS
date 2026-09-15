import { handleCompanyEvaluatePost } from "../../lib/intelligence/companyEvaluateApi";

/**
 * POST /api/evaluate
 *
 * Body: { url: string, vendorProfile: VendorProfile }
 * Uses the submitted, server-validated VendorProfile only — never a fixture.
 */
export async function POST(request: Request): Promise<Response> {
  return handleCompanyEvaluatePost(request);
}

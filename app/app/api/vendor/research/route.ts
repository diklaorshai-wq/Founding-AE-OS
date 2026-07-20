import { handleVendorResearchPost } from "../../../lib/intelligence/vendorResearchApi";

/**
 * Checkpoint A: Vendor URL → canonical VendorProfile research draft.
 * Does not persist, approve, or evaluate a target company.
 */
export async function POST(request: Request): Promise<Response> {
  return handleVendorResearchPost(request);
}

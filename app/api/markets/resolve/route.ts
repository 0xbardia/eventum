import { assertSameOrigin, errorResponse, parseBody, rateLimitResponse, readJson, response, withApiHeaders } from "@/lib/api";
import { storeMarketPreview } from "@/lib/db";
import { resolveMarketSchema } from "@/lib/schemas";
import { resolvePolymarket } from "@/lib/providers/polymarket";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const limited = rateLimitResponse(request, "provider");
    if (limited) return limited;
    assertSameOrigin(request);
    const { url } = parseBody(resolveMarketSchema, await readJson(request));
    const evidence = await resolvePolymarket(url);
    const snapshot = storeMarketPreview(evidence);
    return withApiHeaders(response({ market: snapshot, source: "real-provider", authority: "offchain-preview" }));
  } catch (error) {
    return withApiHeaders(errorResponse(error));
  }
}

import { errorResponse, parseBody, rateLimitResponse, readJson, response, withApiHeaders } from "@/lib/api";
import { registerArgs, storeMarketPreview } from "@/lib/db";
import { prepareComparisonSchema } from "@/lib/schemas";
import { resolvePolymarket } from "@/lib/providers/polymarket";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const limited = rateLimitResponse(request);
    if (limited) return limited;
    const body = parseBody(prepareComparisonSchema, await readJson(request));
    const evidence = await Promise.all(body.urls.map(resolvePolymarket));
    const snapshots = evidence.map(storeMarketPreview);
    return withApiHeaders(
      response({
        comparisonVersion: body.comparisonVersion,
        source: "real-provider",
        authority: "offchain-preview",
        snapshots,
        registerArgs: evidence.map(registerArgs),
      }),
    );
  } catch (error) {
    return withApiHeaders(errorResponse(error));
  }
}

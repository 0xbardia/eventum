import { errorResponse, rateLimitResponse, response, withApiHeaders } from "@/lib/api";
import { getSnapshot, readContract } from "@/lib/genlayer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const limited = rateLimitResponse(request);
    if (limited) return limited;
    const ids = await readContract("get_market_ids", [0, 20]);
    if (!Array.isArray(ids)) throw new Error("Invalid market index response");
    const markets = await Promise.all(ids.map((id) => getSnapshot(String(id))));
    return withApiHeaders(response({ markets, authority: "onchain" }));
  } catch (error) {
    const safe = error instanceof Error && "code" in error && (error as { code?: string }).code === "CONTRACT_NOT_CONFIGURED";
    if (safe) return withApiHeaders(response({ markets: [], authority: "unavailable", configured: false }));
    return withApiHeaders(errorResponse(error));
  }
}

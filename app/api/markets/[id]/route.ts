import { errorResponse, rateLimitResponse, response, withApiHeaders } from "@/lib/api";
import { getSnapshot } from "@/lib/genlayer";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const limited = rateLimitResponse(request);
    if (limited) return limited;
    const { id } = await context.params;
    return withApiHeaders(response({ market: await getSnapshot(id), authority: "onchain" }));
  } catch (error) {
    return withApiHeaders(errorResponse(error));
  }
}

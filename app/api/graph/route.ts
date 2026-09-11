import { errorResponse, rateLimitResponse, response, withApiHeaders } from "@/lib/api";
import { getGraphEdges } from "@/lib/genlayer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const limited = rateLimitResponse(request);
    if (limited) return limited;
    return withApiHeaders(response({ edges: await getGraphEdges(), directEdgesOnly: true, authority: "onchain" }));
  } catch (error) {
    const safe = error instanceof Error && "code" in error && (error as { code?: string }).code === "CONTRACT_NOT_CONFIGURED";
    if (safe) return withApiHeaders(response({ edges: [], directEdgesOnly: true, authority: "unavailable", configured: false }));
    return withApiHeaders(errorResponse(error));
  }
}

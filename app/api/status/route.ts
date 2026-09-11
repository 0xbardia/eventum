import { errorResponse, rateLimitResponse, response, withApiHeaders } from "@/lib/api";
import { getContractStatus } from "@/lib/genlayer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const limited = rateLimitResponse(request);
    if (limited) return limited;
    return withApiHeaders(response({ contract: await getContractStatus(), checkedAt: new Date().toISOString() }));
  } catch (error) {
    return withApiHeaders(errorResponse(error));
  }
}

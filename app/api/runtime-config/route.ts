import { getPublicConfig } from "@/lib/config";
import { rateLimitResponse, response, withApiHeaders } from "@/lib/api";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const limited = rateLimitResponse(request);
  if (limited) return limited;
  return withApiHeaders(response(getPublicConfig()));
}

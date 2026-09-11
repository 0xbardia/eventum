import { errorResponse, response, withApiHeaders } from "@/lib/api";
import { dbHealth } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const healthy = dbHealth();
    return withApiHeaders(response({ status: healthy ? "ok" : "degraded", database: healthy, checkedAt: new Date().toISOString() }, healthy ? 200 : 503));
  } catch (error) {
    return withApiHeaders(errorResponse(error));
  }
}


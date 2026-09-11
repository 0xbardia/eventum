import { errorResponse, parseBody, rateLimitResponse, readJson, response, withApiHeaders } from "@/lib/api";
import { createComparisonRun, listComparisonRuns } from "@/lib/db";
import { createComparisonRunSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = rateLimitResponse(request);
  if (limited) return limited;
  return withApiHeaders(response({ runs: listComparisonRuns(), authority: "application-persistence" }));
}

export async function POST(request: Request) {
  try {
    const limited = rateLimitResponse(request);
    if (limited) return limited;
    const body = parseBody(createComparisonRunSchema, await readJson(request));
    const run = createComparisonRun({
      ...body,
      snapshots: body.snapshots as [typeof body.snapshots[0], typeof body.snapshots[1]],
      registerArgs: body.registerArgs as [string[], string[]],
    });
    return withApiHeaders(response({ run, authority: "application-persistence" }, 201));
  } catch (error) {
    return withApiHeaders(errorResponse(error));
  }
}

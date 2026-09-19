import { errorResponse, parseBody, rateLimitResponse, readJson, response, withApiHeaders } from "@/lib/api";
import { getPublicConfig } from "@/lib/config";
import { createComparisonRun, listComparisonRuns } from "@/lib/db";
import { createComparisonRunSchema } from "@/lib/schemas";
import { getSession } from "@/lib/session";

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
    const session = getSession(request, true)!;
    const body = parseBody(createComparisonRunSchema, await readJson(request));
    const runtime = getPublicConfig();
    const run = createComparisonRun({
      ...body,
      snapshots: body.snapshots as [typeof body.snapshots[0], typeof body.snapshots[1]],
      registerArgs: body.registerArgs as [string[], string[]],
      contractAddress: runtime.contractAddress,
      network: runtime.network,
      chainId: runtime.chainId,
    }, session.hash);
    const result = withApiHeaders(response({ run, authority: "application-persistence" }, 201));
    if (session.setCookie) result.headers.set("Set-Cookie", session.setCookie);
    return result;
  } catch (error) {
    return withApiHeaders(errorResponse(error));
  }
}

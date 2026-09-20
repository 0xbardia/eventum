import { assertSameOrigin, errorResponse, parseBody, rateLimitResponse, readJson, response, withApiHeaders } from "@/lib/api";
import { getPublicConfig } from "@/lib/config";
import { createComparisonRun, findRecentComparisonRun, listComparisonRuns } from "@/lib/db";
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
    const limited = rateLimitResponse(request, "registration");
    if (limited) return limited;
    assertSameOrigin(request);
    const session = getSession(request, true)!;
    const body = parseBody(createComparisonRunSchema, await readJson(request));
    const runtime = getPublicConfig();
    const registerArgs = body.registerArgs as [string[], string[]];
    const existing = findRecentComparisonRun(body.snapshotAId, body.snapshotBId, body.comparisonVersion, registerArgs, session.hash);
    const run = existing ?? createComparisonRun({
      ...body,
      snapshots: body.snapshots as [typeof body.snapshots[0], typeof body.snapshots[1]],
      registerArgs,
      contractAddress: runtime.contractAddress,
      network: runtime.network,
      chainId: runtime.chainId,
    }, session.hash);
    const result = withApiHeaders(response({ run, authority: "application-persistence" }, existing ? 200 : 201));
    if (session.setCookie) result.headers.set("Set-Cookie", session.setCookie);
    return result;
  } catch (error) {
    return withApiHeaders(errorResponse(error));
  }
}

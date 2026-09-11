import { errorResponse, parseBody, rateLimitResponse, readJson, response, withApiHeaders } from "@/lib/api";
import { getComparisonRun, updateComparisonRun } from "@/lib/db";
import { updateComparisonRunSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = rateLimitResponse(request);
  if (limited) return limited;
  const { id } = await context.params;
  const run = getComparisonRun(id);
  if (!run) return withApiHeaders(response({ error: { code: "COMPARISON_RUN_NOT_FOUND", message: "Comparison run not found." } }, 404));
  return withApiHeaders(response({ run, authority: "application-persistence" }));
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const limited = rateLimitResponse(request);
    if (limited) return limited;
    const { id } = await context.params;
    const body = parseBody(updateComparisonRunSchema, await readJson(request));
    const { eventState, eventDetail, ...patch } = body;
    const event = eventState ? { state: eventState, at: new Date().toISOString(), detail: eventDetail } : undefined;
    return withApiHeaders(response({ run: updateComparisonRun(id, patch, event), authority: "application-persistence" }));
  } catch (error) {
    const message = error instanceof Error && error.message === "COMPARISON_RUN_NOT_FOUND" ? { error: { code: "COMPARISON_RUN_NOT_FOUND", message: "Comparison run not found." } } : null;
    if (message) return withApiHeaders(response(message, 404));
    return withApiHeaders(errorResponse(error));
  }
}

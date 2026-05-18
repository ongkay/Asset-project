import { buildExtApiErrorResponse, ExtApiError } from "@/lib/ext-api/errors";
import { syncExtTradingViewOwnedLayouts } from "@/modules/ext/services";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new ExtApiError("EXT_REQUEST_INVALID", "Request body must be valid JSON.");
    }

    return Response.json(
      await syncExtTradingViewOwnedLayouts({
        body,
        requestHeaders: request.headers,
      }),
    );
  } catch (error) {
    return buildExtApiErrorResponse(error);
  }
}

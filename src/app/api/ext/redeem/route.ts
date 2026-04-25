import { buildExtApiErrorResponse, ExtApiError } from "@/lib/ext-api/errors";
import { createExtRedeemResponse } from "@/modules/ext/services";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new ExtApiError("EXT_REQUEST_INVALID", "Request body must be valid JSON.");
    }

    const payload = await createExtRedeemResponse({ body, requestHeaders: request.headers });

    return Response.json(payload);
  } catch (error) {
    return buildExtApiErrorResponse(error);
  }
}

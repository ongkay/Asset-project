import { buildExtApiErrorResponse } from "@/lib/ext-api/errors";
import { createExtLogoutResponse } from "@/modules/ext/services";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await createExtLogoutResponse({ requestHeaders: request.headers });

    return Response.json(payload);
  } catch (error) {
    return buildExtApiErrorResponse(error);
  }
}

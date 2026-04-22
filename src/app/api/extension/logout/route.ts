import { buildExtensionApiErrorResponse } from "@/lib/extension-api/errors";
import { createExtensionLogoutResponse } from "@/modules/extension/services";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await createExtensionLogoutResponse({
      requestHeaders: request.headers,
    });

    return Response.json(payload);
  } catch (error) {
    return buildExtensionApiErrorResponse(error);
  }
}

import { buildExtensionApiErrorResponse } from "@/lib/extension-api/errors";
import { getExtensionSessionResponse } from "@/modules/extension/services";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const payload = await getExtensionSessionResponse({
      requestHeaders: request.headers,
    });

    return Response.json(payload);
  } catch (error) {
    return buildExtensionApiErrorResponse(error);
  }
}

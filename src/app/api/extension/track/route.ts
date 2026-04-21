import { buildExtensionApiErrorResponse } from "@/lib/extension-api/errors";
import { createExtensionTrackResponse } from "@/modules/extension/services";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await createExtensionTrackResponse({
      heartbeat: await request.json(),
      requestHeaders: request.headers,
    });

    return Response.json(payload);
  } catch (error) {
    return buildExtensionApiErrorResponse(error);
  }
}

import { buildExtensionApiErrorResponse } from "@/lib/extension-api/errors";
import { getExtensionAssetResponse } from "@/modules/extension/services";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const payload = await getExtensionAssetResponse({
      assetId: searchParams.get("id") ?? "",
      nonce: request.headers.get("x-request-nonce"),
      requestHeaders: request.headers,
    });

    return Response.json(payload);
  } catch (error) {
    return buildExtensionApiErrorResponse(error);
  }
}

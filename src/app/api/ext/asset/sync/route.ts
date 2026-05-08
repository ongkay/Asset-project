import { buildExtApiErrorResponse } from "@/lib/ext-api/errors";
import { getExtAssetSyncResponse } from "@/modules/ext/services";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const query = Object.fromEntries(new URL(request.url).searchParams.entries());
    const payload = await getExtAssetSyncResponse({ query, requestHeaders: request.headers });

    return Response.json(payload);
  } catch (error) {
    return buildExtApiErrorResponse(error);
  }
}

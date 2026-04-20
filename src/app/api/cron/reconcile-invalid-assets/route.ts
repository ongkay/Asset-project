import { assertTrustedCronRequest, buildCronErrorResponse } from "@/lib/cron";
import { runReconcileInvalidAssetsCronJob } from "@/modules/subscriptions/services";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    assertTrustedCronRequest(request);

    const result = await runReconcileInvalidAssetsCronJob();

    return Response.json(result);
  } catch (error) {
    return buildCronErrorResponse(error);
  }
}

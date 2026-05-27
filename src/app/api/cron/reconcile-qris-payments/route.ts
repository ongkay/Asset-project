import { assertTrustedCronRequest, buildCronErrorResponse } from "@/lib/cron";
import { runReconcileQrisPaymentsCronJob } from "@/modules/payments/services";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    assertTrustedCronRequest(request);

    const result = await runReconcileQrisPaymentsCronJob();

    return Response.json(result);
  } catch (error) {
    return buildCronErrorResponse(error);
  }
}

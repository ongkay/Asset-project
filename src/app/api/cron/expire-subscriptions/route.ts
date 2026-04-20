import { assertTrustedCronRequest, buildCronErrorResponse } from "@/lib/cron";
import { runExpireSubscriptionsCronJob } from "@/modules/subscriptions/services";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    assertTrustedCronRequest(request);

    const result = await runExpireSubscriptionsCronJob();

    return Response.json(result);
  } catch (error) {
    return buildCronErrorResponse(error);
  }
}

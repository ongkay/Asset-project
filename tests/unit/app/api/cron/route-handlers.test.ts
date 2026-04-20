import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/subscriptions/services", () => ({
  runExpireSubscriptionsCronJob: vi.fn(),
  runReconcileInvalidAssetsCronJob: vi.fn(),
}));

import { GET as getExpireSubscriptions } from "@/app/api/cron/expire-subscriptions/route";
import { GET as getReconcileInvalidAssets } from "@/app/api/cron/reconcile-invalid-assets/route";
import { runExpireSubscriptionsCronJob, runReconcileInvalidAssetsCronJob } from "@/modules/subscriptions/services";

const mockedRunExpireSubscriptionsCronJob = vi.mocked(runExpireSubscriptionsCronJob);
const mockedRunReconcileInvalidAssetsCronJob = vi.mocked(runReconcileInvalidAssetsCronJob);

describe("cron route handlers", () => {
  it("returns expire subscriptions payload for trusted cron requests", async () => {
    mockedRunExpireSubscriptionsCronJob.mockResolvedValue({
      ok: true,
      job: "expire-subscriptions",
      processedCount: 2,
      executedAt: "2026-04-20T12:00:00.000Z",
    });

    const response = await getExpireSubscriptions(
      new Request("http://localhost/api/cron/expire-subscriptions", {
        headers: {
          authorization: "Bearer cron-secret",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      job: "expire-subscriptions",
      processedCount: 2,
      executedAt: "2026-04-20T12:00:00.000Z",
    });
  });

  it("returns 401 when expire subscriptions bearer token is missing", async () => {
    const response = await getExpireSubscriptions(new Request("http://localhost/api/cron/expire-subscriptions"));

    expect(response.status).toBe(401);
  });

  it("returns reconcile invalid assets payload for trusted cron requests", async () => {
    mockedRunReconcileInvalidAssetsCronJob.mockResolvedValue({
      ok: true,
      job: "reconcile-invalid-assets",
      processedCount: 3,
      executedAt: "2026-04-20T12:05:00.000Z",
    });

    const response = await getReconcileInvalidAssets(
      new Request("http://localhost/api/cron/reconcile-invalid-assets", {
        headers: {
          authorization: "Bearer cron-secret",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      job: "reconcile-invalid-assets",
      processedCount: 3,
      executedAt: "2026-04-20T12:05:00.000Z",
    });
  });
});

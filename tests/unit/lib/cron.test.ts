import { describe, expect, it } from "vitest";

import { CronAuthorizationError, assertTrustedCronRequest, buildCronErrorResponse } from "@/lib/cron";

describe("lib/cron", () => {
  it("accepts configured bearer token", () => {
    const request = new Request("http://localhost/api/cron/expire-subscriptions", {
      headers: {
        authorization: "Bearer cron-secret",
      },
    });

    expect(() => assertTrustedCronRequest(request)).not.toThrow();
  });

  it("throws CronAuthorizationError when bearer token is missing", () => {
    const request = new Request("http://localhost/api/cron/expire-subscriptions");

    expect(() => assertTrustedCronRequest(request)).toThrow(CronAuthorizationError);
    expect(() => assertTrustedCronRequest(request)).toThrow("Unauthorized cron request.");
    expect(new CronAuthorizationError().name).toBe("CronAuthorizationError");
  });

  it("maps authorization failures to 401 JSON response", async () => {
    const response = buildCronErrorResponse(new CronAuthorizationError());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "CRON_UNAUTHORIZED",
        message: "Unauthorized cron request.",
      },
    });
  });

  it("maps unexpected failures to 500 JSON response", async () => {
    const response = buildCronErrorResponse(new Error("boom"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "CRON_JOB_FAILED",
        message: "Cron job failed.",
      },
    });
  });
});

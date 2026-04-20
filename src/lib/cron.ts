import "server-only";

import { env } from "@/config/env.server";

const CRON_UNAUTHORIZED_MESSAGE = "Unauthorized cron request.";
const CRON_FAILED_MESSAGE = "Cron job failed.";

export class CronAuthorizationError extends Error {
  constructor() {
    super(CRON_UNAUTHORIZED_MESSAGE);
    this.name = "CronAuthorizationError";
  }
}

export function assertTrustedCronRequest(request: Request) {
  if (request.headers.get("authorization") === `Bearer ${env.CRON_SECRET}`) {
    return;
  }

  throw new CronAuthorizationError();
}

export function buildCronErrorResponse(error: unknown) {
  if (error instanceof CronAuthorizationError) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "CRON_UNAUTHORIZED",
          message: CRON_UNAUTHORIZED_MESSAGE,
        },
      },
      { status: 401 },
    );
  }

  return Response.json(
    {
      ok: false,
      error: {
        code: "CRON_JOB_FAILED",
        message: CRON_FAILED_MESSAGE,
      },
    },
    { status: 500 },
  );
}

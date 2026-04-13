import "server-only";

import { createMiddleware } from "next-safe-action";

export const actionLoggingMiddleware = createMiddleware<{
  metadata: { actionName: string };
}>().define(async ({ metadata, next }) => {
  const startedAt = Date.now();
  const result = await next();

  if (process.env.NODE_ENV !== "production") {
    console.info("Safe action executed:", {
      actionName: metadata.actionName,
      durationMs: Date.now() - startedAt,
    });
  }

  return result;
});

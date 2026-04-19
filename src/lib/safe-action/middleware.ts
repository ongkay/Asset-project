import "server-only";

import { createMiddleware } from "next-safe-action";

type ActionClientMetadata = {
  actionName: string;
};

type CurrentAppUserContext<TCurrentAppUser> = {
  currentAppUser: TCurrentAppUser | null;
};

export function createCurrentAppUserMiddleware<TCurrentAppUser>(
  readCurrentAppUser: () => Promise<TCurrentAppUser | null>,
) {
  return createMiddleware<{
    metadata: ActionClientMetadata;
  }>().define(async ({ next }) => {
    const currentAppUser = await readCurrentAppUser();

    return next({
      ctx: {
        currentAppUser,
      },
    });
  });
}

export function createRequiredAppUserMiddleware<TCurrentAppUser>(
  assertCurrentAppUser?: (currentAppUser: TCurrentAppUser) => void,
) {
  return createMiddleware<{
    ctx: CurrentAppUserContext<TCurrentAppUser>;
    metadata: ActionClientMetadata;
  }>().define(async ({ ctx, next }) => {
    if (!ctx.currentAppUser) {
      throw new Error("Unauthorized");
    }

    assertCurrentAppUser?.(ctx.currentAppUser);

    return next({
      ctx: {
        currentAppUser: ctx.currentAppUser,
      },
    });
  });
}

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

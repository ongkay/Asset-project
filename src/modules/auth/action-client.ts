import "server-only";

import { createMiddleware } from "next-safe-action";

import { actionClient } from "@/lib/safe-action/client";
import { getAuthenticatedAppUser } from "@/modules/users/services";

import type { AuthenticatedAppUser } from "@/modules/users/types";

const withCurrentAppUser = createMiddleware<{
  metadata: { actionName: string };
}>().define(async ({ next }) => {
  const currentAppUser = await getAuthenticatedAppUser();

  return next({
    ctx: {
      currentAppUser,
    },
  });
});

const requireAuthenticatedAppUser = createMiddleware<{
  ctx: { currentAppUser: AuthenticatedAppUser | null };
  metadata: { actionName: string };
}>().define(async ({ ctx, next }) => {
  if (!ctx.currentAppUser) {
    throw new Error("Unauthorized");
  }

  return next({
    ctx: {
      currentAppUser: ctx.currentAppUser,
    },
  });
});

const requireAdminAppUser = createMiddleware<{
  ctx: { currentAppUser: AuthenticatedAppUser };
  metadata: { actionName: string };
}>().define(async ({ ctx, next }) => {
  if (ctx.currentAppUser.profile.role !== "admin") {
    throw new Error("Forbidden");
  }

  return next({
    ctx: {
      currentAppUser: ctx.currentAppUser,
    },
  });
});

export const currentAppUserActionClient = actionClient.use(withCurrentAppUser);
export const authenticatedActionClient = currentAppUserActionClient.use(requireAuthenticatedAppUser);
export const adminActionClient = authenticatedActionClient.use(requireAdminAppUser);

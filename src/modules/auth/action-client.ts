import "server-only";

import { actionClient } from "@/lib/safe-action/client";
import { createCurrentAppUserMiddleware, createRequiredAppUserMiddleware } from "@/lib/safe-action/middleware";
import { getAuthenticatedAppUser } from "@/modules/users/services";

import type { AuthenticatedAppUser } from "@/modules/users/types";

function assertAdminAppUser(currentAppUser: AuthenticatedAppUser) {
  if (currentAppUser.profile.isBanned || currentAppUser.profile.role !== "admin") {
    throw new Error("Forbidden");
  }
}

function assertMemberAppUser(currentAppUser: AuthenticatedAppUser) {
  if (currentAppUser.profile.isBanned || currentAppUser.profile.role !== "member") {
    throw new Error("Forbidden");
  }
}

const withCurrentAppUser = createCurrentAppUserMiddleware(getAuthenticatedAppUser);
const requireAuthenticatedAppUser = createRequiredAppUserMiddleware<AuthenticatedAppUser>();
const requireAdminAppUser = createRequiredAppUserMiddleware(assertAdminAppUser);
const requireMemberAppUser = createRequiredAppUserMiddleware(assertMemberAppUser);

export const currentAppUserActionClient = actionClient.use(withCurrentAppUser);
export const authenticatedActionClient = currentAppUserActionClient.use(requireAuthenticatedAppUser);
export const adminActionClient = authenticatedActionClient.use(requireAdminAppUser);
export const memberActionClient = authenticatedActionClient.use(requireMemberAppUser);

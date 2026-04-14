import "server-only";

import { redirect } from "next/navigation";

import {
  revokeActiveAppSession,
  touchActiveAppSessionLastSeen,
  validateActiveAppSession,
} from "@/modules/sessions/services";

import { findUserProfileById } from "./repositories";

import type { AuthenticatedAppUser } from "./types";

export async function getAuthenticatedAppUser(): Promise<AuthenticatedAppUser | null> {
  const activeSession = await validateActiveAppSession();

  if (!activeSession) {
    return null;
  }

  const profile = await findUserProfileById(activeSession.userId);

  if (!profile) {
    await revokeActiveAppSession();
    return null;
  }

  return {
    profile,
    session: activeSession,
  };
}

export async function requireMemberShellAccess(): Promise<AuthenticatedAppUser> {
  const authenticatedUser = await getAuthenticatedAppUser();

  if (!authenticatedUser) {
    redirect("/login");
  }

  if (authenticatedUser.profile.isBanned) {
    redirect("/unauthorized");
  }

  if (authenticatedUser.profile.role === "admin") {
    redirect("/admin");
  }

  await touchActiveAppSessionLastSeen();

  return authenticatedUser;
}

export async function requireAdminShellAccess(): Promise<AuthenticatedAppUser> {
  const authenticatedUser = await getAuthenticatedAppUser();

  if (!authenticatedUser) {
    redirect("/login");
  }

  if (authenticatedUser.profile.isBanned || authenticatedUser.profile.role !== "admin") {
    redirect("/unauthorized");
  }

  await touchActiveAppSessionLastSeen();

  return authenticatedUser;
}

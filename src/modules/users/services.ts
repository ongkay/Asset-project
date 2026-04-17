import "server-only";

import { redirect } from "next/navigation";

import { createAuthUserAsAdmin, deleteAuthUserAsAdmin, readAuthUserByEmail } from "@/modules/auth/repositories";
import {
  revokeActiveAppSession,
  touchActiveAppSessionLastSeen,
  validateActiveAppSession,
} from "@/modules/sessions/services";

import {
  findUserProfileById,
  insertUserProfile,
  isPublicIdTaken,
  isUsernameTaken,
  readProfileByEmail,
  updateUserBanState,
  updateUserProfileFields,
} from "./repositories";
import {
  adminCreateUserServiceInputSchema,
  adminEditUserProfileServiceInputSchema,
  adminToggleUserBanServiceInputSchema,
  usernameSchema,
} from "./schemas";

import type { AuthenticatedAppUser } from "./types";

const AVATAR_FALLBACK_PALETTE = [
  "bg-muted text-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-accent text-accent-foreground",
  "bg-card text-card-foreground",
] as const;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Unexpected user service error.";
}

function getErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code;
  }

  return null;
}

function isRetriableProfileUniquenessConflict(error: unknown) {
  if (getErrorCode(error) !== "23505") {
    return false;
  }

  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes("profiles_username_unique") ||
    message.includes("profiles_public_id_unique") ||
    message.includes("username") ||
    message.includes("public_id")
  );
}

function isProfileIdentityConflict(error: unknown) {
  if (getErrorCode(error) !== "23505") {
    return false;
  }

  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes("profiles_email") ||
    message.includes("profiles_user_id") ||
    message.includes("email") ||
    message.includes("user_id")
  );
}

function createPublicIdCandidate(role: "admin" | "member") {
  const prefix = role === "admin" ? "ADM" : "MEM";
  const suffix = Math.floor(Math.random() * 36 ** 6)
    .toString(36)
    .toUpperCase()
    .padStart(6, "0");

  return `${prefix}-${suffix}`;
}

function hashStringToIndex(value: string, length: number) {
  let total = 0;

  for (const character of value) {
    total = (total + character.charCodeAt(0)) % length;
  }

  return total;
}

export function normalizeUsernameFromEmailLocalPart(email: string) {
  const normalizedLocalPart = email
    .trim()
    .toLowerCase()
    .split("@")[0]
    ?.replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizedLocalPart && normalizedLocalPart.length > 0 ? normalizedLocalPart : "user";
}

export async function resolveUniqueUsername(baseUsername: string, excludeUserId?: string) {
  const normalizedBaseUsername = usernameSchema.parse(baseUsername);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidateUsername = attempt === 0 ? normalizedBaseUsername : `${normalizedBaseUsername}-${attempt + 1}`;
    const isTaken = excludeUserId
      ? await isUsernameTaken(candidateUsername, excludeUserId)
      : await isUsernameTaken(candidateUsername);

    if (!isTaken) {
      return candidateUsername;
    }
  }

  throw new Error("Could not generate a unique username.");
}

export async function generateUniquePublicId(role: "admin" | "member") {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidatePublicId = createPublicIdCandidate(role);

    if (!(await isPublicIdTaken(candidatePublicId))) {
      return candidatePublicId;
    }
  }

  throw new Error("Could not generate a unique public ID.");
}

export function buildFallbackAvatarSeed(input: { userId: string; username: string }) {
  return {
    initials:
      input.username
        .split("-")
        .filter(Boolean)
        .slice(0, 2)
        .map((segment) => segment[0]?.toUpperCase() ?? "")
        .join("") || "U",
    toneClassName: AVATAR_FALLBACK_PALETTE[hashStringToIndex(input.userId, AVATAR_FALLBACK_PALETTE.length)],
  };
}

export async function createUserByAdmin(input: unknown) {
  const payload = adminCreateUserServiceInputSchema.parse(input);
  const existingAuthUser = await readAuthUserByEmail({ email: payload.email });

  if (existingAuthUser) {
    throw new Error("Email is already used by another user.");
  }

  const existingProfile = await readProfileByEmail(payload.email);

  if (existingProfile) {
    throw new Error("Email is already used by another user.");
  }

  const createdAuthUser = await createAuthUserAsAdmin({
    email: payload.email,
    password: payload.password,
  });

  try {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        const createdProfile = await insertUserProfile({
          avatarUrl: null,
          email: payload.email,
          isBanned: false,
          publicId: await generateUniquePublicId(payload.role),
          role: payload.role,
          userId: createdAuthUser.id,
          username: await resolveUniqueUsername(normalizeUsernameFromEmailLocalPart(payload.email)),
        });

        return {
          publicId: createdProfile.public_id,
          userId: createdProfile.user_id,
          username: createdProfile.username,
        };
      } catch (error) {
        if (isRetriableProfileUniquenessConflict(error)) {
          continue;
        }

        if (isProfileIdentityConflict(error)) {
          throw new Error("Email is already used by another user.");
        }

        throw error;
      }
    }

    throw new Error("Could not generate a unique username or public ID.");
  } catch (error) {
    await deleteAuthUserAsAdmin({ userId: createdAuthUser.id });
    throw error;
  }
}

export async function updateUserProfileByAdmin(input: unknown) {
  const payload = adminEditUserProfileServiceInputSchema.parse(input);

  if (await isUsernameTaken(payload.username, payload.userId)) {
    throw new Error("Username is already used by another user.");
  }

  const updatedProfile = await updateUserProfileFields({
    avatarUrl: payload.avatarUrl,
    userId: payload.userId,
    username: payload.username,
  });

  return {
    userId: updatedProfile.user_id,
    username: updatedProfile.username,
  };
}

export async function toggleUserBanByAdmin(input: unknown) {
  const payload = adminToggleUserBanServiceInputSchema.parse(input);

  if (payload.nextIsBanned && payload.actingAdminUserId === payload.userId) {
    throw new Error("You cannot ban your own admin account.");
  }

  const updatedProfile = await updateUserBanState({
    banReason: payload.banReason,
    isBanned: payload.nextIsBanned,
    userId: payload.userId,
  });

  return {
    isBanned: updatedProfile.is_banned,
    userId: updatedProfile.user_id,
  };
}

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

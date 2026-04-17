import "server-only";

import { randomBytes } from "node:crypto";

import { createInsForgeServerAuth } from "@/lib/insforge/auth";
import { createInsForgeAdminDatabase, createInsForgeServerDatabase } from "@/lib/insforge/database";

import type {
  CheckAuthEmailInput,
  ExchangeResetPasswordInput,
  LoginLogWriteInputSchema,
  ResetPasswordInput,
  SendResetPasswordInput,
  SignInInput,
  SignUpInput,
} from "./schemas";
import type { AuthProfile, AuthProviderUser, AuthenticatedUserSnapshot } from "./types";

type ProfileRow = {
  avatar_url: string | null;
  email: string;
  is_banned: boolean;
  public_id: string;
  role: "admin" | "member";
  user_id: string;
  username: string;
};

type LoginLogCounterRow = {
  created_at: string;
  failure_reason: string | null;
  is_success: boolean;
};

type InsertMemberProfileInput = {
  email: string;
  publicId: string;
  userId: string;
  username: string;
};

// The current InsForge repo/runtime does not expose a stable exact-email lookup or password-update
// admin API from the SDK layer. Phase 2 therefore uses a narrow SQL helper boundary instead of
// shaping auth.users rows in app code.
function createAuthAdminDatabase() {
  return createInsForgeAdminDatabase();
}

function mapProfileRowToAuthProfile(data: ProfileRow): AuthProfile {
  return {
    avatarUrl: data.avatar_url,
    email: data.email,
    isBanned: data.is_banned,
    publicId: data.public_id,
    role: data.role,
    userId: data.user_id,
    username: data.username,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Unexpected repository error.";
}

function getErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code;
  }

  return null;
}

function createPublicId() {
  return `MEM-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function createUsernameCandidate(email: string) {
  const localPart =
    email
      .split("@")[0]
      ?.replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "member";
  const suffix = randomBytes(3).toString("hex");

  return `${localPart.slice(0, 20)}-${suffix}`;
}

function isRetriableProfileConflict(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  const code = getErrorCode(error);

  if (code !== "23505") {
    return false;
  }

  return (
    message.includes("profiles_username_unique") ||
    message.includes("profiles_public_id_unique") ||
    message.includes("username") ||
    message.includes("public_id")
  );
}

export async function signInWithPassword(input: SignInInput) {
  return createInsForgeServerAuth().signInWithPassword({
    email: input.email,
    password: input.password,
  });
}

export async function signUpWithPassword(input: SignUpInput) {
  return createInsForgeServerAuth().signUp({
    email: input.email,
    password: input.password,
  });
}

export async function createAuthUserAsAdmin(input: { email: string; password: string }) {
  const { data, error } = await createAuthAdminDatabase().rpc("admin_create_auth_user", {
    p_email: input.email,
    p_password: input.password,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Auth user could not be created.");
  }

  return {
    email: data.email,
    emailVerified: data.email_verified,
    id: data.id,
  } satisfies AuthProviderUser;
}

export async function updateAuthUserPasswordAsAdmin(input: { newPassword: string; userId: string }) {
  const { data, error } = await createAuthAdminDatabase().rpc("admin_update_auth_user_password", {
    p_new_password: input.newPassword,
    p_user_id: input.userId,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Auth user not found.");
  }

  return {
    userId: input.userId,
  };
}

export async function deleteAuthUserAsAdmin(input: { userId: string }) {
  const { error } = await createAuthAdminDatabase().rpc("admin_delete_auth_user", {
    p_user_id: input.userId,
  });

  if (error) {
    throw error;
  }
}

export async function sendResetPasswordEmail(input: SendResetPasswordInput & { redirectTo: string }) {
  return createInsForgeServerAuth().sendResetPasswordEmail({
    email: input.email,
    redirectTo: input.redirectTo,
  });
}

export async function exchangeResetPasswordToken(input: ExchangeResetPasswordInput) {
  return createInsForgeServerAuth().exchangeResetPasswordToken({
    code: input.code,
    email: input.email,
  });
}

export async function resetPasswordWithOtp(input: ResetPasswordInput) {
  return createInsForgeServerAuth().resetPassword({
    newPassword: input.password,
    otp: input.otp,
  });
}

export async function readAuthUserByEmail(input: CheckAuthEmailInput): Promise<AuthProviderUser | null> {
  const { data, error } = await createAuthAdminDatabase().rpc("get_auth_user_by_email", {
    p_email: input.email,
  });

  if (error) {
    throw error;
  }

  if (data) {
    return {
      email: data.email,
      emailVerified: data.email_verified,
      id: data.id,
    } satisfies AuthProviderUser;
  }

  return null;
}

export async function readAuthenticatedUserSnapshot(accessToken?: string) {
  const auth = createInsForgeServerAuth({ accessToken });
  const { data, error } = await auth.getCurrentUser();

  if (error) {
    throw error;
  }

  const user = data.user;

  if (!user) {
    return {
      accessToken,
      profile: null,
      user: null,
    } satisfies AuthenticatedUserSnapshot;
  }

  const profile = await readProfileByUserId(user.id, accessToken);

  return {
    accessToken,
    profile,
    user: {
      email: user.email ?? null,
      id: user.id,
    },
  } satisfies AuthenticatedUserSnapshot;
}

export async function readProfileByUserId(userId: string, accessToken?: string): Promise<AuthProfile | null> {
  const database = accessToken ? createInsForgeServerDatabase({ accessToken }) : createInsForgeAdminDatabase();
  const { data, error } = await database
    .from("profiles")
    .select("user_id, email, username, public_id, avatar_url, role, is_banned")
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapProfileRowToAuthProfile(data);
}

async function insertMemberProfile(input: InsertMemberProfileInput) {
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database
    .from("profiles")
    .insert([
      {
        avatar_url: null,
        ban_reason: null,
        email: input.email,
        is_banned: false,
        public_id: input.publicId,
        role: "member",
        user_id: input.userId,
        username: input.username,
      },
    ])
    .select("user_id, email, username, public_id, avatar_url, role, is_banned")
    .single<ProfileRow>();

  if (error) {
    throw error;
  }

  return mapProfileRowToAuthProfile(data);
}

export async function provisionMemberProfile(input: { email: string; userId: string }) {
  const existingProfile = await readProfileByUserId(input.userId);

  if (existingProfile) {
    return existingProfile;
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      return await insertMemberProfile({
        email: input.email,
        publicId: createPublicId(),
        userId: input.userId,
        username: createUsernameCandidate(input.email),
      });
    } catch (error) {
      if (!isRetriableProfileConflict(error)) {
        throw new Error(getErrorMessage(error));
      }
    }
  }

  throw new Error("Failed to provision a unique member profile.");
}

export async function insertLoginLog(input: LoginLogWriteInputSchema) {
  const database = createInsForgeAdminDatabase();
  const { error } = await database.from("login_logs").insert([
    {
      browser: input.browser,
      email: input.email,
      failure_reason: input.failureReason,
      ip_address: input.ipAddress,
      is_success: input.isSuccess,
      os: input.os,
      user_id: input.userId,
    },
  ]);

  if (error) {
    throw error;
  }
}

export async function readWrongPasswordFailureCount(email: string) {
  const database = createInsForgeAdminDatabase();
  const cutoffIso = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: latestRecentRows, error } = await database
    .from("login_logs")
    .select("created_at, is_success, failure_reason")
    .eq("email", email)
    .gt("created_at", cutoffIso)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  const rows = (latestRecentRows ?? []) as LoginLogCounterRow[];
  let consecutiveFailureCount = 0;

  for (const row of rows) {
    if (row.is_success) {
      break;
    }

    if (row.failure_reason !== "wrong_password") {
      break;
    }

    consecutiveFailureCount += 1;
  }

  return consecutiveFailureCount;
}

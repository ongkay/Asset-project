import "server-only";

import { createInsForgeServerAuth } from "@/lib/insforge/auth";
import { createInsForgeAdminDatabase, createInsForgeServerDatabase } from "@/lib/insforge/database";

import type {
  ExchangeResetPasswordInput,
  LoginLogWriteInputSchema,
  ResetPasswordInput,
  SendResetPasswordInput,
  SignInInput,
  SignUpInput,
} from "./schemas";
import type { AuthProfile, AuthenticatedUserSnapshot } from "./types";

type ProfileRow = {
  avatar_url: string | null;
  email: string;
  is_banned: boolean;
  public_id: string;
  role: "admin" | "member";
  user_id: string;
  username: string;
};

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

export async function sendResetPasswordEmail(input: SendResetPasswordInput) {
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

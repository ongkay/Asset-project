import "server-only";

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";
import { readProfileByUserId } from "@/modules/auth/repositories";

type UserProfileRow = {
  avatar_url: string | null;
  ban_reason: string | null;
  email: string;
  is_banned: boolean;
  public_id: string;
  role: "admin" | "member";
  user_id: string;
  username: string;
};

type UserProfileWriteInput = {
  avatarUrl: string | null;
  email: string;
  isBanned: boolean;
  publicId: string;
  role: "admin" | "member";
  userId: string;
  username: string;
};

function mapProfileWriteInput(input: UserProfileWriteInput) {
  return {
    avatar_url: input.avatarUrl,
    ban_reason: null,
    email: input.email,
    is_banned: input.isBanned,
    public_id: input.publicId,
    role: input.role,
    user_id: input.userId,
    username: input.username,
  };
}

export async function findUserProfileById(userId: string) {
  return readProfileByUserId(userId);
}

export async function readProfileByEmail(email: string) {
  const { data, error } = await createInsForgeAdminDatabase()
    .from("profiles")
    .select("user_id, email, username, public_id, avatar_url, role, is_banned")
    .eq("email", email)
    .maybeSingle<UserProfileRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function isUsernameTaken(username: string, excludeUserId?: string) {
  const database = createInsForgeAdminDatabase();
  let query = database.from("profiles").select("user_id").eq("username", username).limit(1);

  if (excludeUserId) {
    query = query.neq("user_id", excludeUserId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).length > 0;
}

export async function isPublicIdTaken(publicId: string) {
  const { data, error } = await createInsForgeAdminDatabase()
    .from("profiles")
    .select("user_id")
    .eq("public_id", publicId)
    .limit(1);

  if (error) {
    throw error;
  }

  return (data ?? []).length > 0;
}

export async function insertUserProfile(input: UserProfileWriteInput) {
  const { data, error } = await createInsForgeAdminDatabase()
    .from("profiles")
    .insert([mapProfileWriteInput(input)])
    .select("user_id, email, username, public_id, avatar_url, role, is_banned")
    .single<UserProfileRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateUserProfileFields(input: { avatarUrl: string | null; userId: string; username: string }) {
  const { data, error } = await createInsForgeAdminDatabase()
    .from("profiles")
    .update({
      avatar_url: input.avatarUrl,
      username: input.username,
    })
    .eq("user_id", input.userId)
    .select("user_id, email, username, public_id, avatar_url, role, is_banned")
    .single<UserProfileRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateUserBanState(input: { banReason?: string | null; isBanned: boolean; userId: string }) {
  const { data, error } = await createInsForgeAdminDatabase()
    .from("profiles")
    .update({
      ban_reason: input.isBanned ? (input.banReason ?? null) : null,
      is_banned: input.isBanned,
    })
    .eq("user_id", input.userId)
    .select("user_id, email, username, public_id, avatar_url, role, is_banned")
    .single<UserProfileRow>();

  if (error) {
    throw error;
  }

  return data;
}

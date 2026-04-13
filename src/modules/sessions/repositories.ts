import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";

import type { CreateSessionRecordInput, RevokeSessionInput } from "./schemas";
import type { SessionLookupResult, SessionToken, SessionTokenHash } from "./types";

type AppSessionRow = {
  created_at: string;
  id: string;
  last_seen_at: string;
  revoked_at: string | null;
  user_id: string;
};

function getSessionsRepositoryDatabase() {
  return createInsForgeAdminDatabase();
}

export function createOpaqueSessionToken(): SessionToken {
  return randomBytes(48).toString("base64url");
}

export function hashSessionToken(token: SessionToken): SessionTokenHash {
  return createHash("sha256").update(token).digest("hex");
}

export async function insertSessionRecord(input: CreateSessionRecordInput): Promise<SessionLookupResult> {
  const database = getSessionsRepositoryDatabase();
  const { data, error } = await database
    .from("app_sessions")
    .insert([
      {
        token_hash: input.tokenHash,
        user_id: input.userId,
      },
    ])
    .select("id, user_id, created_at, last_seen_at, revoked_at")
    .single<AppSessionRow>();

  if (error) {
    throw error;
  }

  return {
    sessionId: data.id,
    userId: data.user_id,
    createdAt: data.created_at,
    lastSeenAt: data.last_seen_at,
    revokedAt: data.revoked_at,
  };
}

export async function findActiveSessionByTokenHash(tokenHash: SessionTokenHash): Promise<SessionLookupResult | null> {
  const database = getSessionsRepositoryDatabase();
  const { data, error } = await database
    .from("app_sessions")
    .select("id, user_id, created_at, last_seen_at, revoked_at")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle<AppSessionRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    sessionId: data.id,
    userId: data.user_id,
    createdAt: data.created_at,
    lastSeenAt: data.last_seen_at,
    revokedAt: data.revoked_at,
  };
}

export async function revokeSessionsForUser(userId: string): Promise<number> {
  const database = getSessionsRepositoryDatabase();
  const { data, error } = await database.rpc("revoke_app_sessions", {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return typeof data === "number" ? data : 0;
}

export async function revokeSessionRecord(input: RevokeSessionInput): Promise<number> {
  if (input.userId) {
    return revokeSessionsForUser(input.userId);
  }

  if (!input.sessionId) {
    return 0;
  }

  const database = getSessionsRepositoryDatabase();
  const { error } = await database
    .from("app_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", input.sessionId)
    .is("revoked_at", null);

  if (error) {
    throw error;
  }

  return 1;
}

export async function touchSessionLastSeen(sessionId: string): Promise<void> {
  const database = getSessionsRepositoryDatabase();
  const { error } = await database
    .from("app_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", sessionId)
    .is("revoked_at", null);

  if (error) {
    throw error;
  }
}

import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/config/env.server";
import {
  clearAppSessionCookie,
  clearInsForgeAccessTokenCookie,
  readAppSessionCookie,
  writeAppSessionCookie,
} from "@/lib/cookies";

import {
  createSessionRecordInputSchema,
  revokeSessionInputSchema,
  sessionIdSchema,
  sessionNoncePayloadSchema,
  sessionTokenSchema,
} from "./schemas";
import {
  createOpaqueSessionToken,
  findActiveSessionByTokenHash,
  hashSessionToken,
  insertSessionRecord,
  revokeSessionRecord,
  revokeSessionsForUser,
  touchSessionLastSeen,
} from "./repositories";
import { SESSION_COOKIE_CONTRACT } from "./types";

const REQUEST_NONCE_TTL_SECONDS = 60;

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signNoncePayload(payload: string) {
  return createHmac("sha256", env.APP_SESSION_SECRET).update(payload).digest("base64url");
}

export async function createAppSession(userId: string) {
  const rawToken = createOpaqueSessionToken();
  const parsedInput = createSessionRecordInputSchema.parse({
    tokenHash: hashSessionToken(rawToken),
    userId,
  });

  await revokeSessionsForUser(parsedInput.userId);

  const sessionRecord = await insertSessionRecord(parsedInput);

  await writeAppSessionCookie(rawToken);

  return {
    ...sessionRecord,
    rawToken,
    tokenHash: parsedInput.tokenHash,
    contract: SESSION_COOKIE_CONTRACT,
  };
}

export async function validateAppSessionToken(rawToken: string | null | undefined) {
  const normalizedToken = rawToken?.trim();

  if (!normalizedToken) {
    return null;
  }

  const sessionToken = sessionTokenSchema.parse(normalizedToken);

  return findActiveSessionByTokenHash(hashSessionToken(sessionToken));
}

export async function validateActiveAppSession() {
  const rawToken = await readAppSessionCookie();

  if (!rawToken?.trim()) {
    return null;
  }

  const parsedToken = sessionTokenSchema.safeParse(rawToken);

  if (!parsedToken.success) {
    return null;
  }

  return validateAppSessionToken(parsedToken.data);
}

export async function revokeActiveAppSession() {
  const activeSession = await validateActiveAppSession();

  if (!activeSession) {
    await clearAppSessionCookie();
    await clearInsForgeAccessTokenCookie();
    return 0;
  }

  const revokedCount = await revokeSessionRecord(
    revokeSessionInputSchema.parse({
      sessionId: activeSession.sessionId,
      reason: "logout",
    }),
  );

  await clearAppSessionCookie();
  await clearInsForgeAccessTokenCookie();

  return revokedCount;
}

export async function revokeActiveAppSessionRecord() {
  const activeSession = await validateActiveAppSession();

  if (!activeSession) {
    return 0;
  }

  return revokeSessionRecord(
    revokeSessionInputSchema.parse({
      sessionId: activeSession.sessionId,
      reason: "logout",
    }),
  );
}

export async function touchAppSessionLastSeen(sessionId: string) {
  await touchSessionLastSeen(sessionIdSchema.parse(sessionId));
}

export async function touchActiveAppSessionLastSeen() {
  const activeSession = await validateActiveAppSession();

  if (!activeSession) {
    return null;
  }

  await touchAppSessionLastSeen(activeSession.sessionId);
  return activeSession;
}

export async function createSessionBoundRequestNonce(input: { sessionId: string; userId: string }) {
  const expiresAt = new Date(Date.now() + REQUEST_NONCE_TTL_SECONDS * 1000).toISOString();
  const payload = sessionNoncePayloadSchema.parse({
    expiresAt,
    sessionId: input.sessionId,
    userId: input.userId,
  });

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signNoncePayload(encodedPayload);
  const value = `${encodedPayload}.${signature}`;

  return {
    expiresAt,
    value,
  };
}

export async function verifySessionBoundRequestNonce(value: string) {
  const [encodedPayload, providedSignature] = value.split(".");

  if (!encodedPayload || !providedSignature) {
    throw new Error("Request nonce format is invalid.");
  }

  const expectedSignature = signNoncePayload(encodedPayload);
  const expectedSignatureBuffer = Buffer.from(expectedSignature, "utf8");
  const providedSignatureBuffer = Buffer.from(providedSignature, "utf8");

  if (
    expectedSignatureBuffer.length !== providedSignatureBuffer.length ||
    !timingSafeEqual(expectedSignatureBuffer, providedSignatureBuffer)
  ) {
    throw new Error("Request nonce signature is invalid.");
  }

  const payload = sessionNoncePayloadSchema.parse(JSON.parse(fromBase64Url(encodedPayload)));

  if (new Date(payload.expiresAt).getTime() <= Date.now()) {
    throw new Error("Request nonce has expired.");
  }

  return payload;
}

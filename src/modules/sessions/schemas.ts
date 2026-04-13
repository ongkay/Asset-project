import { z } from "zod";

export const sessionTokenSchema = z.string().trim().min(32, "Session token is required.");

export const sessionTokenHashSchema = z.string().trim().min(32, "Session token hash is required.");

export const sessionIdSchema = z.uuid("Session ID must be a valid UUID.");

export const sessionUserIdSchema = z.uuid("User ID must be a valid UUID.");

export const createSessionRecordInputSchema = z.object({
  tokenHash: sessionTokenHashSchema,
  userId: sessionUserIdSchema,
});

export const revokeSessionInputSchema = z.object({
  sessionId: sessionIdSchema.optional(),
  userId: sessionUserIdSchema.optional(),
  reason: z.string().trim().min(1).max(120).default("session_revoked"),
});

export const sessionNoncePayloadSchema = z.object({
  expiresAt: z.iso.datetime(),
  sessionId: sessionIdSchema,
  userId: sessionUserIdSchema,
});

export type CreateSessionRecordInput = z.infer<typeof createSessionRecordInputSchema>;
export type RevokeSessionInput = z.infer<typeof revokeSessionInputSchema>;
export type SessionNoncePayloadInput = z.infer<typeof sessionNoncePayloadSchema>;

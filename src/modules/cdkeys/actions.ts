"use server";

import { adminActionClient, memberActionClient } from "@/modules/auth/action-client";

import { cdKeyIssueInputSchema, redeemCdKeySchema } from "./schemas";
import { createCdKey, redeemCdKey } from "./services";

export const createCdKeyAction = adminActionClient
  .metadata({ actionName: "cdkeys.create" })
  .inputSchema(cdKeyIssueInputSchema)
  .action(async ({ ctx, parsedInput }) => {
    try {
      const row = await createCdKey(parsedInput, ctx.currentAppUser.profile.userId);
      return { ok: true as const, row };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Failed to create CD-Key.",
      };
    }
  });

export const redeemCdKeyAction = memberActionClient
  .metadata({ actionName: "cdkeys.redeem" })
  .inputSchema(redeemCdKeySchema)
  .action(async ({ ctx, parsedInput }) => {
    return redeemCdKey({
      userId: ctx.currentAppUser.profile.userId,
      code: parsedInput.code,
    });
  });

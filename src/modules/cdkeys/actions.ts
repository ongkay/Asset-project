"use server";

import { adminActionClient } from "@/modules/auth/action-client";

import { cdKeyIssueInputSchema } from "./schemas";
import { createCdKey } from "./services";

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

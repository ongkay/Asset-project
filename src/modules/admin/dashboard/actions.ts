"use server";

import { adminActionClient } from "@/modules/auth/action-client";

import { getAdminDashboardSnapshot } from "./queries";
import { adminDashboardFilterSchema } from "./schemas";

export const getAdminDashboardSnapshotAction = adminActionClient
  .metadata({ actionName: "admin.dashboard.get-snapshot" })
  .inputSchema(adminDashboardFilterSchema)
  .action(async ({ parsedInput }) => {
    try {
      const snapshot = await getAdminDashboardSnapshot(parsedInput);

      return {
        ok: true as const,
        snapshot,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Failed to load admin dashboard.",
      };
    }
  });

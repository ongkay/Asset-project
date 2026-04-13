import "server-only";

import { z } from "zod";

import { createInsForgeServerDatabase } from "@/lib/insforge/database";
import { readProfileByUserId } from "@/modules/auth/repositories";
import { validateActiveAppSession } from "@/modules/sessions/services";

import type { AdminDashboardStats } from "./types";

const adminDashboardStatsSchema = z.object({
  from: z.iso.datetime(),
  to: z.iso.datetime(),
  totalAssets: z.number().int().nonnegative(),
  totalMembers: z.number().int().nonnegative(),
  totalMixedSubscriptions: z.number().int().nonnegative(),
  totalPrivateSubscriptions: z.number().int().nonnegative(),
  totalShareSubscriptions: z.number().int().nonnegative(),
  totalSubscribedMembers: z.number().int().nonnegative(),
  totalSuccessAmountRp: z.number().int().nonnegative(),
});

async function assertAdminDashboardAccess() {
  const activeSession = await validateActiveAppSession();

  if (!activeSession) {
    throw new Error("An active app session is required.");
  }

  const profile = await readProfileByUserId(activeSession.userId);

  if (!profile || profile.role !== "admin") {
    throw new Error("Admin role is required to read dashboard stats.");
  }
}

export async function getAdminDashboardStats(input: { from?: Date; to?: Date } = {}): Promise<AdminDashboardStats> {
  await assertAdminDashboardAccess();

  const database = createInsForgeServerDatabase();
  const { data, error } = await database.rpc("get_admin_dashboard_stats", {
    p_from: input?.from?.toISOString(),
    p_to: input?.to?.toISOString(),
  });

  if (error) {
    throw error;
  }

  return adminDashboardStatsSchema.parse(data);
}

"use server";

import { z } from "zod";

import { adminActionClient } from "@/modules/auth/action-client";

import { packageFormSchema, packageToggleSchema } from "./schemas";
import { createPackage, togglePackageActive, updatePackage } from "./services";

const updatePackageInputSchema = z
  .object({
    id: z.uuid("Package ID must be a valid UUID."),
  })
  .and(packageFormSchema);

export const createPackageAction = adminActionClient
  .metadata({ actionName: "packages.create" })
  .inputSchema(packageFormSchema)
  .action(async ({ parsedInput }) => {
    try {
      const row = await createPackage(parsedInput);
      return { ok: true as const, row };
    } catch (error) {
      return {
        message: error instanceof Error ? error.message : "Failed to create package.",
        ok: false as const,
      };
    }
  });

export const updatePackageAction = adminActionClient
  .metadata({ actionName: "packages.update" })
  .inputSchema(updatePackageInputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const row = await updatePackage(parsedInput);
      return { ok: true as const, row };
    } catch (error) {
      return {
        message: error instanceof Error ? error.message : "Failed to update package.",
        ok: false as const,
      };
    }
  });

export const togglePackageActiveAction = adminActionClient
  .metadata({ actionName: "packages.toggle-active" })
  .inputSchema(packageToggleSchema)
  .action(async ({ parsedInput }) => {
    try {
      const row = await togglePackageActive(parsedInput);
      return { ok: true as const, row };
    } catch (error) {
      return {
        message: error instanceof Error ? error.message : "Failed to update package status.",
        ok: false as const,
      };
    }
  });

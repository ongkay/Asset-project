"use server";

import { adminActionClient } from "@/modules/auth/action-client";

import { adminCreateUserSchema, adminEditUserProfileSchema, adminToggleUserBanSchema } from "./schemas";
import { createUserByAdmin, toggleUserBanByAdmin, updateUserProfileByAdmin } from "./services";

function getActionErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return fallbackMessage;
}

export const createUserAction = adminActionClient
  .metadata({ actionName: "users.create" })
  .inputSchema(adminCreateUserSchema)
  .action(async ({ ctx, parsedInput }) => {
    try {
      const createdUser = await createUserByAdmin({
        actingAdminUserId: ctx.currentAppUser.profile.userId,
        ...parsedInput,
      });

      return {
        ok: true as const,
        userId: createdUser.userId,
      };
    } catch (error) {
      return {
        message: getActionErrorMessage(error, "Failed to create user."),
        ok: false as const,
      };
    }
  });

export const updateUserProfileAction = adminActionClient
  .metadata({ actionName: "users.update-profile" })
  .inputSchema(adminEditUserProfileSchema)
  .action(async ({ ctx, parsedInput }) => {
    try {
      const updatedUser = await updateUserProfileByAdmin({
        actingAdminUserId: ctx.currentAppUser.profile.userId,
        ...parsedInput,
      });

      return {
        ok: true as const,
        userId: updatedUser.userId,
      };
    } catch (error) {
      return {
        message: getActionErrorMessage(error, "Failed to update user profile."),
        ok: false as const,
      };
    }
  });

export const toggleUserBanAction = adminActionClient
  .metadata({ actionName: "users.toggle-ban" })
  .inputSchema(adminToggleUserBanSchema)
  .action(async ({ ctx, parsedInput }) => {
    try {
      const updatedUser = await toggleUserBanByAdmin({
        actingAdminUserId: ctx.currentAppUser.profile.userId,
        ...parsedInput,
      });

      return {
        isBanned: updatedUser.isBanned,
        ok: true as const,
        userId: updatedUser.userId,
      };
    } catch (error) {
      return {
        message: getActionErrorMessage(error, "Failed to update user ban state."),
        ok: false as const,
      };
    }
  });

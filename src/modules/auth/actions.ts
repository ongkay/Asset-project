"use server";

import { actionClient } from "@/lib/safe-action/client";
import { buildCurrentUrl, readTrustedRequestMetadata } from "@/lib/request-metadata";
import { adminActionClient } from "@/modules/auth/action-client";

import {
  adminChangeUserPasswordInputSchema,
  checkAuthEmailInputSchema,
  completeResetPasswordInputSchema,
  sendResetPasswordInputSchema,
  signInInputSchema,
  signUpInputSchema,
} from "./schemas";
import {
  checkAuthEmailStatus,
  changeUserPasswordByAdmin,
  completePasswordReset,
  requestPasswordReset,
  signInAndCreateAppSession,
  signOutAndRevokeAppSession,
  signUpAndCreateAppSession,
} from "./services";

export const checkAuthEmailAction = actionClient
  .metadata({ actionName: "auth.check-email" })
  .inputSchema(checkAuthEmailInputSchema)
  .action(async ({ parsedInput }) => checkAuthEmailStatus(parsedInput));

export const loginAction = actionClient
  .metadata({ actionName: "auth.login" })
  .inputSchema(signInInputSchema)
  .action(async ({ parsedInput }) =>
    signInAndCreateAppSession({
      credentials: parsedInput,
      metadata: await readTrustedRequestMetadata(),
    }),
  );

export const registerAction = actionClient
  .metadata({ actionName: "auth.register" })
  .inputSchema(signUpInputSchema)
  .action(async ({ parsedInput }) =>
    signUpAndCreateAppSession({
      credentials: parsedInput,
      metadata: await readTrustedRequestMetadata(),
    }),
  );

export const requestPasswordResetAction = actionClient
  .metadata({ actionName: "auth.request-password-reset" })
  .inputSchema(sendResetPasswordInputSchema)
  .action(async ({ parsedInput }) =>
    requestPasswordReset({
      payload: parsedInput,
      redirectTo: await buildCurrentUrl("/reset-password"),
    }),
  );

export const completePasswordResetAction = actionClient
  .metadata({ actionName: "auth.complete-password-reset" })
  .inputSchema(completeResetPasswordInputSchema)
  .action(async ({ parsedInput }) => completePasswordReset(parsedInput));

export const changeUserPasswordAction = adminActionClient
  .metadata({ actionName: "auth.change-user-password" })
  .inputSchema(adminChangeUserPasswordInputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const result = await changeUserPasswordByAdmin(parsedInput);

      return {
        ok: true as const,
        userId: result.userId,
      };
    } catch (error) {
      return {
        message: error instanceof Error ? error.message : "Failed to update user password.",
        ok: false as const,
      };
    }
  });

export const logoutAction = actionClient
  .metadata({ actionName: "auth.logout" })
  .action(async () => signOutAndRevokeAppSession());

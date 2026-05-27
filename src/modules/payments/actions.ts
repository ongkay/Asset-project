"use server";

import { memberActionClient } from "@/modules/auth/action-client";

import { paymentActionInputSchema } from "./schemas";
import { cancelMemberQrisPayment, checkMemberQrisPaymentStatus } from "./services";

export const checkPaymentStatusAction = memberActionClient
  .metadata({ actionName: "payments.check-status" })
  .inputSchema(paymentActionInputSchema)
  .action(async ({ ctx, parsedInput }) => {
    return checkMemberQrisPaymentStatus({
      transactionId: parsedInput.transactionId,
      userId: ctx.currentAppUser.profile.userId,
    });
  });

export const cancelPaymentAction = memberActionClient
  .metadata({ actionName: "payments.cancel" })
  .inputSchema(paymentActionInputSchema)
  .action(async ({ ctx, parsedInput }) => {
    return cancelMemberQrisPayment({
      transactionId: parsedInput.transactionId,
      userId: ctx.currentAppUser.profile.userId,
    });
  });

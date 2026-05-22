"use server";

import { memberActionClient } from "@/modules/auth/action-client";

import { resolveCheckoutStateSchema, submitCheckoutSchema } from "./schemas";
import { resolveCheckoutState, submitCheckout } from "./services";

export const getCheckoutQuoteAction = memberActionClient
  .metadata({ actionName: "checkout.get-quote" })
  .inputSchema(resolveCheckoutStateSchema)
  .action(async ({ parsedInput }) => {
    return resolveCheckoutState(parsedInput);
  });

export const submitCheckoutAction = memberActionClient
  .metadata({ actionName: "checkout.submit" })
  .inputSchema(submitCheckoutSchema)
  .action(async ({ ctx, parsedInput }) => {
    return submitCheckout({
      packageId: parsedInput.packageId,
      paymentMethod: parsedInput.paymentMethod,
      userId: ctx.currentAppUser.profile.userId,
      voucherCode: parsedInput.voucherCode,
    });
  });

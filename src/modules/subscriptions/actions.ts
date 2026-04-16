"use server";

import { adminActionClient } from "@/modules/auth/action-client";

import { adminManualActivationFormSchema, subscriberCancelSchema, subscriberQuickAddAssetSchema } from "./schemas";
import { activateSubscriptionManually, cancelSubscription, quickAddSubscriberAsset } from "./services";

function getActionErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

export const activateSubscriptionManuallyAction = adminActionClient
  .metadata({ actionName: "subscriptions.activate-manually" })
  .inputSchema(adminManualActivationFormSchema)
  .action(async ({ parsedInput }) => {
    try {
      const result = await activateSubscriptionManually(parsedInput);

      return {
        ok: true as const,
        subscriptionId: result.subscriptionId,
        transactionId: result.transactionId,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: getActionErrorMessage(error, "Failed to activate subscription."),
      };
    }
  });

export const quickAddSubscriberAssetAction = adminActionClient
  .metadata({ actionName: "subscriptions.quick-add-asset" })
  .inputSchema(subscriberQuickAddAssetSchema)
  .action(async ({ parsedInput }) => {
    try {
      const result = await quickAddSubscriberAsset(parsedInput);

      return {
        ok: true as const,
        assetId: result.assetId,
        accessKey: result.accessKey,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: getActionErrorMessage(error, "Failed to quick add subscriber asset."),
      };
    }
  });

export const cancelSubscriptionAction = adminActionClient
  .metadata({ actionName: "subscriptions.cancel" })
  .inputSchema(subscriberCancelSchema)
  .action(async ({ parsedInput }) => {
    try {
      const result = await cancelSubscription(parsedInput);

      return {
        ok: true as const,
        subscriptionId: result.subscriptionId,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: getActionErrorMessage(error, "Failed to cancel subscription."),
      };
    }
  });

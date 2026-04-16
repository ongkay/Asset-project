"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cancelSubscriptionAction } from "@/modules/subscriptions/actions";

import { ADMIN_SUBSCRIBER_QUERY_KEY } from "../subscriber-query";

import type { SubscriberCancelDialogState } from "../subscriber-page-types";

type SubscriberCancelDialogProps = {
  dialogState: SubscriberCancelDialogState;
  onOpenChange: (open: boolean) => void;
};

export function SubscriberCancelDialog({ dialogState, onOpenChange }: SubscriberCancelDialogProps) {
  const queryClient = useQueryClient();
  const cancelMutation = useAction(cancelSubscriptionAction);

  async function handleCancelSubscription() {
    if (!dialogState.open) {
      return;
    }

    const result = await cancelMutation.executeAsync({
      subscriptionId: dialogState.row.subscriptionId,
    });
    const validationError = result.validationErrors?.formErrors?.[0];

    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!result.data?.ok) {
      toast.error(result.data?.message ?? "Failed to cancel subscription.");
      return;
    }

    toast.success("Subscription canceled.");
    await queryClient.invalidateQueries({ queryKey: ADMIN_SUBSCRIBER_QUERY_KEY });
    onOpenChange(false);
  }

  return (
    <AlertDialog open={dialogState.open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this running subscription?</AlertDialogTitle>
          <AlertDialogDescription>
            This will set the subscription to canceled and revoke all active assignments for{" "}
            {dialogState.row?.username ?? "the selected user"}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
          <AlertDialogAction
            disabled={cancelMutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              void handleCancelSubscription();
            }}
            variant="destructive"
          >
            Cancel Subscription
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

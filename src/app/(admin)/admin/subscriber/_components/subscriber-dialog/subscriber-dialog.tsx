"use client";

import { useEffect, useMemo, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError } from "@/components/ui/field";
import { activateSubscriptionManuallyAction } from "@/modules/subscriptions/actions";
import { positiveIntegerDurationSchema } from "@/modules/subscriptions/schemas";

import {
  ADMIN_SUBSCRIBER_QUERY_KEY,
  fetchSubscriberActivationDraft,
  fetchSubscriberEditorData,
  getSubscriberActivationDraftQueryKey,
  getSubscriberEditorQueryKey,
} from "../subscriber-query";
import { SubscriberQuickAddAssetDialog } from "../subscriber-quick-add-asset-dialog/subscriber-quick-add-asset-dialog";
import { SubscriberDialogCandidateGroups } from "./subscriber-dialog-candidate-groups";
import { SubscriberDialogPackagePanel } from "./subscriber-dialog-package-panel";
import { SubscriberDialogUserPicker } from "./subscriber-dialog-user-picker";

import type { SubscriberUserOption } from "@/modules/admin/subscriptions/types";
import type { SubscriberDialogState } from "../subscriber-page-types";

type QuickAddDialogState =
  | {
      open: true;
      accessKey: string;
      platform: "tradingview" | "fxreplay" | "fxtester";
    }
  | {
      open: false;
      accessKey: null;
      platform: null;
    };

const subscriberDialogFormSchema = z.object({
  userId: z.string().trim().min(1, "User ID is required."),
  packageId: z.string().trim().min(1, "Package ID is required."),
  durationDays: positiveIntegerDurationSchema,
  manualAssignmentsByAccessKey: z.record(z.string(), z.string().nullable()),
});

type SubscriberDialogFormValues = z.output<typeof subscriberDialogFormSchema>;

type SubscriberDialogProps = {
  dialogState: SubscriberDialogState;
  onOpenChange: (open: boolean) => void;
};

function isRunningStatus(status: "active" | "processed" | "expired" | "canceled") {
  return status === "active" || status === "processed";
}

export function SubscriberDialog({ dialogState, onOpenChange }: SubscriberDialogProps) {
  const queryClient = useQueryClient();
  const activateMutation = useAction(activateSubscriptionManuallyAction);
  const [selectedUser, setSelectedUser] = useState<SubscriberUserOption | null>(null);
  const [quickAddDialogState, setQuickAddDialogState] = useState<QuickAddDialogState>({
    open: false,
    accessKey: null,
    platform: null,
  });

  const form = useForm<SubscriberDialogFormValues>({
    defaultValues: {
      userId: "",
      packageId: "",
      durationDays: 30,
      manualAssignmentsByAccessKey: {},
    },
    resolver: zodResolver(subscriberDialogFormSchema),
  });

  const editorQuery = useQuery({
    queryKey:
      dialogState.open && dialogState.mode === "edit"
        ? getSubscriberEditorQueryKey(dialogState.row.userId, dialogState.row.subscriptionId)
        : getSubscriberEditorQueryKey(null, null),
    queryFn: () =>
      fetchSubscriberEditorData(
        dialogState.mode === "edit"
          ? {
              userId: dialogState.row.userId,
              subscriptionId: dialogState.row.subscriptionId,
            }
          : {},
      ),
    enabled: dialogState.open,
  });

  const packageOptions = useMemo(() => editorQuery.data?.packageOptions ?? [], [editorQuery.data?.packageOptions]);
  const selectedPackageId = form.watch("packageId");
  const selectedPackage = useMemo(
    () => packageOptions.find((packageOption) => packageOption.packageId === selectedPackageId) ?? null,
    [packageOptions, selectedPackageId],
  );
  const draftSubscriptionId =
    dialogState.mode === "edit" && isRunningStatus(dialogState.row.subscriptionStatus)
      ? dialogState.row.subscriptionId
      : null;
  const selectedUserId = form.watch("userId");

  const activationDraftQuery = useQuery({
    queryKey:
      dialogState.open && selectedUserId && selectedPackageId
        ? getSubscriberActivationDraftQueryKey(selectedUserId, selectedPackageId, draftSubscriptionId)
        : [...getSubscriberActivationDraftQueryKey("empty", "empty", null), "disabled"],
    queryFn: () =>
      fetchSubscriberActivationDraft({
        userId: selectedUserId,
        packageId: selectedPackageId,
        subscriptionId: draftSubscriptionId,
      }),
    enabled: dialogState.open && Boolean(selectedUserId) && Boolean(selectedPackageId),
  });

  useEffect(() => {
    if (!dialogState.open) {
      return;
    }

    if (dialogState.mode === "create") {
      setSelectedUser(null);
      form.reset({
        userId: "",
        packageId: "",
        durationDays: 30,
        manualAssignmentsByAccessKey: {},
      });
      return;
    }

    if (!editorQuery.data) {
      return;
    }

    setSelectedUser(editorQuery.data.selectedUser);
    form.reset({
      userId: editorQuery.data.selectedUser?.userId ?? dialogState.row.userId,
      packageId: editorQuery.data.defaultPackageId ?? dialogState.row.packageId,
      durationDays: editorQuery.data.defaultDurationDays ?? 30,
      manualAssignmentsByAccessKey: Object.fromEntries(
        editorQuery.data.currentAssignments.map((assignment) => [assignment.accessKey, assignment.assetId]),
      ),
    });
  }, [dialogState, editorQuery.data, form]);

  useEffect(() => {
    if (!activationDraftQuery.data) {
      return;
    }

    const currentAssignments = form.getValues("manualAssignmentsByAccessKey");
    const nextAssignments = Object.fromEntries(
      activationDraftQuery.data.candidateGroups.map((group) => [
        group.accessKey,
        currentAssignments[group.accessKey] ?? group.currentSelection?.assetId ?? null,
      ]),
    );

    form.setValue("manualAssignmentsByAccessKey", nextAssignments, { shouldDirty: false });
  }, [activationDraftQuery.data, form]);

  useEffect(() => {
    if (!selectedPackage) {
      return;
    }

    form.setValue("durationDays", selectedPackage.durationDays, { shouldDirty: false });
  }, [selectedPackage, form]);

  async function handleSubmitSubscriber(values: SubscriberDialogFormValues) {
    const result = await activateMutation.executeAsync(values);
    const validationError = result.validationErrors?.formErrors?.[0];

    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!result.data?.ok) {
      toast.error(result.data?.message ?? "Failed to save subscriber.");
      return;
    }

    toast.success(dialogState.mode === "edit" ? "Subscriber updated." : "Subscriber activated.");
    await queryClient.invalidateQueries({ queryKey: ADMIN_SUBSCRIBER_QUERY_KEY });
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={dialogState.open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{dialogState.mode === "edit" ? "Edit Subscriber" : "Add Subscriber"}</DialogTitle>
            <DialogDescription>
              Activate a package, override exact entitlement assets, quick-add private inventory, or extend the running
              subscription.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" noValidate onSubmit={form.handleSubmit(handleSubmitSubscriber)}>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="space-y-5">
                <SubscriberDialogUserPicker
                  disabled={dialogState.mode === "edit"}
                  selectedUser={selectedUser}
                  onSelectUser={(user) => {
                    setSelectedUser(user);
                    form.setValue("userId", user.userId, { shouldValidate: true });
                  }}
                />

                <SubscriberDialogPackagePanel
                  control={form.control}
                  packageOptions={packageOptions}
                  selectedPackage={selectedPackage}
                />
              </div>

              <div className="space-y-5">
                <SubscriberDialogCandidateGroups
                  draft={activationDraftQuery.data ?? null}
                  manualAssignmentsByAccessKey={form.watch("manualAssignmentsByAccessKey")}
                  onSelectAssignment={(accessKey, assetId) => {
                    form.setValue("manualAssignmentsByAccessKey", {
                      ...form.getValues("manualAssignmentsByAccessKey"),
                      [accessKey]: assetId === "__auto__" ? null : (assetId ?? null),
                    });
                  }}
                  onQuickAddAsset={(accessKey, platform) => {
                    setQuickAddDialogState({ open: true, accessKey, platform });
                  }}
                />
              </div>
            </div>

            {form.formState.errors.userId ? (
              <Field data-invalid>
                <FieldError errors={[form.formState.errors.userId]} />
              </Field>
            ) : null}

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
                Cancel
              </Button>
              <Button disabled={activateMutation.isPending} type="submit">
                {dialogState.mode === "edit" ? "Save Subscriber" : "Activate Subscriber"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SubscriberQuickAddAssetDialog
        dialogState={quickAddDialogState}
        userId={selectedUserId}
        packageId={selectedPackageId}
        subscriptionId={draftSubscriptionId}
        onOpenChange={(open) => {
          if (!open) {
            setQuickAddDialogState({ open: false, accessKey: null, platform: null });
          }
        }}
        onCreated={async (assetId, accessKey) => {
          form.setValue("manualAssignmentsByAccessKey", {
            ...form.getValues("manualAssignmentsByAccessKey"),
            [accessKey]: assetId,
          });

          if (selectedUserId && selectedPackageId) {
            await queryClient.invalidateQueries({
              queryKey: getSubscriberActivationDraftQueryKey(selectedUserId, selectedPackageId, draftSubscriptionId),
            });
          }
        }}
      />
    </>
  );
}

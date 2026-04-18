"use client";

import { useMemo } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { type SubmitErrorHandler, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createCdKeyAction } from "@/modules/cdkeys/actions";
import { cdKeyIssueInputSchema } from "@/modules/cdkeys/schemas";

import { ADMIN_CDKEY_QUERY_KEY, fetchIssuablePackages, getIssuablePackagesQueryKey } from "../cdkey-query";
import { CdKeyFormFields } from "./cdkey-form-fields";
import { DEFAULT_CDKEY_FORM_DIALOG_VALUES, type CdKeyFormDialogValues } from "./cdkey-form-dialog-types";

type AdminCdKeyFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CDKEY_FORM_FIELD_ORDER: Array<keyof CdKeyFormDialogValues> = ["packageId", "manualCode", "amountRpOverride"];

const CDKEY_FIELD_SELECTOR_MAP: Record<keyof CdKeyFormDialogValues, string> = {
  packageId: "#cdkey-package",
  manualCode: "#cdkey-manual-code",
  amountRpOverride: "#cdkey-amount-override",
};

function getFieldFromServerMessage(message: string | null): keyof CdKeyFormDialogValues {
  const normalizedMessage = message?.toLowerCase() ?? "";

  if (normalizedMessage.includes("code") || normalizedMessage.includes("duplicate")) {
    return "manualCode";
  }

  if (normalizedMessage.includes("amount") || normalizedMessage.includes("override")) {
    return "amountRpOverride";
  }

  if (normalizedMessage.includes("package") || normalizedMessage.includes("inactive")) {
    return "packageId";
  }

  return "packageId";
}

function getActionMessage(result: { data?: { message?: string }; validationErrors?: { formErrors?: string[] } }) {
  return result.validationErrors?.formErrors?.[0] ?? result.data?.message ?? null;
}

export function AdminCdKeyFormDialog({ open, onOpenChange }: AdminCdKeyFormDialogProps) {
  const queryClient = useQueryClient();
  const issueMutation = useAction(createCdKeyAction);
  const issuablePackagesQuery = useQuery({
    queryKey: getIssuablePackagesQueryKey(),
    queryFn: fetchIssuablePackages,
    enabled: open,
  });

  const form = useForm<CdKeyFormDialogValues>({
    defaultValues: DEFAULT_CDKEY_FORM_DIALOG_VALUES,
    resolver: zodResolver(cdKeyIssueInputSchema),
    shouldFocusError: true,
  });

  const packageId = form.watch("packageId");
  const selectedPackage = useMemo(
    () => issuablePackagesQuery.data?.find((packageOption) => packageOption.packageId === packageId) ?? null,
    [issuablePackagesQuery.data, packageId],
  );

  function focusFieldWithFallback(fieldName: keyof CdKeyFormDialogValues) {
    form.setFocus(fieldName);
    const fallbackElement = document.querySelector<HTMLElement>(CDKEY_FIELD_SELECTOR_MAP[fieldName]);
    fallbackElement?.focus();
  }

  async function handleIssueCdKey(rawValues: CdKeyFormDialogValues) {
    const values = cdKeyIssueInputSchema.parse(rawValues);
    const result = await issueMutation.executeAsync(values);

    const actionMessage = getActionMessage(result ?? {});

    if (actionMessage) {
      toast.error(actionMessage);
      focusFieldWithFallback(getFieldFromServerMessage(actionMessage));
      return;
    }

    if (!result.data?.ok) {
      const failedMessage = result.data?.message ?? "Failed to issue CD-Key.";
      toast.error(failedMessage);
      focusFieldWithFallback(getFieldFromServerMessage(failedMessage));
      return;
    }

    toast.success("CD-Key issued.");
    await queryClient.invalidateQueries({ queryKey: ADMIN_CDKEY_QUERY_KEY });
    form.reset(DEFAULT_CDKEY_FORM_DIALOG_VALUES);
    onOpenChange(false);
  }

  const onInvalidIssueCdKey: SubmitErrorHandler<CdKeyFormDialogValues> = (errors) => {
    for (const fieldName of CDKEY_FORM_FIELD_ORDER) {
      if (!errors[fieldName]) {
        continue;
      }

      focusFieldWithFallback(fieldName);
      break;
    }
  };

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);

        if (!nextOpen) {
          form.reset(DEFAULT_CDKEY_FORM_DIALOG_VALUES);
        }
      }}
      open={open}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Issue CD-Key</DialogTitle>
          <DialogDescription>
            Create one new key from an active package snapshot. Manual code is optional. When left empty, the server
            generates code and the generated value appears in table and detail after issue.
          </DialogDescription>
        </DialogHeader>

        {issuablePackagesQuery.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading active packages...</p>
        ) : issuablePackagesQuery.error instanceof Error ? (
          <p className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-destructive text-sm">
            {issuablePackagesQuery.error.message}
          </p>
        ) : (
          <form className="space-y-5" noValidate onSubmit={form.handleSubmit(handleIssueCdKey, onInvalidIssueCdKey)}>
            <CdKeyFormFields
              form={form}
              packageOptions={issuablePackagesQuery.data ?? []}
              selectedPackage={selectedPackage}
            />

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
                Cancel
              </Button>
              <Button disabled={issueMutation.isPending} type="submit">
                Issue Key
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

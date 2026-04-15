"use client";

import { useEffect, useMemo } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
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
import { createPackageAction, updatePackageAction } from "@/modules/packages/actions";
import { packageFormSchema } from "@/modules/packages/schemas";
import { sortPackageAccessKeysCanonical } from "@/modules/packages/types";

import { ADMIN_PACKAGE_QUERY_KEY } from "../package-query";
import { PackageFormFields } from "./package-form-fields";
import { getDefaultFormValues, normalizeCheckoutUrl, type PackageFormDialogValues } from "./package-form-dialog-types";
import { PackageMetadataCopy } from "./package-metadata-copy";

import type { PackageEditorPrefill } from "@/modules/admin/packages/types";
import type { AdminPackageDialogState } from "../package-page-types";

type AdminPackageFormDialogProps = {
  dialogState: AdminPackageDialogState;
  onPackageSaved: () => void;
  onOpenChange: (open: boolean) => void;
  prefillById: Record<string, PackageEditorPrefill>;
};

function getActionFormError(result: {
  serverError?: string;
  validationErrors?: {
    formErrors?: string[];
  };
}) {
  return result.validationErrors?.formErrors?.[0] ?? result.serverError ?? null;
}

export function AdminPackageFormDialog({
  dialogState,
  onOpenChange,
  onPackageSaved,
  prefillById,
}: AdminPackageFormDialogProps) {
  const queryClient = useQueryClient();
  const createMutation = useAction(createPackageAction);
  const updateMutation = useAction(updatePackageAction);

  const activePrefill = useMemo(() => {
    if (dialogState.mode !== "edit") {
      return null;
    }

    return prefillById[dialogState.packageId] ?? null;
  }, [dialogState, prefillById]);

  const form = useForm<PackageFormDialogValues>({
    defaultValues: getDefaultFormValues(activePrefill),
    resolver: zodResolver(packageFormSchema),
  });

  useEffect(() => {
    if (!dialogState.open) {
      return;
    }

    form.reset(getDefaultFormValues(activePrefill));
  }, [activePrefill, dialogState.open, form]);

  const activeAccessKeys = form.watch("accessKeys");

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEditMode = dialogState.mode === "edit";

  async function handleSubmitPackage(values: PackageFormDialogValues) {
    const canonicalAccessKeys = sortPackageAccessKeysCanonical(values.accessKeys);
    const payload = {
      accessKeys: canonicalAccessKeys,
      amountRp: Number(values.amountRp),
      checkoutUrl: normalizeCheckoutUrl(values.checkoutUrl ?? null),
      durationDays: Number(values.durationDays),
      isExtended: values.isExtended,
      name: values.name,
    };

    const result = isEditMode
      ? await updateMutation.executeAsync({
          ...payload,
          id: dialogState.packageId,
        })
      : await createMutation.executeAsync(payload);

    const formError = getActionFormError(result);

    if (formError) {
      toast.error(formError);
      return;
    }

    if (!result.data?.ok) {
      toast.error(result.data?.message ?? "Failed to save package.");
      return;
    }

    toast.success(isEditMode ? "Package updated." : "Package created.");
    await queryClient.invalidateQueries({ queryKey: ADMIN_PACKAGE_QUERY_KEY });
    onPackageSaved();
    onOpenChange(false);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={dialogState.open}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Package" : "Create Package"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update package metadata, entitlement access keys, and checkout behavior."
              : "Create a package with canonical access keys and pricing details."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" noValidate onSubmit={form.handleSubmit(handleSubmitPackage)}>
          {isEditMode ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <PackageMetadataCopy label="Package ID" value={activePrefill?.id} />
              <PackageMetadataCopy label="Package Code" value={activePrefill?.code} />
            </div>
          ) : null}

          <PackageFormFields activeAccessKeys={activeAccessKeys} form={form} />

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={isPending} type="submit">
              {isEditMode ? "Save Changes" : "Create Package"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

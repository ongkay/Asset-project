"use client";

import { useEffect, useMemo } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeDollarSign, CalendarDays, CopyIcon, LinkIcon, Package } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { createPackageAction, updatePackageAction } from "@/modules/packages/actions";
import { packageFormSchema } from "@/modules/packages/schemas";
import { PACKAGE_ACCESS_KEYS, sortPackageAccessKeysCanonical, type PackageAccessKey } from "@/modules/packages/types";

import { ADMIN_PACKAGE_QUERY_KEY } from "./package-types";

import type { PackageEditorPrefill } from "@/modules/admin/packages/types";
import type { AdminPackageDialogState } from "./package-types";

type PackageFormDialogSubmitValues = z.input<typeof packageFormSchema>;
type PackageFormDialogValues = PackageFormDialogSubmitValues;

type AdminPackageFormDialogProps = {
  dialogState: AdminPackageDialogState;
  onPackageSaved: () => void;
  onOpenChange: (open: boolean) => void;
  prefillById: Record<string, PackageEditorPrefill>;
};

function getDefaultFormValues(prefill: PackageEditorPrefill | null): PackageFormDialogValues {
  if (!prefill) {
    return {
      accessKeys: [],
      amountRp: 0,
      checkoutUrl: "",
      durationDays: 30,
      isExtended: false,
      name: "",
    };
  }

  return {
    accessKeys: sortPackageAccessKeysCanonical(prefill.accessKeys),
    amountRp: prefill.amountRp,
    checkoutUrl: prefill.checkoutUrl ?? "",
    durationDays: prefill.durationDays,
    isExtended: prefill.isExtended,
    name: prefill.name,
  };
}

function normalizeCheckoutUrl(checkoutUrl: string | null): string | null {
  if (!checkoutUrl) {
    return null;
  }

  const trimmedValue = checkoutUrl.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function getActionFormError(result: {
  serverError?: string;
  validationErrors?: {
    formErrors?: string[];
  };
}) {
  return result.validationErrors?.formErrors?.[0] ?? result.serverError ?? null;
}

async function copyPackageMetadata(label: string, value: string | null | undefined) {
  if (!value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied.`);
  } catch {
    toast.error(`Failed to copy ${label}.`);
  }
}

function PackageMetadataValue({ label, value }: { label: string; value: string | null | undefined }) {
  const displayValue = value ?? "-";

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <div className="min-w-0">
        <p className="font-medium text-sm">{label}</p>
        <p className="truncate text-muted-foreground text-xs" title={displayValue}>
          {displayValue}
        </p>
      </div>
      <Button
        aria-label={`Copy ${label}`}
        disabled={!value}
        onClick={() => {
          void copyPackageMetadata(label, value);
        }}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <CopyIcon />
      </Button>
    </div>
  );
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
              <PackageMetadataValue label="Package ID" value={activePrefill?.id} />
              <PackageMetadataValue label="Package Code" value={activePrefill?.code} />
            </div>
          ) : null}

          <FieldGroup className="gap-4">
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="package-name">Package Name</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <Package />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id="package-name"
                      placeholder="Pro Trader"
                    />
                  </InputGroup>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="amountRp"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="package-amount-rp">Amount (Rp)</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <BadgeDollarSign />
                      </InputGroupAddon>
                      <InputGroupInput
                        aria-invalid={fieldState.invalid}
                        id="package-amount-rp"
                        inputMode="numeric"
                        min={0}
                        onChange={(event) => {
                          const nextValue = Number.isNaN(event.target.valueAsNumber) ? 0 : event.target.valueAsNumber;
                          field.onChange(nextValue);
                        }}
                        type="number"
                        value={field.value}
                      />
                    </InputGroup>
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="durationDays"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="package-duration-days">Duration (days)</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <CalendarDays />
                      </InputGroupAddon>
                      <InputGroupInput
                        aria-invalid={fieldState.invalid}
                        id="package-duration-days"
                        inputMode="numeric"
                        min={1}
                        onChange={(event) => {
                          const nextValue = Number.isNaN(event.target.valueAsNumber) ? 1 : event.target.valueAsNumber;
                          field.onChange(nextValue);
                        }}
                        type="number"
                        value={field.value}
                      />
                    </InputGroup>
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="checkoutUrl"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="package-checkout-url">Checkout URL</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <LinkIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id="package-checkout-url"
                      placeholder="https://checkout.example.com/plan"
                      value={field.value ?? ""}
                    />
                  </InputGroup>
                  <FieldDescription>Leave blank to store null checkout URL.</FieldDescription>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="isExtended"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <FieldLabel htmlFor="package-is-extended">Extended Package</FieldLabel>
                  <Switch
                    checked={field.value}
                    id="package-is-extended"
                    onCheckedChange={(checked) => field.onChange(checked)}
                  />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="accessKeys"
              render={({ fieldState }) => (
                <FieldSet>
                  <FieldLegend>Access Keys</FieldLegend>
                  <FieldDescription>Select one or more entitlement keys.</FieldDescription>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {PACKAGE_ACCESS_KEYS.map((accessKey) => {
                      const isChecked = activeAccessKeys?.includes(accessKey) ?? false;

                      return (
                        <label
                          className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                          key={accessKey}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const nextAccessKeys = checked
                                ? [...(activeAccessKeys ?? []), accessKey]
                                : (activeAccessKeys ?? []).filter((item: PackageAccessKey) => item !== accessKey);

                              form.setValue("accessKeys", sortPackageAccessKeysCanonical(nextAccessKeys), {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                            }}
                          />
                          <span>{accessKey}</span>
                        </label>
                      );
                    })}
                  </div>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </FieldSet>
              )}
            />
          </FieldGroup>

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

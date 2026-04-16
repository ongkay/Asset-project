"use client";

import { useEffect, useMemo } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { Controller, useForm } from "react-hook-form";
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createAssetAction, updateAssetAction } from "@/modules/assets/actions";
import { assetFormSchema } from "@/modules/assets/schemas";

import { ADMIN_ASSET_QUERY_KEY } from "../assets-query";

import type { AssetEditorData } from "@/modules/admin/assets/types";

type AssetFormDialogValues = z.input<typeof assetFormSchema>;

type AssetFormDialogState =
  | {
      mode: "create";
      open: true;
    }
  | {
      mode: "edit";
      open: true;
      assetId: string;
    }
  | {
      mode: null;
      open: false;
    };

type AssetFormDialogProps = {
  dialogState: AssetFormDialogState;
  prefillById: Record<string, AssetEditorData>;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

function normalizeAssetJsonText(assetJson: AssetEditorData["assetJson"] | null) {
  if (!assetJson) {
    return "";
  }

  return JSON.stringify(assetJson, null, 2);
}

function buildDefaultAssetExpiry() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
}

function getDefaultValues(prefill: AssetEditorData | null): AssetFormDialogValues {
  if (!prefill) {
    return {
      platform: "tradingview",
      assetType: "private",
      account: "",
      note: null,
      proxy: null,
      assetJsonText: "{}",
      expiresAt: buildDefaultAssetExpiry(),
    };
  }

  return {
    platform: prefill.platform,
    assetType: prefill.assetType,
    account: prefill.account,
    note: prefill.note,
    proxy: prefill.proxy,
    assetJsonText: normalizeAssetJsonText(prefill.assetJson),
    expiresAt: prefill.expiresAt,
  };
}

function getActionFormError(result: {
  serverError?: string;
  validationErrors?: {
    formErrors?: string[];
  };
}) {
  return result.validationErrors?.formErrors?.[0] ?? result.serverError ?? null;
}

export function AssetFormDialog({ dialogState, prefillById, onOpenChange, onSaved }: AssetFormDialogProps) {
  const queryClient = useQueryClient();
  const createMutation = useAction(createAssetAction);
  const updateMutation = useAction(updateAssetAction);

  const isEditMode = dialogState.mode === "edit";
  const activePrefill = useMemo(() => {
    if (!isEditMode) {
      return null;
    }

    return prefillById[dialogState.assetId] ?? null;
  }, [dialogState, isEditMode, prefillById]);

  const form = useForm<AssetFormDialogValues>({
    defaultValues: getDefaultValues(activePrefill),
    resolver: zodResolver(assetFormSchema),
  });

  useEffect(() => {
    if (!dialogState.open) {
      return;
    }

    form.reset(getDefaultValues(activePrefill));
  }, [dialogState.open, activePrefill, form]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  async function handleSubmitAsset(values: AssetFormDialogValues) {
    const payload: AssetFormDialogValues = {
      platform: values.platform,
      assetType: values.assetType,
      account: values.account,
      note: values.note,
      proxy: values.proxy,
      assetJsonText: values.assetJsonText,
      expiresAt: values.expiresAt,
    };

    const result = isEditMode
      ? await updateMutation.executeAsync({
          ...payload,
          id: dialogState.assetId,
        })
      : await createMutation.executeAsync(payload);

    const formError = getActionFormError(result);

    if (formError) {
      toast.error(formError);
      return;
    }

    if (!result.data?.ok) {
      toast.error(result.data?.message ?? "Failed to save asset.");
      return;
    }

    toast.success(isEditMode ? "Asset updated." : "Asset created.");
    await queryClient.invalidateQueries({ queryKey: ADMIN_ASSET_QUERY_KEY });
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={dialogState.open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Asset" : "Create Asset"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update asset identity, credentials payload, and expiry settings."
              : "Create one asset inventory row with validated JSON payload and UTC expiry."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" noValidate onSubmit={form.handleSubmit(handleSubmitAsset)}>
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="platform"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="asset-platform">Platform</FieldLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger aria-invalid={fieldState.invalid} id="asset-platform">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Platform</SelectLabel>
                          <SelectItem value="tradingview">tradingview</SelectItem>
                          <SelectItem value="fxreplay">fxreplay</SelectItem>
                          <SelectItem value="fxtester">fxtester</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="assetType"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="asset-type">Asset Type</FieldLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger aria-invalid={fieldState.invalid} id="asset-type">
                        <SelectValue placeholder="Select asset type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Asset Type</SelectLabel>
                          <SelectItem value="private">private</SelectItem>
                          <SelectItem value="share">share</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="account"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="asset-account">Account</FieldLabel>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id="asset-account"
                    placeholder="account@example.com"
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="note"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="asset-note">Note</FieldLabel>
                  <Textarea
                    id="asset-note"
                    aria-invalid={fieldState.invalid}
                    placeholder="Optional note"
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="proxy"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="asset-proxy">Proxy</FieldLabel>
                  <Input
                    id="asset-proxy"
                    aria-invalid={fieldState.invalid}
                    placeholder="http://proxy.example.com"
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="assetJsonText"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="asset-json">Asset JSON</FieldLabel>
                  <Textarea
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id="asset-json"
                    placeholder='[{"name":"session","value":"cookie"}]'
                    className="min-h-40 font-mono text-xs"
                  />
                  <FieldDescription>Top-level JSON must be object or array.</FieldDescription>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="expiresAt"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="asset-expires-at">Expires At (ISO Datetime)</FieldLabel>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id="asset-expires-at"
                    placeholder="2026-05-15T00:00:00.000Z"
                  />
                  <FieldDescription>Must include timezone, example: 2026-05-15T00:00:00.000Z</FieldDescription>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={isPending} type="submit">
              {isEditMode ? "Save Changes" : "Create Asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

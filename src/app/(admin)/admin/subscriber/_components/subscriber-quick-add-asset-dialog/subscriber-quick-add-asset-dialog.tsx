"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupTextarea } from "@/components/ui/input-group";
import { quickAddSubscriberAssetAction } from "@/modules/subscriptions/actions";
import { subscriberQuickAddAssetSchema } from "@/modules/subscriptions/schemas";
import { Braces, CalendarClock, FileText, Globe, HardDrive, UserCircle2 } from "lucide-react";

type QuickAddAssetDialogState =
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

type SubscriberQuickAddAssetDialogProps = {
  dialogState: QuickAddAssetDialogState;
  userId: string;
  packageId: string;
  subscriptionId: string | null;
  onOpenChange: (open: boolean) => void;
  onCreated: (assetId: string, accessKey: string) => void;
};

const quickAddAssetFormSchema = subscriberQuickAddAssetSchema.pick({
  account: true,
  durationDays: true,
  note: true,
  proxy: true,
  assetJsonText: true,
});

type QuickAddAssetFormValues = z.input<typeof quickAddAssetFormSchema>;

export function SubscriberQuickAddAssetDialog({
  dialogState,
  userId,
  packageId,
  subscriptionId,
  onOpenChange,
  onCreated,
}: SubscriberQuickAddAssetDialogProps) {
  const quickAddMutation = useAction(quickAddSubscriberAssetAction);
  const form = useForm<QuickAddAssetFormValues>({
    defaultValues: {
      account: "",
      durationDays: 30,
      note: null,
      proxy: null,
      assetJsonText: "{}",
    },
    resolver: zodResolver(quickAddAssetFormSchema),
  });

  useEffect(() => {
    if (dialogState.open) {
      form.reset({
        account: "",
        durationDays: 30,
        note: null,
        proxy: null,
        assetJsonText: "{}",
      });
    }
  }, [dialogState.open, form]);

  async function handleSubmitQuickAdd(values: QuickAddAssetFormValues) {
    if (!dialogState.open) {
      return;
    }

    const result = await quickAddMutation.executeAsync({
      userId,
      packageId,
      subscriptionId,
      platform: dialogState.platform,
      account: values.account,
      durationDays: values.durationDays,
      note: values.note,
      proxy: values.proxy,
      assetJsonText: values.assetJsonText,
    });

    const validationError = result.validationErrors?.formErrors?.[0];

    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!result.data?.ok) {
      toast.error(result.data?.message ?? "Failed to quick add subscriber asset.");
      return;
    }

    toast.success("Private asset created.");
    onCreated(result.data.assetId, result.data.accessKey);
    onOpenChange(false);
  }

  return (
    <Dialog open={dialogState.open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Quick Add Private Asset</DialogTitle>
          <DialogDescription>
            Create one private inventory row and bind it to the current access key draft.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" noValidate onSubmit={form.handleSubmit(handleSubmitQuickAdd)}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>Target Access Key</FieldLabel>
              <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">{dialogState.accessKey ?? "-"}</div>
              <FieldDescription>The platform is locked to the entitlement you are fulfilling.</FieldDescription>
            </Field>

            <Controller
              control={form.control}
              name="account"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="quick-add-account">Account</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <UserCircle2 />
                    </InputGroupAddon>
                    <InputGroupInput {...field} aria-invalid={fieldState.invalid} id="quick-add-account" />
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
                  <FieldLabel htmlFor="quick-add-duration-days">Duration Days</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <CalendarClock />
                    </InputGroupAddon>
                    <InputGroupInput
                      aria-invalid={fieldState.invalid}
                      id="quick-add-duration-days"
                      type="number"
                      min={1}
                      value={field.value}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                    />
                  </InputGroup>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="note"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="quick-add-note">Note</FieldLabel>
                  <InputGroup className="min-h-24 items-stretch">
                    <InputGroupAddon className="items-start py-3" align="inline-start">
                      <FileText />
                    </InputGroupAddon>
                    <InputGroupTextarea
                      aria-invalid={fieldState.invalid}
                      id="quick-add-note"
                      placeholder="Optional note"
                      value={field.value ?? ""}
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                  </InputGroup>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="proxy"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="quick-add-proxy">Proxy</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <Globe />
                    </InputGroupAddon>
                    <InputGroupInput
                      aria-invalid={fieldState.invalid}
                      id="quick-add-proxy"
                      placeholder="http://proxy.example.com"
                      value={field.value ?? ""}
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                  </InputGroup>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="assetJsonText"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="quick-add-json">Asset JSON</FieldLabel>
                  <InputGroup className="min-h-40 items-stretch">
                    <InputGroupAddon className="items-start py-3" align="inline-start">
                      <Braces />
                    </InputGroupAddon>
                    <InputGroupTextarea
                      {...field}
                      aria-invalid={fieldState.invalid}
                      className="min-h-40 font-mono text-xs"
                      id="quick-add-json"
                    />
                  </InputGroup>
                  <FieldDescription>Top-level JSON must be object or array.</FieldDescription>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={quickAddMutation.isPending} type="submit">
              <HardDrive data-icon="inline-start" />
              Create Asset
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

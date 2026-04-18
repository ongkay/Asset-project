"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { CalendarClock, Coins, Info, KeyRound, Package2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { CdKeyPackageOption } from "@/modules/admin/cdkeys/types";
import type { CdKeyFormDialogValues } from "./cdkey-form-dialog-types";

type CdKeyFormFieldsProps = {
  form: UseFormReturn<CdKeyFormDialogValues>;
  packageOptions: CdKeyPackageOption[];
  selectedPackage: CdKeyPackageOption | null;
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CdKeyFormFields({ form, packageOptions, selectedPackage }: CdKeyFormFieldsProps) {
  return (
    <FieldGroup className="gap-4">
      <Controller
        control={form.control}
        name="packageId"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="cdkey-package">Package</FieldLabel>
            <Select
              onValueChange={(nextPackageId) => {
                field.onChange(nextPackageId);
                field.onBlur();
              }}
              value={field.value}
            >
              <SelectTrigger
                aria-invalid={fieldState.invalid}
                className="w-full"
                id="cdkey-package"
                onBlur={field.onBlur}
                ref={field.ref}
              >
                <Package2 className="text-muted-foreground" />
                <SelectValue placeholder="Select active package" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Active Packages</SelectLabel>
                  {packageOptions.map((packageOption) => (
                    <SelectItem key={packageOption.packageId} value={packageOption.packageId}>
                      {packageOption.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="manualCode"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="cdkey-manual-code">Manual Code (Optional)</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <KeyRound />
              </InputGroupAddon>
              <InputGroupInput
                aria-invalid={fieldState.invalid}
                id="cdkey-manual-code"
                name={field.name}
                onBlur={field.onBlur}
                onChange={(event) => field.onChange(event.target.value)}
                placeholder="AB12CD34"
                ref={field.ref}
                value={field.value ?? ""}
              />
            </InputGroup>
            <FieldDescription>
              Leave blank to auto-generate a unique code on the server. Generated code appears in table and detail after
              issue. Manual code accepts 8-12 alphanumeric characters.
            </FieldDescription>
            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="amountRpOverride"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="cdkey-amount-override">Amount Override (Optional)</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Coins />
              </InputGroupAddon>
              <InputGroupInput
                aria-invalid={fieldState.invalid}
                id="cdkey-amount-override"
                inputMode="numeric"
                min={0}
                name={field.name}
                onBlur={field.onBlur}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  field.onChange(nextValue.length === 0 ? null : nextValue);
                }}
                placeholder="e.g. 125000"
                ref={field.ref}
                type="number"
                value={field.value ?? ""}
              />
            </InputGroup>
            <FieldDescription>
              Leave blank to use the selected package amount snapshot when this key is issued.
            </FieldDescription>
            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
          </Field>
        )}
      />

      {selectedPackage ? (
        <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground text-xs">
            <Info className="size-4" />
            Snapshot preview used for this issued key
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Package</p>
              <p className="font-medium text-sm">{selectedPackage.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Amount</p>
              <p className="font-medium text-sm">{formatRupiah(selectedPackage.amountRp)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Duration</p>
              <p className="flex items-center gap-1 font-medium text-sm">
                <CalendarClock className="size-4 text-muted-foreground" />
                {selectedPackage.durationDays} days
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Summary</p>
              <Badge className="capitalize" variant="outline">
                {selectedPackage.packageSummary}
              </Badge>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {selectedPackage.accessKeys.map((accessKey) => (
              <Badge key={accessKey} variant="outline">
                {accessKey}
              </Badge>
            ))}
            <Badge variant="outline">{selectedPackage.isExtended ? "Extended" : "Fixed"}</Badge>
          </div>
        </div>
      ) : null}
    </FieldGroup>
  );
}

"use client";

import { ArrowDownWideNarrow, BadgeDollarSign, CalendarDays, Layers3, LinkIcon, Package } from "lucide-react";
import { Controller, type UseFormReturn } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  calculatePackageDiscountAmountRp,
  calculatePackageDiscountPercent,
  PACKAGE_ACCESS_KEYS,
  sortPackageAccessKeysCanonical,
  type PackageAccessKey,
} from "@/modules/packages/types";

import type { PackageFormDialogValues } from "./package-form-dialog-types";

type PackageFormFieldsProps = {
  activeAccessKeys: PackageAccessKey[] | undefined;
  form: UseFormReturn<PackageFormDialogValues>;
};

function formatCompactRupiah(value: number) {
  return `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value)}`;
}

export function PackageFormFields({ activeAccessKeys, form }: PackageFormFieldsProps) {
  const currentAmountRp = Number(form.watch("amountRp") ?? 0);
  const currentListAmountRp = Number(form.watch("listAmountRp") ?? 0);
  const currentCheckoutGroup = form.watch("checkoutGroup");
  const packageDiscountAmountRp = calculatePackageDiscountAmountRp(currentListAmountRp, currentAmountRp);
  const packageDiscountPercent = calculatePackageDiscountPercent(currentListAmountRp, currentAmountRp);

  const checkoutGroupLabel =
    currentCheckoutGroup === "semi-private"
      ? "Semi Private"
      : currentCheckoutGroup === "full-private"
        ? "Full Private"
        : "Choose checkout group";

  return (
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
                placeholder="Semi Private 60 days"
              />
            </InputGroup>
            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
          </Field>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="checkoutGroup"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="package-checkout-group">Checkout Group</FieldLabel>
              <Select
                onValueChange={(nextCheckoutGroup) => {
                  field.onChange(nextCheckoutGroup);
                  field.onBlur();
                }}
                value={field.value}
              >
                <SelectTrigger
                  aria-invalid={fieldState.invalid}
                  className="w-full"
                  id="package-checkout-group"
                  onBlur={field.onBlur}
                  ref={field.ref}
                >
                  <Layers3 className="text-muted-foreground" />
                  <SelectValue placeholder="Select checkout group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Checkout Groups</SelectLabel>
                    <SelectItem value="semi-private">Semi Private</SelectItem>
                    <SelectItem value="full-private">Full Private</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>Every new package must belong to the member checkout catalog.</FieldDescription>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="listAmountRp"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="package-list-amount-rp">Original Amount (Rp)</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <BadgeDollarSign />
                </InputGroupAddon>
                <InputGroupInput
                  aria-invalid={fieldState.invalid}
                  id="package-list-amount-rp"
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
              <FieldDescription>Use the original catalog price before package discount.</FieldDescription>
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="amountRp"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="package-amount-rp">Selling Amount (Rp)</FieldLabel>
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
              <FieldDescription>This is the final amount charged before voucher discount.</FieldDescription>
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="sortOrder"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="package-sort-order">Sort Order</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <ArrowDownWideNarrow />
                </InputGroupAddon>
                <InputGroupInput
                  aria-invalid={fieldState.invalid}
                  id="package-sort-order"
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
              <FieldDescription>Lower values appear earlier inside the selected checkout group.</FieldDescription>
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
            <FieldDescription>
              Leave blank to store null checkout URL. Internal member checkout no longer relies on this field.
            </FieldDescription>
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

      <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
        <p className="font-medium text-sm">Checkout pricing preview</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Checkout Group</p>
            <p className="font-medium text-sm">{checkoutGroupLabel}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Original Price</p>
            <p className="font-medium text-sm">{formatCompactRupiah(currentListAmountRp)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Selling Price</p>
            <p className="font-medium text-sm">{formatCompactRupiah(currentAmountRp)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Package Discount</p>
            <p className="font-medium text-sm">
              -{formatCompactRupiah(packageDiscountAmountRp)} ({packageDiscountPercent}%)
            </p>
          </div>
        </div>
      </div>
    </FieldGroup>
  );
}

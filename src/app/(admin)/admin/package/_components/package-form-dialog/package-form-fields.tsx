"use client";

import { BadgeDollarSign, CalendarDays, LinkIcon, Package } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { PACKAGE_ACCESS_KEYS, sortPackageAccessKeysCanonical, type PackageAccessKey } from "@/modules/packages/types";

import type { PackageFormDialogValues } from "./package-form-dialog-types";

type PackageFormFieldsProps = {
  activeAccessKeys: PackageAccessKey[] | undefined;
  form: UseFormReturn<PackageFormDialogValues>;
};

export function PackageFormFields({ activeAccessKeys, form }: PackageFormFieldsProps) {
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
  );
}

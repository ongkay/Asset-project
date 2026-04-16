"use client";

import { Search, X } from "lucide-react";

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

type AdminTableSearchInputProps = {
  ariaLabel: string;
  className?: string;
  onChange: (search: string) => void;
  placeholder: string;
  value: string;
};

export function AdminTableSearchInput({
  ariaLabel,
  className = "w-full sm:min-w-72",
  onChange,
  placeholder,
  value,
}: AdminTableSearchInputProps) {
  return (
    <InputGroup className={className}>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      {value ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton aria-label="Clear search" onClick={() => onChange("")} size="icon-xs">
            <X />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}

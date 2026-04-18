"use client";

import { useState } from "react";

import { Eye, EyeOff } from "lucide-react";

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

type PasswordInputProps = Omit<React.ComponentProps<typeof InputGroupInput>, "type"> & {
  leadingIcon?: React.ReactNode;
};

export function PasswordInput({ className, leadingIcon, ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <InputGroup className={className}>
      {leadingIcon ? <InputGroupAddon>{leadingIcon}</InputGroupAddon> : null}
      <InputGroupInput {...props} type={isVisible ? "text" : "password"} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          aria-label={isVisible ? "Hide password" : "Show password"}
          onClick={() => setIsVisible((currentValue) => !currentValue)}
          size="icon-sm"
          type="button"
        >
          {isVisible ? <EyeOff /> : <Eye />}
          <span className="sr-only">{isVisible ? "Hide password" : "Show password"}</span>
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

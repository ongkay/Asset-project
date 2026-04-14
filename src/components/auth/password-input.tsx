"use client";

import { useState } from "react";

import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type">;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <Input {...props} className={cn("pr-11", className)} type={isVisible ? "text" : "password"} />
      <Button
        aria-label={isVisible ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-1.5 -translate-y-1/2"
        onClick={() => setIsVisible((currentValue) => !currentValue)}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        {isVisible ? <EyeOff /> : <Eye />}
        <span className="sr-only">{isVisible ? "Hide password" : "Show password"}</span>
      </Button>
    </div>
  );
}

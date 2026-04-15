"use client";

import { CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

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

export function PackageMetadataCopy({ label, value }: { label: string; value: string | null | undefined }) {
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

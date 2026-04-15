"use client";

import type { ReactNode } from "react";

type AdminDataTableToolbarProps = {
  filters: ReactNode;
  primaryAction?: ReactNode;
  viewOptions?: ReactNode;
};

export function AdminDataTableToolbar({ filters, viewOptions, primaryAction }: AdminDataTableToolbarProps) {
  return (
    <div className="flex flex-col gap-3 @3xl/main:flex-row @3xl/main:items-center @3xl/main:justify-between">
      <div className="min-w-0 flex-1">{filters}</div>
      <div className="flex w-full items-center gap-2 @3xl/main:w-auto @3xl/main:justify-end">
        {viewOptions}
        {primaryAction}
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";

import type { SubscriberAdminRow } from "@/modules/admin/subscriptions/types";

type AdminSubscriberRowActionsProps = {
  row: SubscriberAdminRow;
  onEditRow: (row: SubscriberAdminRow) => void;
  onCancelRow: (row: SubscriberAdminRow) => void;
};

export function AdminSubscriberRowActions({ row, onEditRow, onCancelRow }: AdminSubscriberRowActionsProps) {
  const isRunning = row.subscriptionStatus === "active" || row.subscriptionStatus === "processed";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        aria-label={`Edit subscriber ${row.username}`}
        onClick={() => onEditRow(row)}
        size="sm"
        type="button"
        variant="outline"
      >
        Edit
      </Button>
      {isRunning ? (
        <Button
          aria-label={`Cancel subscription for ${row.username}`}
          onClick={() => onCancelRow(row)}
          size="sm"
          type="button"
          variant="destructive"
        >
          Cancel
        </Button>
      ) : null}
    </div>
  );
}

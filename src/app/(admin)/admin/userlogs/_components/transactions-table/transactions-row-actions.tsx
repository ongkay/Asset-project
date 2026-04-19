"use client";

import { History } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { AdminTransactionRow } from "@/modules/admin/userlogs/types";

type AdminTransactionsRowActionsProps = {
  onOpenHistory: (transactionId: string) => void;
  row: AdminTransactionRow;
};

export function AdminTransactionsRowActions({ onOpenHistory, row }: AdminTransactionsRowActionsProps) {
  return (
    <Button onClick={() => onOpenHistory(row.transactionId)} size="sm" type="button" variant="outline">
      <History data-icon="inline-start" />
      View History
    </Button>
  );
}

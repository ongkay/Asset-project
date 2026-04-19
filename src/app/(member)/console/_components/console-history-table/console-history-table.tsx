import { History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ConsoleTransactionSnapshot } from "@/modules/console/types";

type ConsoleHistoryTableProps = {
  transactions: ConsoleTransactionSnapshot[];
};

function formatAmount(amountRp: number) {
  return `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(amountRp)}`;
}

function formatDateTime(dateTime: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateTime));
}

function getStatusVariant(status: ConsoleTransactionSnapshot["status"]) {
  if (status === "success") {
    return "default" as const;
  }

  if (status === "pending") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function getSourceLabel(source: ConsoleTransactionSnapshot["source"]) {
  if (source === "payment_dummy") {
    return "Payment Dummy";
  }

  if (source === "cdkey") {
    return "CD-Key";
  }

  return "Admin Manual";
}

export function ConsoleHistoryTable({ transactions }: ConsoleHistoryTableProps) {
  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader>
        <CardTitle>History Subscription</CardTitle>
        <CardDescription>Riwayat transaksi subscription yang sudah tercatat pada akun member.</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <Empty className="border border-dashed border-border/60 bg-muted/10 p-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <History />
              </EmptyMedia>
              <EmptyTitle>Belum ada riwayat transaksi</EmptyTitle>
              <EmptyDescription>
                Riwayat subscription akan muncul setelah pembayaran atau redeem berhasil diproses.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Amount (Rp)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created at</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{getSourceLabel(transaction.source)}</TableCell>
                  <TableCell className="font-medium text-foreground">{transaction.packageName}</TableCell>
                  <TableCell>{formatAmount(transaction.amountRp)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(transaction.status)} className="capitalize">
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateTime(transaction.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

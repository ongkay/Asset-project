"use client";

import { AlertCircle, Boxes, CreditCard, Package2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { ConsolePageProps } from "./console-page-types";

const paymentErrorMessageByKey = {
  "disabled-package": "Package sudah tidak tersedia untuk pembelian baru.",
  "invalid-package": "Package yang dipilih tidak valid atau sudah tidak tersedia.",
  "missing-package": "Package tujuan pembayaran tidak ditemukan.",
} satisfies Record<NonNullable<ConsolePageProps["initialPaymentError"]>, string>;

export function ConsolePage({
  initialPackages,
  initialPaymentError,
  initialSnapshot,
  initialStateSnapshot,
}: ConsolePageProps) {
  return (
    <div className="flex flex-col gap-6">
      {initialPaymentError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Checkout belum bisa dilanjutkan</AlertTitle>
          <AlertDescription>{paymentErrorMessageByKey[initialPaymentError]}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/60 shadow-xs">
        <CardHeader>
          <CardTitle>Console bootstrap</CardTitle>
          <CardDescription>Phase 4 menyiapkan route final dengan data server yang sudah stabil.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <CreditCard className="size-4" />
              Console state
            </div>
            <p className="text-2xl font-semibold capitalize">{initialStateSnapshot.state}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {initialStateSnapshot.latestSubscription?.packageName ?? "Belum ada subscription sebelumnya."}
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <Boxes className="size-4" />
              Assigned assets
            </div>
            <p className="text-2xl font-semibold">{initialSnapshot.assets.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Asset aktif akan dirender penuh pada phase UI berikutnya.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <Package2 className="size-4" />
              Active packages
            </div>
            <p className="text-2xl font-semibold">{initialPackages.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Katalog package aktif siap dipakai oleh purchase flow.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

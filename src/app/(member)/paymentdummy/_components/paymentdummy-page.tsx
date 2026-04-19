"use client";

import { useState } from "react";

import { ArrowRight, CreditCard, History, Package2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

import { purchaseSubscriptionWithPaymentDummyAction } from "@/modules/subscriptions/actions";

import type { PaymentDummyPageProps } from "./paymentdummy-page-types";

function formatAmount(amountRp: number) {
  return `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(amountRp)}`;
}

function isGuardFailure(errorMessage: string | null) {
  return errorMessage === "Unauthorized." || errorMessage === "Forbidden.";
}

export function PaymentDummyPage({ currentSubscription, selectedPackage }: PaymentDummyPageProps) {
  const router = useRouter();
  const purchaseMutation = useAction(purchaseSubscriptionWithPaymentDummyAction);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function handleConfirmPayment() {
    setActionMessage(null);

    const result = await purchaseMutation.executeAsync({ packageId: selectedPackage.packageId });
    const serverError = result.serverError ?? null;

    if (isGuardFailure(serverError)) {
      router.refresh();
      return;
    }

    if (serverError) {
      setActionMessage(serverError);
      return;
    }

    if (result.data?.ok) {
      router.replace(result.data.redirectTo);
      return;
    }

    setActionMessage(result.data?.message ?? "Pembayaran dummy gagal diproses. Silakan coba lagi.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <Card className="border-border/60 shadow-xs">
        <CardHeader>
          <CardTitle>Konfirmasi pembayaran</CardTitle>
          <CardDescription>
            Periksa package tujuan, nominal, lalu lanjutkan pembayaran dummy dari halaman ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-4">
            <Package2 className="mt-0.5 size-4 shrink-0 text-foreground" />
            <div>
              <p className="font-medium text-foreground">{selectedPackage.name}</p>
              <p>
                {selectedPackage.durationDays} hari, {selectedPackage.summary} access
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-4">
            <CreditCard className="mt-0.5 size-4 shrink-0 text-foreground" />
            <div>
              <p className="font-medium text-foreground">Nominal</p>
              <p>{formatAmount(selectedPackage.amountRp)}</p>
            </div>
          </div>

          {actionMessage ? (
            <Alert variant="destructive">
              <CreditCard className="size-4" />
              <AlertTitle>Pembayaran belum berhasil</AlertTitle>
              <AlertDescription>{actionMessage}</AlertDescription>
            </Alert>
          ) : null}

          <div className="rounded-lg border border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Checkout akan memvalidasi ulang package aktif saat submit.</p>
            <p className="mt-1">
              Jika package berubah atau session tidak lagi valid, halaman akan menampilkan hasil yang aman tanpa
              menyimpan state palsu di browser.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button disabled={purchaseMutation.isPending} onClick={() => void handleConfirmPayment()} type="button">
              {purchaseMutation.isPending ? <Spinner /> : <ArrowRight data-icon="inline-end" />}
              Lanjutkan pembayaran dummy
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-xs">
        <CardHeader>
          <CardTitle>Langganan berjalan saat ini</CardTitle>
          <CardDescription>Ringkasan ini berasal dari console read model yang aman untuk member.</CardDescription>
        </CardHeader>
        <CardContent>
          {currentSubscription ? (
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-4">
                <History className="mt-0.5 size-4 shrink-0 text-foreground" />
                <div>
                  <p className="font-medium text-foreground">{currentSubscription.packageName}</p>
                  <p className="capitalize">Status {currentSubscription.status}</p>
                  <p>{currentSubscription.daysLeft} hari tersisa</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Member ini belum memiliki subscription aktif.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

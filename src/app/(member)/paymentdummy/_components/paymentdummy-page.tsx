"use client";

import { CreditCard, History, Package2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { PaymentDummyPageProps } from "./paymentdummy-page-types";

function formatAmount(amountRp: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amountRp);
}

export function PaymentDummyPage({ currentSubscription, selectedPackage }: PaymentDummyPageProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <Card className="border-border/60 shadow-xs">
        <CardHeader>
          <CardTitle>Payment dummy bootstrap</CardTitle>
          <CardDescription>
            Route ini sudah memvalidasi package dan memuat konteks subscription aktif member.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
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
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-xs">
        <CardHeader>
          <CardTitle>Current subscription</CardTitle>
          <CardDescription>Ringkasan ini berasal dari console read model yang aman untuk member.</CardDescription>
        </CardHeader>
        <CardContent>
          {currentSubscription ? (
            <div className="space-y-3 text-sm text-muted-foreground">
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

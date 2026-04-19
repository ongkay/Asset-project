import { AlertCircle, CreditCard, Package2, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConsoleSnapshot, ConsoleStateSnapshot } from "@/modules/console/types";

type ConsoleOverviewCardProps = {
  onOpenExtendDialog: () => void;
  onOpenRedeemDialog: () => void;
  snapshot: ConsoleSnapshot;
  stateSnapshot: ConsoleStateSnapshot;
};

function formatDateTime(dateTime: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateTime));
}

function getConsoleStateCopy(stateSnapshot: ConsoleStateSnapshot, snapshot: ConsoleSnapshot) {
  if (stateSnapshot.state === "active" && snapshot.subscription) {
    return {
      badgeVariant: "default" as const,
      description: `${snapshot.subscription.daysLeft} hari tersisa hingga ${formatDateTime(snapshot.subscription.endAt)}.`,
      title: "Langganan aktif dan asset siap dipakai.",
    };
  }

  if (stateSnapshot.state === "processed" && snapshot.subscription) {
    return {
      badgeVariant: "secondary" as const,
      description: `${snapshot.subscription.packageName} masih diproses hingga ${formatDateTime(snapshot.subscription.endAt)}. Asset yang sudah assigned tetap bisa dipakai.`,
      title: "Sebagian akses masih menunggu pemenuhan asset.",
    };
  }

  if (stateSnapshot.state === "expired" && stateSnapshot.latestSubscription) {
    return {
      badgeVariant: "outline" as const,
      description: `${stateSnapshot.latestSubscription.packageName} berakhir pada ${formatDateTime(stateSnapshot.latestSubscription.endAt)}.`,
      title: "Langganan terakhir sudah berakhir.",
    };
  }

  if (stateSnapshot.state === "canceled" && stateSnapshot.latestSubscription) {
    return {
      badgeVariant: "outline" as const,
      description: `${stateSnapshot.latestSubscription.packageName} sudah dibatalkan. Pilih package baru untuk mengaktifkan akses lagi.`,
      title: "Langganan terakhir sudah dibatalkan.",
    };
  }

  return {
    badgeVariant: "outline" as const,
    description: "Pilih package aktif atau redeem CD-Key untuk mulai mengaktifkan akses member.",
    title: "Belum ada langganan aktif pada akun ini.",
  };
}

function getPurchaseButtonLabel(state: ConsoleStateSnapshot["state"]) {
  return state === "active" || state === "processed" ? "Perpanjang langganan" : "Pilih package";
}

export function ConsoleOverviewCard({
  onOpenExtendDialog,
  onOpenRedeemDialog,
  snapshot,
  stateSnapshot,
}: ConsoleOverviewCardProps) {
  const stateCopy = getConsoleStateCopy(stateSnapshot, snapshot);

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="gap-3 border-b border-border/60">
        <div className="flex flex-col gap-2">
          <CardTitle>Status langganan</CardTitle>
          <CardDescription>
            Ringkasan status akses member, package terakhir, dan titik masuk aksi utama.
          </CardDescription>
        </div>
        <CardAction className="w-full sm:w-auto">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={onOpenExtendDialog} variant="outline">
              <Package2 data-icon="inline-start" />
              {getPurchaseButtonLabel(stateSnapshot.state)}
            </Button>
            <Button onClick={onOpenRedeemDialog} variant="secondary">
              <ShieldCheck data-icon="inline-start" />
              Redeem CD-Key
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4 pt-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
          <div className="mb-3 flex items-center gap-2">
            <CreditCard className="size-4 text-muted-foreground" />
            <Badge variant={stateCopy.badgeVariant} className="capitalize">
              {stateSnapshot.state}
            </Badge>
          </div>
          <p className="text-lg font-semibold tracking-tight text-foreground">{stateCopy.title}</p>
          <p className="mt-2 text-sm text-muted-foreground">{stateCopy.description}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">Package berjalan</p>
            <p className="mt-2 font-medium text-foreground">
              {snapshot.subscription?.packageName ??
                stateSnapshot.latestSubscription?.packageName ??
                "Belum ada package"}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="size-4" />
              Asset aktif
            </div>
            <p className="font-medium text-foreground">{snapshot.assets.length} asset</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

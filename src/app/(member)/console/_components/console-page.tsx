"use client";

import { useState } from "react";

import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import type { ConsolePageProps } from "./console-page-types";
import { ConsoleAssetDetailDialog } from "./console-asset-detail-dialog/console-asset-detail-dialog";
import { ConsoleAssetTable } from "./console-asset-table/console-asset-table";
import { ConsoleExtendDialog } from "./console-extend-dialog/console-extend-dialog";
import { ConsoleHistoryTable } from "./console-history-table/console-history-table";
import { ConsoleOverviewCard } from "./console-overview-card";
import { ConsoleRedeemDialog } from "./console-redeem-dialog/console-redeem-dialog";

import type { ConsoleAssetSnapshot } from "@/modules/console/types";

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
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false);
  const [isRedeemDialogOpen, setIsRedeemDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ConsoleAssetSnapshot | null>(null);
  const [isAssetDetailOpen, setIsAssetDetailOpen] = useState(false);

  function handleOpenAssetDetail(asset: ConsoleAssetSnapshot) {
    setSelectedAsset(asset);
    setIsAssetDetailOpen(true);
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {initialPaymentError ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Checkout belum bisa dilanjutkan</AlertTitle>
            <AlertDescription>{paymentErrorMessageByKey[initialPaymentError]}</AlertDescription>
          </Alert>
        ) : null}

        <ConsoleOverviewCard
          onOpenExtendDialog={() => setIsExtendDialogOpen(true)}
          onOpenRedeemDialog={() => setIsRedeemDialogOpen(true)}
          snapshot={initialSnapshot}
          stateSnapshot={initialStateSnapshot}
        />
        <ConsoleAssetTable assets={initialSnapshot.assets} onViewAsset={handleOpenAssetDetail} />
        <ConsoleHistoryTable transactions={initialSnapshot.transactions} />
      </div>

      <ConsoleExtendDialog
        onOpenChange={setIsExtendDialogOpen}
        open={isExtendDialogOpen}
        packages={initialPackages}
        state={initialStateSnapshot.state}
      />
      <ConsoleRedeemDialog onOpenChange={setIsRedeemDialogOpen} open={isRedeemDialogOpen} />
      <ConsoleAssetDetailDialog asset={selectedAsset} onOpenChange={setIsAssetDetailOpen} open={isAssetDetailOpen} />
    </>
  );
}

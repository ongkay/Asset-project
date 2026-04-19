"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { Copy, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { getConsoleAssetDetailAction } from "@/modules/console/actions";
import type { ConsoleAssetSnapshot } from "@/modules/console/types";

type ConsoleAssetDetailDialogProps = {
  asset: ConsoleAssetSnapshot | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

function isGuardFailure(errorMessage: string | null) {
  return errorMessage === "Unauthorized." || errorMessage === "Forbidden.";
}

type AssetDetailResponseGuardInput = {
  currentAssetId: string | null;
  currentRequestKey: number;
  requestAssetId: string;
  responseRequestKey: number;
};

export function shouldApplyAssetDetailResponse(input: AssetDetailResponseGuardInput) {
  return input.currentAssetId === input.requestAssetId && input.currentRequestKey === input.responseRequestKey;
}

export function ConsoleAssetDetailDialog({ asset, onOpenChange, open }: ConsoleAssetDetailDialogProps) {
  const router = useRouter();
  const detailMutation = useAction(getConsoleAssetDetailAction);
  const [assetJsonText, setAssetJsonText] = useState<string | null>(null);
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null);
  const latestRequestKeyRef = useRef(0);
  const latestAssetIdRef = useRef<string | null>(null);

  const loadAssetDetail = useEffectEvent(async (assetId: string, requestKey: number) => {
    latestAssetIdRef.current = assetId;
    setAssetJsonText(null);
    setUnavailableMessage(null);

    const result = await detailMutation.executeAsync({ assetId });

    if (
      !shouldApplyAssetDetailResponse({
        currentAssetId: latestAssetIdRef.current,
        currentRequestKey: latestRequestKeyRef.current,
        requestAssetId: assetId,
        responseRequestKey: requestKey,
      })
    ) {
      return;
    }

    const serverError = result?.serverError ?? null;

    if (isGuardFailure(serverError)) {
      onOpenChange(false);
      router.refresh();
      return;
    }

    if (!result.data?.detail) {
      setUnavailableMessage(result.data?.uiMessage ?? "Asset sudah tidak tersedia.");
      return;
    }

    try {
      setAssetJsonText(JSON.stringify(result.data.detail.asset, null, 2));
    } catch {
      setUnavailableMessage("Asset sudah tidak tersedia.");
    }
  });

  useEffect(() => {
    if (!open || !asset?.id) {
      latestRequestKeyRef.current += 1;
      latestAssetIdRef.current = null;
      return;
    }

    latestRequestKeyRef.current += 1;
    latestAssetIdRef.current = asset.id;

    void loadAssetDetail(asset.id, latestRequestKeyRef.current);
  }, [asset?.id, open]);

  const detailSummary = useMemo(() => {
    if (!asset) {
      return null;
    }

    return `${asset.platform} - ${asset.assetType}`;
  }, [asset]);

  async function handleCopyJson() {
    if (!assetJsonText) {
      return;
    }

    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      toast.error("Copy JSON gagal diproses.");
      return;
    }

    await navigator.clipboard.writeText(assetJsonText);
    toast.success("JSON asset berhasil disalin.");
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detail asset</DialogTitle>
          <DialogDescription>
            {detailSummary ?? "Buka detail asset dari tabel untuk melihat JSON mentah dengan aman."}
          </DialogDescription>
        </DialogHeader>
        {!asset ? (
          <Empty className="border border-dashed border-border/60 bg-muted/10 p-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Info />
              </EmptyMedia>
              <EmptyTitle>Belum ada asset dipilih</EmptyTitle>
              <EmptyDescription>
                Pilih salah satu asset dari tabel lalu tekan View untuk memuat detail.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : detailMutation.isPending && !assetJsonText && !unavailableMessage ? (
          <div className="flex min-h-56 items-center justify-center rounded-lg border border-border/60 bg-muted/10">
            <Spinner className="size-5" />
          </div>
        ) : unavailableMessage ? (
          <Empty className="border border-dashed border-border/60 bg-muted/10 p-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Info />
              </EmptyMedia>
              <EmptyTitle>Asset unavailable</EmptyTitle>
              <EmptyDescription>{unavailableMessage}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{asset.id}</p>
              <p className="mt-1 capitalize">
                {asset.platform} - {asset.assetType}
              </p>
            </div>
            <pre className="max-h-[50vh] overflow-auto rounded-lg border border-border/60 bg-muted/10 p-4 text-xs leading-6 text-foreground">
              {assetJsonText}
            </pre>
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Tutup
          </Button>
          <Button
            aria-label={asset ? `Copy JSON asset ${asset.id}` : "Copy JSON asset"}
            disabled={!assetJsonText}
            onClick={() => void handleCopyJson()}
            type="button"
          >
            <Copy data-icon="inline-start" />
            Copy JSON
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

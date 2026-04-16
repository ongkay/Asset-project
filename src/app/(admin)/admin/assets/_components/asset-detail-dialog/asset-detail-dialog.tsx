"use client";

import type { ComponentType, ReactNode } from "react";

import { AtSign, Braces, CalendarClock, CopyIcon, HardDrive, PencilLine, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { AssetDetailUsers } from "./asset-detail-users";

import type { AssetEditorData } from "@/modules/admin/assets/types";

type AssetDetailDialogProps = {
  open: boolean;
  asset: AssetEditorData | null;
  loading: boolean;
  errorMessage: string | null;
  onOpenChange: (open: boolean) => void;
  onEditAsset: (assetId: string) => void;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

async function copyAssetText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied.`);
  } catch {
    toast.error(`Failed to copy ${label}.`);
  }
}

export function AssetDetailDialog({
  open,
  asset,
  loading,
  errorMessage,
  onOpenChange,
  onEditAsset,
}: AssetDetailDialogProps) {
  const assetJsonText = asset ? JSON.stringify(asset.assetJson, null, 2) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] overflow-y-auto border-border/70 p-0 sm:max-w-4xl">
        <div className="border-b border-border/60 px-4 py-4 sm:px-6 sm:py-5">
          <DialogHeader>
            <DialogTitle>Asset Detail</DialogTitle>
            <DialogDescription>Inspect sensitive fields, lifecycle state, and current active users.</DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5">
          {loading ? <p className="text-muted-foreground text-sm">Loading asset detail...</p> : null}

          {!loading && errorMessage ? (
            <p className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-destructive text-sm">
              {errorMessage}
            </p>
          ) : null}

          {!loading && !errorMessage && !asset ? (
            <p className="text-muted-foreground text-sm">Asset detail is not available.</p>
          ) : null}

          {!loading && !errorMessage && asset ? (
            <div className="space-y-5">
              <Card className="border-border/60 bg-linear-to-br from-card via-card to-primary/5 shadow-xs">
                <CardContent className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-muted-foreground text-[11px] uppercase tracking-[0.18em] sm:text-xs sm:tracking-[0.22em]">
                        <ShieldCheck className="size-4" />
                        Asset Inventory
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{asset.status}</Badge>
                          <Badge variant="outline">{asset.platform}</Badge>
                          <Badge variant="outline">{asset.assetType}</Badge>
                        </div>
                        <h3 className="font-semibold text-lg tracking-tight sm:text-xl">Protected asset credentials</h3>
                        <p className="max-w-2xl text-muted-foreground text-sm leading-6">
                          Review the current lifecycle metadata and sensitive payload before editing this asset.
                        </p>
                      </div>
                    </div>

                    <Button className="w-full sm:w-auto" onClick={() => onEditAsset(asset.id)} type="button">
                      <PencilLine data-icon="inline-start" />
                      Edit Asset
                    </Button>
                  </div>

                  <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/80 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-[11px] uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.18em]">
                        Asset ID
                      </p>
                      <p className="break-all font-mono text-xs sm:truncate sm:text-sm" title={asset.id}>
                        {asset.id}
                      </p>
                    </div>
                    <Button
                      aria-label="Copy Asset ID"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        void copyAssetText("Asset ID", asset.id);
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <CopyIcon data-icon="inline-start" />
                      Copy ID
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-3">
                <DetailCard icon={HardDrive} title="Inventory Snapshot">
                  <DetailValueItem label="Platform" value={asset.platform} />
                  <DetailValueItem label="Asset Type" value={asset.assetType} />
                  <DetailValueItem label="Status" value={asset.status} />
                  <DetailValueItem label="Total Used" value={String(asset.totalUsed)} />
                </DetailCard>

                <DetailCard icon={CalendarClock} title="Lifecycle Timing">
                  <DetailValueItem label="Expires At" value={formatDateTime(asset.expiresAt)} />
                  <DetailValueItem label="Disabled At" value={formatDateTime(asset.disabledAt)} />
                  <DetailValueItem label="Created At" value={formatDateTime(asset.createdAt)} />
                  <DetailValueItem label="Updated At" value={formatDateTime(asset.updatedAt)} />
                </DetailCard>

                <DetailCard icon={AtSign} title="Sensitive Fields">
                  <DetailValueItem label="Account" monospace value={asset.account} />
                  <DetailValueItem label="Proxy" monospace value={asset.proxy ?? "-"} />
                  <DetailValueItem label="Note" value={asset.note ?? "-"} />
                </DetailCard>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="space-y-1.5">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Braces className="size-4 text-muted-foreground" />
                        Asset JSON
                      </CardTitle>
                      <p className="text-muted-foreground text-sm">
                        Canonical credential payload stored for this asset.
                      </p>
                    </div>
                    <Button
                      aria-label="Copy Asset JSON"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        void copyAssetText("Asset JSON", assetJsonText);
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <CopyIcon data-icon="inline-start" />
                      Copy JSON
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <pre className="max-h-64 overflow-auto rounded-xl border border-border/70 bg-muted/30 p-3 font-mono text-[11px] leading-5 sm:max-h-80 sm:p-4 sm:text-xs sm:leading-6">
                      {assetJsonText}
                    </pre>
                  </CardContent>
                </Card>

                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="size-4 text-muted-foreground" />
                      Current Active Users
                    </CardTitle>
                    <p className="text-muted-foreground text-sm">
                      Users currently consuming access from this asset row.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <AssetDetailUsers users={asset.activeUsers} />
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border/60 px-4 py-4 sm:px-6">
          <Button className="w-full sm:w-auto" onClick={() => onOpenChange(false)} type="button" variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailCard({
  children,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  icon: ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="space-y-1.5 p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">{children}</CardContent>
    </Card>
  );
}

function DetailValueItem({ label, monospace, value }: { label: string; monospace?: boolean; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
      <p className="text-muted-foreground text-[11px] uppercase tracking-[0.12em] sm:text-xs sm:tracking-[0.16em]">
        {label}
      </p>
      <p className={monospace ? "mt-1 break-all font-mono text-xs" : "mt-1 text-sm"}>{value}</p>
    </div>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export function AssetDetailDialog({
  open,
  asset,
  loading,
  errorMessage,
  onOpenChange,
  onEditAsset,
}: AssetDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Asset Detail</DialogTitle>
          <DialogDescription>Inspect sensitive fields and current active users for this asset.</DialogDescription>
        </DialogHeader>

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
            <div className="grid gap-3 sm:grid-cols-2">
              <ReadOnlyField label="Asset ID" value={asset.id} monospace />
              <ReadOnlyField label="Platform" value={asset.platform} />
              <ReadOnlyField label="Asset Type" value={asset.assetType} />
              <ReadOnlyField label="Status" value={asset.status} asBadge />
              <ReadOnlyField label="Total Used" value={String(asset.totalUsed)} />
              <ReadOnlyField label="Disabled At" value={formatDateTime(asset.disabledAt)} />
              <ReadOnlyField label="Expires At" value={formatDateTime(asset.expiresAt)} />
              <ReadOnlyField label="Created At" value={formatDateTime(asset.createdAt)} />
              <ReadOnlyField label="Updated At" value={formatDateTime(asset.updatedAt)} />
              <ReadOnlyField label="Account" value={asset.account} monospace />
              <ReadOnlyField label="Proxy" value={asset.proxy ?? "-"} monospace />
              <ReadOnlyField label="Note" value={asset.note ?? "-"} />
            </div>

            <div className="space-y-2">
              <p className="font-medium text-sm">Asset JSON</p>
              <pre className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs">
                {JSON.stringify(asset.assetJson, null, 2)}
              </pre>
            </div>

            <div className="space-y-2">
              <p className="font-medium text-sm">Current Active Users</p>
              <AssetDetailUsers users={asset.activeUsers} />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          {asset ? (
            <Button
              onClick={() => {
                onEditAsset(asset.id);
              }}
              type="button"
            >
              Edit Asset
            </Button>
          ) : null}
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReadOnlyField({
  label,
  value,
  monospace,
  asBadge,
}: {
  label: string;
  value: string;
  monospace?: boolean;
  asBadge?: boolean;
}) {
  return (
    <div className="space-y-1 rounded-md border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      {asBadge ? (
        <Badge variant="outline">{value}</Badge>
      ) : (
        <p className={monospace ? "font-mono text-xs" : "text-sm"}>{value}</p>
      )}
    </div>
  );
}

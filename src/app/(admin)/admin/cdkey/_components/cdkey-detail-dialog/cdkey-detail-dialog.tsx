"use client";

import { CalendarClock, CopyIcon, KeyRound, Package2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { getAvatarToneClass } from "@/lib/avatar";
import { getInitials } from "@/lib/utils";

import type { AdminCdKeyDetailDialogPayload } from "../cdkey-page-types";
import type { CdKeyUserIdentity } from "@/modules/admin/cdkeys/types";

type AdminCdKeyDetailDialogProps = {
  open: boolean;
  payload: AdminCdKeyDetailDialogPayload | null;
  loading: boolean;
  errorMessage: string | null;
  onOpenChange: (open: boolean) => void;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

async function copyText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied.`);
  } catch {
    toast.error(`Failed to copy ${label}.`);
  }
}

function IdentityCard({
  label,
  user,
  emptyLabel,
}: {
  label: string;
  user: CdKeyUserIdentity | null;
  emptyLabel: string;
}) {
  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {!user ? (
          <p className="text-muted-foreground text-sm">{emptyLabel}</p>
        ) : (
          <div className="flex items-start gap-3">
            <Avatar className="size-9 rounded-full">
              <AvatarImage alt={user.username} src={user.avatarUrl ?? undefined} />
              <AvatarFallback className={`${user.avatarUrl ? "" : getAvatarToneClass(user.userId)} rounded-full`}>
                {getInitials(user.username)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium text-sm">{user.username}</p>
              <p className="truncate text-muted-foreground text-xs">{user.email}</p>
              <p className="truncate text-muted-foreground text-xs">{user.userId}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminCdKeyDetailDialog({
  open,
  payload,
  loading,
  errorMessage,
  onOpenChange,
}: AdminCdKeyDetailDialogProps) {
  const detail = payload?.detail ?? null;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] overflow-y-auto p-0 sm:max-w-3xl">
        <div className="border-b border-border/60 px-4 py-4 sm:px-6 sm:py-5">
          <DialogHeader>
            <DialogTitle>CD-Key Detail</DialogTitle>
            <DialogDescription>Inspect the immutable issuance snapshot and usage identities.</DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5">
          {loading ? <p className="text-muted-foreground text-sm">Loading CD-Key detail...</p> : null}

          {!loading && errorMessage ? (
            <p className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-destructive text-sm">
              {errorMessage}
            </p>
          ) : null}

          {!loading && !errorMessage && !detail ? (
            <p className="text-muted-foreground text-sm">CD-Key detail is not available.</p>
          ) : null}

          {!loading && !errorMessage && detail ? (
            <>
              <Card className="border-border/60 bg-linear-to-br from-card via-card to-primary/5 shadow-xs">
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.18em]">
                        <KeyRound className="size-4" />
                        Issued Code
                      </div>
                      <p className="font-mono text-lg sm:text-xl">{detail.code}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="capitalize" variant={detail.usedAt ? "outline" : "secondary"}>
                          {detail.usedAt ? "used" : "unused"}
                        </Badge>
                        <Badge className="capitalize" variant="outline">
                          {detail.packageSummary}
                        </Badge>
                      </div>
                    </div>

                    <Button
                      aria-label="Copy CD key code"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        void copyText("CD-Key code", detail.code);
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <CopyIcon data-icon="inline-start" />
                      Copy Code
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Package2 className="size-4 text-muted-foreground" />
                      Package Snapshot
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <DetailValue label="Package ID" monospace value={detail.packageId} />
                    <DetailValue label="Package Name" value={detail.packageName ?? "-"} />
                    <DetailValue label="Amount" value={formatRupiah(detail.amountRp)} />
                    <DetailValue label="Duration" value={`${detail.durationDays} days`} />
                    <DetailValue label="Mode" value={detail.isExtended ? "Extended" : "Fixed"} />
                    <div>
                      <p className="mb-1 text-muted-foreground text-xs">Access Keys</p>
                      <div className="flex flex-wrap gap-2">
                        {detail.accessKeys.map((accessKey) => (
                          <Badge key={accessKey} variant="outline">
                            {accessKey}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CalendarClock className="size-4 text-muted-foreground" />
                      Audit Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <DetailValue label="Used At" value={formatDateTime(detail.usedAt)} />
                    <DetailValue label="Created At" value={formatDateTime(detail.createdAt)} />
                    <DetailValue label="Updated At" value={formatDateTime(detail.updatedAt)} />
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <IdentityCard emptyLabel="-" label="Created By" user={detail.createdBy} />
                <IdentityCard emptyLabel="Unused" label="Used By" user={detail.usedBy} />
              </div>
            </>
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

function DetailValue({ label, value, monospace }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={monospace ? "mt-1 break-all font-mono text-xs" : "mt-1 text-sm"}>{value}</p>
    </div>
  );
}

"use client";

import { ArchiveX, History, PackageOpen } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { getAvatarToneClass } from "@/lib/avatar";
import { getInitials } from "@/lib/utils";

import type { AdminTransactionDetail } from "@/modules/admin/userlogs/types";

type TransactionDetailDialogProps = {
  detail: AdminTransactionDetail | null;
  errorMessage: string | null;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
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

function formatCurrency(value: number) {
  return `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value)}`;
}

function SummaryItem({ label, monospace = false, value }: { label: string; monospace?: boolean; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/15 p-3">
      <p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">{label}</p>
      <p className={`mt-2 text-sm ${monospace ? "font-mono" : "font-medium"}`}>{value}</p>
    </div>
  );
}

export function TransactionDetailDialog({
  detail,
  errorMessage,
  loading,
  onOpenChange,
  open,
}: TransactionDetailDialogProps) {
  const initials = getInitials(detail?.user.username ?? "user");

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] overflow-y-auto border-border/70 p-0 sm:max-w-4xl">
        <div className="border-b border-border/60 px-4 py-4 sm:px-6 sm:py-5">
          <DialogHeader>
            <DialogTitle>Transaction History</DialogTitle>
            <DialogDescription>
              Review the selected transaction and any assignment snapshots linked through its subscription.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex flex-col gap-5 px-4 py-4 sm:px-6 sm:py-5">
          {loading && !detail ? <p className="text-muted-foreground text-sm">Loading transaction detail...</p> : null}

          {errorMessage ? (
            <p className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-destructive text-sm">
              {errorMessage}
            </p>
          ) : null}

          {!loading && !errorMessage && !detail ? (
            <Empty className="border border-dashed border-border/60 bg-muted/10 p-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <History />
                </EmptyMedia>
                <EmptyTitle>Transaction detail unavailable</EmptyTitle>
                <EmptyDescription>The selected history row could not be loaded.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {detail ? (
            <>
              <Card className="border-border/60 bg-linear-to-br from-card via-card to-primary/5 shadow-xs">
                <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <Avatar className="size-14 rounded-full sm:size-16">
                        {detail.user.avatarUrl ? (
                          <AvatarImage alt={detail.user.username} src={detail.user.avatarUrl} />
                        ) : null}
                        <AvatarFallback
                          className={`${detail.user.avatarUrl ? "" : getAvatarToneClass(detail.user.userId)} rounded-full`}
                        >
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <div>
                          <p className="font-semibold text-lg tracking-tight">{detail.user.username}</p>
                          <p className="text-muted-foreground text-sm">{detail.user.email}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{detail.user.publicId}</Badge>
                          <Badge variant="outline">{detail.source}</Badge>
                          <Badge
                            variant={
                              detail.status === "success"
                                ? "secondary"
                                : detail.status === "pending"
                                  ? "outline"
                                  : "destructive"
                            }
                          >
                            {detail.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-right">
                      <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">Amount</p>
                      <p className="mt-2 font-semibold text-xl tabular-nums">{formatCurrency(detail.amountRp)}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryItem label="Transaction ID" monospace value={detail.transactionId} />
                    <SummaryItem
                      label="Subscription ID"
                      monospace
                      value={detail.subscriptionId ?? "No linked subscription"}
                    />
                    <SummaryItem label="Package" value={detail.packageName} />
                    <SummaryItem label="Paid At" value={formatDateTime(detail.paidAt)} />
                    <SummaryItem label="Created At" value={formatDateTime(detail.createdAt)} />
                    <SummaryItem label="Updated At" value={formatDateTime(detail.updatedAt)} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-xs">
                <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
                  <CardTitle className="text-base">Assignment Snapshot History</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-4 sm:p-6">
                  {detail.assignmentHistory.length ? (
                    <div className="grid gap-3">
                      {detail.assignmentHistory.map((assignment) => (
                        <div
                          className="rounded-xl border border-border/70 bg-muted/15 p-4"
                          key={assignment.assignmentId}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{assignment.accessKey}</Badge>
                            <Badge variant="outline">{assignment.platform}</Badge>
                            <Badge variant="outline">{assignment.assetType}</Badge>
                            {assignment.assetDeletedAt ? (
                              <Badge variant="destructive">Deleted asset snapshot</Badge>
                            ) : null}
                            {assignment.revokedAt ? (
                              <Badge variant="outline">Revoked</Badge>
                            ) : (
                              <Badge variant="secondary">Active at snapshot</Badge>
                            )}
                          </div>
                          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <SummaryItem label="Assignment ID" monospace value={assignment.assignmentId} />
                            <SummaryItem label="Original Asset ID" monospace value={assignment.originalAssetId} />
                            <SummaryItem
                              label="Current Asset ID"
                              monospace
                              value={assignment.assetId ?? "Asset removed"}
                            />
                            <SummaryItem label="Note" value={assignment.assetNote ?? "No note"} />
                            <SummaryItem label="Assigned At" value={formatDateTime(assignment.assignedAt)} />
                            <SummaryItem label="Expires At" value={formatDateTime(assignment.assetExpiresAt)} />
                            <SummaryItem label="Revoked At" value={formatDateTime(assignment.revokedAt)} />
                            <SummaryItem label="Deleted At" value={formatDateTime(assignment.assetDeletedAt)} />
                          </div>
                          {assignment.revokeReason ? (
                            <div className="mt-3 rounded-lg border border-border/60 bg-background/70 p-3 text-sm">
                              <p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">Revoke Reason</p>
                              <p className="mt-2">{assignment.revokeReason}</p>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : detail.subscriptionId ? (
                    <Empty className="border border-dashed border-border/60 bg-muted/10 p-8">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <PackageOpen />
                        </EmptyMedia>
                        <EmptyTitle>No assignment snapshots found</EmptyTitle>
                        <EmptyDescription>
                          This transaction is linked to a subscription, but there are no assignment snapshots stored for
                          it.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <Empty className="border border-dashed border-border/60 bg-muted/10 p-8">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <ArchiveX />
                        </EmptyMedia>
                        <EmptyTitle>No linked assignment history</EmptyTitle>
                        <EmptyDescription>
                          This transaction does not have a linked subscription, so there is no assignment history to
                          display.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

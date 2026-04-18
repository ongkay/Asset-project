"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { Link2, ShieldCheck, ShieldOff, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { getAvatarToneClass } from "@/lib/avatar";
import { getInitials } from "@/lib/utils";
import { updateUserProfileAction } from "@/modules/users/actions";
import { adminEditUserProfileSchema, type AdminEditUserProfileValues } from "@/modules/users/schemas";

import {
  getAdminUsersActionMessage,
  isAdminUsersTableQueryKey,
  shouldAllowAdminUsersDialogOpenChange,
} from "../users-action-feedback";
import { ADMIN_USERS_QUERY_KEY, fetchAdminUserDetail, getAdminUserDetailQueryKey } from "../users-query";
import type { AdminUsersDialogState } from "../users-dialog-state";
import {
  canEditUserDetailForm,
  DEFAULT_USER_DETAIL_FORM_VALUES,
  resolveUserDetailFormResetValues,
} from "./user-detail-form-state";

type UserDetailDialogProps = {
  dialogState: AdminUsersDialogState;
  onOpenChange: (open: boolean) => void;
};

export function UserDetailDialog({ dialogState, onOpenChange }: UserDetailDialogProps) {
  const queryClient = useQueryClient();
  const updateProfileMutation = useAction(updateUserProfileAction);
  const [isRefreshingAfterSave, setIsRefreshingAfterSave] = useState(false);
  const isOpen = dialogState.open && dialogState.mode === "detail";
  const isEditMode = isOpen && dialogState.view === "edit";
  const userId = isOpen ? dialogState.userId : null;
  const isDetailDialogBusy = updateProfileMutation.isPending || isRefreshingAfterSave;

  const detailQuery = useQuery({
    queryKey: userId ? getAdminUserDetailQueryKey(userId) : [...ADMIN_USERS_QUERY_KEY, "detail", "closed"],
    queryFn: () => fetchAdminUserDetail(userId ?? ""),
    enabled: Boolean(userId),
  });

  const form = useForm<AdminEditUserProfileValues>({
    defaultValues: DEFAULT_USER_DETAIL_FORM_VALUES,
    resolver: zodResolver(adminEditUserProfileSchema),
  });
  const handleSubmitDetailForm = form.handleSubmit(onSubmitEditUser);

  function handleOpenChange(nextOpen: boolean) {
    if (!shouldAllowAdminUsersDialogOpenChange(nextOpen, isDetailDialogBusy)) {
      return;
    }

    onOpenChange(nextOpen);
  }

  useEffect(() => {
    const nextResetValues = resolveUserDetailFormResetValues({
      isDirty: form.formState.isDirty,
      isEditMode,
      isOpen,
      profile: detailQuery.data?.profile ?? null,
      userId,
    });

    if (nextResetValues) {
      form.reset(nextResetValues);
    }
  }, [detailQuery.data, form, form.formState.isDirty, isEditMode, isOpen, userId]);

  async function onSubmitEditUser(values: AdminEditUserProfileValues) {
    if (!detail) {
      return;
    }

    const result = await updateProfileMutation.executeAsync(values);
    const usernameError = result.validationErrors?.fieldErrors?.username?.[0];
    const avatarUrlError = result.validationErrors?.fieldErrors?.avatarUrl?.[0];

    if (usernameError) {
      form.setError("username", { message: usernameError, type: "server" });
    }

    if (avatarUrlError) {
      form.setError("avatarUrl", { message: avatarUrlError, type: "server" });
    }

    if (usernameError || avatarUrlError) {
      return;
    }

    if (!result.data?.ok) {
      if (result.data?.message?.toLowerCase().includes("username")) {
        form.setError("username", {
          message: result.data.message,
          type: "server",
        });
        return;
      }

      toast.error(getAdminUsersActionMessage(result ?? {}) ?? "Failed to update user profile.");
      return;
    }

    toast.success("User profile updated.");
    setIsRefreshingAfterSave(true);

    if (!userId) {
      setIsRefreshingAfterSave(false);
      handleOpenChange(false);
      return;
    }

    try {
      await queryClient.invalidateQueries({ queryKey: getAdminUserDetailQueryKey(userId) });
      const refreshedDetail = await queryClient.fetchQuery({
        queryKey: getAdminUserDetailQueryKey(userId),
        queryFn: () => fetchAdminUserDetail(userId),
      });

      form.reset({
        avatarUrl: refreshedDetail.profile.avatarUrl,
        userId: refreshedDetail.profile.userId,
        username: refreshedDetail.profile.username,
      });
    } catch {
      toast.error("User profile was updated, but the refreshed detail could not be loaded.");
    } finally {
      await queryClient.invalidateQueries({ predicate: (query) => isAdminUsersTableQueryKey(query.queryKey) });
      setIsRefreshingAfterSave(false);
    }
  }

  const detail = detailQuery.data ?? null;
  const profile = detail?.profile ?? null;
  const isFormEditable = canEditUserDetailForm({
    hasDetail: Boolean(detail),
    isDetailDialogBusy,
    isEditMode,
  });
  const initials = getInitials(profile?.username ?? "user");
  const avatarPreviewUrl = form.watch("avatarUrl") ?? undefined;
  const avatarPreviewName = form.watch("username") || profile?.username || "user";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] overflow-y-auto border-border/70 p-0 sm:max-w-5xl">
        <div className="border-b border-border/60 px-4 py-4 sm:px-6 sm:py-5">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit User" : "User Details"}</DialogTitle>
            <DialogDescription>
              Review the profile, subscription, active assets, and recent account activity for this user.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form
          className="space-y-5 px-4 py-4 sm:px-6 sm:py-5"
          noValidate
          onSubmit={(event) => {
            if (!isEditMode || !detail) {
              event.preventDefault();
              return;
            }

            void handleSubmitDetailForm(event);
          }}
        >
          {detailQuery.isLoading && !detail ? (
            <p className="text-muted-foreground text-sm">Loading user detail...</p>
          ) : null}

          {!detailQuery.isLoading && detailQuery.error instanceof Error ? (
            <p className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-destructive text-sm">
              {detailQuery.error.message}
            </p>
          ) : null}

          {!detailQuery.isLoading && !detailQuery.error && !detail ? (
            <p className="text-muted-foreground text-sm">User detail is not available.</p>
          ) : null}

          {detail ? (
            <>
              <Card className="border-border/60 bg-linear-to-br from-card via-card to-primary/5 shadow-xs">
                <CardContent className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <Avatar className="size-14 rounded-full sm:size-16">
                        {avatarPreviewUrl ? <AvatarImage alt={avatarPreviewName} src={avatarPreviewUrl} /> : null}
                        <AvatarFallback
                          className={`${avatarPreviewUrl ? "" : getAvatarToneClass(profile?.userId ?? "user")} rounded-full`}
                        >
                          {getInitials(avatarPreviewName) || initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-[11px] uppercase tracking-[0.18em] sm:text-xs sm:tracking-[0.22em]">
                            {profile?.isBanned ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
                            User Profile
                          </div>
                          <h3 className="font-semibold text-lg tracking-tight sm:text-xl">{profile?.username}</h3>
                          <p className="text-muted-foreground text-sm">{profile?.email}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={profile?.role === "admin" ? "outline" : "secondary"}>{profile?.role}</Badge>
                          <Badge variant={profile?.isBanned ? "destructive" : "secondary"}>
                            {profile?.isBanned ? "Banned" : "Active"}
                          </Badge>
                          <Badge variant="outline">{profile?.publicId}</Badge>
                        </div>
                      </div>
                    </div>
                    {detailQuery.isFetching ? <Badge variant="outline">Refreshing</Badge> : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryItem label="User ID" monospace value={profile?.userId ?? "-"} />
                    <SummaryItem label="Created At" value={formatDateTime(profile?.createdAt ?? null)} />
                    <SummaryItem label="Updated At" value={formatDateTime(profile?.updatedAt ?? null)} />
                    <SummaryItem label="Ban Reason" value={profile?.banReason ?? "-"} />
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="space-y-1.5 p-4 sm:p-6">
                    <CardTitle className="text-base">Profile Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                    <FieldGroup className="gap-4">
                      <Field data-invalid={form.formState.errors.username ? true : undefined}>
                        <FieldLabel htmlFor="user-detail-username">Username</FieldLabel>
                        <InputGroup>
                          <InputGroupAddon>
                            <User />
                          </InputGroupAddon>
                          <InputGroupInput
                            {...form.register("username")}
                            aria-invalid={form.formState.errors.username ? true : undefined}
                            disabled={!isFormEditable}
                            id="user-detail-username"
                            readOnly={!isFormEditable}
                          />
                        </InputGroup>
                        {isEditMode ? (
                          <FieldDescription>Lowercase letters, numbers, and hyphens only.</FieldDescription>
                        ) : null}
                        <FieldError errors={[form.formState.errors.username]} />
                      </Field>

                      <Field data-invalid={form.formState.errors.avatarUrl ? true : undefined}>
                        <div className="flex items-center justify-between gap-3">
                          <FieldLabel htmlFor="user-detail-avatar-url">Avatar URL</FieldLabel>
                          {isEditMode ? (
                            <Button
                              disabled={!isFormEditable}
                              onClick={() => {
                                form.setValue("avatarUrl", null, { shouldDirty: true, shouldValidate: true });
                              }}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              Clear Avatar
                            </Button>
                          ) : null}
                        </div>
                        <InputGroup>
                          <InputGroupAddon>
                            <Link2 />
                          </InputGroupAddon>
                          <InputGroupInput
                            aria-invalid={form.formState.errors.avatarUrl ? true : undefined}
                            disabled={!isFormEditable}
                            id="user-detail-avatar-url"
                            placeholder="https://example.com/avatar.png"
                            readOnly={!isFormEditable}
                            value={form.watch("avatarUrl") ?? ""}
                            onChange={(event) => {
                              form.setValue("avatarUrl", event.target.value, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                            }}
                          />
                        </InputGroup>
                        <FieldDescription>
                          {isEditMode ? "Leave blank to remove the current avatar." : "Read-only in details mode."}
                        </FieldDescription>
                        <FieldError errors={[form.formState.errors.avatarUrl]} />
                      </Field>

                      <ReadonlySummaryField label="Email" value={profile?.email ?? "-"} />
                      <ReadonlySummaryField label="Role" value={profile?.role ?? "-"} />
                      <ReadonlySummaryField label="Public ID" monospace value={profile?.publicId ?? "-"} />
                    </FieldGroup>
                  </CardContent>
                </Card>

                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="space-y-1.5 p-4 sm:p-6">
                    <CardTitle className="text-base">Active Subscription</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 p-4 pt-0 sm:p-6 sm:pt-0">
                    <SummaryItem
                      label="Package"
                      value={detail.currentSubscription.packageName ?? "No active subscription"}
                    />
                    <SummaryItem label="Package Summary" value={detail.currentSubscription.packageSummary} />
                    <SummaryItem label="Status" value={detail.currentSubscription.status ?? "-"} />
                    <SummaryItem label="Start At" value={formatDateTime(detail.currentSubscription.startAt)} />
                    <SummaryItem label="End At" value={formatDateTime(detail.currentSubscription.endAt)} />
                  </CardContent>
                </Card>
              </div>

              <SectionCard description="Current active access rows assigned to this user." title="Active Assets">
                {detail.activeAssets.length ? (
                  <div className="grid gap-3">
                    {detail.activeAssets.map((asset) => (
                      <div
                        className="rounded-xl border border-border/70 bg-muted/20 p-3"
                        key={`${asset.subscriptionId}:${asset.assetId}`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{asset.accessKey}</Badge>
                          <Badge variant="outline">{asset.platform}</Badge>
                          <Badge variant="outline">{asset.assetType}</Badge>
                          <Badge variant="secondary">{asset.subscriptionStatus}</Badge>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          <SummaryItem label="Asset ID" monospace value={asset.assetId} />
                          <SummaryItem label="Note" value={asset.note ?? "-"} />
                          <SummaryItem label="Expires At" value={formatDateTime(asset.expiresAt)} />
                          <SummaryItem label="Subscription Ends" value={formatDateTime(asset.subscriptionEndAt)} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptySectionMessage message="No active assets." />
                )}
              </SectionCard>

              <div className="grid gap-4 xl:grid-cols-3">
                <HistoryCard description="Recent payment and activation history." title="Transactions">
                  {detail.transactions.length ? (
                    detail.transactions.map((transaction) => (
                      <HistoryRow
                        key={transaction.transactionId}
                        primary={`${transaction.packageName} · Rp${transaction.amountRp.toLocaleString("id-ID")}`}
                        secondary={`${transaction.source} · ${transaction.status}`}
                        tertiary={`Created ${formatDateTime(transaction.createdAt)}${transaction.paidAt ? ` · Paid ${formatDateTime(transaction.paidAt)}` : ""}`}
                      />
                    ))
                  ) : (
                    <EmptySectionMessage message="No transactions." />
                  )}
                </HistoryCard>

                <HistoryCard description="Recent sign-in outcomes for this account." title="Login Logs">
                  {detail.loginLogs.length ? (
                    detail.loginLogs.map((loginLog) => (
                      <HistoryRow
                        key={loginLog.loginLogId}
                        primary={`${loginLog.email} · ${loginLog.isSuccess ? "Success" : "Failed"}`}
                        secondary={`${loginLog.ipAddress} · ${loginLog.browser ?? "Unknown browser"} · ${loginLog.os ?? "Unknown OS"}`}
                        tertiary={`${formatDateTime(loginLog.createdAt)}${loginLog.failureReason ? ` · ${loginLog.failureReason}` : ""}`}
                      />
                    ))
                  ) : (
                    <EmptySectionMessage message="No login logs." />
                  )}
                </HistoryCard>

                <HistoryCard description="Tracked extension activity for this user." title="Extension Tracks">
                  {detail.extensionTracks.length ? (
                    detail.extensionTracks.map((track) => (
                      <HistoryRow
                        key={track.extensionTrackId}
                        primary={`${track.extensionId} · ${track.extensionVersion}`}
                        secondary={`${track.deviceId} · ${track.ipAddress}`}
                        tertiary={`${track.city ?? "Unknown city"}, ${track.country ?? "Unknown country"} · First ${formatDateTime(track.firstSeenAt)} · Last ${formatDateTime(track.lastSeenAt)}`}
                      />
                    ))
                  ) : (
                    <EmptySectionMessage message="No extension tracks." />
                  )}
                </HistoryCard>
              </div>
            </>
          ) : null}

          <DialogFooter className="border-t border-border/60 px-0 pt-4">
            <Button
              disabled={isDetailDialogBusy}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Close
            </Button>
            {isEditMode ? (
              <Button disabled={isDetailDialogBusy || !detail} type="submit">
                Save Changes
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionCard({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="space-y-1.5 p-4 sm:p-6">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">{children}</CardContent>
    </Card>
  );
}

function HistoryCard({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <SectionCard description={description} title={title}>
      {children}
    </SectionCard>
  );
}

function HistoryRow({ primary, secondary, tertiary }: { primary: string; secondary: string; tertiary: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
      <p className="font-medium text-sm">{primary}</p>
      <p className="mt-1 text-muted-foreground text-xs">{secondary}</p>
      <p className="mt-2 text-muted-foreground text-xs">{tertiary}</p>
    </div>
  );
}

function SummaryItem({ label, monospace, value }: { label: string; monospace?: boolean; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
      <p className="text-muted-foreground text-[11px] uppercase tracking-[0.12em] sm:text-xs sm:tracking-[0.16em]">
        {label}
      </p>
      <p className={monospace ? "mt-1 break-all font-mono text-xs" : "mt-1 text-sm"}>{value}</p>
    </div>
  );
}

function ReadonlySummaryField({ label, monospace, value }: { label: string; monospace?: boolean; value: string }) {
  return (
    <div className="grid gap-1">
      <p className="font-medium text-sm">{label}</p>
      <p
        className={
          monospace
            ? "break-all rounded-md border border-border/70 bg-muted/20 px-3 py-2 font-mono text-xs"
            : "rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm"
        }
      >
        {value}
      </p>
    </div>
  );
}

function EmptySectionMessage({ message }: { message: string }) {
  return <p className="text-muted-foreground text-sm">{message}</p>;
}

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

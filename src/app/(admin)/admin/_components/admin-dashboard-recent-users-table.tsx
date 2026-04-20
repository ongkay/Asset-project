"use client";

import { useState } from "react";

import { formatDistanceStrict } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAvatarToneClass } from "@/lib/avatar";
import { getInitials } from "@/lib/utils";

import type { AdminDashboardRecentUserRow } from "@/modules/admin/dashboard/types";

export function formatAdminDashboardRecentUserAbsoluteDateTime(value: string, timeZone = "UTC") {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    year: "2-digit",
  });

  const parts = formatter.formatToParts(new Date(value));
  const partValueByType = new Map(parts.map((part) => [part.type, part.value]));

  return `${partValueByType.get("day")}/${partValueByType.get("month")}/${partValueByType.get("year")} ${partValueByType.get("hour")}:${partValueByType.get("minute")}`;
}

export function resolveAdminDashboardRecentUserRelativeLabel(value: string, now: Date) {
  return formatDistanceStrict(new Date(value), now, {
    addSuffix: true,
    locale: indonesiaLocale,
  });
}

export const ADMIN_DASHBOARD_RECENT_USERS_PAGE_SIZE = 6;

export function paginateAdminDashboardRecentUsers(users: AdminDashboardRecentUserRow[], page: number) {
  const pageCount = Math.max(1, Math.ceil(users.length / ADMIN_DASHBOARD_RECENT_USERS_PAGE_SIZE));
  const resolvedPage = Math.min(Math.max(page, 1), pageCount);
  const pageStart = (resolvedPage - 1) * ADMIN_DASHBOARD_RECENT_USERS_PAGE_SIZE;

  return {
    page: resolvedPage,
    pageCount,
    users: users.slice(pageStart, pageStart + ADMIN_DASHBOARD_RECENT_USERS_PAGE_SIZE),
  };
}

type AdminDashboardRecentUsersTableProps = {
  users: AdminDashboardRecentUserRow[];
};

export function AdminDashboardRecentUsersTable({ users }: AdminDashboardRecentUsersTableProps) {
  const [page, setPage] = useState(1);
  const paginatedUsers = paginateAdminDashboardRecentUsers(users, page);
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader>
        <CardTitle>Recent Users</CardTitle>
        <CardDescription>50 member terbaru berdasarkan aktivitas terakhir yang tercatat.</CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-muted-foreground text-sm">Belum ada aktivitas user yang bisa ditampilkan.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="min-w-56">User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Paket Aktif</TableHead>
                  <TableHead className="min-w-36">Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.users.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar size="lg">
                          <AvatarImage alt={user.username} src={user.avatarUrl ?? undefined} />
                          <AvatarFallback className={getAvatarToneClass(user.userId)}>
                            {getInitials(user.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <p className="truncate font-medium">{user.username}</p>
                          <p className="truncate text-muted-foreground text-xs">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell>{user.activePackageName ?? "Belum ada"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span suppressHydrationWarning>
                          {formatAdminDashboardRecentUserAbsoluteDateTime(user.lastSeenAt, localTimeZone)}
                        </span>
                        <span suppressHydrationWarning className="text-muted-foreground text-xs">
                          {resolveAdminDashboardRecentUserRelativeLabel(user.lastSeenAt, new Date())}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {paginatedUsers.pageCount > 1 ? (
              <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                <Button
                  disabled={paginatedUsers.page === 1}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setPage((currentPage) => currentPage - 1)}
                >
                  Previous
                </Button>
                <p className="text-muted-foreground text-sm">
                  Page {paginatedUsers.page} of {paginatedUsers.pageCount}
                </p>
                <Button
                  disabled={paginatedUsers.page === paginatedUsers.pageCount}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setPage((currentPage) => currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

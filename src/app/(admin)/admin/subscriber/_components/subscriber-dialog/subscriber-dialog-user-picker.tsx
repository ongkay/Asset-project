"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { AdminTableSearchInput } from "@/components/shared/table-filters/search-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { getAvatarToneClass } from "@/lib/avatar";
import { getInitials } from "@/lib/utils";

import { fetchSubscriberUsers, getSubscriberUsersQueryKey } from "../subscriber-query";

import type { SubscriberUserOption } from "@/modules/admin/subscriptions/types";

type SubscriberDialogUserPickerProps = {
  disabled?: boolean;
  selectedUser: SubscriberUserOption | null;
  onSelectUser: (user: SubscriberUserOption) => void;
};

export function SubscriberDialogUserPicker({
  disabled = false,
  selectedUser,
  onSelectUser,
}: SubscriberDialogUserPickerProps) {
  const [searchInput, setSearchInput] = useState(selectedUser ? `${selectedUser.username} ${selectedUser.email}` : "");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const userSearchQuery = useQuery({
    queryKey: getSubscriberUsersQueryKey(searchQuery, 1, 10),
    queryFn: () => fetchSubscriberUsers({ query: searchQuery, page: 1, pageSize: 10 }),
    enabled: !disabled && searchQuery.length > 0,
  });

  return (
    <FieldGroup className="gap-4">
      <Field>
        <FieldLabel htmlFor="subscriber-user-search">Member User</FieldLabel>
        <AdminTableSearchInput
          ariaLabel="Search member users"
          className="w-full"
          onChange={setSearchInput}
          placeholder="Search member by user ID, username, or email..."
          value={searchInput}
        />
        <FieldDescription>Admin subscriptions can only be assigned to member accounts.</FieldDescription>
      </Field>

      {selectedUser ? (
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <Avatar className="size-10 rounded-full">
            <AvatarImage src={selectedUser.avatarUrl ?? undefined} alt={selectedUser.username} />
            <AvatarFallback
              className={`${selectedUser.avatarUrl ? "" : getAvatarToneClass(selectedUser.userId)} rounded-full`}
            >
              {getInitials(selectedUser.username)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">{selectedUser.username}</p>
            <p className="truncate text-muted-foreground text-xs">{selectedUser.email}</p>
            <p className="truncate text-muted-foreground text-xs">{selectedUser.userId}</p>
          </div>
          {disabled ? null : (
            <Button onClick={() => setSearchInput("")} size="sm" type="button" variant="outline">
              Change
            </Button>
          )}
        </div>
      ) : null}

      {!disabled && searchQuery.length > 0 ? (
        userSearchQuery.data?.users.length ? (
          <div className="grid gap-2">
            {userSearchQuery.data.users.map((user) => (
              <button
                className="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                key={user.userId}
                onClick={() => onSelectUser(user)}
                type="button"
              >
                <Avatar className="size-9 rounded-full">
                  <AvatarImage src={user.avatarUrl ?? undefined} alt={user.username} />
                  <AvatarFallback className={`${user.avatarUrl ? "" : getAvatarToneClass(user.userId)} rounded-full`}>
                    {getInitials(user.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{user.username}</p>
                  <p className="truncate text-muted-foreground text-xs">{user.email}</p>
                  <p className="truncate text-muted-foreground text-xs">{user.userId}</p>
                </div>
              </button>
            ))}
          </div>
        ) : userSearchQuery.isLoading ? null : (
          <Empty className="min-h-0 p-6">
            <EmptyHeader>
              <EmptyTitle>No member found</EmptyTitle>
              <EmptyDescription>Try another user ID, username, or email.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )
      ) : null}
    </FieldGroup>
  );
}

import { describe, expect, it } from "vitest";

import {
  closeAdminUsersDialogState,
  openAdminUsersCreateDialogState,
  openAdminUsersDetailDialogState,
  openAdminUsersPasswordDialogState,
  openAdminUsersToggleBanDialogState,
} from "@/app/(admin)/admin/users/_components/users-dialog-state";

describe("app/admin/users/users-dialog-state", () => {
  it("opens the shared detail dialog in view or edit mode", () => {
    expect(openAdminUsersDetailDialogState("user-1", "view")).toEqual({
      mode: "detail",
      open: true,
      userId: "user-1",
      view: "view",
    });

    expect(openAdminUsersDetailDialogState("user-1", "edit")).toEqual({
      mode: "detail",
      open: true,
      userId: "user-1",
      view: "edit",
    });
  });

  it("captures the row context needed by the ban dialog", () => {
    expect(openAdminUsersToggleBanDialogState({ isBanned: true, userId: "user-2", username: "alice" })).toEqual({
      currentIsBanned: true,
      mode: "toggle-ban",
      open: true,
      userId: "user-2",
      username: "alice",
    });
  });

  it("returns stable state objects for create, password, and close actions", () => {
    expect(openAdminUsersCreateDialogState()).toEqual({
      mode: "create",
      open: true,
    });

    expect(openAdminUsersPasswordDialogState("user-3")).toEqual({
      mode: "change-password",
      open: true,
      userId: "user-3",
    });

    expect(closeAdminUsersDialogState()).toEqual({
      mode: null,
      open: false,
    });
  });
});

import { describe, expect, it } from "vitest";

import {
  getAdminUsersActionFieldErrorMessage,
  getAdminUsersActionMessage,
  isAdminUsersTableQueryKey,
  shouldAllowAdminUsersDialogOpenChange,
} from "@/app/(admin)/admin/users/_components/users-action-feedback";

describe("admin/users/users-query phase 5 helpers", () => {
  it("prefers field-level validation errors for inline form feedback", () => {
    expect(
      getAdminUsersActionFieldErrorMessage(
        {
          data: {
            message: "Failed to update user profile.",
          },
          validationErrors: {
            fieldErrors: {
              username: ["Username is already taken."],
            },
            formErrors: ["Profile update failed."],
          },
        },
        "username",
      ),
    ).toBe("Username is already taken.");
  });

  it("falls back to the best available top-level action message", () => {
    expect(
      getAdminUsersActionFieldErrorMessage(
        {
          serverError: "Server rejected the request.",
        },
        "password",
      ),
    ).toBe("Server rejected the request.");

    expect(
      getAdminUsersActionMessage({
        serverError: "Server rejected the request.",
      }),
    ).toBe("Server rejected the request.");
  });

  it("blocks dialog close requests while a mutation is pending", () => {
    expect(shouldAllowAdminUsersDialogOpenChange(false, true)).toBe(false);
    expect(shouldAllowAdminUsersDialogOpenChange(false, false)).toBe(true);
    expect(shouldAllowAdminUsersDialogOpenChange(true, true)).toBe(true);
  });

  it("matches table query keys without matching the detail namespace", () => {
    expect(isAdminUsersTableQueryKey(["admin-users", { page: 1, pageSize: 10 }])).toBe(true);
    expect(isAdminUsersTableQueryKey(["admin-users", "detail", "user-1"])).toBe(false);
  });
});

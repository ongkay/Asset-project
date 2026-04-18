import { describe, expect, it } from "vitest";

import {
  canEditUserDetailForm,
  DEFAULT_USER_DETAIL_FORM_VALUES,
  resolveUserDetailFormResetValues,
} from "@/app/(admin)/admin/users/_components/user-detail-dialog/user-detail-form-state";

describe("app/admin/users/user-detail-dialog", () => {
  it("keeps unsaved edit values when the same user refetches during edit mode", () => {
    expect(
      resolveUserDetailFormResetValues({
        isDirty: true,
        isEditMode: true,
        isOpen: true,
        profile: {
          avatarUrl: "https://example.com/server-avatar.png",
          userId: "user-1",
          username: "server-username",
        },
        userId: "user-1",
      }),
    ).toBeNull();
  });

  it("hydrates the fetched profile when the dialog is open and not preserving dirty edits", () => {
    expect(
      resolveUserDetailFormResetValues({
        isDirty: false,
        isEditMode: true,
        isOpen: true,
        profile: {
          avatarUrl: "https://example.com/server-avatar.png",
          userId: "user-1",
          username: "server-username",
        },
        userId: "user-1",
      }),
    ).toEqual({
      avatarUrl: "https://example.com/server-avatar.png",
      userId: "user-1",
      username: "server-username",
    });
  });

  it("resets to defaults when the dialog closes", () => {
    expect(
      resolveUserDetailFormResetValues({
        isDirty: true,
        isEditMode: true,
        isOpen: false,
        profile: null,
        userId: null,
      }),
    ).toEqual(DEFAULT_USER_DETAIL_FORM_VALUES);
  });

  it("keeps the edit form non-interactive until detail data is loaded", () => {
    expect(
      canEditUserDetailForm({
        hasDetail: false,
        isDetailDialogBusy: false,
        isEditMode: true,
      }),
    ).toBe(false);

    expect(
      canEditUserDetailForm({
        hasDetail: true,
        isDetailDialogBusy: false,
        isEditMode: true,
      }),
    ).toBe(true);
  });
});

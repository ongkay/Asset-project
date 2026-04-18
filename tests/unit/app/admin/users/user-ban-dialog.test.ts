import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: async () => undefined,
  }),
}));

vi.mock("next-safe-action/hooks", () => ({
  useAction: () => ({
    executeAsync: async () => ({ data: { ok: true } }),
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: () => undefined,
    success: () => undefined,
  },
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: () => null,
  AlertDialogAction: () => null,
  AlertDialogCancel: () => null,
  AlertDialogContent: () => null,
  AlertDialogDescription: () => null,
  AlertDialogFooter: () => null,
  AlertDialogHeader: () => null,
  AlertDialogTitle: () => null,
}));

vi.mock("@/modules/users/actions", () => ({
  toggleUserBanAction: vi.fn(),
}));

vi.mock("@/app/(admin)/admin/users/_components/users-query", () => ({
  ADMIN_USERS_QUERY_KEY: ["admin-users"],
  getAdminUserDetailQueryKey: () => ["admin-users", "detail", "user-id"],
}));

import { isSelfBanAttempt } from "@/app/(admin)/admin/users/_components/user-ban-dialog/user-ban-dialog";

describe("app/admin/users/user-ban-dialog", () => {
  it("blocks self-ban before the request is submitted", () => {
    expect(isSelfBanAttempt("admin-user-1", "admin-user-1", true)).toBe(true);
    expect(isSelfBanAttempt("admin-user-1", "member-user-1", true)).toBe(false);
    expect(isSelfBanAttempt("admin-user-1", "admin-user-1", false)).toBe(false);
  });
});

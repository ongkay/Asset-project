import { describe, expect, it } from "vitest";

import { userChangePasswordFormSchema } from "@/app/(admin)/admin/users/_components/user-change-password-dialog/user-change-password-form-schema";

describe("app/admin/users/user-change-password-form-schema", () => {
  it("validates password confirmation without requiring userId", () => {
    expect(
      userChangePasswordFormSchema.parse({
        confirmPassword: "Devpass123",
        newPassword: "Devpass123",
      }),
    ).toEqual({
      confirmPassword: "Devpass123",
      newPassword: "Devpass123",
    });
  });
});

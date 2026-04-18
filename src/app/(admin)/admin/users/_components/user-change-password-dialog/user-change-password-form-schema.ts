import { z } from "zod";

import { authPasswordSchema } from "@/modules/auth/schemas";

export const userChangePasswordFormSchema = z
  .object({
    confirmPassword: authPasswordSchema,
    newPassword: authPasswordSchema,
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Password confirmation must match.",
    path: ["confirmPassword"],
  });

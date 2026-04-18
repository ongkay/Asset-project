import { z } from "zod";

import { authEmailSchema, authPasswordSchema, authUserIdSchema } from "@/modules/auth/schemas";

const userRoleSchema = z.enum(["admin", "member"], {
  error: "Role is invalid.",
});

export const usernameSchema = z
  .string()
  .trim()
  .min(1, "Username is required.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Username may only use lowercase letters, numbers, and single hyphens.");

const avatarUrlSchema = z
  .union([z.string().trim(), z.null()])
  .transform((value) => {
    if (value === null) {
      return null;
    }

    return value.length > 0 ? value : null;
  })
  .pipe(z.url("Avatar URL must be valid.").nullable());

export const adminCreateUserSchema = z
  .object({
    email: authEmailSchema,
    password: authPasswordSchema,
    confirmPassword: authPasswordSchema,
    role: userRoleSchema,
  })
  .strict()
  .refine((value) => value.password === value.confirmPassword, {
    message: "Password confirmation must match.",
    path: ["confirmPassword"],
  });

export const adminEditUserProfileSchema = z
  .object({
    userId: authUserIdSchema,
    username: usernameSchema,
    avatarUrl: avatarUrlSchema,
  })
  .strict();

export const adminToggleUserBanSchema = z
  .object({
    userId: authUserIdSchema,
    nextIsBanned: z.boolean(),
    banReason: z.string().trim().min(1).nullable().optional().default(null),
  })
  .strict();

export const adminCreateUserServiceInputSchema = z
  .object({
    actingAdminUserId: authUserIdSchema,
    email: authEmailSchema,
    password: authPasswordSchema,
    role: userRoleSchema,
  })
  .strict();

export const adminEditUserProfileServiceInputSchema = adminEditUserProfileSchema
  .extend({
    actingAdminUserId: authUserIdSchema,
  })
  .strict();

export const adminToggleUserBanServiceInputSchema = adminToggleUserBanSchema
  .extend({
    actingAdminUserId: authUserIdSchema,
  })
  .strict();

export type AdminCreateUserValues = z.infer<typeof adminCreateUserSchema>;
export type AdminEditUserProfileValues = z.infer<typeof adminEditUserProfileSchema>;
export type AdminToggleUserBanInput = z.infer<typeof adminToggleUserBanSchema>;
export type AdminCreateUserServiceInput = z.infer<typeof adminCreateUserServiceInputSchema>;
export type AdminEditUserProfileServiceInput = z.infer<typeof adminEditUserProfileServiceInputSchema>;
export type AdminToggleUserBanServiceInput = z.infer<typeof adminToggleUserBanServiceInputSchema>;

import { z } from "zod";

export const authEmailSchema = z.email("Email address must be valid.");

export const authPasswordSchema = z.string().min(6, "Password must be at least 6 characters.");

export const signInInputSchema = z.object({
  email: authEmailSchema,
  password: authPasswordSchema,
});

export const signUpInputSchema = z
  .object({
    email: authEmailSchema,
    password: authPasswordSchema,
    confirmPassword: authPasswordSchema,
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Password confirmation must match.",
    path: ["confirmPassword"],
  });

export const sendResetPasswordInputSchema = z.object({
  email: authEmailSchema,
  redirectTo: z.url().optional(),
});

export const exchangeResetPasswordInputSchema = z.object({
  code: z.string().trim().min(1, "Reset code is required."),
  email: authEmailSchema,
});

export const resetPasswordInputSchema = z.object({
  otp: z.string().trim().min(1, "Reset token is required."),
  password: authPasswordSchema,
});

export const authUserIdSchema = z.uuid("User ID must be a valid UUID.");

export const authRequestMetadataSchema = z.object({
  browser: z.string().trim().min(1).nullable().default(null),
  ipAddress: z.string().trim().min(1, "IP address is required."),
  os: z.string().trim().min(1).nullable().default(null),
});

export const loginLogWriteInputSchema = z.object({
  browser: z.string().trim().min(1).nullable(),
  email: authEmailSchema,
  failureReason: z.string().trim().min(1).nullable(),
  ipAddress: z.string().trim().min(1, "IP address is required."),
  isSuccess: z.boolean(),
  os: z.string().trim().min(1).nullable(),
  userId: authUserIdSchema.nullable(),
});

export type SignInInput = z.infer<typeof signInInputSchema>;
export type SignUpInput = z.infer<typeof signUpInputSchema>;
export type SendResetPasswordInput = z.infer<typeof sendResetPasswordInputSchema>;
export type ExchangeResetPasswordInput = z.infer<typeof exchangeResetPasswordInputSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
export type AuthRequestMetadataInput = z.infer<typeof authRequestMetadataSchema>;
export type LoginLogWriteInputSchema = z.infer<typeof loginLogWriteInputSchema>;

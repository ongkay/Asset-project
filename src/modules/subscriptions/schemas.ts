import { z } from "zod";

export const accessKeySchema = z
  .string()
  .trim()
  .regex(/^(tradingview|fxreplay|fxtester):(private|share)$/i, "Access key must match platform:asset_type.");

export const packageActivationSnapshotSchema = z.object({
  accessKeys: z.array(accessKeySchema).min(1, "Package must contain at least one access key."),
  amountRp: z.number().int().nonnegative(),
  durationDays: z.number().int().positive(),
  id: z.uuid(),
  isActive: z.boolean(),
  isExtended: z.boolean(),
  name: z.string().trim().min(1),
});

export const activateSubscriptionInputSchema = z
  .object({
    activatedAt: z.date().optional(),
    amountOverrideRp: z.number().int().nonnegative().optional(),
    cancelReason: z.string().trim().min(1).max(120).optional(),
    cdKeyCode: z.string().trim().min(1).optional(),
    packageId: z.uuid().optional(),
    source: z.enum(["payment_dummy", "cdkey", "admin_manual"]),
    userId: z.uuid(),
  })
  .superRefine((value, context) => {
    if (value.source === "cdkey" && !value.cdKeyCode) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CD-Key source requires cdKeyCode.",
        path: ["cdKeyCode"],
      });
    }

    if (value.source !== "cdkey" && !value.packageId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Package source requires packageId.",
        path: ["packageId"],
      });
    }
  });

export type ActivateSubscriptionInput = z.infer<typeof activateSubscriptionInputSchema>;
export type PackageActivationSnapshotInput = z.infer<typeof packageActivationSnapshotSchema>;

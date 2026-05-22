"use server";

import { adminActionClient } from "@/modules/auth/action-client";
import { updateVoucherSchema, voucherFormSchema, voucherToggleSchema } from "@/modules/vouchers/schemas";
import { createVoucher, toggleVoucherActive, updateVoucher } from "@/modules/vouchers/services";

import { getVoucherTablePage } from "./queries";
import { voucherTableFilterSchema } from "./schemas";

const VOUCHER_TABLE_LOAD_FAILED_MESSAGE = "Failed to load voucher table.";

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Voucher action failed.";
}

export const getVoucherTablePageAction = adminActionClient
  .metadata({ actionName: "admin.vouchers.get-table-page" })
  .inputSchema(voucherTableFilterSchema)
  .action(async ({ parsedInput }) => {
    try {
      const tablePage = await getVoucherTablePage(parsedInput);

      return {
        ok: true as const,
        tablePage,
      };
    } catch (error) {
      return {
        message: error instanceof Error ? error.message : VOUCHER_TABLE_LOAD_FAILED_MESSAGE,
        ok: false as const,
      };
    }
  });

export const createVoucherAction = adminActionClient
  .metadata({ actionName: "admin.vouchers.create" })
  .inputSchema(voucherFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    try {
      const row = await createVoucher({
        ...parsedInput,
        createdBy: ctx.currentAppUser.profile.userId,
      });

      return {
        ok: true as const,
        row,
      };
    } catch (error) {
      return {
        message: getActionErrorMessage(error),
        ok: false as const,
      };
    }
  });

export const updateVoucherAction = adminActionClient
  .metadata({ actionName: "admin.vouchers.update" })
  .inputSchema(updateVoucherSchema)
  .action(async ({ parsedInput }) => {
    try {
      const row = await updateVoucher(parsedInput);

      return {
        ok: true as const,
        row,
      };
    } catch (error) {
      return {
        message: getActionErrorMessage(error),
        ok: false as const,
      };
    }
  });

export const toggleVoucherActiveAction = adminActionClient
  .metadata({ actionName: "admin.vouchers.toggle-active" })
  .inputSchema(voucherToggleSchema)
  .action(async ({ parsedInput }) => {
    try {
      const row = await toggleVoucherActive(parsedInput);

      return {
        ok: true as const,
        row,
      };
    } catch (error) {
      return {
        message: getActionErrorMessage(error),
        ok: false as const,
      };
    }
  });

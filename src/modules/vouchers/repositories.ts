import "server-only";

import { z } from "zod";

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";

import type {
  CreateVoucherInput,
  DiscountVoucherRow,
  UpdateVoucherInput,
  VoucherScopeType,
  VoucherToggleInput,
} from "./types";

const discountVoucherDatabaseRowSchema = z.object({
  code: z.string().min(1),
  created_at: z.string().min(1),
  created_by: z.guid(),
  discount_percent: z.number().int().min(1).max(100),
  expires_at: z.string().min(1).nullable(),
  id: z.guid(),
  is_active: z.boolean(),
  max_uses: z.number().int().positive().nullable(),
  package_id: z.guid().nullable(),
  scope_type: z.enum(["global", "package"]),
  updated_at: z.string().min(1),
  used_count: z.number().int().nonnegative(),
});

type DiscountVoucherDatabaseRow = z.infer<typeof discountVoucherDatabaseRowSchema>;

function mapDiscountVoucherRow(row: DiscountVoucherDatabaseRow): DiscountVoucherRow {
  return {
    code: row.code,
    createdAt: row.created_at,
    createdBy: row.created_by,
    discountPercent: row.discount_percent,
    expiresAt: row.expires_at,
    id: row.id,
    isActive: row.is_active,
    maxUses: row.max_uses,
    packageId: row.package_id,
    scopeType: row.scope_type,
    updatedAt: row.updated_at,
    usedCount: row.used_count,
  };
}

const DISCOUNT_VOUCHER_SELECT_FIELDS =
  "id, code, scope_type, package_id, discount_percent, max_uses, used_count, expires_at, is_active, created_by, created_at, updated_at";

export async function getDiscountVoucherByCode(code: string): Promise<DiscountVoucherRow | null> {
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database
    .from("discount_vouchers")
    .select(DISCOUNT_VOUCHER_SELECT_FIELDS)
    .eq("code", code)
    .maybeSingle<DiscountVoucherDatabaseRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapDiscountVoucherRow(discountVoucherDatabaseRowSchema.parse(data));
}

export async function getDiscountVoucherById(voucherId: string): Promise<DiscountVoucherRow | null> {
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database
    .from("discount_vouchers")
    .select(DISCOUNT_VOUCHER_SELECT_FIELDS)
    .eq("id", voucherId)
    .maybeSingle<DiscountVoucherDatabaseRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapDiscountVoucherRow(discountVoucherDatabaseRowSchema.parse(data));
}

export async function listDiscountVoucherRows(input: {
  scopeType: VoucherScopeType | null;
  search: string | null;
}): Promise<DiscountVoucherRow[]> {
  const database = createInsForgeAdminDatabase();
  let query = database
    .from("discount_vouchers")
    .select(DISCOUNT_VOUCHER_SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (input.search) {
    query = query.ilike("code", `%${input.search}%`);
  }

  if (input.scopeType) {
    query = query.eq("scope_type", input.scopeType);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return z
    .array(discountVoucherDatabaseRowSchema)
    .parse(data ?? [])
    .map(mapDiscountVoucherRow);
}

export async function createDiscountVoucherRow(input: CreateVoucherInput): Promise<DiscountVoucherRow> {
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database
    .from("discount_vouchers")
    .insert([
      {
        code: input.code,
        created_by: input.createdBy,
        discount_percent: input.discountPercent,
        expires_at: input.expiresAt,
        is_active: input.isActive,
        max_uses: input.maxUses,
        package_id: input.packageId,
        scope_type: input.scopeType,
      },
    ])
    .select(DISCOUNT_VOUCHER_SELECT_FIELDS)
    .single<DiscountVoucherDatabaseRow>();

  if (error) {
    throw error;
  }

  return mapDiscountVoucherRow(discountVoucherDatabaseRowSchema.parse(data));
}

export async function updateDiscountVoucherRow(input: UpdateVoucherInput): Promise<DiscountVoucherRow> {
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database
    .from("discount_vouchers")
    .update({
      code: input.code,
      discount_percent: input.discountPercent,
      expires_at: input.expiresAt,
      is_active: input.isActive,
      max_uses: input.maxUses,
      package_id: input.packageId,
      scope_type: input.scopeType,
    })
    .eq("id", input.id)
    .select(DISCOUNT_VOUCHER_SELECT_FIELDS)
    .single<DiscountVoucherDatabaseRow>();

  if (error) {
    throw error;
  }

  return mapDiscountVoucherRow(discountVoucherDatabaseRowSchema.parse(data));
}

export async function toggleDiscountVoucherActiveRow(input: VoucherToggleInput): Promise<DiscountVoucherRow> {
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database
    .from("discount_vouchers")
    .update({ is_active: input.isActive })
    .eq("id", input.id)
    .select(DISCOUNT_VOUCHER_SELECT_FIELDS)
    .single<DiscountVoucherDatabaseRow>();

  if (error) {
    throw error;
  }

  return mapDiscountVoucherRow(discountVoucherDatabaseRowSchema.parse(data));
}

export async function consumeDiscountVoucherUsage(voucherId: string): Promise<boolean> {
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database.rpc("consume_discount_voucher_usage", {
    p_voucher_id: voucherId,
  });

  if (error) {
    throw error;
  }

  return data === true;
}

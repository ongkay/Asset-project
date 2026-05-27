import "server-only";

import { z } from "zod";

import { env } from "@/config/env.server";

type PaymentProviderStatus = "pending" | "paid" | "failed" | "canceled" | "expired";

export type InvoiceKuProviderErrorCode =
  | "provider-auth-error"
  | "provider-invalid-response"
  | "provider-not-found"
  | "provider-unavailable";

export class InvoiceKuProviderError extends Error {
  code: InvoiceKuProviderErrorCode;
  httpStatus: number | null;

  constructor(code: InvoiceKuProviderErrorCode, message: string, httpStatus: number | null = null) {
    super(message);
    this.name = "InvoiceKuProviderError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

const invoiceKuDateTimePattern = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/;

function parseInvoiceKuDateTimeToIso(value: string) {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error("InvoiceKu date is empty.");
  }

  if (z.iso.datetime({ offset: true }).safeParse(normalizedValue).success) {
    return normalizedValue;
  }

  if (!invoiceKuDateTimePattern.test(normalizedValue)) {
    throw new Error(`InvoiceKu date is invalid: ${normalizedValue}`);
  }

  const isoCandidate = normalizedValue.replace(" ", "T");
  const parsedDate = new Date(`${isoCandidate}+07:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`InvoiceKu date is invalid: ${normalizedValue}`);
  }

  return parsedDate.toISOString();
}

const invoiceKuDateTimeSchema = z.string().transform(parseInvoiceKuDateTimeToIso);

const invoiceKuStatusSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(z.enum(["pending", "paid", "failed", "canceled", "cancelled", "expired"]));

const createInvoiceResponseSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    amount_original: z.coerce.number().int().nonnegative(),
    amount_total: z.coerce.number().int().nonnegative(),
    expired_at: invoiceKuDateTimeSchema,
    invoice_id: z.string().trim().min(1),
    payment_url: z.string().trim().min(1).nullable().optional().default(null),
    qris_image_url: z.string().trim().min(1).nullable().optional().default(null),
    qris_string: z.string().trim().min(1),
    status: invoiceKuStatusSchema,
  }),
});

const getInvoiceResponseSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    amount_total: z.coerce.number().int().nonnegative(),
    invoice_id: z.string().trim().min(1),
    order_id: z.string().trim().min(1).nullable().optional().default(null),
    paid_at: z
      .union([invoiceKuDateTimeSchema, z.literal(""), z.null(), z.undefined()])
      .transform((value) => (typeof value === "string" && value.length === 0 ? null : (value ?? null))),
    status: invoiceKuStatusSchema,
  }),
});

const cancelInvoiceResponseSchema = z.object({
  message: z.string().trim().min(1).optional(),
  status: z.literal("success"),
  data: z
    .object({
      invoice_id: z.string().trim().min(1),
      status: invoiceKuStatusSchema,
    })
    .optional(),
});

function toProviderError(input: { httpStatus: number; message?: string | null }) {
  if (input.httpStatus === 401) {
    return new InvoiceKuProviderError(
      "provider-auth-error",
      input.message ?? "Autentikasi InvoiceKu gagal.",
      input.httpStatus,
    );
  }

  if (input.httpStatus === 404) {
    return new InvoiceKuProviderError(
      "provider-not-found",
      input.message ?? "Invoice QRIS tidak ditemukan di provider.",
      input.httpStatus,
    );
  }

  if (input.httpStatus === 503) {
    return new InvoiceKuProviderError(
      "provider-unavailable",
      input.message ?? "InvoiceKu sedang tidak tersedia.",
      input.httpStatus,
    );
  }

  return new InvoiceKuProviderError(
    "provider-invalid-response",
    input.message ?? "Respons InvoiceKu tidak valid.",
    input.httpStatus,
  );
}

async function readProviderJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestInvoiceKu(pathname: string, init: RequestInit) {
  let response: Response;

  try {
    response = await fetch(`${env.INVOICEKU_BASE_URL}${pathname}`, {
      ...init,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${env.INVOICEKU_API_KEY}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new InvoiceKuProviderError("provider-unavailable", "InvoiceKu sedang tidak tersedia.");
  }

  if (!response.ok) {
    const payload = await readProviderJson(response);
    const message =
      payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : null;

    throw toProviderError({
      httpStatus: response.status,
      message,
    });
  }

  return readProviderJson(response);
}

function mapInvoiceStatus(status: z.infer<typeof invoiceKuStatusSchema>): PaymentProviderStatus {
  if (status === "paid") {
    return "paid";
  }

  if (status === "failed") {
    return "failed";
  }

  if (status === "canceled" || status === "cancelled") {
    return "canceled";
  }

  if (status === "expired") {
    return "expired";
  }

  return "pending";
}

function parseProviderResponse<TOutput>(schema: z.ZodSchema<TOutput>, payload: unknown) {
  const parsedPayload = schema.safeParse(payload);

  if (!parsedPayload.success) {
    throw new InvoiceKuProviderError(
      "provider-invalid-response",
      `Respons InvoiceKu tidak valid: ${z.prettifyError(parsedPayload.error)}`,
    );
  }

  return parsedPayload.data;
}

export async function createInvoice(input: {
  amount: number;
  customerEmail: string;
  customerName: string;
  itemName: string;
}) {
  const payload = await requestInvoiceKu("/invoice", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      customer_name: input.customerName,
      email: input.customerEmail,
      item_name: input.itemName,
    }),
  });
  const parsedPayload = parseProviderResponse(createInvoiceResponseSchema, payload);

  return {
    amountOriginal: parsedPayload.data.amount_original,
    amountTotal: parsedPayload.data.amount_total,
    expiredAt: parsedPayload.data.expired_at,
    invoiceId: parsedPayload.data.invoice_id,
    paymentUrl: parsedPayload.data.payment_url,
    providerStatus: mapInvoiceStatus(parsedPayload.data.status),
    qrisImageUrl: parsedPayload.data.qris_image_url,
    qrisString: parsedPayload.data.qris_string,
    raw: parsedPayload,
  };
}

export async function getInvoiceById(invoiceId: string) {
  const payload = await requestInvoiceKu(`/invoice/${invoiceId}`, {
    method: "GET",
  });
  const parsedPayload = parseProviderResponse(getInvoiceResponseSchema, payload);

  return {
    amountTotal: parsedPayload.data.amount_total,
    invoiceId: parsedPayload.data.invoice_id,
    orderId: parsedPayload.data.order_id,
    paidAt: parsedPayload.data.paid_at,
    providerStatus: mapInvoiceStatus(parsedPayload.data.status),
    raw: parsedPayload,
  };
}

export async function cancelInvoiceById(invoiceId: string) {
  const payload = await requestInvoiceKu(`/invoice/${invoiceId}/cancel`, {
    method: "POST",
  });
  const parsedPayload = parseProviderResponse(cancelInvoiceResponseSchema, payload);

  return {
    invoiceId: parsedPayload.data?.invoice_id ?? invoiceId,
    message: parsedPayload.message ?? "Invoice cancelled successfully",
    providerStatus: parsedPayload.data?.status === "paid" ? "paid" : "canceled",
    raw: parsedPayload,
  } satisfies {
    invoiceId: string;
    message: string;
    providerStatus: PaymentProviderStatus;
    raw: typeof parsedPayload;
  };
}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createInvoice, cancelInvoiceById, getInvoiceById, InvoiceKuProviderError } from "@/lib/payments/invoiceku";

const mockedFetch = vi.fn<typeof fetch>();

describe("lib/payments/invoiceku", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    vi.stubGlobal("fetch", mockedFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a QRIS invoice and normalizes provider fields", async () => {
    mockedFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          data: {
            invoice_id: "INV-001",
            amount_original: 50000,
            amount_total: 50123,
            status: "pending",
            qris_string: "000201010212",
            qris_image_url: "https://cdn.example.com/qris.png",
            payment_url: "https://invoiceku.example.com/pay/INV-001",
            expired_at: "2026-01-28 14:00:00",
          },
        }),
        { status: 200 },
      ),
    );

    await expect(
      createInvoice({
        amount: 50000,
        customerEmail: "member@example.com",
        customerName: "member-one",
        itemName: "Premium Upgrade",
      }),
    ).resolves.toMatchObject({
      amountOriginal: 50000,
      amountTotal: 50123,
      invoiceId: "INV-001",
      paymentUrl: "https://invoiceku.example.com/pay/INV-001",
      providerStatus: "pending",
      qrisString: "000201010212",
    });
  });

  it("reads invoice status and parses paid_at", async () => {
    mockedFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          data: {
            invoice_id: "INV-PAID-1",
            order_id: "ORD-001",
            status: "paid",
            amount_total: 99000,
            paid_at: "2026-01-28 13:40:14",
          },
        }),
        { status: 200 },
      ),
    );

    await expect(getInvoiceById("INV-PAID-1")).resolves.toMatchObject({
      amountTotal: 99000,
      invoiceId: "INV-PAID-1",
      orderId: "ORD-001",
      providerStatus: "paid",
    });
  });

  it("maps cancel responses to canceled provider status", async () => {
    mockedFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          message: "Invoice cancelled successfully",
          data: {
            invoice_id: "INV-CANCEL-1",
            status: "failed",
          },
        }),
        { status: 200 },
      ),
    );

    await expect(cancelInvoiceById("INV-CANCEL-1")).resolves.toEqual(
      expect.objectContaining({
        invoiceId: "INV-CANCEL-1",
        message: "Invoice cancelled successfully",
        providerStatus: "canceled",
      }),
    );
  });

  it("accepts successful cancel responses without a data object", async () => {
    mockedFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          message: "Invoice cancelled successfully",
        }),
        { status: 200 },
      ),
    );

    await expect(cancelInvoiceById("INV-CANCEL-2")).resolves.toEqual(
      expect.objectContaining({
        invoiceId: "INV-CANCEL-2",
        message: "Invoice cancelled successfully",
        providerStatus: "canceled",
      }),
    );
  });

  it("maps 401 responses to provider-auth-error", async () => {
    mockedFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
      }),
    );

    await expect(getInvoiceById("INV-401")).rejects.toEqual(
      expect.objectContaining<Partial<InvoiceKuProviderError>>({
        code: "provider-auth-error",
        httpStatus: 401,
      }),
    );
  });

  it("rejects invalid provider payloads", async () => {
    mockedFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          data: {
            invoice_id: "INV-BAD-1",
          },
        }),
        { status: 200 },
      ),
    );

    await expect(getInvoiceById("INV-BAD-1")).rejects.toEqual(
      expect.objectContaining<Partial<InvoiceKuProviderError>>({
        code: "provider-invalid-response",
      }),
    );
  });
});

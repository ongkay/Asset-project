"use client";

import { useEffect, useEffectEvent, useState } from "react";

import { ArrowLeft, CheckCircle2, CircleX, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cancelPaymentAction, checkPaymentStatusAction } from "@/modules/payments/actions";

import { PaymentCancelDialog } from "./payment-cancel-dialog";
import { PaymentCountdown } from "./payment-countdown";

import type { MemberPaymentPageData } from "@/modules/payments/types";

type PaymentClientProps = {
  initialPayment: MemberPaymentPageData;
};

const PAYMENT_STATUS_POLL_INTERVAL_MS = 5 * 60 * 1000;

function isGuardFailure(errorMessage: string | null) {
  return errorMessage === "Unauthorized." || errorMessage === "Forbidden.";
}

function hasIncompleteInvoiceData(payment: MemberPaymentPageData) {
  if (payment.status !== "pending") {
    return false;
  }

  if (!payment.providerInvoiceId || !payment.providerStatus) {
    return true;
  }

  if (payment.providerStatus !== "pending") {
    return false;
  }

  return !payment.qrisString || !payment.expiresAt;
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getPaymentPresentation(payment: MemberPaymentPageData) {
  const invoiceIsIncomplete = hasIncompleteInvoiceData(payment);

  if (payment.state === "success") {
    return {
      accentClassName: "text-emerald-400",
      helperMessage: "Pembayaran sudah dikonfirmasi dan akses Anda sudah aktif.",
      helperToneClassName: "text-emerald-300",
      primaryCtaLabel: "Buka Console",
      qrHint: "Pembayaran QRIS telah berhasil dikonfirmasi.",
      title: "Pembayaran Berhasil",
    };
  }

  if (payment.state === "processing") {
    return {
      accentClassName: "text-cyan-300",
      helperMessage: "Dana sudah diterima. Sistem sedang menyelesaikan aktivasi akses Anda.",
      helperToneClassName: "text-cyan-300",
      primaryCtaLabel: "Cek Status Pembayaran",
      qrHint: "Pembayaran sudah diterima. Mohon tunggu proses aktivasi selesai.",
      title: "Pembayaran Sedang Diproses",
    };
  }

  if (payment.state === "processing_failed") {
    return {
      accentClassName: "text-amber-300",
      helperMessage:
        "Pembayaran sudah diterima, tetapi aktivasi akses belum selesai. Silakan cek ulang beberapa saat lagi.",
      helperToneClassName: "text-amber-300",
      primaryCtaLabel: "Cek Status Pembayaran",
      qrHint: "Dana sudah diterima. Sistem sedang mencoba menyelesaikan aktivasi akses Anda.",
      title: "Pembayaran Perlu Dicek Ulang",
    };
  }

  if (payment.state === "expired") {
    return {
      accentClassName: "text-red-400",
      helperMessage: "Batas waktu pembayaran telah habis. Silakan buat transaksi baru dari checkout.",
      helperToneClassName: "text-red-400",
      primaryCtaLabel: "Kembali ke Checkout",
      qrHint: "QRIS ini sudah tidak berlaku lagi.",
      title: "QRIS Kedaluwarsa",
    };
  }

  if (payment.state === "canceled") {
    return {
      accentClassName: "text-red-400",
      helperMessage: "Transaksi ini sudah dibatalkan dan QRIS tidak bisa digunakan lagi.",
      helperToneClassName: "text-red-400",
      primaryCtaLabel: "Kembali ke Checkout",
      qrHint: "Transaksi ini sudah dibatalkan.",
      title: "Transaksi Dibatalkan",
    };
  }

  if (payment.state === "failed") {
    if (invoiceIsIncomplete) {
      return {
        accentClassName: "text-red-400",
        helperMessage:
          "Invoice QRIS untuk transaksi ini tidak lengkap. Silakan ulangi checkout untuk membuat QRIS baru.",
        helperToneClassName: "text-red-400",
        primaryCtaLabel: "Kembali ke Checkout",
        qrHint: "Invoice ini tidak bisa digunakan lagi.",
        title: "Invoice Tidak Valid",
      };
    }

    return {
      accentClassName: "text-red-400",
      helperMessage: "Pembayaran dinyatakan gagal. Silakan ulangi checkout untuk membuat invoice baru.",
      helperToneClassName: "text-red-400",
      primaryCtaLabel: "Kembali ke Checkout",
      qrHint: "Pembayaran untuk QRIS ini tidak berhasil.",
      title: "Pembayaran Gagal",
    };
  }

  return {
    accentClassName: "text-slate-50",
    helperMessage: null,
    helperToneClassName: "text-slate-400",
    primaryCtaLabel: "Cek Status Pembayaran",
    qrHint: "Scan QRIS berikut ini",
    title: "Menunggu Pembayaran",
  };
}

function getQrOverlayContent(payment: MemberPaymentPageData) {
  const invoiceIsIncomplete = hasIncompleteInvoiceData(payment);

  if (payment.state === "success") {
    return {
      icon: CheckCircle2,
      label: "QRIS SUDAH DIBAYAR",
    };
  }

  if (payment.state === "expired") {
    return {
      icon: CircleX,
      label: "QRIS KEDALUWARSA",
    };
  }

  if (payment.state === "canceled") {
    return {
      icon: CircleX,
      label: "TRANSAKSI DIBATALKAN",
    };
  }

  if (payment.state === "failed") {
    return {
      icon: CircleX,
      label: invoiceIsIncomplete ? "INVOICE TIDAK VALID" : "PEMBAYARAN GAGAL",
    };
  }

  return null;
}

export function PaymentClient({ initialPayment }: PaymentClientProps) {
  const router = useRouter();
  const checkMutation = useAction(checkPaymentStatusAction);
  const cancelMutation = useAction(cancelPaymentAction);
  const [payment, setPayment] = useState(initialPayment);

  const presentation = getPaymentPresentation(payment);
  const qrOverlay = getQrOverlayContent(payment);
  const shouldPoll = payment.state === "pending" || payment.state === "processing";

  async function handleActionResult(
    result:
      | Awaited<ReturnType<typeof checkMutation.executeAsync>>
      | Awaited<ReturnType<typeof cancelMutation.executeAsync>>,
    options: { silent?: boolean } = {},
  ) {
    const serverError = result.serverError ?? null;

    if (isGuardFailure(serverError)) {
      router.refresh();
      return;
    }

    if (serverError) {
      if (!options.silent) {
        toast.error(serverError);
      }

      return;
    }

    if (!result.data) {
      if (!options.silent) {
        toast.error("Status pembayaran belum bisa dimuat.");
      }

      return;
    }

    if (result.data.payment) {
      setPayment(result.data.payment);
    }

    if (result.data.message) {
      if (!options.silent) {
        if (result.data.ok) {
          toast.success(result.data.message);
        } else {
          toast.error(result.data.message);
        }
      }
    }

    if (result.data.ok && result.data.payment.state === "success") {
      router.refresh();
    }
  }

  async function handleCheckStatus(options: { silent?: boolean } = {}) {
    const result = await checkMutation.executeAsync({ transactionId: payment.id });
    await handleActionResult(result, options);
  }

  async function handleCancelPayment() {
    const result = await cancelMutation.executeAsync({ transactionId: payment.id });
    await handleActionResult(result);
  }

  const pollPaymentStatus = useEffectEvent(() => {
    void handleCheckStatus({ silent: true });
  });

  useEffect(() => {
    if (!shouldPoll) {
      return undefined;
    }

    const pollTimer = window.setInterval(() => {
      pollPaymentStatus();
    }, PAYMENT_STATUS_POLL_INTERVAL_MS);

    return () => window.clearInterval(pollTimer);
  }, [payment.id, shouldPoll]);

  return (
    <div className="min-h-screen bg-[#080c12] px-6 py-6 text-slate-50 sm:py-10">
      <div className="mx-auto w-full max-w-[420px]">
        <main className="overflow-hidden rounded-[12px] border border-white/8 bg-[#171b24] px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.32)]">
          <header className="mb-7 flex items-start justify-between gap-5 border-white/8 border-b pb-6">
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className={cn("font-bold text-[16px] leading-6 tracking-[-0.01em]", presentation.accentClassName)}>
                {presentation.title}
              </h1>
              <p className="text-[13px] font-medium text-[#7b8190]">{payment.providerInvoiceId ?? payment.code}</p>
              <p className="text-[13px] text-[#a7afbd]">{payment.packageName}</p>
              {presentation.helperMessage ? (
                <p className={cn("mt-1 max-w-[220px] text-[12px] leading-5", presentation.helperToneClassName)}>
                  {presentation.helperMessage}
                </p>
              ) : null}
            </div>
            <PaymentCountdown expiresAt={payment.expiresAt} state={payment.state} />
          </header>

          <section className="mb-6 text-center" aria-label="Total pembayaran">
            <span className="mb-2 block text-[13px] text-[#a7afbd]">Total Tagihan</span>
            <div className="font-bold text-[32px] tracking-[-0.02em] text-emerald-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.14)]">
              {formatRupiah(payment.amountRp)}
            </div>
            {payment.paymentFeeAmountRp > 0 ? (
              <p className="mt-2 text-[12px] text-[#7b8190]">
                Sudah termasuk biaya provider {formatRupiah(payment.paymentFeeAmountRp)}.
              </p>
            ) : null}
          </section>

          <section className="mb-8" aria-label="QRIS pembayaran">
            <div className="mb-5 text-center text-[13px] font-medium text-[#a7afbd]">{presentation.qrHint}</div>

            <div className="mb-7 flex justify-center">
              <div
                className={cn(
                  "relative w-fit rounded-[6px] bg-white p-[18px] shadow-[0_16px_40px_rgba(0,0,0,0.25),inset_0_0_0_1px_rgba(0,0,0,0.04),0_0_0_1px_rgba(255,255,255,0.05)]",
                  qrOverlay && "overflow-hidden",
                )}
              >
                {payment.qrisString ? (
                  <QRCodeSVG
                    bgColor="#FFFFFF"
                    fgColor="#10151d"
                    level="M"
                    marginSize={2}
                    size={210}
                    title={`QRIS ${payment.packageName}`}
                    value={payment.qrisString}
                  />
                ) : (
                  <div className="grid size-[210px] place-items-center text-center text-slate-500 text-sm">
                    QRIS belum tersedia.
                  </div>
                )}
                {qrOverlay ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-white/60 backdrop-blur-[4px]">
                    <qrOverlay.icon className="size-10 text-red-500" />
                    <span className="rounded-md bg-red-500 px-3.5 py-2 font-extrabold text-[12px] tracking-[0.03em] text-white">
                      {qrOverlay.label}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section
            className="mb-8 rounded-[6px] border border-white/8 bg-white/[0.02] p-5"
            aria-label="Instruksi pembayaran"
          >
            <h2 className="mb-5 font-bold text-[13px] text-white">Cara Pembayaran</h2>
            <ol className="grid gap-3.5 text-[13px] leading-6 text-[#a7afbd]">
              <li className="relative pl-8 before:absolute before:left-0 before:top-0 before:flex before:size-[22px] before:items-center before:justify-center before:rounded-full before:bg-cyan-400/12 before:font-bold before:text-[11px] before:text-cyan-400 before:content-['1']">
                Buka aplikasi E-Wallet / Mobile Banking
              </li>
              <li className="relative pl-8 before:absolute before:left-0 before:top-0 before:flex before:size-[22px] before:items-center before:justify-center before:rounded-full before:bg-cyan-400/12 before:font-bold before:text-[11px] before:text-cyan-400 before:content-['2']">
                Scan QR Code di atas
              </li>
              <li className="relative pl-8 before:absolute before:left-0 before:top-0 before:flex before:size-[22px] before:items-center before:justify-center before:rounded-full before:bg-cyan-400/12 before:font-bold before:text-[11px] before:text-cyan-400 before:content-['3']">
                Pastikan nominal transfer ={" "}
                <strong className="font-semibold text-emerald-400">{formatRupiah(payment.amountRp)}</strong>
              </li>
              <li className="relative pl-8 before:absolute before:left-0 before:top-0 before:flex before:size-[22px] before:items-center before:justify-center before:rounded-full before:bg-cyan-400/12 before:font-bold before:text-[11px] before:text-cyan-400 before:content-['4']">
                Pembayaran akan terkonfirmasi otomatis dalam 1-5 menit
              </li>
            </ol>

            <div className="mt-5 grid gap-1 text-[12px] text-[#7b8190]">
              <p>Dibuat: {formatDateTime(payment.createdAt)}</p>
              <p>Dibayar: {formatDateTime(payment.paidAt)}</p>
            </div>
          </section>

          <section className="flex flex-col gap-4" aria-label="Aksi pembayaran">
            {payment.state === "success" ? (
              <Button
                asChild
                className="h-12 rounded-[6px] bg-cyan-400 font-bold text-[#080c12] shadow-[0_8px_16px_rgba(0,194,255,0.2)] hover:-translate-y-0.5 hover:bg-cyan-300 hover:shadow-[0_12px_24px_rgba(0,194,255,0.3)]"
                type="button"
              >
                <Link href="/console">{presentation.primaryCtaLabel}</Link>
              </Button>
            ) : payment.state === "expired" || payment.state === "canceled" || payment.state === "failed" ? (
              <Button
                asChild
                className="h-12 rounded-[6px] bg-cyan-400 font-bold text-[#080c12] shadow-[0_8px_16px_rgba(0,194,255,0.2)] hover:-translate-y-0.5 hover:bg-cyan-300 hover:shadow-[0_12px_24px_rgba(0,194,255,0.3)]"
                type="button"
              >
                <Link href={`/checkout?packageId=${payment.packageId}`}>{presentation.primaryCtaLabel}</Link>
              </Button>
            ) : (
              <Button
                className="h-12 rounded-[6px] bg-cyan-400 font-bold text-[#080c12] shadow-[0_8px_16px_rgba(0,194,255,0.2)] hover:-translate-y-0.5 hover:bg-cyan-300 hover:shadow-[0_12px_24px_rgba(0,194,255,0.3)] disabled:bg-[#2b313d] disabled:text-[#a7afbd] disabled:shadow-none"
                disabled={checkMutation.isPending || !payment.canCheckStatus}
                onClick={() => void handleCheckStatus()}
                type="button"
              >
                {checkMutation.isPending ? "Memeriksa..." : presentation.primaryCtaLabel}
              </Button>
            )}

            {payment.state === "pending" ? (
              <PaymentCancelDialog
                disabled={!payment.canCancel}
                isPending={cancelMutation.isPending}
                onConfirm={() => void handleCancelPayment()}
              />
            ) : null}

            {payment.providerPaymentUrl ? (
              <a
                className="mx-auto inline-flex items-center gap-2 text-[12px] font-medium text-[#a7afbd] transition hover:text-white"
                href={payment.providerPaymentUrl}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink className="size-3.5" />
                Buka halaman pembayaran provider
              </a>
            ) : null}
          </section>
        </main>

        <div className="mt-5 text-center">
          <Link
            className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-300 transition hover:text-white"
            href="/console"
          >
            <ArrowLeft className="size-4" />
            Kembali ke console
          </Link>
        </div>
      </div>
    </div>
  );
}

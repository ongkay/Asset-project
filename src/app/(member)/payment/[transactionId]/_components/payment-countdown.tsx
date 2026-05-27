"use client";

import { useEffect, useState } from "react";

import { Clock3 } from "lucide-react";

import { cn } from "@/lib/utils";

import type { PaymentPageState } from "@/modules/payments/types";

type PaymentCountdownProps = {
  expiresAt: string | null;
  state: PaymentPageState;
};

function formatRemainingTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function getCountdownPresentation(state: PaymentPageState, expiredByTime: boolean) {
  if (state === "success") {
    return {
      badgeClassName: "border-emerald-400/20 bg-emerald-400/12 text-emerald-300",
      label: "Pembayaran",
      value: "Berhasil",
    };
  }

  if (state === "processing") {
    return {
      badgeClassName: "border-cyan-400/20 bg-cyan-400/12 text-cyan-300",
      label: "Status",
      value: "Diproses",
    };
  }

  if (state === "processing_failed") {
    return {
      badgeClassName: "border-amber-400/20 bg-amber-400/12 text-amber-300",
      label: "Status",
      value: "Perlu cek ulang",
    };
  }

  if (state === "canceled") {
    return {
      badgeClassName: "border-red-500/20 bg-red-500/8 text-red-400",
      label: "Status",
      value: "Dibatalkan",
    };
  }

  if (state === "failed") {
    return {
      badgeClassName: "border-red-500/20 bg-red-500/8 text-red-400",
      label: "Status",
      value: "Gagal",
    };
  }

  if (state === "expired" || expiredByTime) {
    return {
      badgeClassName: "border-red-500/20 bg-red-500/8 text-red-400",
      label: "Waktu Habis",
      value: "00:00",
    };
  }

  return null;
}

export function PaymentCountdown({ expiresAt, state }: PaymentCountdownProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const isPending = state === "pending";

  useEffect(() => {
    if (!expiresAt || !isPending) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [expiresAt, isPending]);

  if (!expiresAt) {
    return null;
  }

  const expiredByTime = new Date(expiresAt).getTime() <= currentTime;
  const terminalPresentation = getCountdownPresentation(state, expiredByTime);

  if (terminalPresentation) {
    return (
      <div className="flex flex-col items-end gap-2 text-right">
        <p className="text-[11px] font-bold tracking-[0.05em] text-slate-400 uppercase">{terminalPresentation.label}</p>
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 font-bold text-sm tracking-[0.02em]",
            terminalPresentation.badgeClassName,
          )}
        >
          <Clock3 className="size-3.5" />
          <span>{terminalPresentation.value}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2 text-right">
      <p className="text-[11px] font-bold tracking-[0.05em] text-amber-300 uppercase">Sisa Waktu</p>
      <div className="inline-flex items-center gap-2 rounded-md border border-amber-400/20 bg-amber-400/12 px-3 py-1.5 font-bold text-amber-300 text-sm tabular-nums tracking-[0.02em]">
        <Clock3 className="size-3.5" />
        <span>{formatRemainingTime(new Date(expiresAt).getTime() - currentTime)}</span>
      </div>
    </div>
  );
}

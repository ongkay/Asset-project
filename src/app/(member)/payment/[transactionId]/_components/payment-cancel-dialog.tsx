"use client";

import { AlertTriangle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type PaymentCancelDialogProps = {
  disabled: boolean;
  isPending: boolean;
  onConfirm: () => void;
};

export function PaymentCancelDialog({ disabled, isPending, onConfirm }: PaymentCancelDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          className="h-12 rounded-md border-[#2b313d] bg-transparent font-bold text-[14px] text-slate-300 hover:border-red-500/20 hover:bg-[#1d2330] hover:text-red-400"
          disabled={disabled || isPending}
          type="button"
          variant="outline"
        >
          Batalkan Transaksi
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-[320px] rounded-md border border-[#2b313d] bg-[#171b24] p-6 text-slate-50 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
        <AlertDialogHeader className="place-items-center text-center">
          <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-red-500/12 text-red-400">
            <AlertTriangle className="size-5" />
          </div>
          <AlertDialogTitle className="font-bold text-[16px] text-white">Batalkan Transaksi?</AlertDialogTitle>
          <AlertDialogDescription className="text-[13px] leading-6 text-slate-400">
            Apakah Anda yakin ingin membatalkan transaksi ini? QRIS tidak akan berlaku lagi setelah dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="-mx-0 -mb-0 grid grid-cols-2 gap-4 border-none bg-transparent p-0">
          <AlertDialogCancel
            className="mt-0 h-10 rounded-md border border-[#2b313d] bg-[#10151d] font-semibold text-slate-200 hover:bg-[#2b313d]"
            disabled={isPending}
          >
            Tidak
          </AlertDialogCancel>
          <AlertDialogAction
            className="h-10 rounded-md border-none bg-red-500 font-semibold text-white hover:bg-red-600"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? <Spinner className="size-4" /> : null}
            Ya, Batalkan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

"use client";

import { useState } from "react";

import { Bitcoin, ChevronLeft, CircleCheck, CreditCard, Lock, QrCode, Ticket, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { getCheckoutQuoteAction, submitCheckoutAction } from "@/modules/checkout/actions";

import type {
  CheckoutCatalogGroup,
  CheckoutPaymentMethod,
  CheckoutSummaryQuote,
  ResolvedCheckoutState,
} from "@/modules/checkout/types";

type CheckoutPageProps = {
  initialState: ResolvedCheckoutState;
};

const paymentMethods: Array<{
  icon: typeof QrCode;
  key: CheckoutPaymentMethod;
  label: string;
}> = [
  { icon: QrCode, key: "qris", label: "QRIS" },
  { icon: Bitcoin, key: "crypto", label: "Crypto" },
  { icon: CreditCard, key: "card", label: "Card" },
];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function findSelectedGroup(groups: CheckoutCatalogGroup[], selectedGroupKey: string | null) {
  return groups.find((group) => group.groupKey === selectedGroupKey) ?? groups[0] ?? null;
}

function buildQuoteFromGroupItem(input: {
  group: CheckoutCatalogGroup;
  packageId: string;
}): CheckoutSummaryQuote | null {
  const selectedItem =
    input.group.items.find((item) => item.packageId === input.packageId) ?? input.group.items[0] ?? null;

  if (!selectedItem) {
    return null;
  }

  return {
    durationLabel: selectedItem.durationLabel,
    featureList: input.group.featureList,
    groupDescription: input.group.description,
    groupKey: input.group.groupKey,
    groupLabel: input.group.label,
    listAmountRp: selectedItem.listAmountRp,
    packageDiscountAmountRp: selectedItem.packageDiscountAmountRp,
    packageDiscountPercent: selectedItem.packageDiscountPercent,
    packageId: selectedItem.packageId,
    packageName: selectedItem.name,
    totalRp: selectedItem.previewTotalRp,
    voucherCode: selectedItem.appliedVoucherCode,
    voucherDiscountAmountRp: selectedItem.appliedVoucherAmountRp,
    voucherDiscountPercent: selectedItem.appliedVoucherPercent,
    voucherId: selectedItem.appliedVoucherId,
  };
}

function selectPackageLocally(currentState: ResolvedCheckoutState, packageId: string): ResolvedCheckoutState {
  const nextSelectedGroup =
    currentState.groups.find((group) => group.items.some((item) => item.packageId === packageId)) ??
    currentState.groups[0] ??
    null;

  if (!nextSelectedGroup) {
    return currentState;
  }

  return {
    ...currentState,
    quote: buildQuoteFromGroupItem({ group: nextSelectedGroup, packageId }),
    selectedGroupKey: nextSelectedGroup.groupKey,
    selectedPackageId: packageId,
    voucherError: null,
  };
}

function isGuardFailure(errorMessage: string | null) {
  return errorMessage === "Unauthorized." || errorMessage === "Forbidden.";
}

export function CheckoutPage({ initialState }: CheckoutPageProps) {
  const router = useRouter();
  const getQuoteMutation = useAction(getCheckoutQuoteAction);
  const submitCheckoutMutation = useAction(submitCheckoutAction);
  const [checkoutState, setCheckoutState] = useState(initialState);
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("qris");
  const [voucherInputValue, setVoucherInputValue] = useState("");
  const [isVoucherExpanded, setIsVoucherExpanded] = useState(false);
  const [pageErrorMessage, setPageErrorMessage] = useState<string | null>(null);

  const selectedGroup = findSelectedGroup(checkoutState.groups, checkoutState.selectedGroupKey);
  const quote = checkoutState.quote;
  const isQuotePending = getQuoteMutation.isPending;
  const isSubmitPending = submitCheckoutMutation.isPending;

  async function refreshCheckoutState(nextPackageId: string, nextVoucherCode: string | null) {
    setPageErrorMessage(null);

    const result = await getQuoteMutation.executeAsync({
      packageId: nextPackageId,
      voucherCode: nextVoucherCode,
    });

    if (isGuardFailure(result.serverError ?? null)) {
      router.refresh();
      return;
    }

    if (result.serverError) {
      setPageErrorMessage(result.serverError);
      return;
    }

    if (!result.data) {
      setPageErrorMessage("Quote checkout tidak tersedia.");
      return;
    }

    setCheckoutState(result.data);
  }

  function handleSelectGroup(groupKey: string) {
    const nextGroup = checkoutState.groups.find((group) => group.groupKey === groupKey);

    if (!nextGroup || nextGroup.items.length === 0) {
      return;
    }

    const nextPackageId = nextGroup.items[0]?.packageId;

    if (!nextPackageId) {
      return;
    }

    if (checkoutState.appliedVoucherCode) {
      void refreshCheckoutState(nextPackageId, checkoutState.appliedVoucherCode);
      return;
    }

    setCheckoutState((currentState) => selectPackageLocally(currentState, nextPackageId));
  }

  function handleSelectPackage(packageId: string) {
    if (checkoutState.appliedVoucherCode) {
      void refreshCheckoutState(packageId, checkoutState.appliedVoucherCode);
      return;
    }

    setCheckoutState((currentState) => selectPackageLocally(currentState, packageId));
  }

  async function handleApplyVoucher() {
    const selectedPackageId = checkoutState.selectedPackageId;

    if (!selectedPackageId) {
      return;
    }

    const normalizedCode = voucherInputValue.trim().toUpperCase();

    if (normalizedCode.length === 0) {
      setCheckoutState((currentState) => ({
        ...currentState,
        voucherError: {
          errorCode: "voucher-not-found",
          message: "Kode voucher wajib diisi.",
        },
      }));
      return;
    }

    await refreshCheckoutState(selectedPackageId, normalizedCode);
    setVoucherInputValue(normalizedCode);
  }

  async function handleRemoveVoucher() {
    const selectedPackageId = checkoutState.selectedPackageId;

    if (!selectedPackageId) {
      return;
    }

    setVoucherInputValue("");
    setIsVoucherExpanded(false);
    await refreshCheckoutState(selectedPackageId, null);
  }

  function handleCloseVoucherInput() {
    setVoucherInputValue("");
    setIsVoucherExpanded(false);
    setCheckoutState((currentState) =>
      currentState.voucherError
        ? {
            ...currentState,
            voucherError: null,
          }
        : currentState,
    );
  }

  async function handleSubmitCheckout() {
    if (!quote) {
      return;
    }

    setPageErrorMessage(null);
    const result = await submitCheckoutMutation.executeAsync({
      packageId: quote.packageId,
      paymentMethod,
      voucherCode: checkoutState.appliedVoucherCode,
    });

    if (isGuardFailure(result.serverError ?? null)) {
      router.refresh();
      return;
    }

    if (result.serverError) {
      setPageErrorMessage(result.serverError);
      return;
    }

    if (!result.data) {
      setPageErrorMessage("Checkout gagal diproses.");
      return;
    }

    if (!result.data.ok) {
      setPageErrorMessage(result.data.message);
      return;
    }

    router.replace(result.data.redirectTo);
    router.refresh();
  }

  const appliedVoucherCode = quote?.voucherCode ?? null;
  const selectedGroupItems = selectedGroup?.items ?? [];

  return (
    <div className="min-h-screen bg-[#080c12] text-slate-50">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(0,194,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_30%)] px-4 py-5 sm:px-6 sm:py-8 lg:px-9 lg:py-9">
        <div className="mx-auto max-w-[1160px]">
          <Link
            className="mb-8 inline-flex items-center gap-2.5 text-left font-extrabold text-2xl tracking-tight text-white transition-colors hover:text-sky-300 sm:mb-11"
            href="/console"
          >
            <span className="text-3xl font-normal leading-none text-slate-400">
              <ChevronLeft className="size-7" />
            </span>
            <span>Checkout</span>
          </Link>

          {pageErrorMessage ? (
            <Alert className="mb-6 border-red-500/30 bg-red-500/10 text-red-50">
              <AlertTitle>Checkout belum bisa dilanjutkan</AlertTitle>
              <AlertDescription>{pageErrorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-14 xl:gap-[60px]">
            <div className="min-w-0">
              <section className="mb-10">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[15px] font-black tracking-[0.02em] text-white">Select Package</h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {checkoutState.groups.map((group) => {
                    const isActive = checkoutState.selectedGroupKey === group.groupKey;

                    return (
                      <button
                        className={cn(
                          "relative flex min-h-[104px] w-full flex-col justify-center rounded-xl border px-5 py-6 text-left transition duration-200",
                          "bg-white/[0.02] hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.04] hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]",
                          isActive
                            ? "border-cyan-400/50 bg-linear-to-br from-cyan-400/8 to-cyan-400/2 shadow-[0_12px_32px_rgba(0,194,255,0.08)]"
                            : "border-white/6",
                        )}
                        key={group.groupKey}
                        onClick={() => handleSelectGroup(group.groupKey)}
                        type="button"
                      >
                        <span
                          className={cn(
                            "absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-cyan-400 shadow-[0_1px_8px_rgba(0,194,255,0.4)]",
                            isActive ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-[16px] text-white">{group.label}</h3>
                            <p className="mt-2 pr-4 text-[13px] leading-5 text-slate-400">{group.description}</p>
                          </div>
                          <CircleCheck
                            className={cn(
                              "mt-1 size-4 shrink-0 text-cyan-400 transition duration-200",
                              isActive ? "scale-100 opacity-100" : "scale-50 opacity-0",
                            )}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="mb-10">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="text-[15px] font-black tracking-[0.02em] text-white">Select Duration</h2>
                  <span className="text-[13px] text-slate-400">{selectedGroup?.label ?? "Package"}</span>
                </div>

                {selectedGroupItems.length === 0 ? (
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] p-5 text-sm text-slate-300">
                    Belum ada package aktif yang tersedia untuk pembelian.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {selectedGroupItems.map((item) => {
                      const isActive = checkoutState.selectedPackageId === item.packageId;
                      const showBestBadge = item.packageDiscountPercent >= 40;

                      return (
                        <button
                          className={cn(
                            "relative flex min-h-[118px] flex-col items-center justify-center rounded-xl border px-4 py-6 text-center transition duration-200",
                            "bg-white/[0.03] hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-[#1d2330]",
                            isActive
                              ? "border-cyan-400 bg-linear-to-br from-cyan-400/8 to-purple-400/6 shadow-[0_0_0_1px_rgba(0,194,255,0.24),0_18px_42px_rgba(0,194,255,0.08)]"
                              : "border-[#2b313d]",
                          )}
                          key={item.packageId}
                          onClick={() => handleSelectPackage(item.packageId)}
                          type="button"
                        >
                          {item.packageDiscountPercent > 0 ? (
                            <span
                              className={cn(
                                "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3.5 py-1 text-[12px] font-black text-white shadow-[0_10px_22px_rgba(239,68,68,0.18)]",
                                showBestBadge
                                  ? "bg-linear-to-r from-pink-500 to-red-600 shadow-[0_10px_24px_rgba(220,38,38,0.34),0_0_0_1px_rgba(255,255,255,0.18)]"
                                  : "bg-linear-to-r from-orange-400 to-red-500",
                              )}
                            >
                              {item.packageDiscountPercent}% Off
                            </span>
                          ) : null}
                          <h3 className={cn("mb-2 font-bold text-[16px]", isActive ? "text-cyan-300" : "text-white")}>
                            {item.durationLabel}
                          </h3>
                          <div className="mb-1 flex items-baseline justify-center gap-1 text-white/25 line-through">
                            <span className="text-[12px] font-medium">{formatRupiah(item.originalMonthlyPriceRp)}</span>
                            <span className="text-[11px]">/month</span>
                          </div>
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="font-semibold text-[15px] tracking-[-0.01em] text-slate-300">
                              {formatRupiah(item.previewMonthlyPriceRp)}
                            </span>
                            <span className="text-[11px] text-white/35">/month</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[15px] font-black tracking-[0.02em] text-white">Payment Method</h2>
                </div>

                <div className="flex flex-wrap gap-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    const isActive = paymentMethod === method.key;

                    return (
                      <button
                        className={cn(
                          "flex min-h-[92px] flex-1 flex-col items-center justify-center gap-2 rounded-[10px] border px-3 py-3 text-center transition duration-200 sm:max-w-[120px]",
                          isActive
                            ? "border-cyan-400 bg-linear-to-br from-cyan-400/8 to-purple-400/6 shadow-[0_0_0_1px_rgba(0,194,255,0.24),0_8px_24px_rgba(0,194,255,0.08)]"
                            : "border-[#2b313d] bg-[rgba(16,21,29,0.68)] hover:border-cyan-400/30 hover:bg-[#1d2330]",
                        )}
                        key={method.key}
                        onClick={() => setPaymentMethod(method.key)}
                        type="button"
                      >
                        <span className="grid size-7 place-items-center rounded-lg bg-cyan-400/12 text-cyan-400">
                          <Icon className="size-3.5" />
                        </span>
                        <span className="font-semibold text-[13px] text-white">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <aside className="rounded-[22px] border border-white/8 bg-[#171b24] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.32)] lg:sticky lg:top-8 lg:p-10">
              {quote ? (
                <>
                  <h2 className="mb-2 text-[20px] font-bold tracking-[-0.01em] text-white">
                    {quote.groupLabel} {quote.durationLabel}
                  </h2>

                  <ul className="mb-8 mt-6 grid gap-4">
                    {quote.featureList.map((feature) => (
                      <li className="flex items-center gap-3.5 text-[14px] leading-6 text-slate-300" key={feature}>
                        <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-cyan-400/12 text-cyan-400 shadow-[0_0_0_1px_rgba(0,194,255,0.2)]">
                          <CircleCheck className="size-3.5" />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="my-7 h-px bg-white/10" />

                  <div className="grid gap-3 text-[13px] text-slate-400">
                    <div className="flex items-center justify-between gap-4">
                      <span>Subtotal</span>
                      <strong className="font-semibold text-[14px] text-slate-200">
                        {formatRupiah(quote.listAmountRp)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>
                        Discount
                        <span className="ml-2 inline-flex rounded bg-amber-300/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.02em] text-amber-300">
                          {quote.packageDiscountPercent}% Off
                        </span>
                      </span>
                      <strong className="font-medium text-[14px] text-amber-300">
                        -{formatRupiah(quote.packageDiscountAmountRp)}
                      </strong>
                    </div>

                    {quote.voucherDiscountPercent ? (
                      <div className="flex items-center justify-between gap-4">
                        <span>
                          Discount Voucher
                          <span className="ml-2 inline-flex rounded bg-amber-400/12 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.02em] text-amber-400">
                            {quote.voucherDiscountPercent}%
                          </span>
                        </span>
                        <strong className="font-semibold text-[14px] text-amber-400">
                          -{formatRupiah(quote.voucherDiscountAmountRp)}
                        </strong>
                      </div>
                    ) : null}

                    <div className="my-1 h-px bg-white/6" />

                    <div className="flex items-center justify-between gap-4 pt-1">
                      <span className="font-extrabold text-[12px] tracking-[0.05em] text-slate-400 uppercase">
                        TOTAL
                      </span>
                      <strong className="font-extrabold text-[20px] tracking-[-0.02em] text-white">
                        {formatRupiah(quote.totalRp)}
                      </strong>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "mt-6 rounded-xl border border-dashed border-amber-400/30 bg-amber-400/5 p-4 transition",
                    )}
                  >
                    {appliedVoucherCode ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 text-white">
                          <Ticket className="size-4 text-amber-400" />
                          <span className="font-extrabold tracking-[0.02em]">{appliedVoucherCode}</span>
                          <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-amber-300">
                            Applied
                          </span>
                        </div>
                        <button
                          className="rounded p-1 text-slate-400 transition hover:scale-105 hover:text-red-400"
                          onClick={() => void handleRemoveVoucher()}
                          title="Remove voucher"
                          type="button"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        {isVoucherExpanded ? (
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 text-[14px] font-bold text-white">
                              <Ticket className="size-4 text-amber-400" />
                              <span>Apply voucher</span>
                            </div>
                            <button
                              aria-label="Close voucher input"
                              className="rounded p-1 text-slate-400 transition hover:scale-105 hover:text-white"
                              onClick={handleCloseVoucherInput}
                              type="button"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="flex w-full items-center justify-between gap-3 bg-transparent text-left text-[14px] font-bold text-white"
                            onClick={() => setIsVoucherExpanded(true)}
                            type="button"
                          >
                            <span className="flex items-center gap-2.5">
                              <Ticket className="size-4 text-amber-400" />
                              <span>Apply voucher</span>
                            </span>
                            <span className="text-[12px] font-medium text-slate-400">Have a promo code?</span>
                          </button>
                        )}

                        {isVoucherExpanded ? (
                          <div className="mt-4 border-t border-dashed border-white/5 pt-4">
                            <div className="flex items-start gap-2">
                              <InputGroup className="h-11 border-white/10 bg-[#10151d]/80">
                                <InputGroupAddon className="text-amber-400">
                                  <Ticket className="size-4" />
                                </InputGroupAddon>
                                <InputGroupInput
                                  aria-invalid={checkoutState.voucherError ? true : undefined}
                                  className="h-11 text-sm text-white placeholder:text-slate-400"
                                  onChange={(event) => setVoucherInputValue(event.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      void handleApplyVoucher();
                                    }
                                  }}
                                  placeholder="Enter code"
                                  value={voucherInputValue}
                                />
                              </InputGroup>
                              <Button
                                className="h-11 rounded-lg bg-amber-500 px-4 font-bold text-white hover:bg-amber-400"
                                disabled={isQuotePending}
                                onClick={() => void handleApplyVoucher()}
                                type="button"
                              >
                                {isQuotePending ? <Spinner className="size-4" /> : "Apply"}
                              </Button>
                            </div>
                            {checkoutState.voucherError ? (
                              <p className="mt-2 px-1 text-[12px] text-red-400">{checkoutState.voucherError.message}</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <button
                    className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 font-extrabold text-[#080c12] text-[16px] tracking-[0.02em] shadow-[0_12px_24px_rgba(0,194,255,0.2)] transition hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_16px_32px_rgba(0,194,255,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSubmitPending || !quote}
                    onClick={() => void handleSubmitCheckout()}
                    type="button"
                  >
                    {isSubmitPending ? <Spinner className="size-4 text-[#080c12]" /> : <Lock className="size-4" />}
                    <span>Pay Now</span>
                  </button>

                  <p className="mt-4 text-center text-[12px] leading-6 text-slate-500">
                    Pembayaran aman. Akses premium akan diproses setelah pembayaran berhasil.
                  </p>
                </>
              ) : (
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-5 text-sm text-slate-300">
                  Belum ada package aktif yang tersedia untuk checkout saat ini.
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

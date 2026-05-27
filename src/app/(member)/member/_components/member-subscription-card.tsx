import Link from "next/link";

import { ArrowUpRight, Gift } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ConsoleSnapshot, ConsoleStateSnapshot } from "@/modules/console/types";

import { MEMBER_PAGE_CONTENT } from "./member-page-content";

type MemberSubscriptionCardProps = {
  onOpenRedeem: () => void;
  snapshot: ConsoleSnapshot;
  stateSnapshot: ConsoleStateSnapshot;
};

function formatSubscriptionDate(value: string | null) {
  if (!value) {
    return MEMBER_PAGE_CONTENT.subscription.noneValue;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}

function resolveSubscriptionSummary(snapshot: ConsoleSnapshot, stateSnapshot: ConsoleStateSnapshot) {
  if (stateSnapshot.state === "none") {
    return {
      packageName: MEMBER_PAGE_CONTENT.subscription.noneValue,
      startAt: null,
      endAt: null,
      status: "none" as const,
    };
  }

  const subscription = snapshot.subscription ?? stateSnapshot.latestSubscription;

  return {
    endAt: subscription?.endAt ?? null,
    packageName: subscription?.packageName ?? MEMBER_PAGE_CONTENT.subscription.noneValue,
    startAt: subscription?.startAt ?? null,
    status: stateSnapshot.state,
  };
}

function getStatusBadgeClassName(status: ConsoleStateSnapshot["state"]) {
  if (status === "active" || status === "processed") {
    return "border-emerald-400/20 bg-emerald-400/12 text-emerald-300";
  }

  if (status === "expired") {
    return "border-red-400/20 bg-red-400/12 text-red-300";
  }

  if (status === "canceled") {
    return "border-amber-400/20 bg-amber-400/12 text-amber-300";
  }

  return "border-white/10 bg-white/5 text-[#a7afbd]";
}

export function MemberSubscriptionCard({ onOpenRedeem, snapshot, stateSnapshot }: MemberSubscriptionCardProps) {
  const subscriptionSummary = resolveSubscriptionSummary(snapshot, stateSnapshot);

  return (
    <section
      aria-label="Subscription Overview"
      className="rounded-2xl border border-white/8 bg-[rgba(23,27,36,0.6)] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.32)] backdrop-blur-md"
    >
      <header className="mb-6 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-base text-white">{MEMBER_PAGE_CONTENT.subscription.title}</h2>
        <span
          className={`rounded-md border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] ${getStatusBadgeClassName(subscriptionSummary.status)}`}
        >
          {MEMBER_PAGE_CONTENT.subscription.statusLabels[subscriptionSummary.status]}
        </span>
      </header>

      <div className="mb-5">
        <p className="mb-1.5 text-[#7b8190] text-xs">{MEMBER_PAGE_CONTENT.subscription.activePlanLabel}</p>
        <p className="font-semibold text-[15px] text-white">{subscriptionSummary.packageName}</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[#7b8190] text-xs">{MEMBER_PAGE_CONTENT.subscription.startDateLabel}</p>
          <p className="font-semibold text-[15px] text-white">{formatSubscriptionDate(subscriptionSummary.startAt)}</p>
        </div>
        <div>
          <p className="mb-1.5 text-[#7b8190] text-xs">{MEMBER_PAGE_CONTENT.subscription.expiryDateLabel}</p>
          <p className="font-semibold text-[15px] text-white">{formatSubscriptionDate(subscriptionSummary.endAt)}</p>
        </div>
      </div>

      <div className="mb-6 h-px bg-white/8" />

      <div className="flex flex-col gap-3.5">
        <Button
          className="h-[46px] w-full border border-cyan-400/50 bg-linear-to-br from-[#0072ff] to-[#00c6ff] font-bold text-white shadow-[0_4px_14px_rgba(0,114,255,0.25),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_8px_22px_rgba(0,114,255,0.4),inset_0_1px_1px_rgba(255,255,255,0.5)]"
          onClick={onOpenRedeem}
          type="button"
        >
          <Gift data-icon="inline-start" />
          {MEMBER_PAGE_CONTENT.subscription.redeemLabel}
        </Button>
        <Button
          asChild
          className="h-[46px] w-full border-[#2b313d] bg-transparent font-bold text-[#a7afbd] hover:bg-white/5 hover:text-white"
          type="button"
          variant="outline"
        >
          <Link href={MEMBER_PAGE_CONTENT.subscription.renewUrl}>
            <ArrowUpRight data-icon="inline-start" />
            {MEMBER_PAGE_CONTENT.subscription.renewLabel}
          </Link>
        </Button>
      </div>
    </section>
  );
}

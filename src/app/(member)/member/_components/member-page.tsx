"use client";

import { useState } from "react";

import Link from "next/link";

import { ChartLine, CircleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { AuthProfile } from "@/modules/auth/types";
import type { ConsolePaymentError, ConsoleSnapshot, ConsoleStateSnapshot } from "@/modules/console/types";

import { MEMBER_PAGE_CONTENT } from "./member-page-content";
import { MemberInstallationTabs } from "./member-installation-tabs";
import { MemberRedeemDialog } from "./member-redeem-dialog";
import { MemberSubscriptionCard } from "./member-subscription-card";
import { MemberSupportCard } from "./member-support-card";
import { MemberUserMenu } from "./member-user-menu";

type MemberPageProps = {
  initialPaymentError: ConsolePaymentError | null;
  initialSnapshot: ConsoleSnapshot;
  initialStateSnapshot: ConsoleStateSnapshot;
  profile: AuthProfile;
};

function getWelcomeName(profile: AuthProfile) {
  const [firstSegment = profile.username] = profile.username.split(/[\s-]+/);
  return firstSegment;
}

export function MemberPage({ initialPaymentError, initialSnapshot, initialStateSnapshot, profile }: MemberPageProps) {
  const [isRedeemDialogOpen, setIsRedeemDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#080c12] text-[#f8fafc] antialiased">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(0,194,255,0.08),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.08),transparent_40%)]">
        <header className="sticky top-0 z-40 border-b border-white/8 bg-[#080c12]/85 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
            <Link
              className="flex items-center gap-2.5 font-extrabold text-[20px] tracking-[-0.02em] text-white"
              href="/member"
            >
              <ChartLine className="size-5 text-cyan-400" />
              {MEMBER_PAGE_CONTENT.brandLabel}
            </Link>
            <MemberUserMenu onOpenRedeem={() => setIsRedeemDialogOpen(true)} profile={profile} />
          </div>
        </header>

        <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 lg:px-8">
          <section aria-label="Ucapan Selamat Datang" className="mb-8">
            <h1 className="mb-2 font-extrabold text-2xl tracking-[-0.02em] text-white sm:text-[28px]">
              {MEMBER_PAGE_CONTENT.welcome.titlePrefix}
              {getWelcomeName(profile)}
              {MEMBER_PAGE_CONTENT.welcome.titleSuffix}
            </h1>
            <p className="max-w-2xl text-[15px] leading-7 text-[#a7afbd]">{MEMBER_PAGE_CONTENT.welcome.description}</p>
          </section>

          {initialPaymentError ? (
            <Alert className="mb-6 border-red-500/30 bg-red-500/10 text-red-50" variant="destructive">
              <CircleAlert className="size-4" />
              <AlertTitle>{MEMBER_PAGE_CONTENT.paymentError.title}</AlertTitle>
              <AlertDescription>{MEMBER_PAGE_CONTENT.paymentError.messages[initialPaymentError]}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
            <div className="flex flex-col gap-8">
              <MemberSubscriptionCard
                onOpenRedeem={() => setIsRedeemDialogOpen(true)}
                snapshot={initialSnapshot}
                stateSnapshot={initialStateSnapshot}
              />
              <MemberSupportCard />
            </div>
            <MemberInstallationTabs />
          </div>
        </div>

        <MemberRedeemDialog onOpenChange={setIsRedeemDialogOpen} open={isRedeemDialogOpen} />
      </div>
    </div>
  );
}

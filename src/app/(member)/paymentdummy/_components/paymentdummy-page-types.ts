import type { ConsoleSubscriptionSnapshot } from "@/modules/console/types";
import type { MemberPurchasablePackage } from "@/modules/packages/types";

export type PaymentDummyPageProps = {
  currentSubscription: ConsoleSubscriptionSnapshot | null;
  selectedPackage: MemberPurchasablePackage;
};

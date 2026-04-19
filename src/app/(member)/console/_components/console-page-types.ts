import type { ConsolePaymentError, ConsoleSnapshot, ConsoleStateSnapshot } from "@/modules/console/types";
import type { MemberPurchasablePackage } from "@/modules/packages/types";

export type ConsolePageProps = {
  initialPackages: MemberPurchasablePackage[];
  initialPaymentError: ConsolePaymentError | null;
  initialSnapshot: ConsoleSnapshot;
  initialStateSnapshot: ConsoleStateSnapshot;
};

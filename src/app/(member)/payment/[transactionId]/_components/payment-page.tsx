import { PaymentClient } from "./payment-client";

import type { MemberPaymentPageData } from "@/modules/payments/types";

type PaymentPageProps = {
  initialPayment: MemberPaymentPageData;
};

export function PaymentPage({ initialPayment }: PaymentPageProps) {
  return <PaymentClient initialPayment={initialPayment} />;
}

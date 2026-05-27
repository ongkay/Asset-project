import { notFound } from "next/navigation";

import { PaymentPage } from "./_components/payment-page";

import { getMemberPaymentPageData } from "@/modules/payments/queries";
import { paymentTransactionIdSchema } from "@/modules/payments/schemas";
import { requireMemberShellAccess } from "@/modules/users/services";

type MemberPaymentRoutePageProps = {
  params: Promise<{ transactionId: string }>;
};

export default async function MemberPaymentRoutePage({ params }: MemberPaymentRoutePageProps) {
  const { transactionId } = await params;
  const parsedTransactionId = paymentTransactionIdSchema.safeParse(transactionId);

  if (!parsedTransactionId.success) {
    notFound();
  }

  const authenticatedUser = await requireMemberShellAccess();
  const initialPayment = await getMemberPaymentPageData({
    transactionId: parsedTransactionId.data,
    userId: authenticatedUser.profile.userId,
  });

  return <PaymentPage initialPayment={initialPayment} />;
}

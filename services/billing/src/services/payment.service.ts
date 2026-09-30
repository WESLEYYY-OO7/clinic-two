import { prisma } from "@cura/db-client";
import type { PaymentInputType } from "../validators/invoice.schema";
import { recomputeInvoiceBalance } from "./ledger.service";

export const recordPayment = async (tenantId: string, input: PaymentInputType) => {
  const payment = await prisma.payment.create({
    data: {
      tenantId,
      invoiceId: input.invoiceId,
      amount: input.amount,
      method: input.method,
      reference: input.reference
    }
  });

  const invoice = await recomputeInvoiceBalance(input.invoiceId);
  return { payment, invoice };
};
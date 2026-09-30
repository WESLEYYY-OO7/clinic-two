import { prisma } from "@clinic-two/db-client";

/**
 * Recompute an invoice's balance from its payments.
 * This is the single source of truth — never trust a stored balance.
 */
export const recomputeInvoiceBalance = async (invoiceId: string) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true }
  });

  if (!invoice) throw new Error("Invoice not found");

  const totalPaid = invoice.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  const total = Number(invoice.total);
  const balance = total - totalPaid;

  let status: "PAID" | "PARTIALLY_PAID" | "ISSUED" = "ISSUED";
  if (balance <= 0) status = "PAID";
  else if (totalPaid > 0) status = "PARTIALLY_PAID";

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { balance, status }
  });
};
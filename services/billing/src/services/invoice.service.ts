import { prisma } from "@clinic-two/db-client";
import type { InvoiceInputType } from "../validators/invoice.schema";

export const createInvoice = async (tenantId: string, input: InvoiceInputType) => {
  const subtotal = input.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const total = subtotal + input.tax - input.discount;

  const count = await prisma.invoice.count({ where: { tenantId } });
  const number = `INV-${String(count + 1).padStart(6, "0")}`;

  return prisma.invoice.create({
    data: {
      tenantId,
      patientId: input.patientId,
      number,
      status: "ISSUED",
      subtotal,
      tax: input.tax,
      discount: input.discount,
      total,
      balance: total,
      issuedAt: new Date(),
      lineItems: {
        create: input.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice
        }))
      }
    },
    include: { lineItems: true }
  });
};

export const listInvoices = async (tenantId: string, patientId?: string) => {
  return prisma.invoice.findMany({
    where: { tenantId, ...(patientId ? { patientId } : {}) },
    include: { lineItems: true, payments: true },
    orderBy: { createdAt: "desc" }
  });
};
import { z } from "zod";

export const InvoiceLineItemInput = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative()
});

export const InvoiceInput = z.object({
  patientId: z.string().uuid(),
  tax: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  lineItems: z.array(InvoiceLineItemInput).min(1)
});

export const PaymentInput = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(["CASH", "TRANSFER", "POS", "HMO", "CARD"]),
  reference: z.string().optional()
});

export type InvoiceInputType = z.infer<typeof InvoiceInput>;
export type PaymentInputType = z.infer<typeof PaymentInput>;
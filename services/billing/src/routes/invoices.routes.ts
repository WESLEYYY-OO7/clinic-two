import { Router } from "express";
import { auditFromRequest } from "@clinic-two/audit";
import { can } from "@clinic-two/auth";
import { InvoiceInput } from "../validators/invoice.schema";
import { createInvoice, listInvoices } from "../services/invoice.service";

const router = Router();

router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "invoice:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = InvoiceInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const invoice = await createInvoice(ctx.tenantId, parsed.data);

  await auditFromRequest(req, {
    action: "CREATE",
    resourceType: "Invoice",
    resourceId: invoice.id,
    afterState: invoice
  });

  res.status(201).json({ data: invoice });
});

router.get("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "invoice:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const patientId = req.query.patientId as string | undefined;
  const invoices = await listInvoices(ctx.tenantId, patientId);
  res.json({ data: invoices });
});

export default router;
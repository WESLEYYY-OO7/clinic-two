import { Router } from "express";
import { auditFromRequest } from "@cura/audit";
import { can } from "@cura/auth";
import { prisma } from "@cura/db-client";
import { InvoiceInput } from "../validators/invoice.schema";
import {
  createInvoice,
  listInvoices,
  getInvoice
} from "../services/invoice.service";

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

router.get("/:id", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "invoice:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const invoice = await getInvoice(ctx.tenantId, req.params.id);
  if (!invoice) return res.status(404).json({ error: "Not found" });

  await auditFromRequest(req, {
    action: "READ",
    resourceType: "Invoice",
    resourceId: invoice.id
  });

  res.json({ data: invoice });
});

router.patch("/:id/void", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "invoice:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const invoice = await prisma.invoice.update({
    where: { id: req.params.id },
    data: { status: "VOID" }
  });

  await auditFromRequest(req, {
    action: "VOID",
    resourceType: "Invoice",
    resourceId: invoice.id,
    afterState: invoice
  });

  res.json({ data: invoice });
});

export default router;
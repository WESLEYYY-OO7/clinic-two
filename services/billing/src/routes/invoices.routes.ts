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
// ── GET /api/invoices/stats — aggregated billing stats for dashboard ──
router.get("/stats", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "invoice:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { prisma } = await import("@cura/db-client");

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Invoices in last 6 months
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId: ctx.tenantId,
      createdAt: { gte: sixMonthsAgo }
    },
    select: { total: true, balance: true, createdAt: true, status: true }
  });

  // Group by month
  const monthly: Record<string, { revenue: number; outstanding: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthly[key] = { revenue: 0, outstanding: 0 };
  }

  for (const inv of invoices) {
    const d = new Date(inv.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthly[key]) {
      monthly[key].revenue += Number(inv.total);
      monthly[key].outstanding += Number(inv.balance);
    }
  }

  const monthlyArray = Object.entries(monthly).map(([month, data]) => ({
    month,
    revenue: Math.round(data.revenue),
    outstanding: Math.round(data.outstanding)
  }));

  res.json({
    data: {
      monthly: monthlyArray,
      totals: {
        revenue: invoices.reduce((s, i) => s + Number(i.total), 0),
        outstanding: invoices.reduce((s, i) => s + Number(i.balance), 0)
      }
    }
  });
});

export default router;
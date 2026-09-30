import { Router } from "express";
import { z } from "zod";
import { can } from "@cura/auth";
import { prisma } from "@cura/db-client";

const router = Router();

const PayrollRunInput = z.object({
  employeeId: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  gross: z.number().positive(),
  deductions: z.number().nonnegative()
});

router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "payroll:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = PayrollRunInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const net = parsed.data.gross - parsed.data.deductions;
  res.status(201).json({ data: { ...parsed.data, net } });
});

router.get("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "payroll:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const employees = await prisma.employee.findMany({
    where: { tenantId: ctx.tenantId }
  });

  res.json({ data: employees });
});

export default router;
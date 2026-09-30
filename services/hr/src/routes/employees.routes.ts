import { Router } from "express";
import { z } from "zod";
import { can } from "@cura/auth";
import { prisma } from "@cura/db-client";

const router = Router();

const EmployeeInput = z.object({
  fullName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.string().min(1),
  salaryBase: z.number().nonnegative()
});

router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "employee:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = EmployeeInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const employee = await prisma.employee.create({
    data: { tenantId: ctx.tenantId, ...parsed.data }
  });

  res.status(201).json({ data: employee });
});

router.get("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "employee:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const employees = await prisma.employee.findMany({
    where: { tenantId: ctx.tenantId }
  });

  res.json({ data: employees });
});

export default router;
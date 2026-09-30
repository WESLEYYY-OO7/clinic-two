import { Router } from "express";
import { z } from "zod";
import { can } from "@cura/auth";
import { prisma } from "@cura/db-client";

const router = Router();

const DrugInput = z.object({
  name: z.string().min(1),
  genericName: z.string().optional(),
  form: z.string().optional(),
  strength: z.string().optional()
});

router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "inventory:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = DrugInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const drug = await prisma.drug.create({
    data: { tenantId: ctx.tenantId, ...parsed.data }
  });

  res.status(201).json({ data: drug });
});

router.get("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "drug:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const drugs = await prisma.drug.findMany({
    where: { tenantId: ctx.tenantId, isActive: true },
    orderBy: { name: "asc" }
  });

  res.json({ data: drugs });
});

export default router;
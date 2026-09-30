import { Router } from "express";
import { z } from "zod";
import { auditFromRequest } from "@cura/audit";
import { can } from "@cura/auth";
import { prisma } from "@cura/db-client";

const router = Router();

const LabOrderInput = z.object({
  encounterId: z.string().uuid(),
  testCode: z.string().min(1),
  testName: z.string().min(1)
});

router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "order:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = LabOrderInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const order = await prisma.labOrder.create({
    data: { tenantId: ctx.tenantId, ...parsed.data }
  });

  await auditFromRequest(req, {
    action: "CREATE",
    resourceType: "LabOrder",
    resourceId: order.id,
    afterState: order
  });

  res.status(201).json({ data: order });
});

router.get("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "order:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const orders = await prisma.labOrder.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: "desc" }
  });

  res.json({ data: orders });
});

export default router;
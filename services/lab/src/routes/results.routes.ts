import { Router } from "express";
import { z } from "zod";
import { auditFromRequest } from "@cura/audit";
import { can } from "@cura/auth";
import { prisma } from "@cura/db-client";

const router = Router();

const LabResultInput = z.object({
  result: z.string().min(1)
});

router.patch("/:id/result", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "order:result:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = LabResultInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const order = await prisma.labOrder.update({
    where: { id: req.params.id },
    data: {
      result: parsed.data.result,
      status: "COMPLETED",
      resultedAt: new Date()
    }
  });

  await auditFromRequest(req, {
    action: "UPDATE",
    resourceType: "LabResult",
    resourceId: order.id,
    afterState: order
  });

  res.json({ data: order });
});

export default router;
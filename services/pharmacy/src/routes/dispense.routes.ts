import { Router } from "express";
import { z } from "zod";
import { auditFromRequest } from "@clinic-two/audit";
import { can } from "@clinic-two/auth";
import { prisma } from "@clinic-two/db-client";

const router = Router();

const DispenseInput = z.object({
  prescriptionId: z.string().uuid()
});

router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "prescription:dispense")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = DispenseInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const prescription = await prisma.prescription.update({
    where: { id: parsed.data.prescriptionId },
    data: { status: "DISPENSED" }
  });

  await auditFromRequest(req, {
    action: "DISPENSE",
    resourceType: "Prescription",
    resourceId: prescription.id,
    afterState: prescription
  });

  res.status(201).json({ data: prescription });
});

export default router;
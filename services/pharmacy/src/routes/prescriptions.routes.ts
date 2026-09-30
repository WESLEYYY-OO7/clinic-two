import { Router } from "express";
import { z } from "zod";
import { auditFromRequest } from "@clinic-two/audit";
import { can } from "@clinic-two/auth";
import { prisma } from "@clinic-two/db-client";

const router = Router();

const PrescriptionInput = z.object({
  patientId: z.string().uuid(),
  drugId: z.string().uuid(),
  encounterId: z.string().uuid().optional(),
  dose: z.string().min(1),
  frequency: z.string().min(1),
  durationDays: z.number().int().positive()
});

router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "prescription:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = PrescriptionInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const prescription = await prisma.prescription.create({
    data: { tenantId: ctx.tenantId, ...parsed.data }
  });

  await auditFromRequest(req, {
    action: "CREATE",
    resourceType: "Prescription",
    resourceId: prescription.id,
    afterState: prescription
  });

  res.status(201).json({ data: prescription });
});

router.patch("/:id/dispense", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "prescription:dispense")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const prescription = await prisma.prescription.update({
    where: { id: req.params.id },
    data: { status: "DISPENSED" }
  });

  await auditFromRequest(req, {
    action: "DISPENSE",
    resourceType: "Prescription",
    resourceId: prescription.id,
    afterState: prescription
  });

  res.json({ data: prescription });
});

router.get("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "prescription:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const prescriptions = await prisma.prescription.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: "desc" }
  });

  res.json({ data: prescriptions });
});

export default router;
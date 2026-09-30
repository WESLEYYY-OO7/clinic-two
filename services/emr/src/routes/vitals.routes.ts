import { Router } from "express";
import { z } from "zod";
import { auditFromRequest } from "@clinic-two/audit";
import { can } from "@clinic-two/auth";
import { prisma } from "@clinic-two/db-client";

const router = Router();

const VitalInput = z.object({
  encounterId: z.string().uuid(),
  temperatureC: z.number().optional(),
  heartRateBpm: z.number().int().optional(),
  respRateBpm: z.number().int().optional(),
  bpSystolic: z.number().int().optional(),
  bpDiastolic: z.number().int().optional(),
  spo2: z.number().int().optional(),
  weightKg: z.number().optional(),
  heightCm: z.number().optional()
});

router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "vitals:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = VitalInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { weightKg, heightCm } = parsed.data;
  const bmi =
    weightKg && heightCm ? weightKg / Math.pow(heightCm / 100, 2) : undefined;

  const vital = await prisma.vital.create({
    data: {
      tenantId: ctx.tenantId,
      encounterId: parsed.data.encounterId,
      temperatureC: parsed.data.temperatureC,
      heartRateBpm: parsed.data.heartRateBpm,
      respRateBpm: parsed.data.respRateBpm,
      bpSystolic: parsed.data.bpSystolic,
      bpDiastolic: parsed.data.bpDiastolic,
      spo2: parsed.data.spo2,
      weightKg,
      heightCm,
      bmi
    }
  });

  await auditFromRequest(req, {
    action: "CREATE",
    resourceType: "Vital",
    resourceId: vital.id,
    afterState: vital
  });

  res.status(201).json({ data: vital });
});

router.get("/:encounterId", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "encounter:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const vitals = await prisma.vital.findMany({
    where: { tenantId: ctx.tenantId, encounterId: req.params.encounterId },
    orderBy: { recordedAt: "desc" }
  });

  res.json({ data: vitals });
});

export default router;
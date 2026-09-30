import { Router } from "express";
import { z } from "zod";
import { auditFromRequest } from "@clinic-two/audit";
import { can } from "@clinic-two/auth";
import { prisma } from "@clinic-two/db-client";
import { evaluate, hasBlockingAlert, type CdsAlert } from "@clinic-two/cds";

const router = Router();

const PrescriptionInput = z.object({
  patientId: z.string().uuid(),
  drugId: z.string().uuid(),
  encounterId: z.string().uuid().optional(),
  dose: z.string().min(1),
  frequency: z.string().min(1),
  durationDays: z.number().int().positive(),
  /** Optional — if a critical alert fires, the doctor must provide a justification */
  overrideReason: z.string().min(10).optional()
});

/**
 * POST /api/prescriptions
 *
 * Flow:
 *   1. Validate input
 *   2. Load patient (for allergies, age, gender, pregnancy flag)
 *   3. Load drug being prescribed
 *   4. Load patient's active medications (last 90 days)
 *   5. Run CDS evaluate()
 *   6. If any alert is critical:
 *        - If no overrideReason → return 409 Conflict with the alerts
 *        - If overrideReason provided → create prescription, log override in audit
 *   7. Otherwise create prescription with the informational alerts attached
 */
router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "prescription:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = PrescriptionInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { patientId, drugId, encounterId, dose, frequency, durationDays, overrideReason } = parsed.data;

  // ── 1. Load patient ──
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, tenantId: ctx.tenantId }
  });
  if (!patient) return res.status(404).json({ error: "Patient not found" });

  // ── 2. Load drug ──
  const drug = await prisma.drug.findFirst({
    where: { id: drugId, tenantId: ctx.tenantId }
  });
  if (!drug) return res.status(404).json({ error: "Drug not found" });

  // ── 3. Load patient's current prescriptions (last 90 days) ──
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const activePrescriptions = await prisma.prescription.findMany({
    where: {
      tenantId: ctx.tenantId,
      patientId,
      status: { in: ["PENDING", "DISPENSED"] },
      createdAt: { gte: ninetyDaysAgo }
    },
    include: { drug: true }
  });

  const currentMeds = activePrescriptions.map((p) => p.drug.name);

  // ── 4. Compute age ──
  const ageYears = Math.floor(
    (Date.now() - new Date(patient.dateOfBirth).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000)
  );

  // ── 5. Run CDS ──
  const allergies = Array.isArray(patient.allergies)
    ? (patient.allergies as string[])
    : [];

  const alerts: CdsAlert[] = evaluate({
    patient: {
      allergies,
      age: ageYears,
      gender: patient.gender,
      isPregnant: false // TODO: add pregnancy flag to Patient model later
    },
    medications: [drug.name],
    currentMeds,
    diagnoses: []
  });

  // ── 6. Handle critical alerts ──
  if (hasBlockingAlert(alerts)) {
    if (!overrideReason) {
      // Block the prescription
      await auditFromRequest(req, {
        action: "CREATE",
        resourceType: "Prescription",
        afterState: {
          blocked: true,
          patientId,
          drugId,
          alerts
        }
      });

      return res.status(409).json({
        error: "Prescription blocked by clinical decision support",
        code: "CDS_BLOCKED",
        alerts,
        message:
          "This prescription was blocked because it may cause harm. " +
          "To override, resubmit with a clinical justification (overrideReason, min 10 chars)."
      });
    }
  }

  // ── 7. Create prescription ──
  const prescription = await prisma.prescription.create({
    data: {
      tenantId: ctx.tenantId,
      patientId,
      drugId,
      encounterId: encounterId ?? null,
      dose,
      frequency,
      durationDays,
      status: "PENDING"
    },
    include: { drug: true }
  });

  // ── 8. Audit ──
  const isOverride =
    hasBlockingAlert(alerts) && overrideReason !== undefined;

  await auditFromRequest(req, {
    action: isOverride ? "CREATE" : "CREATE",
    resourceType: "Prescription",
    resourceId: prescription.id,
    afterState: {
      prescription,
      cdsAlerts: alerts,
      overridden: isOverride,
      overrideReason: overrideReason ?? null
    }
  });

  res.status(201).json({
    data: prescription,
    cds: {
      alerts,
      overridden: isOverride,
      blocking: hasBlockingAlert(alerts)
    }
  });
});

/**
 * GET /api/prescriptions — list all
 * ?patientId=... — filter by patient
 */
router.get("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "prescription:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const patientId = req.query.patientId as string | undefined;

  const prescriptions = await prisma.prescription.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(patientId ? { patientId } : {})
    },
    include: { drug: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  res.json({ data: prescriptions });
});

/**
 * PATCH /api/prescriptions/:id/dispense — mark as dispensed
 */
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

/**
 * POST /api/prescriptions/preview
 * Run CDS without creating anything — lets the UI show warnings live.
 */
const PreviewInput = z.object({
  patientId: z.string().uuid(),
  drugId: z.string().uuid()
});

router.post("/preview", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "prescription:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = PreviewInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const patient = await prisma.patient.findFirst({
    where: { id: parsed.data.patientId, tenantId: ctx.tenantId }
  });
  if (!patient) return res.status(404).json({ error: "Patient not found" });

  const drug = await prisma.drug.findFirst({
    where: { id: parsed.data.drugId, tenantId: ctx.tenantId }
  });
  if (!drug) return res.status(404).json({ error: "Drug not found" });

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const activePrescriptions = await prisma.prescription.findMany({
    where: {
      tenantId: ctx.tenantId,
      patientId: parsed.data.patientId,
      status: { in: ["PENDING", "DISPENSED"] },
      createdAt: { gte: ninetyDaysAgo }
    },
    include: { drug: true }
  });

  const ageYears = Math.floor(
    (Date.now() - new Date(patient.dateOfBirth).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000)
  );

  const allergies = Array.isArray(patient.allergies)
    ? (patient.allergies as string[])
    : [];

  const alerts = evaluate({
    patient: {
      allergies,
      age: ageYears,
      gender: patient.gender,
      isPregnant: false
    },
    medications: [drug.name],
    currentMeds: activePrescriptions.map((p) => p.drug.name),
    diagnoses: []
  });

  res.json({
    data: {
      alerts,
      blocking: hasBlockingAlert(alerts)
    }
  });
});

export default router;
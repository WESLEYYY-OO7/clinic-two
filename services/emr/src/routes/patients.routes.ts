import { Router } from "express";
import { auditFromRequest } from "@cura/audit";
import { can, PATIENT_FIELDS } from "@cura/auth";
import { PatientInput } from "../validators/patient.schema";
import {
  createPatient,
  searchPatients,
  getPatientById
} from "../services/patient.service";

const router = Router();

/**
 * Filter patient fields by role tier.
 * LAB_TECH gets an even narrower view (name + MRN + DOB + gender only).
 */
const filterPatient = (patient: any, role: string) => {
  const allowed = new Set<string>();

  // Lab tech: minimal fields only
  if (role === "LAB_TECH") {
    ["id", "mrn", "firstName", "lastName", "dateOfBirth", "gender"].forEach(
      (f) => allowed.add(f)
    );
  } else {
    if (can(role as any, "patient:read:demographics")) {
      PATIENT_FIELDS.demographics.forEach((f) => allowed.add(f));
    }
    if (can(role as any, "patient:read:clinical")) {
      PATIENT_FIELDS.clinical.forEach((f) => allowed.add(f));
      allowed.add("fhirResource");
    }
  }

  const filtered: any = {};
  for (const key of Object.keys(patient)) {
    if (allowed.has(key)) filtered[key] = patient[key];
  }
  return filtered;
};

// ── POST /api/patients ──
router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "patient:write:demographics")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = PatientInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { patient, fhir } = await createPatient(ctx.tenantId, parsed.data);

  await auditFromRequest(req, {
    action: "CREATE",
    resourceType: "Patient",
    resourceId: patient.id,
    afterState: patient
  });

  const filtered = filterPatient(patient, ctx.role);
  res.status(201).json({ data: { ...filtered, fhir } });
});

// ── GET /api/patients — list ──
router.get("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "patient:read:demographics")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const q = String(req.query.q ?? "").trim();
  const patients = await searchPatients(ctx.tenantId, q);

  // Filter EVERY patient in the list — no leakage
  const filtered = patients.map((p) => filterPatient(p, ctx.role));

  res.json({ data: filtered });
});

// ── GET /api/patients/:id — detail ──
router.get("/:id", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "patient:read:demographics")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const patient = await getPatientById(ctx.tenantId, req.params.id);
  if (!patient) return res.status(404).json({ error: "Not found" });

  await auditFromRequest(req, {
    action: "READ",
    resourceType: "Patient",
    resourceId: patient.id
  });

  const filtered = filterPatient(patient, ctx.role);

  // Clinical data (encounters list) only for clinical users
  if (can(ctx.role, "patient:read:clinical") && patient.encounters) {
    filtered.encounters = patient.encounters;
  }

  // Financial data only for billing/financial users
  if (can(ctx.role, "patient:read:financial")) {
    const { prisma } = await import("@cura/db-client");
    const invoices = await prisma.invoice.findMany({
      where: { tenantId: ctx.tenantId, patientId: patient.id },
      include: { lineItems: true, payments: true },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    filtered.invoices = invoices;
  }

  res.json({ data: filtered });
});

// ── PATCH /api/patients/:id ──
const DEMOGRAPHIC_FIELDS = [
  "firstName",
  "middleName",
  "lastName",
  "dateOfBirth",
  "gender",
  "phone",
  "email",
  "address",
  "bloodGroup",
  "nextOfKin"
];

const CLINICAL_FIELDS = ["allergies"];

router.patch("/:id", async (req, res) => {
  const ctx = req.user!;

  const body = req.body as Record<string, unknown>;
  const demographicChanges: Record<string, unknown> = {};
  const clinicalChanges: Record<string, unknown> = {};

  for (const key of Object.keys(body)) {
    if (DEMOGRAPHIC_FIELDS.includes(key)) demographicChanges[key] = body[key];
    if (CLINICAL_FIELDS.includes(key)) clinicalChanges[key] = body[key];
  }

  const touchesDemographics = Object.keys(demographicChanges).length > 0;
  const touchesClinical = Object.keys(clinicalChanges).length > 0;

  if (touchesDemographics && !can(ctx.role, "patient:write:demographics")) {
    return res.status(403).json({ error: "Cannot edit demographics" });
  }
  if (touchesClinical && !can(ctx.role, "patient:write:clinical")) {
    return res.status(403).json({ error: "Cannot edit clinical data" });
  }

  const { prisma } = await import("@cura/db-client");
  const before = await prisma.patient.findFirst({
    where: { id: req.params.id, tenantId: ctx.tenantId }
  });
  if (!before) return res.status(404).json({ error: "Not found" });

  const updated = await prisma.patient.update({
    where: { id: req.params.id },
    data: { ...demographicChanges, ...clinicalChanges }
  });

  await auditFromRequest(req, {
    action: "UPDATE",
    resourceType: "Patient",
    resourceId: updated.id,
    beforeState: before,
    afterState: updated
  });

  res.json({ data: filterPatient(updated, ctx.role) });
});

export default router;
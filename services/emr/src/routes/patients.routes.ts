import { Router } from "express";
import { auditFromRequest } from "@cura/audit";
import { can } from "@cura/auth";
import { PatientInput } from "../validators/patient.schema";
import {
  createPatient,
  searchPatients,
  getPatientById
} from "../services/patient.service";

const router = Router();

router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "patient:write")) {
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

  res.status(201).json({ data: { ...patient, fhir } });
});

router.get("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "patient:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const q = String(req.query.q ?? "").trim();
  const patients = await searchPatients(ctx.tenantId, q);
  res.json({ data: patients });
});

router.get("/:id", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "patient:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const patient = await getPatientById(ctx.tenantId, req.params.id);
  if (!patient) return res.status(404).json({ error: "Not found" });

  await auditFromRequest(req, {
    action: "READ",
    resourceType: "Patient",
    resourceId: patient.id
  });

  res.json({ data: patient });
});

export default router;
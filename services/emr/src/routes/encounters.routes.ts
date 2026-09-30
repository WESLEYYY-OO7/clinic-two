import { Router } from "express";
import { auditFromRequest } from "@clinic-two/audit";
import { can } from "@clinic-two/auth";
import { EncounterInput } from "../validators/encounter.schema";
import {
  createEncounter,
  listEncounters,
  finishEncounter
} from "../services/encounter.service";

const router = Router();

router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "encounter:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = EncounterInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { encounter } = await createEncounter(ctx.tenantId, parsed.data);

  await auditFromRequest(req, {
    action: "CREATE",
    resourceType: "Encounter",
    resourceId: encounter.id,
    afterState: encounter
  });

  res.status(201).json({ data: encounter });
});

router.get("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "encounter:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const patientId = req.query.patientId as string | undefined;
  const encounters = await listEncounters(ctx.tenantId, patientId);
  res.json({ data: encounters });
});

router.patch("/:id/finish", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "encounter:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const encounter = await finishEncounter(ctx.tenantId, req.params.id);

  await auditFromRequest(req, {
    action: "UPDATE",
    resourceType: "Encounter",
    resourceId: encounter.id,
    afterState: encounter
  });

  res.json({ data: encounter });
});

export default router;
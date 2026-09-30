import { Router } from "express";
import { auditFromRequest } from "@cura/audit";
import { can } from "@cura/auth";
import { prisma } from "@cura/db-client";
import { EncounterInput } from "../validators/encounter.schema";
import {
  createEncounter,
  listEncounters,
  finishEncounter
} from "../services/encounter.service";

const router = Router();

// POST /api/encounters — create
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

// GET /api/encounters — list all (optionally filtered by patientId)
router.get("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "encounter:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const patientId = req.query.patientId as string | undefined;
  const encounters = await listEncounters(ctx.tenantId, patientId);
  res.json({ data: encounters });
});

// GET /api/encounters/:id — single encounter
router.get("/:id", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "encounter:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const encounter = await prisma.encounter.findFirst({
    where: { id: req.params.id, tenantId: ctx.tenantId }
  });

  if (!encounter) {
    return res.status(404).json({ error: "Encounter not found" });
  }

  await auditFromRequest(req, {
    action: "READ",
    resourceType: "Encounter",
    resourceId: encounter.id
  });

  res.json({ data: encounter });
});

// PATCH /api/encounters/:id/finish — close the encounter
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
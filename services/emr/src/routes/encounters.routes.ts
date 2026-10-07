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
// ── GET /api/encounters/stats — diagnoses stats for dashboard ──
router.get("/stats", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "encounter:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { prisma } = await import("@cura/db-client");

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Top diagnoses
  const diagnoses = await prisma.diagnosis.groupBy({
    by: ["code", "display"],
    where: {
      tenantId: ctx.tenantId,
      createdAt: { gte: sixMonthsAgo }
    },
    _count: { code: true },
    orderBy: { _count: { code: "desc" } },
    take: 10
  });

  // Monthly encounter counts
  const encounters = await prisma.encounter.findMany({
    where: {
      tenantId: ctx.tenantId,
      startedAt: { gte: sixMonthsAgo }
    },
    select: { startedAt: true }
  });

  const monthly: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthly[key] = 0;
  }

  for (const e of encounters) {
    const d = new Date(e.startedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthly[key] !== undefined) monthly[key]++;
  }

  const monthlyArray = Object.entries(monthly).map(([month, count]) => ({
    month,
    count
  }));

  res.json({
    data: {
      topDiagnoses: diagnoses.map((d) => ({
        code: d.code,
        display: d.display,
        count: d._count.code
      })),
      monthly: monthlyArray
    }
  });
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
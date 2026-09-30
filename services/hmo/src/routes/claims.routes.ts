import { Router } from "express";
import { z } from "zod";
import { auditFromRequest } from "@cura/audit";
import { can } from "@cura/auth";
import { prisma } from "@cura/db-client";
import { HygeiaAdapter } from "../adapters/HygeiaAdapter";
import { RelianceHmoAdapter } from "../adapters/RelianceHmoAdapter";
import type { HmoAdapter } from "../adapters/HmoAdapter";

const router = Router();

const adapters: Record<string, HmoAdapter> = {
  Hygeia: HygeiaAdapter,
  RelianceHMO: RelianceHmoAdapter
};

const ClaimInput = z.object({
  patientId: z.string().uuid(),
  hmo: z.enum(["Hygeia", "RelianceHMO"]),
  amount: z.number().positive(),
  notes: z.string().optional()
});

router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "invoice:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = ClaimInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const claim = await prisma.claim.create({
    data: {
      tenantId: ctx.tenantId,
      patientId: parsed.data.patientId,
      hmo: parsed.data.hmo,
      amount: parsed.data.amount,
      notes: parsed.data.notes,
      status: "SUBMITTED",
      submittedAt: new Date()
    }
  });

  await auditFromRequest(req, {
    action: "CREATE",
    resourceType: "LabOrder",
    resourceId: claim.id,
    afterState: claim
  });

  res.status(201).json({ data: claim });
});

router.get("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "invoice:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const claims = await prisma.claim.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: "desc" }
  });

  res.json({ data: claims });
});

export default router;
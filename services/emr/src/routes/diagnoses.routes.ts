import { Router } from "express";
import { z } from "zod";
import { auditFromRequest } from "@cura/audit";
import { can } from "@cura/auth";
import { prisma } from "@cura/db-client";

const router = Router();

const DiagnosisInput = z.object({
  encounterId: z.string().uuid(),
  code: z.string().min(1),
  display: z.string().min(1),
  certainty: z.string().optional()
});

router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "encounter:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = DiagnosisInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const diagnosis = await prisma.diagnosis.create({
    data: {
      tenantId: ctx.tenantId,
      encounterId: parsed.data.encounterId,
      code: parsed.data.code,
      display: parsed.data.display,
      certainty: parsed.data.certainty
    }
  });

  await auditFromRequest(req, {
    action: "CREATE",
    resourceType: "Diagnosis",
    resourceId: diagnosis.id,
    afterState: diagnosis
  });

  res.status(201).json({ data: diagnosis });
});

export default router;
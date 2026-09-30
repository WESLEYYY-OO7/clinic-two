import { Router } from "express";
import { z } from "zod";
import { auditFromRequest } from "@cura/audit";
import { can } from "@cura/auth";
import { prisma } from "@cura/db-client";

const router = Router();

const NoteInput = z.object({
  encounterId: z.string().uuid(),
  content: z.string().min(1)
});

router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "encounter:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = NoteInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const last = await prisma.clinicalNote.findFirst({
    where: { encounterId: parsed.data.encounterId },
    orderBy: { version: "desc" }
  });

  const note = await prisma.clinicalNote.create({
    data: {
      tenantId: ctx.tenantId,
      encounterId: parsed.data.encounterId,
      authorId: ctx.sub,
      content: parsed.data.content,
      version: (last?.version ?? 0) + 1
    }
  });

  await auditFromRequest(req, {
    action: "CREATE",
    resourceType: "ClinicalNote",
    resourceId: note.id,
    afterState: note
  });

  res.status(201).json({ data: note });
});

router.get("/:encounterId", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "encounter:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const notes = await prisma.clinicalNote.findMany({
    where: { tenantId: ctx.tenantId, encounterId: req.params.encounterId },
    orderBy: { version: "desc" }
  });

  res.json({ data: notes });
});

export default router;
import { Router } from "express";
import { z } from "zod";
import { auditFromRequest } from "@cura/audit";
import { can } from "@cura/auth";
import { prisma } from "@cura/db-client";

const router = Router();

router.get("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "inventory:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const locations = await prisma.stockLocation.findMany({
    where: { tenantId: ctx.tenantId, isActive: true },
    orderBy: { name: "asc" }
  });

  res.json({ data: locations });
});

const LocationInput = z.object({
  name: z.string().min(1),
  type: z.enum(["STORE", "PHARMACY", "WARD", "THEATRE", "LAB"])
});

router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "inventory:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = LocationInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const location = await prisma.stockLocation.create({
    data: { tenantId: ctx.tenantId, ...parsed.data }
  });

  await auditFromRequest(req, {
    action: "CREATE",
    resourceType: "StockLocation",
    resourceId: location.id,
    afterState: location
  });

  res.status(201).json({ data: location });
});

export default router;
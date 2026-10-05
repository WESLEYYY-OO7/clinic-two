import { Router } from "express";
import { z } from "zod";
import { auditFromRequest } from "@cura/audit";
import { can } from "@cura/auth";
import { prisma } from "@cura/db-client";
import { getItemTotalStock } from "../services/stock.service";

const router = Router();

// ── List items ──
router.get("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "inventory:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const category = req.query.category as string | undefined;
  const search = req.query.q as string | undefined;

  const items = await prisma.item.findMany({
    where: {
      tenantId: ctx.tenantId,
      isActive: true,
      ...(category ? { category: category as any } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: { name: "asc" },
    take: 200
  });

  // Attach total stock
  const enriched = await Promise.all(
    items.map(async (item) => ({
      ...item,
      totalStock: await getItemTotalStock(ctx.tenantId, item.id)
    }))
  );

  res.json({ data: enriched });
});

// ── Get one item ──
router.get("/:id", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "inventory:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const item = await prisma.item.findFirst({
    where: { id: req.params.id, tenantId: ctx.tenantId },
    include: {
      batches: {
        include: { location: true },
        orderBy: { expiryDate: "asc" }
      }
    }
  });
  if (!item) return res.status(404).json({ error: "Not found" });

  const total = item.batches.reduce((s, b) => s + b.quantity, 0);

  res.json({ data: { ...item, totalStock: total } });
});

// ── Create item ──
const ItemInput = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(["DRUG", "INJECTION", "CONSUMABLE", "EQUIPMENT", "REAGENT"]),
  unit: z.enum([
    "TABLET", "CAPSULE", "VIAL", "AMPOULE", "BOTTLE",
    "BOX", "SACHET", "PIECE", "PAIR", "SET"
  ]),
  reorderLevel: z.number().int().min(0).default(0)
});

router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "inventory:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = ItemInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const existing = await prisma.item.findFirst({
    where: { tenantId: ctx.tenantId, code: parsed.data.code }
  });
  if (existing) {
    return res.status(409).json({ error: "Item code already exists" });
  }

  const item = await prisma.item.create({
    data: { tenantId: ctx.tenantId, ...parsed.data }
  });

  await auditFromRequest(req, {
    action: "CREATE",
    resourceType: "Item",
    resourceId: item.id,
    afterState: item
  });

  res.status(201).json({ data: item });
});

// ── Update item ──
router.patch("/:id", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "inventory:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const before = await prisma.item.findFirst({
    where: { id: req.params.id, tenantId: ctx.tenantId }
  });
  if (!before) return res.status(404).json({ error: "Not found" });

  const parsed = ItemInput.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const item = await prisma.item.update({
    where: { id: req.params.id },
    data: parsed.data
  });

  await auditFromRequest(req, {
    action: "UPDATE",
    resourceType: "Item",
    resourceId: item.id,
    beforeState: before,
    afterState: item
  });

  res.json({ data: item });
});

export default router;
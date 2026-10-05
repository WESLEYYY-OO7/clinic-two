import { Router } from "express";
import { z } from "zod";
import { auditFromRequest } from "@cura/audit";
import { can } from "@cura/auth";
import { prisma } from "@cura/db-client";
import {
  getStockLevels,
  receiveStock,
  dispenseStock,
  transferStock,
  adjustStock,
  findFefoBatch
} from "../services/stock.service";

const router = Router();

// ── Stock levels (all items, per location) ──
router.get("/levels", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "inventory:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const levels = await getStockLevels(ctx.tenantId);
  res.json({ data: levels });
});

// ── Movements (ledger) ──
router.get("/movements", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "inventory:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const itemId = req.query.itemId as string | undefined;
  const locationId = req.query.locationId as string | undefined;
  const type = req.query.type as string | undefined;
  const limit = Math.min(Number(req.query.limit ?? 200), 500);

  const movements = await prisma.stockMovement.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(itemId ? { itemId } : {}),
      ...(locationId ? { locationId } : {}),
      ...(type ? { type: type as any } : {})
    },
    include: {
      item: { select: { id: true, code: true, name: true, unit: true } },
      location: { select: { id: true, name: true } },
      batch: { select: { id: true, batchNumber: true, expiryDate: true } }
    },
    orderBy: { createdAt: "desc" },
    take: limit
  });

  res.json({ data: movements });
});

// ── FEFO preview (what batch would be dispensed) ──
router.post("/fefo-preview", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "inventory:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = z.object({
    itemId: z.string().uuid(),
    locationId: z.string().uuid(),
    quantity: z.number().int().positive()
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const batch = await findFefoBatch(
    ctx.tenantId,
    parsed.data.itemId,
    parsed.data.locationId,
    parsed.data.quantity
  );

  res.json({ data: { batch } });
});

// ── Receive stock ──
const ReceiveInput = z.object({
  itemId: z.string().uuid(),
  locationId: z.string().uuid(),
  batchNumber: z.string().min(1),
  expiryDate: z.coerce.date(),
  quantity: z.number().int().positive(),
  costPrice: z.number().nonnegative().optional(),
  supplier: z.string().optional(),
  reason: z.string().optional()
});

router.post("/receive", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "inventory:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = ReceiveInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const result = await receiveStock(ctx.tenantId, {
      ...parsed.data,
      performedById: ctx.sub
    });

    await auditFromRequest(req, {
      action: "CREATE",
      resourceType: "StockMovement",
      resourceId: result.movement.id,
      afterState: result
    });

    res.status(201).json({ data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Dispense stock ──
const DispenseInput = z.object({
  itemId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().int().positive(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  reason: z.string().optional()
});

router.post("/dispense", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "inventory:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = DispenseInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const result = await dispenseStock(ctx.tenantId, {
      ...parsed.data,
      performedById: ctx.sub
    });

    await auditFromRequest(req, {
      action: "CREATE",
      resourceType: "StockMovement",
      resourceId: result.movements[0]?.id,
      afterState: result
    });

    res.status(201).json({ data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Transfer stock ──
const TransferInput = z.object({
  itemId: z.string().uuid(),
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  quantity: z.number().int().positive(),
  reason: z.string().optional()
});

router.post("/transfer", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "inventory:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = TransferInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const result = await transferStock(ctx.tenantId, {
      ...parsed.data,
      performedById: ctx.sub
    });

    await auditFromRequest(req, {
      action: "CREATE",
      resourceType: "StockMovement",
      resourceId: result.to.id,
      afterState: result
    });

    res.status(201).json({ data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Adjust stock ──
const AdjustInput = z.object({
  itemId: z.string().uuid(),
  locationId: z.string().uuid(),
  batchId: z.string().uuid(),
  newQuantity: z.number().int().min(0),
  reason: z.string().min(3)
});

router.post("/adjust", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "inventory:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = AdjustInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const movement = await adjustStock(ctx.tenantId, {
      ...parsed.data,
      performedById: ctx.sub
    });

    await auditFromRequest(req, {
      action: "CREATE",
      resourceType: "StockMovement",
      resourceId: movement.id,
      afterState: movement
    });

    res.status(201).json({ data: movement });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
import { Router } from "express";
import { z } from "zod";
import { auditFromRequest } from "@cura/audit";
import { can } from "@cura/auth";
import { prisma } from "@cura/db-client";
import { dispenseStock, findFefoBatch } from "@cura/inventory";

const router = Router();

/**
 * POST /api/prescriptions/:id/dispense
 * Body:
 *   { itemId, locationId, quantity? }
 * - itemId: required — the inventory item to dispense
 * - locationId: required — the stock location
 * - quantity: optional (defaults to prescription.durationDays)
 */
const DispenseInput = z.object({
  itemId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().int().positive().optional()
});

router.post("/:id/dispense", async (req, res) => {
  try {
    const ctx = req.user!;
    if (!can(ctx.role, "prescription:dispense")) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const parsed = DispenseInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    // Load prescription
    const prescription = await prisma.prescription.findFirst({
      where: { id: req.params.id, tenantId: ctx.tenantId },
      include: { drug: true }
    });
    if (!prescription) {
      return res.status(404).json({ error: "Prescription not found" });
    }
    if (prescription.status === "DISPENSED") {
      return res.status(400).json({ error: "Already dispensed" });
    }
    if (prescription.status === "CANCELLED") {
      return res.status(400).json({ error: "Prescription was cancelled" });
    }

    // Verify item belongs to this tenant
    const item = await prisma.item.findFirst({
      where: { id: parsed.data.itemId, tenantId: ctx.tenantId }
    });
    if (!item) return res.status(404).json({ error: "Item not found" });

    // Verify location
    const location = await prisma.stockLocation.findFirst({
      where: { id: parsed.data.locationId, tenantId: ctx.tenantId }
    });
    if (!location) return res.status(404).json({ error: "Location not found" });

    const quantity = parsed.data.quantity ?? prescription.durationDays;

    // FEFO preview check
    const preview = await findFefoBatch(
      ctx.tenantId,
      item.id,
      location.id,
      quantity
    );
    if (!preview) {
      const totalAgg = await prisma.stockBatch.aggregate({
        where: { tenantId: ctx.tenantId, itemId: item.id, locationId: location.id },
        _sum: { quantity: true }
      });
      const total = totalAgg._sum.quantity ?? 0;
      return res.status(400).json({
        error: `Insufficient stock. Available at ${location.name}: ${total}, required: ${quantity}`
      });
    }

    // Dispense
    const result = await dispenseStock(ctx.tenantId, {
      itemId: item.id,
      locationId: location.id,
      quantity,
      referenceType: "Prescription",
      referenceId: prescription.id,
      reason: `Rx: ${prescription.dose} ${prescription.frequency} × ${prescription.durationDays}d`,
      performedById: ctx.sub
    });

    // Mark DISPENSED
    const updated = await prisma.prescription.update({
      where: { id: prescription.id },
      data: { status: "DISPENSED" },
      include: { drug: true }
    });

    await auditFromRequest(req, {
      action: "DISPENSE",
      resourceType: "Prescription",
      resourceId: prescription.id,
      afterState: {
        prescription: updated,
        item: { id: item.id, name: item.name },
        location: { id: location.id, name: location.name },
        quantity
      }
    });

    res.status(201).json({
      data: {
        prescription: updated,
        dispensed: {
          item: { id: item.id, code: item.code, name: item.name },
          location: { id: location.id, name: location.name },
          quantity,
          movements: result.movements
        }
      }
    });
  } catch (err: any) {
    console.error("[dispense] error:", err);
    res.status(500).json({ error: err.message || "Dispense failed" });
  }
});

/**
 * POST /api/prescriptions/:id/dispense-preview
 * Body: { itemId, locationId, quantity? }
 */
const PreviewInput = z.object({
  itemId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().int().positive().optional()
});

router.post("/:id/dispense-preview", async (req, res) => {
  try {
    const ctx = req.user!;
    if (!can(ctx.role, "prescription:read")) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const parsed = PreviewInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const prescription = await prisma.prescription.findFirst({
      where: { id: req.params.id, tenantId: ctx.tenantId },
      include: { drug: true }
    });
    if (!prescription) return res.status(404).json({ error: "Not found" });

    const item = await prisma.item.findFirst({
      where: { id: parsed.data.itemId, tenantId: ctx.tenantId }
    });
    if (!item) return res.status(404).json({ error: "Item not found" });

    const location = await prisma.stockLocation.findFirst({
      where: { id: parsed.data.locationId, tenantId: ctx.tenantId }
    });
    if (!location) return res.status(404).json({ error: "Location not found" });

    const quantity = parsed.data.quantity ?? prescription.durationDays;

    const batches = await prisma.stockBatch.findMany({
      where: {
        tenantId: ctx.tenantId,
        itemId: item.id,
        locationId: location.id,
        quantity: { gt: 0 }
      },
      orderBy: { expiryDate: "asc" }
    });

    const total = batches.reduce((s, b) => s + b.quantity, 0);
    const available = total >= quantity;
    const fefoBatch = batches[0] ?? null;

    res.json({
      data: {
        available,
        quantity,
        totalAvailable: total,
        item: { id: item.id, code: item.code, name: item.name, unit: item.unit },
        location: { id: location.id, name: location.name },
        fefoBatch
      }
    });
  } catch (err: any) {
    console.error("[dispense-preview] error:", err);
    res.status(500).json({ error: err.message || "Preview failed" });
  }
});

export default router;
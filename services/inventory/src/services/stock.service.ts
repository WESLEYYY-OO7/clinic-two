import { prisma } from "@cura/db-client";

/**
 * Get the current stock quantity for an item across all locations.
 * Computed from batches — never trust a stored value.
 */
export const getItemTotalStock = async (
  tenantId: string,
  itemId: string
): Promise<number> => {
  const result = await prisma.stockBatch.aggregate({
    where: { tenantId, itemId },
    _sum: { quantity: true }
  });
  return result._sum.quantity ?? 0;
};

/**
 * Get stock per item, per location — for the "Stock Levels" view.
 */
export const getStockLevels = async (tenantId: string) => {
  const items = await prisma.item.findMany({
    where: { tenantId, isActive: true },
    include: {
      batches: true
    },
    orderBy: { name: "asc" }
  });

  const locations = await prisma.stockLocation.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: "asc" }
  });

  return items.map((item) => {
    const perLocation: Record<string, number> = {};
    for (const loc of locations) {
      perLocation[loc.id] = 0;
    }

    let total = 0;
    for (const batch of item.batches) {
      perLocation[batch.locationId] = (perLocation[batch.locationId] ?? 0) + batch.quantity;
      total += batch.quantity;
    }

    let status: "OUT" | "LOW" | "OK" = "OK";
    if (total === 0) status = "OUT";
    else if (total < item.reorderLevel) status = "LOW";

    return {
      id: item.id,
      code: item.code,
      name: item.name,
      category: item.category,
      unit: item.unit,
      reorderLevel: item.reorderLevel,
      total,
      status,
      perLocation
    };
  });
};

/**
 * FEFO — First-Expiry-First-Out.
 * Find the batch in a location with the earliest expiry that has enough stock.
 * Returns null if no single batch can cover the requested quantity.
 */
export const findFefoBatch = async (
  tenantId: string,
  itemId: string,
  locationId: string,
  requiredQty: number
) => {
  const batches = await prisma.stockBatch.findMany({
    where: {
      tenantId,
      itemId,
      locationId,
      quantity: { gte: requiredQty }
    },
    orderBy: { expiryDate: "asc" }
  });

  return batches[0] ?? null;
};

/**
 * Receive stock — creates a new batch and a RECEIVE movement.
 */
export const receiveStock = async (
  tenantId: string,
  input: {
    itemId: string;
    locationId: string;
    batchNumber: string;
    expiryDate: Date;
    quantity: number;
    costPrice?: number;
    supplier?: string;
    reason?: string;
    performedById?: string;
  }
) => {
  if (input.quantity <= 0) throw new Error("Quantity must be positive");

  // Check for existing batch with same number
  const existing = await prisma.stockBatch.findFirst({
    where: {
      tenantId,
      itemId: input.itemId,
      locationId: input.locationId,
      batchNumber: input.batchNumber
    }
  });

  let batch;
  if (existing) {
    batch = await prisma.stockBatch.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + input.quantity }
    });
  } else {
    batch = await prisma.stockBatch.create({
      data: {
        tenantId,
        itemId: input.itemId,
        locationId: input.locationId,
        batchNumber: input.batchNumber,
        expiryDate: input.expiryDate,
        quantity: input.quantity,
        costPrice: input.costPrice ?? 0,
        supplier: input.supplier
      }
    });
  }

  const movement = await prisma.stockMovement.create({
    data: {
      tenantId,
      itemId: input.itemId,
      batchId: batch.id,
      locationId: input.locationId,
      type: "RECEIVE",
      quantity: input.quantity,
      reason: input.reason ?? "Stock received",
      performedById: input.performedById
    }
  });

  return { batch, movement };
};

/**
 * Dispense stock — FEFO. Removes `quantity` from the earliest-expiring batch.
 * Throws if not enough stock.
 */
export const dispenseStock = async (
  tenantId: string,
  input: {
    itemId: string;
    locationId: string;
    quantity: number;
    referenceType?: string;
    referenceId?: string;
    reason?: string;
    performedById?: string;
  }
) => {
  if (input.quantity <= 0) throw new Error("Quantity must be positive");

  // Total available check
  const totalAgg = await prisma.stockBatch.aggregate({
    where: {
      tenantId,
      itemId: input.itemId,
      locationId: input.locationId
    },
    _sum: { quantity: true }
  });
  const totalAvailable = totalAgg._sum.quantity ?? 0;
  if (totalAvailable < input.quantity) {
    throw new Error(
      `Insufficient stock. Available: ${totalAvailable}, requested: ${input.quantity}`
    );
  }

  // Get all batches with stock, FEFO order
  const batches = await prisma.stockBatch.findMany({
    where: {
      tenantId,
      itemId: input.itemId,
      locationId: input.locationId,
      quantity: { gt: 0 }
    },
    orderBy: { expiryDate: "asc" }
  });

  let remaining = input.quantity;
  const movements: any[] = [];

  for (const batch of batches) {
    if (remaining <= 0) break;

    const take = Math.min(batch.quantity, remaining);

    await prisma.stockBatch.update({
      where: { id: batch.id },
      data: { quantity: batch.quantity - take }
    });

    const movement = await prisma.stockMovement.create({
      data: {
        tenantId,
        itemId: input.itemId,
        batchId: batch.id,
        locationId: input.locationId,
        type: "DISPENSE",
        quantity: -take,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        reason: input.reason ?? "Stock dispensed",
        performedById: input.performedById
      }
    });

    movements.push(movement);
    remaining -= take;
  }

  return { movements, quantityDispensed: input.quantity };
};

/**
 * Transfer stock between locations — FEFO from source.
 */
export const transferStock = async (
  tenantId: string,
  input: {
    itemId: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
    reason?: string;
    performedById?: string;
  }
) => {
  if (input.fromLocationId === input.toLocationId) {
    throw new Error("Source and destination locations must be different");
  }

  // Dispense from source
  const dispenseResult = await dispenseStock(tenantId, {
    itemId: input.itemId,
    locationId: input.fromLocationId,
    quantity: input.quantity,
    referenceType: "Transfer",
    reason: input.reason ?? "Transfer to another location",
    performedById: input.performedById
  });

  // Find or create a destination batch
  const sourceBatch = await prisma.stockBatch.findFirst({
    where: {
      tenantId,
      itemId: input.itemId,
      locationId: input.fromLocationId
    },
    orderBy: { expiryDate: "asc" }
  });

  const batchNumber = sourceBatch?.batchNumber ?? `TRF-${Date.now()}`;
  const expiryDate = sourceBatch?.expiryDate ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const { batch: destBatch, movement: destMovement } = await receiveStock(tenantId, {
    itemId: input.itemId,
    locationId: input.toLocationId,
    batchNumber,
    expiryDate,
    quantity: input.quantity,
    reason: input.reason ?? "Transfer from another location",
    performedById: input.performedById
  });

  // Log as TRANSFER_IN/OUT instead of the generic types
  await prisma.stockMovement.updateMany({
    where: {
      id: { in: [dispenseResult.movements[0]?.id, destMovement.id].filter(Boolean) }
    },
    data: { referenceType: "Transfer" }
  });

  return {
    from: dispenseResult.movements,
    to: destMovement
  };
};

/**
 * Adjust stock — for physical count corrections.
 */
export const adjustStock = async (
  tenantId: string,
  input: {
    itemId: string;
    locationId: string;
    batchId: string;
    newQuantity: number;
    reason: string;
    performedById?: string;
  }
) => {
  const batch = await prisma.stockBatch.findFirst({
    where: { id: input.batchId, tenantId, itemId: input.itemId, locationId: input.locationId }
  });
  if (!batch) throw new Error("Batch not found");

  const delta = input.newQuantity - batch.quantity;
  const type = delta > 0 ? "ADJUST_IN" : "ADJUST_OUT";

  await prisma.stockBatch.update({
    where: { id: batch.id },
    data: { quantity: input.newQuantity }
  });

  const movement = await prisma.stockMovement.create({
    data: {
      tenantId,
      itemId: input.itemId,
      batchId: batch.id,
      locationId: input.locationId,
      type: type as any,
      quantity: delta,
      reason: input.reason,
      performedById: input.performedById
    }
  });

  return movement;
};
import { Router } from "express";
import { z } from "zod";
import { auditFromRequest } from "@cura/audit";
import { can } from "@cura/auth";
import { prisma } from "@cura/db-client";

const router = Router();

// ── List lab tests catalogue ──
router.get("/tests", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "order:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const tests = await prisma.labTest.findMany({
    where: { tenantId: ctx.tenantId, isActive: true },
    orderBy: { name: "asc" }
  });

  res.json({ data: tests });
});

// ── Create a lab order ──
const OrderInput = z.object({
  encounterId: z.string().uuid(),
  patientId: z.string().uuid(),
  testId: z.string().uuid(),
  notes: z.string().optional()
});

router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "order:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = OrderInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const test = await prisma.labTest.findFirst({
    where: { id: parsed.data.testId, tenantId: ctx.tenantId }
  });
  if (!test) return res.status(404).json({ error: "Lab test not found" });

  const order = await prisma.labOrder.create({
    data: {
      tenantId: ctx.tenantId,
      encounterId: parsed.data.encounterId,
      patientId: parsed.data.patientId,
      testId: parsed.data.testId,
      status: "ORDERED",
      notes: parsed.data.notes
    }
  });

  const fhir = {
    resourceType: "ServiceRequest",
    id: order.id,
    status: "active",
    intent: "order",
    code: { coding: [{ system: "urn:cura:lab", code: test.code, display: test.name }] },
    subject: { reference: `Patient/${parsed.data.patientId}` },
    encounter: { reference: `Encounter/${parsed.data.encounterId}` },
    authoredOn: order.createdAt.toISOString()
  };

  await prisma.labOrder.update({
    where: { id: order.id },
    data: { fhirResource: fhir as object }
  });

  await auditFromRequest(req, {
    action: "CREATE",
    resourceType: "LabOrder",
    resourceId: order.id,
    afterState: { order, fhir }
  });

  res.status(201).json({ data: { ...order, fhir, test } });
});

// ── List orders ──
router.get("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "order:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const encounterId = req.query.encounterId as string | undefined;
  const patientId = req.query.patientId as string | undefined;

  const orders = await prisma.labOrder.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(encounterId ? { encounterId } : {}),
      ...(patientId ? { patientId } : {})
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  const testIds = [...new Set(orders.map((o) => o.testId))];
  const tests = await prisma.labTest.findMany({ where: { id: { in: testIds } } });
  const testMap = new Map(tests.map((t) => [t.id, t]));

  const enriched = orders.map((o) => ({ ...o, test: testMap.get(o.testId) ?? null }));

  res.json({ data: enriched });
});

// ── Get single order ──
router.get("/:id", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "order:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const order = await prisma.labOrder.findFirst({
    where: { id: req.params.id, tenantId: ctx.tenantId }
  });
  if (!order) return res.status(404).json({ error: "Order not found" });

  const test = await prisma.labTest.findFirst({ where: { id: order.testId } });

  res.json({ data: { ...order, test } });
});

// ── Enter result ──
const ResultInput = z.object({
  resultValue: z.string().min(1),
  resultFlag: z.enum(["NORMAL", "ABNORMAL", "CRITICAL"]).optional()
});

const detectFlag = (
  value: string,
  referenceRange: string
): "NORMAL" | "ABNORMAL" | "CRITICAL" => {
  const numMatch = value.match(/^-?\d+(\.\d+)?$/);
  const rangeMatch = referenceRange.match(
    /^(-?\d+(\.\d+)?)\s*[–-]\s*(-?\d+(\.\d+)?)$/
  );
  if (numMatch && rangeMatch) {
    const v = parseFloat(numMatch[0]);
    const lo = parseFloat(rangeMatch[1]);
    const hi = parseFloat(rangeMatch[3]);
    if (v >= lo && v <= hi) return "NORMAL";
    if (v < lo * 0.5 || v > hi * 1.5) return "CRITICAL";
    return "ABNORMAL";
  }
  return "NORMAL";
};

router.patch("/:id/result", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "order:result:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = ResultInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const existing = await prisma.labOrder.findFirst({
    where: { id: req.params.id, tenantId: ctx.tenantId }
  });
  if (!existing) return res.status(404).json({ error: "Order not found" });

  const test = await prisma.labTest.findFirst({ where: { id: existing.testId } });
  const flag =
    parsed.data.resultFlag ??
    (test ? detectFlag(parsed.data.resultValue, test.referenceRange) : "NORMAL");

  const updated = await prisma.labOrder.update({
    where: { id: existing.id },
    data: {
      status: "COMPLETED",
      resultValue: parsed.data.resultValue,
      resultFlag: flag,
      resultedAt: new Date(),
      resultedById: ctx.sub
    }
  });

  const fhir = {
    resourceType: "DiagnosticReport",
    id: updated.id,
    status: "final",
    code: {
      coding: [
        { system: "urn:cura:lab", code: test?.code ?? "", display: test?.name ?? "" }
      ]
    },
    subject: { reference: `Patient/${updated.patientId}` },
    encounter: { reference: `Encounter/${updated.encounterId}` },
    effectiveDateTime: updated.resultedAt?.toISOString(),
    conclusion:
      flag === "NORMAL"
        ? "Result within normal limits"
        : `Result flagged as ${flag}`,
    result: [
      {
        resourceType: "Observation",
        id: updated.id,
        status: "final",
        code: {
          coding: [
            { system: "urn:cura:lab", code: test?.code ?? "", display: test?.name ?? "" }
          ]
        },
        valueString: parsed.data.resultValue,
        interpretation: [
          {
            coding: [
              {
                system:
                  "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                code:
                  flag === "NORMAL" ? "N" : flag === "CRITICAL" ? "HH" : "A"
              }
            ]
          }
        ],
        effectiveDateTime: updated.resultedAt?.toISOString()
      }
    ]
  };

  await prisma.labOrder.update({
    where: { id: updated.id },
    data: { fhirResource: fhir as object }
  });

  await auditFromRequest(req, {
    action: "UPDATE",
    resourceType: "LabResult",
    resourceId: updated.id,
    afterState: { order: updated, flag, fhir }
  });

  res.json({ data: { ...updated, fhir, test } });
});

export default router;
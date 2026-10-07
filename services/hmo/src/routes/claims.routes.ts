import { Router } from "express";
import { z } from "zod";
import { auditFromRequest } from "@cura/audit";
import { can } from "@cura/auth";
import { SUPPORTED_HMOS } from "../adapters";
import {
  createClaim,
  submitClaim,
  listClaims,
  getClaim,
  updateClaimStatus,
  verifyEligibility
} from "../services/claim.service";

const router = Router();

// ── GET /api/claims/hmos — list supported HMOs ──
router.get("/hmos", async (_req, res) => {
  res.json({ data: SUPPORTED_HMOS });
});

// ── POST /api/claims/verify — verify eligibility ──
const VerifyInput = z.object({
  hmo: z.string(),
  hmoMemberId: z.string().min(3),
  planCode: z.string().optional()
});

router.post("/verify", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "invoice:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = VerifyInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const result = await verifyEligibility(
      parsed.data.hmo,
      parsed.data.hmoMemberId,
      parsed.data.planCode
    );
    res.json({ data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── GET /api/claims — list ──
router.get("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "invoice:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const claims = await listClaims(ctx.tenantId, {
    status: req.query.status as string | undefined,
    hmo: req.query.hmo as string | undefined,
    patientId: req.query.patientId as string | undefined
  });

  res.json({ data: claims });
});

// ── POST /api/claims — create draft ──
const CreateClaimInput = z.object({
  patientId: z.string().uuid(),
  hmo: z.string(),
  hmoMemberId: z.string().min(3),
  planCode: z.string().optional(),
  amount: z.number().positive(),
  diagnosisCodes: z.array(z.string()).optional(),
  serviceDate: z.coerce.date().optional(),
  notes: z.string().optional()
});

router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "invoice:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = CreateClaimInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const claim = await createClaim(ctx.tenantId, parsed.data);

    await auditFromRequest(req, {
      action: "CREATE",
      resourceType: "Claim",
      resourceId: claim.id,
      afterState: claim
    });

    res.status(201).json({ data: claim });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── GET /api/claims/:id ──
router.get("/:id", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "invoice:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const claim = await getClaim(ctx.tenantId, req.params.id);
  if (!claim) return res.status(404).json({ error: "Not found" });

  res.json({ data: claim });
});

// ── POST /api/claims/:id/submit ──
router.post("/:id/submit", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "invoice:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const claim = await submitClaim(ctx.tenantId, req.params.id);

    await auditFromRequest(req, {
      action: "SUBMIT",
      resourceType: "Claim",
      resourceId: claim.id,
      afterState: claim
    });

    res.json({ data: claim });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── PATCH /api/claims/:id/status ──
const StatusInput = z.object({
  status: z.enum([
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "APPROVED",
    "PARTIALLY_APPROVED",
    "DENIED",
    "PAID"
  ]),
  approvedAmount: z.number().nonnegative().optional(),
  rejectionReason: z.string().optional()
});

router.patch("/:id/status", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "invoice:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = StatusInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const claim = await updateClaimStatus(
      ctx.tenantId,
      req.params.id,
      parsed.data.status,
      parsed.data.approvedAmount,
      parsed.data.rejectionReason
    );

    await auditFromRequest(req, {
      action: "UPDATE",
      resourceType: "Claim",
      resourceId: claim.id,
      afterState: claim
    });

    res.json({ data: claim });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
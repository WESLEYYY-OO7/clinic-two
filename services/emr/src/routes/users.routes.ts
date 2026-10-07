import { Router } from "express";
import { z } from "zod";
import { auditFromRequest } from "@cura/audit";
import { can, hashPassword } from "@cura/auth";
import { prisma } from "@cura/db-client";

const router = Router();

// ── GET /api/users — list staff ──
router.get("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "employee:read") && !can(ctx.role, "user:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const users = await prisma.user.findMany({
    where: { tenantId: ctx.tenantId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      phone: true,
      lastLoginAt: true,
      createdAt: true
    },
    orderBy: { createdAt: "asc" }
  });

  res.json({ data: users });
});

// ── POST /api/users — create staff ──
const CreateUserInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum([
    "SUPER_ADMIN",
    "CLINIC_ADMIN",
    "DOCTOR",
    "NURSE",
    "PHARMACIST",
    "LAB_TECH",
    "RECEPTIONIST",
    "BILLING",
    "HR"
  ]),
  phone: z.string().optional()
});

router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "user:write") && !can(ctx.role, "employee:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = CreateUserInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const existing = await prisma.user.findUnique({
    where: {
      tenantId_email: { tenantId: ctx.tenantId, email: parsed.data.email }
    }
  });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const user = await prisma.user.create({
    data: {
      tenantId: ctx.tenantId,
      email: parsed.data.email,
      passwordHash,
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      phone: parsed.data.phone
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      phone: true,
      createdAt: true
    }
  });

  await auditFromRequest(req, {
    action: "CREATE",
    resourceType: "User",
    resourceId: user.id,
    afterState: user
  });

  res.status(201).json({ data: user });
});

// ── PATCH /api/users/:id — edit staff ──
const UpdateUserInput = z.object({
  fullName: z.string().min(2).optional(),
  role: z
    .enum([
      "SUPER_ADMIN",
      "CLINIC_ADMIN",
      "DOCTOR",
      "NURSE",
      "PHARMACIST",
      "LAB_TECH",
      "RECEPTIONIST",
      "BILLING",
      "HR"
    ])
    .optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional()
});

router.patch("/:id", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "user:write") && !can(ctx.role, "employee:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = UpdateUserInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const existing = await prisma.user.findFirst({
    where: { id: req.params.id, tenantId: ctx.tenantId }
  });
  if (!existing) return res.status(404).json({ error: "User not found" });

  if (parsed.data.isActive === false && req.params.id === ctx.sub) {
    return res.status(400).json({ error: "Cannot deactivate yourself" });
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: parsed.data,
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      phone: true,
      createdAt: true
    }
  });

  await auditFromRequest(req, {
    action: "UPDATE",
    resourceType: "User",
    resourceId: user.id,
    beforeState: existing,
    afterState: user
  });

  res.json({ data: user });
});

// ── POST /api/users/:id/reset-password ──
const ResetPasswordInput = z.object({
  password: z.string().min(8)
});

router.post("/:id/reset-password", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "user:write") && !can(ctx.role, "employee:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = ResetPasswordInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const existing = await prisma.user.findFirst({
    where: { id: req.params.id, tenantId: ctx.tenantId }
  });
  if (!existing) return res.status(404).json({ error: "User not found" });

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({
    where: { id: req.params.id },
    data: { passwordHash }
  });

  await auditFromRequest(req, {
    action: "UPDATE",
    resourceType: "User",
    resourceId: req.params.id,
    afterState: { action: "password_reset" }
  });

  res.json({ data: { ok: true } });
});

export default router;
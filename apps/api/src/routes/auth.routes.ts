import { Router } from "express";
import { z } from "zod";
import { prisma } from "@cura/db-client";
import {
  signToken,
  verifyPassword,
  hashPassword,
  type Role
} from "@cura/auth";
import { auditFromRequest } from "@cura/audit";

const router = Router();

const LoginInput = z.object({
  tenantSlug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1)
});

const RegisterInput = z.object({
  tenantName: z.string().min(1),
  tenantSlug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1)
});

router.post("/register", async (req, res) => {
  const parsed = RegisterInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { tenantName, tenantSlug, email, password, fullName } = parsed.data;

  const existing = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (existing) return res.status(409).json({ error: "Slug already taken" });

  const tenant = await prisma.tenant.create({
    data: { name: tenantName, slug: tenantSlug }
  });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email,
      passwordHash,
      fullName,
      role: "CLINIC_ADMIN"
    }
  });

  const token = signToken(
    { sub: user.id, tenantId: tenant.id, role: user.role as Role },
    process.env.JWT_SECRET!,
    process.env.JWT_EXPIRES_IN || "7d"
  );

  res.status(201).json({
    data: {
      token,
      user: { id: user.id, email: user.email, role: user.role, tenantId: tenant.id }
    }
  });
});

router.post("/login", async (req, res) => {
  const parsed = LoginInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { tenantSlug, email, password } = parsed.data;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) return res.status(401).json({ error: "Invalid credentials" });

  const user = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } }
  });
  if (!user || !user.isActive) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  const token = signToken(
    { sub: user.id, tenantId: tenant.id, role: user.role as Role },
    process.env.JWT_SECRET!,
    process.env.JWT_EXPIRES_IN || "7d"
  );

  await auditFromRequest(
    { user: { sub: user.id, tenantId: tenant.id }, ip: req.ip, headers: req.headers as any },
    { action: "LOGIN", resourceType: "User", resourceId: user.id }
  );

  res.json({
    data: {
      token,
      user: { id: user.id, email: user.email, role: user.role, tenantId: tenant.id }
    }
  });
});

export default router;
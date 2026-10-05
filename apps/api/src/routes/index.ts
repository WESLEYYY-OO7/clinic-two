import { Router } from "express";
import { prisma } from "@cura/db-client";
import { can, ROLE_MENU, PERMISSIONS, type Role } from "@cura/auth";
import {
  patientsRouter,
  encountersRouter,
  vitalsRouter,
  notesRouter,
  diagnosesRouter,
  appointmentsRouter,
  usersRouter
} from "@cura/emr";
import { invoicesRouter, paymentsRouter } from "@cura/billing";
import { drugsRouter, prescriptionsRouter } from "@cura/pharmacy";
import { labOrdersRouter } from "@cura/lab";
import { employeesRouter } from "@cura/hr";
import { claimsRouter } from "@cura/hmo";
import { evaluateRouter } from "@cura/cds";

const router = Router();

// ── Current user (/me) ──
router.get("/me", async (req, res) => {
  const ctx = req.user!;
  const user = await prisma.user.findFirst({
    where: { id: ctx.sub, tenantId: ctx.tenantId },
      select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      tenantId: true,
      isActive: true,
      lastLoginAt: true
    }
  });
  if (!user || !user.isActive) {
    return res.status(401).json({ error: "User not found or inactive" });
  }

  res.json({
    data: {
      user,
      role: user.role,
      menu: ROLE_MENU[user.role as Role] ?? [],
      permissions: PERMISSIONS[user.role as Role] ?? []
    }
  });
});

router.use("/patients", patientsRouter);
router.use("/encounters", encountersRouter);
router.use("/vitals", vitalsRouter);
router.use("/notes", notesRouter);
router.use("/diagnoses", diagnosesRouter);
router.use("/appointments", appointmentsRouter);
router.use("/users", usersRouter);
router.use("/invoices", invoicesRouter);
router.use("/payments", paymentsRouter);
router.use("/drugs", drugsRouter);
router.use("/prescriptions", prescriptionsRouter);
router.use("/lab-orders", labOrdersRouter);
router.use("/employees", employeesRouter);
router.use("/claims", claimsRouter);
router.use("/cds", evaluateRouter);

export default router;
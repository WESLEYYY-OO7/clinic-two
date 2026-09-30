import { Router } from "express";
import { auditFromRequest } from "@cura/audit";
import { can } from "@cura/auth";
import { AppointmentInput } from "../validators/appointment.schema";
import {
  createAppointment,
  listAppointments
} from "../services/appointment.service";

const router = Router();

router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "appointment:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = AppointmentInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const appointment = await createAppointment(ctx.tenantId, parsed.data);

    await auditFromRequest(req, {
      action: "CREATE",
      resourceType: "Appointment",
      resourceId: appointment.id,
      afterState: appointment
    });

    res.status(201).json({ data: appointment });
  } catch (err) {
    res.status(409).json({ error: (err as Error).message });
  }
});

router.get("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "appointment:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const appointments = await listAppointments(ctx.tenantId);
  res.json({ data: appointments });
});

export default router;
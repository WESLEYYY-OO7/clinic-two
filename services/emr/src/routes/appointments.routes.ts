import { Router } from "express";
import { auditFromRequest } from "@cura/audit";
import { can } from "@cura/auth";
import {
  AppointmentInput,
  AppointmentStatusInput
} from "../validators/appointment.schema";
import {
  createAppointment,
  listAppointments,
  getAppointment,
  updateAppointmentStatus,
  markReminderSent
} from "../services/appointment.service";
import { enqueueReminder } from "../services/reminder.service";

const router = Router();

// ── GET /api/appointments — list (role-scoped) ──
router.get("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "appointment:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Role-scoped filtering:
  //   DOCTOR / NURSE → only their own appointments (as provider)
  //   RECEPTIONIST / ADMIN → all
  const roleScopedProviderId =
    ctx.role === "DOCTOR" || ctx.role === "NURSE" ? ctx.sub : undefined;

  const appointments = await listAppointments(ctx.tenantId, {
    patientId: req.query.patientId as string | undefined,
    providerId:
      roleScopedProviderId ?? (req.query.providerId as string | undefined),
    status: req.query.status as string | undefined,
    from: req.query.from ? new Date(String(req.query.from)) : undefined,
    to: req.query.to ? new Date(String(req.query.to)) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined
  });

  res.json({ data: appointments });
});

// ── POST /api/appointments ──
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
    const appt = await createAppointment(ctx.tenantId, parsed.data);

    await auditFromRequest(req, {
      action: "CREATE",
      resourceType: "Appointment",
      resourceId: appt.id,
      afterState: appt
    });

    res.status(201).json({ data: appt });
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});

// ── GET /api/appointments/:id ──
router.get("/:id", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "appointment:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const appt = await getAppointment(ctx.tenantId, req.params.id);
  if (!appt) return res.status(404).json({ error: "Not found" });

  // Doctor/nurse can only see their own appointments
  if (
    (ctx.role === "DOCTOR" || ctx.role === "NURSE") &&
    appt.providerId !== ctx.sub
  ) {
    return res.status(403).json({ error: "Not your appointment" });
  }

  res.json({ data: appt });
});

// ── PATCH /api/appointments/:id/status ──
router.patch("/:id/status", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "appointment:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = AppointmentStatusInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const before = await getAppointment(ctx.tenantId, req.params.id);
    if (!before) return res.status(404).json({ error: "Not found" });

    // Doctor/nurse can only update their own appointments
    if (
      (ctx.role === "DOCTOR" || ctx.role === "NURSE") &&
      before.providerId !== ctx.sub
    ) {
      return res.status(403).json({ error: "Not your appointment" });
    }

    const updated = await updateAppointmentStatus(
      ctx.tenantId,
      req.params.id,
      parsed.data.status
    );

    await auditFromRequest(req, {
      action: "UPDATE",
      resourceType: "Appointment",
      resourceId: updated.id,
      beforeState: before,
      afterState: updated
    });

    res.json({ data: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── POST /api/appointments/:id/remind ──
router.post("/:id/remind", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "appointment:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const appt = await getAppointment(ctx.tenantId, req.params.id);
  if (!appt) return res.status(404).json({ error: "Not found" });

  if (!appt.patient.phone) {
    return res.status(400).json({ error: "Patient has no phone number on file" });
  }

  const jobId = await enqueueReminder({
    appointmentId: appt.id,
    tenantId: ctx.tenantId,
    to: appt.patient.phone,
    patientName: `${appt.patient.firstName} ${appt.patient.lastName}`,
    startsAt: appt.startsAt
  });

  await markReminderSent(ctx.tenantId, appt.id);

  await auditFromRequest(req, {
    action: "CREATE",
    resourceType: "Appointment",
    resourceId: appt.id,
    afterState: { reminderQueued: true, jobId }
  });

  res.status(201).json({ data: { queued: true, jobId } });
});

export default router;
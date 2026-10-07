import { Router } from "express";
import { auditFromRequest } from "@cura/audit";
import { can } from "@cura/auth";
import { z } from "zod";
import {
  AppointmentInput,
  AppointmentStatusInput
} from "../validators/appointment.schema";
import {
  createAppointment,
  listAppointments,
  getAppointment,
  updateAppointmentStatus,
  markReminderSent,
  advanceVisitStatus,
  getTodayAppointments
} from "../services/appointment.service";
import { enqueueReminder } from "../services/reminder.service";

const router = Router();

// ── GET /api/appointments — list ──
router.get("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "appointment:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const roleScopedProviderId =
    ctx.role === "DOCTOR" || ctx.role === "NURSE" ? ctx.sub : undefined;

  const appointments = await listAppointments(ctx.tenantId, {
    patientId: req.query.patientId as string | undefined,
    providerId:
      roleScopedProviderId ?? (req.query.providerId as string | undefined),
    status: req.query.status as string | undefined,
    visitStatus: req.query.visitStatus as string | undefined,
    from: req.query.from ? new Date(String(req.query.from)) : undefined,
    to: req.query.to ? new Date(String(req.query.to)) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined
  });

  res.json({ data: appointments });
});

// ── GET /api/appointments/today — today's appointments ──
router.get("/today", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "appointment:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const appointments = await getTodayAppointments(ctx.tenantId);
  res.json({ data: appointments });
});

// ── GET /api/appointments/queue — role-specific queue ──
router.get("/queue", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "appointment:read")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const today = await getTodayAppointments(ctx.tenantId);

  // Group by visit status
  const grouped: Record<string, any[]> = {
    SCHEDULED: [],
    CHECKED_IN: [],
    VITALS_DONE: [],
    IN_CONSULTATION: [],
    RX_WRITTEN: [],
    DISPENSED: [],
    BILLED: [],
    DONE: []
  };

  for (const appt of today) {
    if (grouped[appt.visitStatus]) {
      grouped[appt.visitStatus].push(appt);
    }
  }

  res.json({ data: grouped });
});

// ── POST /api/appointments — create ──
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
    const updated = await updateAppointmentStatus(
      ctx.tenantId,
      req.params.id,
      parsed.data.status
    );
    await auditFromRequest(req, {
      action: "UPDATE",
      resourceType: "Appointment",
      resourceId: updated.id,
      afterState: updated
    });
    res.json({ data: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── PATCH /api/appointments/:id/visit — advance visit workflow ──
const VisitAdvanceInput = z.object({
  visitStatus: z.enum([
    "SCHEDULED",
    "CHECKED_IN",
    "VITALS_DONE",
    "IN_CONSULTATION",
    "RX_WRITTEN",
    "DISPENSED",
    "BILLED",
    "DONE",
    "CANCELLED"
  ]),
  encounterId: z.string().uuid().optional()
});

router.patch("/:id/visit", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "appointment:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = VisitAdvanceInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const updated = await advanceVisitStatus(
      ctx.tenantId,
      req.params.id,
      parsed.data.visitStatus,
      parsed.data.encounterId
    );

    await auditFromRequest(req, {
      action: "UPDATE",
      resourceType: "Appointment",
      resourceId: updated.id,
      afterState: {
        visitStatus: updated.visitStatus,
        transition: parsed.data.visitStatus
      }
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
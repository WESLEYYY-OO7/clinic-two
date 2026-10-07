import { prisma } from "@cura/db-client";
import type { AppointmentInputType } from "../validators/appointment.schema";

export const createAppointment = async (
  tenantId: string,
  input: AppointmentInputType
) => {
  if (input.endsAt <= input.startsAt) {
    throw new Error("End time must be after start time");
  }

  if (input.startsAt < new Date(Date.now() - 60 * 60 * 1000)) {
    throw new Error("Cannot book appointments in the past");
  }

  const conflict = await prisma.appointment.findFirst({
    where: {
      tenantId,
      providerId: input.providerId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startsAt: { lt: input.endsAt },
      endsAt: { gt: input.startsAt }
    }
  });

  if (conflict) {
    throw new Error(
      `Provider already booked from ${conflict.startsAt.toLocaleString()} to ${conflict.endsAt.toLocaleString()}`
    );
  }

  const appt = await prisma.appointment.create({
    data: {
      tenantId,
      patientId: input.patientId,
      providerId: input.providerId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      reason: input.reason,
      notes: input.notes,
      status: "SCHEDULED",
      visitStatus: "SCHEDULED"
    }
  });

  const patient = await prisma.patient.findFirst({
    where: { id: appt.patientId, tenantId },
    select: {
      id: true,
      mrn: true,
      firstName: true,
      lastName: true,
      phone: true
    }
  });

  return { ...appt, patient };
};

export const listAppointments = async (
  tenantId: string,
  filters: {
    patientId?: string;
    providerId?: string;
    status?: string;
    visitStatus?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  } = {}
) => {
  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      ...(filters.patientId ? { patientId: filters.patientId } : {}),
      ...(filters.providerId ? { providerId: filters.providerId } : {}),
      ...(filters.status ? { status: filters.status as any } : {}),
      ...(filters.visitStatus ? { visitStatus: filters.visitStatus as any } : {}),
      ...(filters.from || filters.to
        ? {
            startsAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {})
            }
          }
        : {})
    },
    orderBy: { startsAt: "asc" },
    take: filters.limit ?? 200
  });

  const patientIds = [...new Set(appointments.map((a) => a.patientId))];
  const patients = await prisma.patient.findMany({
    where: { id: { in: patientIds } },
    select: {
      id: true,
      mrn: true,
      firstName: true,
      lastName: true,
      phone: true,
      dateOfBirth: true,
      gender: true,
      allergies: true
    }
  });
  const patientMap = new Map(patients.map((p) => [p.id, p]));

  return appointments.map((a) => ({
    ...a,
    patient: patientMap.get(a.patientId) ?? null
  }));
};

export const getAppointment = async (tenantId: string, id: string) => {
  const appt = await prisma.appointment.findFirst({
    where: { id, tenantId }
  });
  if (!appt) return null;

  const patient = await prisma.patient.findFirst({
    where: { id: appt.patientId, tenantId },
    select: {
      id: true,
      mrn: true,
      firstName: true,
      lastName: true,
      phone: true,
      dateOfBirth: true,
      gender: true,
      allergies: true
    }
  });

  return { ...appt, patient };
};

/**
 * Advance the patient through the visit workflow.
 * Each transition is explicitly allowed or blocked based on current state.
 */
const VISIT_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ["CHECKED_IN", "CANCELLED"],
  CHECKED_IN: ["VITALS_DONE", "CANCELLED"],
  VITALS_DONE: ["IN_CONSULTATION", "CANCELLED"],
  IN_CONSULTATION: ["RX_WRITTEN", "DISPENSED", "BILLED", "DONE"],
  RX_WRITTEN: ["DISPENSED", "BILLED"],
  DISPENSED: ["BILLED", "DONE"],
  BILLED: ["DONE"],
  DONE: [],
  CANCELLED: ["SCHEDULED"]
};

export const advanceVisitStatus = async (
  tenantId: string,
  appointmentId: string,
  newStatus: string,
  encounterId?: string
) => {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId }
  });
  if (!appt) throw new Error("Appointment not found");

  const allowed = VISIT_TRANSITIONS[appt.visitStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Cannot transition visit from ${appt.visitStatus} to ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`
    );
  }

  const now = new Date();
  const timestampField: Record<string, keyof typeof appt | null> = {
    CHECKED_IN: "checkedInAt",
    VITALS_DONE: "vitalsDoneAt",
    IN_CONSULTATION: "consultationAt",
    DONE: "completedAt"
  };

  const updateData: any = { visitStatus: newStatus as any };
  const field = timestampField[newStatus];
  if (field) updateData[field] = now;
  if (encounterId) updateData.encounterId = encounterId;

  return prisma.appointment.update({
    where: { id: appointmentId },
    data: updateData,
    include: { patient: true }
  });
};

export const updateAppointmentStatus = async (
  tenantId: string,
  id: string,
  newStatus: string
) => {
  const appt = await prisma.appointment.findFirst({
    where: { id, tenantId }
  });
  if (!appt) throw new Error("Appointment not found");

  return prisma.appointment.update({
    where: { id },
    data: { status: newStatus as any }
  });
};

export const markReminderSent = async (tenantId: string, id: string) => {
  return prisma.appointment.update({
    where: { id },
    data: { reminderSentAt: new Date() }
  });
};

/**
 * Workflow queues — role-specific "what do I need to do now" lists.
 */
export const getVisitQueue = async (tenantId: string, visitStatus: string) => {
  return listAppointments(tenantId, { visitStatus });
};

/**
 * Today's appointments — across all visit states.
 */
export const getTodayAppointments = async (tenantId: string) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return listAppointments(tenantId, { from: start, to: end });
};
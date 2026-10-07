import { prisma } from "@cura/db-client";
import type { AppointmentInputType } from "../validators/appointment.schema";

export const createAppointment = async (
  tenantId: string,
  input: AppointmentInputType
) => {
  if (input.endsAt <= input.startsAt) {
    throw new Error("End time must be after start time");
  }

  if (input.startsAt < new Date()) {
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
      status: "SCHEDULED"
    }
  });

  // Fetch patient separately
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

  // Fetch all patients in one query
  const patientIds = [...new Set(appointments.map((a) => a.patientId))];
  const patients = await prisma.patient.findMany({
    where: { id: { in: patientIds } },
    select: {
      id: true,
      mrn: true,
      firstName: true,
      lastName: true,
      phone: true
    }
  });
  const patientMap = new Map(patients.map((p) => [p.id, p]));

  return appointments.map((a) => ({
    ...a,
    patient: patientMap.get(a.patientId) ?? null
  }));
};

export const getAppointment = async (tenantId: string, id: string) => {
  // Step 1: fetch the appointment
  const appt = await prisma.appointment.findFirst({
    where: { id, tenantId }
  });
  if (!appt) return null;

  // Step 2: fetch the patient separately (avoids the include: { patient: true } hang)
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

const VALID_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["ARRIVED", "CANCELLED", "NO_SHOW"],
  ARRIVED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  NO_SHOW: ["SCHEDULED"],
  CANCELLED: ["SCHEDULED"]
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

  const allowed = VALID_TRANSITIONS[appt.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Cannot transition from ${appt.status} to ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`
    );
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: newStatus as any }
  });

  // Fetch patient separately
  const patient = await prisma.patient.findFirst({
    where: { id: updated.patientId, tenantId },
    select: {
      id: true,
      mrn: true,
      firstName: true,
      lastName: true,
      phone: true
    }
  });

  return { ...updated, patient };
};

export const markReminderSent = async (tenantId: string, id: string) => {
  return prisma.appointment.update({
    where: { id },
    data: { reminderSentAt: new Date() }
  });
};
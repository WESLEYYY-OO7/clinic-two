import { prisma } from "@clinic-two/db-client";
import type { AppointmentInputType } from "../validators/appointment.schema";

export const createAppointment = async (
  tenantId: string,
  input: AppointmentInputType
) => {
  if (input.endsAt <= input.startsAt) {
    throw new Error("endsAt must be after startsAt");
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
      `Provider already booked from ${conflict.startsAt.toISOString()} to ${conflict.endsAt.toISOString()}`
    );
  }

  return prisma.appointment.create({
    data: {
      tenantId,
      patientId: input.patientId,
      providerId: input.providerId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      reason: input.reason
    }
  });
};

export const listAppointments = async (tenantId: string) => {
  return prisma.appointment.findMany({
    where: { tenantId },
    orderBy: { startsAt: "asc" },
    take: 200
  });
};
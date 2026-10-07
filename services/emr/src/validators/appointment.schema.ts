import { z } from "zod";

export const AppointmentInput = z.object({
  patientId: z.string().uuid(),
  providerId: z.string().uuid(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  reason: z.string().optional(),
  notes: z.string().optional()
});

export const AppointmentStatusInput = z.object({
  status: z.enum([
    "SCHEDULED",
    "CONFIRMED",
    "ARRIVED",
    "COMPLETED",
    "NO_SHOW",
    "CANCELLED"
  ])
});

export type AppointmentInputType = z.infer<typeof AppointmentInput>;
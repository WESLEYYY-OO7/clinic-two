import { z } from "zod";

export const AppointmentInput = z.object({
  patientId: z.string().uuid(),
  providerId: z.string().uuid(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  reason: z.string().optional()
});

export type AppointmentInputType = z.infer<typeof AppointmentInput>;
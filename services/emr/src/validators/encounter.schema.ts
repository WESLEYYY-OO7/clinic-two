import { z } from "zod";

export const EncounterInput = z.object({
  patientId: z.string().uuid(),
  providerId: z.string().uuid(),
  type: z.enum(["OUTPATIENT", "INPATIENT", "EMERGENCY", "TELEMEDICINE"]),
  reason: z.string().optional()
});

export type EncounterInputType = z.infer<typeof EncounterInput>;
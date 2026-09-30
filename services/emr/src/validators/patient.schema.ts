import { z } from "zod";

export const PatientInput = z.object({
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  lastName: z.string().min(1),
  dateOfBirth: z.coerce.date(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNKNOWN"]),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  nextOfKin: z
    .object({
      name: z.string(),
      phone: z.string(),
      relationship: z.string()
    })
    .optional()
});

export type PatientInputType = z.infer<typeof PatientInput>;
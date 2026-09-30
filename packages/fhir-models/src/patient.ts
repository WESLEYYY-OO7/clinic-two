import type { Patient as DbPatient } from "@cura/db-client";

export interface FhirPatient {
  resourceType: "Patient";
  id: string;
  identifier: { system: string; value: string }[];
  name: { family: string; given: string[] }[];
  gender: "male" | "female" | "other" | "unknown";
  birthDate: string;
  telecom?: { system: "phone" | "email"; value: string }[];
  address?: { text: string }[];
}

export const toFhirPatient = (p: DbPatient): FhirPatient => ({
  resourceType: "Patient",
  id: p.id,
  identifier: [{ system: "urn:clinic-two:mrn", value: p.mrn }],
  name: [
    {
      family: p.lastName,
      given: [p.firstName, p.middleName].filter(Boolean) as string[]
    }
  ],
  gender: p.gender.toLowerCase() as FhirPatient["gender"],
  birthDate: p.dateOfBirth.toISOString().split("T")[0],
  telecom: [
    ...(p.phone ? [{ system: "phone" as const, value: p.phone }] : []),
    ...(p.email ? [{ system: "email" as const, value: p.email }] : [])
  ],
  address: p.address ? [{ text: p.address }] : undefined
});
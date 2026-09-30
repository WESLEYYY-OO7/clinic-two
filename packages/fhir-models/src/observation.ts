import type { Vital as DbVital } from "@clinic-two/db-client";
import { LOINC } from "@clinic-two/config";

export interface FhirObservation {
  resourceType: "Observation";
  id: string;
  status: "final";
  code: { coding: { system: string; code: string; display: string }[] };
  valueQuantity?: { value: number; unit: string };
  effectiveDateTime: string;
}

export const toFhirObservation = (v: DbVital): FhirObservation => ({
  resourceType: "Observation",
  id: v.id,
  status: "final",
  code: {
    coding: [
      {
        system: "http://loinc.org",
        code: LOINC.BODY_TEMP,
        display: "Body temperature"
      }
    ]
  },
  valueQuantity: v.temperatureC
    ? { value: v.temperatureC, unit: "Cel" }
    : undefined,
  effectiveDateTime: v.recordedAt.toISOString()
});
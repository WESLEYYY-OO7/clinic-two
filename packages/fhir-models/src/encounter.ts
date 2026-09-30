import type { Encounter as DbEncounter } from "@cura/db-client";

export interface FhirEncounter {
  resourceType: "Encounter";
  id: string;
  status: "planned" | "in-progress" | "finished" | "cancelled";
  class: { code: string };
  subject: { reference: string };
  period: { start: string; end?: string };
}

const statusMap: Record<string, FhirEncounter["status"]> = {
  PLANNED: "planned",
  IN_PROGRESS: "in-progress",
  FINISHED: "finished",
  CANCELLED: "cancelled"
};

export const toFhirEncounter = (e: DbEncounter): FhirEncounter => ({
  resourceType: "Encounter",
  id: e.id,
  status: statusMap[e.status] ?? "planned",
  class: { code: e.type },
  subject: { reference: `Patient/${e.patientId}` },
  period: {
    start: e.startedAt.toISOString(),
    end: e.endedAt?.toISOString()
  }
});
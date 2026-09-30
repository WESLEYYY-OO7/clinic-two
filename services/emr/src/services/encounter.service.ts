import { prisma } from "@cura/db-client";
import { toFhirEncounter } from "@cura/fhir-models";
import type { EncounterInputType } from "../validators/encounter.schema";

export const createEncounter = async (tenantId: string, input: EncounterInputType) => {
  const encounter = await prisma.encounter.create({
    data: {
      tenantId,
      patientId: input.patientId,
      providerId: input.providerId,
      type: input.type,
      reason: input.reason,
      status: "IN_PROGRESS"
    }
  });

  const fhir = toFhirEncounter(encounter);
  const updated = await prisma.encounter.update({
    where: { id: encounter.id },
    data: { fhirResource: fhir as object }
  });

  return { encounter: updated, fhir };
};

export const listEncounters = async (tenantId: string, patientId?: string) => {
  return prisma.encounter.findMany({
    where: { tenantId, ...(patientId ? { patientId } : {}) },
    orderBy: { startedAt: "desc" },
    take: 100
  });
};

export const finishEncounter = async (tenantId: string, id: string) => {
  return prisma.encounter.update({
    where: { id },
    data: { status: "FINISHED", endedAt: new Date() }
  });
};
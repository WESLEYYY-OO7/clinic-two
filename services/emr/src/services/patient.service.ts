import { prisma } from "@cura/db-client";
import { toFhirPatient } from "@cura/fhir-models";
import type { PatientInputType } from "../validators/patient.schema";

export const createPatient = async (tenantId: string, input: PatientInputType) => {
  const count = await prisma.patient.count({ where: { tenantId } });
  const mrn = `MRN-${String(count + 1).padStart(6, "0")}`;

  const patient = await prisma.patient.create({
    data: {
      tenantId,
      mrn,
      firstName: input.firstName,
      middleName: input.middleName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      phone: input.phone,
      email: input.email,
      address: input.address,
      bloodGroup: input.bloodGroup,
      allergies: input.allergies ?? [],
      nextOfKin: input.nextOfKin ?? undefined
    }
  });

  const fhir = toFhirPatient(patient);
  const updated = await prisma.patient.update({
    where: { id: patient.id },
    data: { fhirResource: fhir as object }
  });

  return { patient: updated, fhir };
};

export const searchPatients = async (tenantId: string, q: string) => {
  return prisma.patient.findMany({
    where: {
      tenantId,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { mrn: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } }
            ]
          }
        : {})
    },
    take: 50,
    orderBy: { createdAt: "desc" }
  });
};

export const getPatientById = async (tenantId: string, id: string) => {
  return prisma.patient.findFirst({
    where: { id, tenantId },
    include: {
      encounters: { take: 10, orderBy: { startedAt: "desc" } }
    }
  });
};
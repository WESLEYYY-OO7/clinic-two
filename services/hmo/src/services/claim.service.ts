import { prisma } from "@cura/db-client";
import { getHmoAdapter } from "../adapters";

export const createClaim = async (
  tenantId: string,
  input: {
    patientId: string;
    hmo: string;
    hmoMemberId: string;
    planCode?: string;
    amount: number;
    diagnosisCodes?: string[];
    serviceDate?: Date;
    notes?: string;
  }
) => {
  const claim = await prisma.claim.create({
    data: {
      tenantId,
      patientId: input.patientId,
      hmo: input.hmo,
      hmoMemberId: input.hmoMemberId,
      planCode: input.planCode,
      amount: input.amount,
      diagnosisCodes: input.diagnosisCodes ?? [],
      serviceDate: input.serviceDate,
      notes: input.notes,
      status: "DRAFT"
    }
  });

  return claim;
};

export const submitClaim = async (tenantId: string, claimId: string) => {
  const claim = await prisma.claim.findFirst({
    where: { id: claimId, tenantId }
  });
  if (!claim) throw new Error("Claim not found");
  if (claim.status !== "DRAFT") {
    throw new Error(`Cannot submit a claim in ${claim.status} status`);
  }

  const adapter = getHmoAdapter(claim.hmo);

  const patient = await prisma.patient.findFirst({
    where: { id: claim.patientId, tenantId },
    select: { firstName: true, lastName: true }
  });

  const response = await adapter.submitClaim({
    hmoMemberId: claim.hmoMemberId,
    patientName: patient
      ? `${patient.firstName} ${patient.lastName}`
      : "Unknown",
    serviceDate: (claim.serviceDate ?? new Date()).toISOString(),
    amount: Number(claim.amount),
    diagnosisCodes: Array.isArray(claim.diagnosisCodes)
      ? (claim.diagnosisCodes as string[])
      : [],
    procedureDescription: claim.notes ?? "Medical services",
    planCode: claim.planCode ?? undefined
  });

  return prisma.claim.update({
    where: { id: claimId },
    data: {
      claimNumber: response.claimNumber,
      status: "SUBMITTED",
      submittedAt: new Date()
    }
  });
};

export const listClaims = async (tenantId: string, filters: {
  status?: string;
  hmo?: string;
  patientId?: string;
} = {}) => {
  const claims = await prisma.claim.findMany({
    where: {
      tenantId,
      ...(filters.status ? { status: filters.status as any } : {}),
      ...(filters.hmo ? { hmo: filters.hmo } : {}),
      ...(filters.patientId ? { patientId: filters.patientId } : {})
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  // Enrich with patient info
  const patientIds = [...new Set(claims.map((c) => c.patientId))];
  const patients = await prisma.patient.findMany({
    where: { id: { in: patientIds } },
    select: {
      id: true,
      mrn: true,
      firstName: true,
      lastName: true
    }
  });
  const patientMap = new Map(patients.map((p) => [p.id, p]));

  return claims.map((c) => ({
    ...c,
    patient: patientMap.get(c.patientId) ?? null
  }));
};

export const getClaim = async (tenantId: string, id: string) => {
  const claim = await prisma.claim.findFirst({
    where: { id, tenantId }
  });
  if (!claim) return null;

  const patient = await prisma.patient.findFirst({
    where: { id: claim.patientId, tenantId },
    select: {
      id: true,
      mrn: true,
      firstName: true,
      lastName: true,
      phone: true
    }
  });

  return { ...claim, patient };
};

export const updateClaimStatus = async (
  tenantId: string,
  id: string,
  status: string,
  approvedAmount?: number,
  rejectionReason?: string
) => {
  const claim = await prisma.claim.findFirst({
    where: { id, tenantId }
  });
  if (!claim) throw new Error("Claim not found");

  return prisma.claim.update({
    where: { id },
    data: {
      status: status as any,
      ...(approvedAmount !== undefined ? { approvedAmount } : {}),
      ...(rejectionReason ? { rejectionReason } : {}),
      ...(status === "PAID" || status === "DENIED" || status === "APPROVED"
        ? { resolvedAt: new Date() }
        : {})
    }
  });
};

export const verifyEligibility = async (
  hmo: string,
  hmoMemberId: string,
  planCode?: string
) => {
  const adapter = getHmoAdapter(hmo);
  return adapter.verifyEligibility(hmoMemberId, planCode);
};
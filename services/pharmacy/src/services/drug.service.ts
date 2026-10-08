import { prisma } from "@cura/db-client";

export const listDrugs = async (tenantId: string) => {
  return prisma.drug.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: "asc" }
  });
};
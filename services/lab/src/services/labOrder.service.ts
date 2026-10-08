import { prisma } from "@cura/db-client";

export const listLabOrders = async (tenantId: string, status?: string) => {
  return prisma.labOrder.findMany({
    where: {
      tenantId,
      ...(status ? { status: status as any } : {})
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });
};
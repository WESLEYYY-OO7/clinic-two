import { prisma } from "@cura/db-client";

export const listEmployees = async (tenantId: string) => {
  return prisma.employee.findMany({
    where: { tenantId },
    orderBy: { fullName: "asc" }
  });
};

export const createEmployee = async (
  tenantId: string,
  input: {
    fullName: string;
    email?: string;
    phone?: string;
    role: string;
    salaryBase: number;
  }
) => {
  return prisma.employee.create({
    data: { tenantId, ...input }
  });
};
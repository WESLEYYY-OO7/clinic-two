import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-clinic" },
    update: {},
    create: { name: "Demo Clinic", slug: "demo-clinic", plan: "ENTERPRISE" }
  });

  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);

  await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: "admin@clinic-two.local" }
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@clinic-two.local",
      passwordHash,
      fullName: "Clinic Admin",
      role: "CLINIC_ADMIN"
    }
  });

  console.log("✅ Seeded tenant:", tenant.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
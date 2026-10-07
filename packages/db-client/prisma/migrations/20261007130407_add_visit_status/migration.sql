-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('SCHEDULED', 'CHECKED_IN', 'VITALS_DONE', 'IN_CONSULTATION', 'RX_WRITTEN', 'DISPENSED', 'BILLED', 'DONE', 'CANCELLED');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "consultationAt" TIMESTAMP(3),
ADD COLUMN     "encounterId" TEXT,
ADD COLUMN     "visitStatus" "VisitStatus" NOT NULL DEFAULT 'SCHEDULED',
ADD COLUMN     "vitalsDoneAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Appointment_tenantId_visitStatus_idx" ON "Appointment"("tenantId", "visitStatus");

/*
  Warnings:

  - Added the required column `hmoMemberId` to the `Claim` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Claim` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "ClaimStatus" ADD VALUE 'PARTIALLY_APPROVED';

-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "approvedAmount" DECIMAL(12,2),
ADD COLUMN     "claimNumber" TEXT,
ADD COLUMN     "diagnosisCodes" JSONB,
ADD COLUMN     "fhirResource" JSONB,
ADD COLUMN     "hmoMemberId" TEXT NOT NULL,
ADD COLUMN     "planCode" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "serviceDate" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Claim_tenantId_patientId_idx" ON "Claim"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "Claim_tenantId_hmo_idx" ON "Claim"("tenantId", "hmo");

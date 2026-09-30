/*
  Warnings:

  - You are about to drop the column `result` on the `LabOrder` table. All the data in the column will be lost.
  - You are about to drop the column `testCode` on the `LabOrder` table. All the data in the column will be lost.
  - You are about to drop the column `testName` on the `LabOrder` table. All the data in the column will be lost.
  - Added the required column `patientId` to the `LabOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `testId` to the `LabOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LabOrder" DROP COLUMN "result",
DROP COLUMN "testCode",
DROP COLUMN "testName",
ADD COLUMN     "fhirResource" JSONB,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "patientId" TEXT NOT NULL,
ADD COLUMN     "resultFlag" TEXT,
ADD COLUMN     "resultValue" TEXT,
ADD COLUMN     "resultedById" TEXT,
ADD COLUMN     "testId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "LabTest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specimen" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "referenceRange" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabTest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LabTest_tenantId_isActive_idx" ON "LabTest"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LabTest_tenantId_code_key" ON "LabTest"("tenantId", "code");

-- CreateIndex
CREATE INDEX "LabOrder_tenantId_patientId_idx" ON "LabOrder"("tenantId", "patientId");

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

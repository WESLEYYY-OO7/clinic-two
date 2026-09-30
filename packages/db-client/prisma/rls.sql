-- Row-Level Security policies — run once after `prisma migrate`
ALTER TABLE "Patient"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Encounter"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prescription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LabOrder"     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_patient      ON "Patient";
DROP POLICY IF EXISTS tenant_encounter    ON "Encounter";
DROP POLICY IF EXISTS tenant_invoice      ON "Invoice";
DROP POLICY IF EXISTS tenant_appointment  ON "Appointment";
DROP POLICY IF EXISTS tenant_prescription ON "Prescription";
DROP POLICY IF EXISTS tenant_laborder     ON "LabOrder";

CREATE POLICY tenant_patient      ON "Patient"      USING ("tenantId" = current_setting('app.tenant_id', true));
CREATE POLICY tenant_encounter    ON "Encounter"    USING ("tenantId" = current_setting('app.tenant_id', true));
CREATE POLICY tenant_invoice      ON "Invoice"      USING ("tenantId" = current_setting('app.tenant_id', true));
CREATE POLICY tenant_appointment  ON "Appointment"  USING ("tenantId" = current_setting('app.tenant_id', true));
CREATE POLICY tenant_prescription ON "Prescription" USING ("tenantId" = current_setting('app.tenant_id', true));
CREATE POLICY tenant_laborder     ON "LabOrder"     USING ("tenantId" = current_setting('app.tenant_id', true));
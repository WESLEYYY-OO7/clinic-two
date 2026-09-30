/**
 * Every action worth recording in the audit log.
 * Extend deliberately — the audit log is append-only and never edited.
 */
export type AuditAction =
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "EXPORT"
  | "PRINT"
  | "DISPENSE"
  | "VOID";

/**
 * Resource types the audit system knows about.
 * Keep names aligned with Prisma model names.
 */
export type AuditResource =
  | "Patient"
  | "Encounter"
  | "ClinicalNote"
  | "Vital"
  | "Diagnosis"
  | "Invoice"
  | "Payment"
  | "Appointment"
  | "Prescription"
  | "LabOrder"
  | "LabResult"
  | "User"
  | "Tenant"
  | "AuditLog";

/**
 * The shape callers pass in. Everything except tenantId, action,
 * and resourceType is optional — but the more you provide, the more
 * useful the trail becomes during a medico-legal review.
 */
export interface AuditEntry {
  tenantId: string;
  userId?: string;
  action: AuditAction;
  resourceType: AuditResource;
  resourceId?: string;
  beforeState?: unknown;
  afterState?: unknown;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}
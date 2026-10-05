export type Role =
  | "SUPER_ADMIN"
  | "CLINIC_ADMIN"
  | "DOCTOR"
  | "NURSE"
  | "PHARMACIST"
  | "LAB_TECH"
  | "RECEPTIONIST"
  | "BILLING"
  | "HR";

export const PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: ["*"],
  CLINIC_ADMIN: ["*"],

  DOCTOR: [
    "patient:read:demographics",
    "patient:read:clinical",
    "patient:read:financial",
    "patient:write:demographics",
    "patient:write:clinical",
    "encounter:*",
    "vitals:write",
    "order:*",
    "prescription:write",
    "appointment:*",
    "invoice:read",
    "lab:read",
    "lab:write",
    "lab:result:write",
    "drug:read",
    "inventory:read"
  ],

  NURSE: [
    "patient:read:demographics",
    "patient:read:clinical",
    "patient:write:demographics",
    "patient:write:clinical",
    "encounter:read",
    "vitals:write",
    "order:read",
    "order:result:read",
    "appointment:read",
    "appointment:write",
    "lab:read",
    "lab:write",
    "drug:read",
    "inventory:read"
  ],

  PHARMACIST: [
    "patient:read:demographics",
    "patient:read:clinical",       // filtered on server to prescriptions only
    "prescription:read",
    "prescription:dispense",
    "drug:read",
    "drug:write",
    "inventory:*"
  ],

  LAB_TECH: [
    "patient:read:demographics",
    "patient:read:clinical",       // filtered on server to lab only
    "order:read",
    "order:result:write",
    "lab:read",
    "lab:result:write"
  ],

  RECEPTIONIST: [
    "patient:read:demographics",
    "patient:write:demographics",
    "appointment:*"
  ],

  BILLING: [
    "patient:read:demographics",
    "patient:read:financial",
    "invoice:*",
    "payment:*"
  ],

  HR: []
};

export const can = (role: Role, permission: string): boolean => {
  const perms = PERMISSIONS[role] ?? [];
  if (perms.includes("*")) return true;
  if (perms.includes(permission)) return true;

  // Wildcard fallback: "patient:*" grants any "patient:xxx"
  const [resource] = permission.split(":");
  if (perms.includes(`${resource}:*`)) return true;

  return false;
};

export const ROLE_MENU: Record<Role, string[]> = {
  SUPER_ADMIN: ["dashboard", "patients", "appointments", "encounters", "inventory", "billing", "settings"],
  CLINIC_ADMIN: ["dashboard", "patients", "appointments", "encounters", "inventory", "billing", "settings"],
  DOCTOR: ["dashboard", "patients", "appointments", "encounters", "inventory"],
  NURSE: ["dashboard", "patients", "appointments", "encounters", "inventory"],
  PHARMACIST: ["dashboard", "patients", "inventory"],
  LAB_TECH: ["dashboard", "patients", "encounters"],
  RECEPTIONIST: ["dashboard", "patients", "appointments"],
  BILLING: ["dashboard", "patients", "billing"],
  HR: ["dashboard", "settings"]
};

/**
 * Which patient fields belong to which tier.
 * Used by the patient routes to filter responses.
 */
export const PATIENT_FIELDS = {
  demographics: [
    "id",
    "mrn",
    "firstName",
    "middleName",
    "lastName",
    "dateOfBirth",
    "gender",
    "phone",
    "email",
    "address",
    "bloodGroup",
    "nextOfKin",
    "createdAt",
    "updatedAt"
  ],
  clinical: [
    "allergies"
  ],
  financial: [] // no direct fields — financial data lives in invoices
} as const;
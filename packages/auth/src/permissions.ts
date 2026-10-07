export type Role =
  | "SUPER_ADMIN"
  | "CLINIC_ADMIN"
  | "DOCTOR"
  | "NURSE"
  | "PHARMACIST"
  | "LAB_TECH"
  | "RECEPTIONIST"
  | "BILLING"
  "claims"
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
    "notes:write",
    "diagnosis:write",
    "prescription:write",
    "prescription:read",
    "prescription:dispense",  // doctors can dispense in emergencies
    "order:*",
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
    "encounter:read",
    "vitals:write",
    "notes:write",
    "order:read",
    "appointment:read",
    "lab:read",
    "inventory:read"
  ],

  PHARMACIST: [
    "patient:read:demographics",
    "patient:read:clinical",     // filtered to prescriptions + allergies on server
    "prescription:read",
    "prescription:dispense",
    "drug:read",
    "drug:write",
    "inventory:*"
  ],

  LAB_TECH: [
    "patient:read:demographics",  // filtered to name + MRN + DOB + gender on server
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

  HR: [
    "employee:*",
    "payroll:*"
  ]
};

export const can = (role: Role, permission: string): boolean => {
  const perms = PERMISSIONS[role] ?? [];
  if (perms.includes("*")) return true;
  if (perms.includes(permission)) return true;

  const [resource] = permission.split(":");
  if (perms.includes(`${resource}:*`)) return true;

  // Handle three-tier: "patient:read" should match "patient:read:clinical"
  const parts = permission.split(":");
  if (parts.length === 3) {
    if (perms.includes(`${parts[0]}:${parts[1]}`)) return true;
  }

  return false;
};

export const ROLE_MENU: Record<Role, string[]> = {
  SUPER_ADMIN: ["dashboard", "patients", "appointments", "encounters", "inventory", "billing", "settings"],
  CLINIC_ADMIN: ["dashboard", "patients", "appointments", "encounters", "inventory", "billing", "settings"],
  DOCTOR: ["dashboard", "patients", "appointments", "encounters", "inventory"],
  NURSE: ["dashboard", "patients", "appointments", "encounters", "inventory"],
  PHARMACIST: ["dashboard", "patients", "inventory"],
  LAB_TECH: ["dashboard", "patients"],
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
  financial: []
} as const;
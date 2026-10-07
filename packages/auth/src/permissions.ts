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
 SUPER_ADMIN: ["*"],  // stays wildcard — this is for the SaaS operator
CLINIC_ADMIN: [
  "patient:read:demographics",
  "patient:read:clinical",
  "patient:read:financial",
  "patient:write:demographics",

  "user:*",
  "employee:*",
  "payroll:*",

  "appointment:read",
  "appointment:write",

  "invoice:read",
  "invoice:write",
  "payment:read",

  "inventory:*",
  "drug:read",
  "drug:write",

  "claim:read",
  "claim:write",

  "encounter:read",
  "vitals:read",
  "notes:read",
  "diagnosis:read",
  "prescription:read",
  "order:read",
  "lab:read",
  "lab:result:read",

  "drug:read"
],
CLINIC_ADMIN: [
  // Patient view (demographics + financial for oversight)
  "patient:read:demographics",
  "patient:read:clinical",       // can VIEW but not edit
  "patient:read:financial",

  // Staff & HR
  "user:*",
  "employee:*",
  "payroll:*",

  // Appointments (view oversight)
  "appointment:read",
  "appointment:write",           // can book for VIPs

  // Billing (oversight + corrections)
  "invoice:read",
  "invoice:write",
  "payment:read",

  // HMO Claims
  "claim:read",
  "claim:write",

  // Inventory (setup + receive)
  "inventory:*",

  // Master data setup
  "drug:read",
  "drug:write",
  "lab:read",
  "lab:write",

  // Encounter oversight
  "encounter:read",              // can VIEW but not write
  "vitals:read",
  "notes:read",
  "diagnosis:read",
  "prescription:read",
  "order:read",
  "lab:result:read",

  // Billing
  "invoice:read",
  "payment:read"
],

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
  SUPER_ADMIN: ["dashboard", "patients", "appointments", "encounters", "claims", "inventory", "billing", "settings"],
  CLINIC_ADMIN: ["dashboard", "patients", "appointments", "encounters", "claims", "inventory", "billing", "settings"],
  DOCTOR: ["dashboard", "patients", "appointments", "encounters", "claims", "inventory"],
  NURSE: ["dashboard", "patients", "appointments", "encounters", "inventory"],
  PHARMACIST: ["dashboard", "patients", "inventory"],
  LAB_TECH: ["dashboard", "patients"],
  RECEPTIONIST: ["dashboard", "patients", "appointments"],
  BILLING: ["dashboard", "patients", "claims", "billing"],
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
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

  /**
   * CLINIC_ADMIN — the owner/manager.
   * Can do everything, but the UI shows oversight-first.
   */
  CLINIC_ADMIN: ["*"],

  /**
   * DOCTOR — full clinical authority.
   */
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
    "prescription:dispense",
    "order:*",
    "appointment:*",
    "invoice:read",
    "lab:read",
    "lab:write",
    "lab:result:write",
    "drug:read",
    "inventory:read"
  ],

  /**
   * NURSE — full clinical support.
   * Does vitals, notes, triage. Can start encounters. Can order basic labs.
   * Cannot prescribe or diagnose.
   */
  NURSE: [
    "patient:read:demographics",
    "patient:read:clinical",
    "patient:write:demographics",
    "encounter:read",
    "encounter:write",           // triage — start encounters
    "vitals:write",
    "notes:write",
    "order:read",
    "order:write",               // can order triage vitals/labs
    "prescription:read",         // sees what's prescribed
    "appointment:read",
    "appointment:write",         // can reschedule
    "lab:read",
    "lab:write",                 // can log sample collection
    "inventory:read",
    "invoice:read"               // can answer "do I owe?"
  ],

  /**
   * PHARMACIST — full pharmacy authority.
   * Dispenses, counsels, notes. Can see clinical history for safety.
   */
  PHARMACIST: [
    "patient:read:demographics",
    "patient:read:clinical",
    "prescription:read",
    "prescription:write",        // pharmacist interventions
    "prescription:dispense",
    "notes:write",               // counseling notes
    "drug:read",
    "drug:write",
    "inventory:*",
    "invoice:read",
    "appointment:read"
  ],

  /**
   * LAB_TECH — full lab workflow.
   * Runs tests, enters results, notes sample issues.
   */
  LAB_TECH: [
    "patient:read:demographics",
    "patient:read:clinical",     // needs allergies for safety
    "order:read",
    "order:result:write",
    "lab:read",
    "lab:write",                 // can flag sample issues
    "lab:result:write",
    "notes:write",               // specimen integrity notes
    "encounter:read"
  ],

  /**
   * RECEPTIONIST — full front desk.
   * Registers, books, checks in, collects payment.
   */
  RECEPTIONIST: [
    "patient:read:demographics",
    "patient:write:demographics",
    "appointment:*",
    "encounter:read",
    "invoice:read",
    "payment:read",
    "payment:write",             // collects payments
    "claim:read"                 // verifies HMO eligibility
  ],

  /**
   * BILLING — full financial.
   */
  BILLING: [
    "patient:read:demographics",
    "patient:read:financial",
    "invoice:*",
    "payment:*",
    "claim:*",
    "encounter:read",
    "appointment:read"
  ],

  /**
   * HR — staff and payroll only.
   */
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

  // "patient:read" should match "patient:read:clinical"
  const parts = permission.split(":");
  if (parts.length === 3 && perms.includes(`${parts[0]}:${parts[1]}`)) {
    return true;
  }

  return false;
};

export const ROLE_MENU: Record<Role, string[]> = {
  SUPER_ADMIN: ["dashboard", "patients", "appointments", "encounters", "claims", "inventory", "billing", "settings"],
  CLINIC_ADMIN: ["dashboard", "patients", "appointments", "encounters", "claims", "inventory", "billing", "settings"],
  DOCTOR: ["dashboard", "patients", "appointments", "encounters", "claims", "inventory"],
  NURSE: ["dashboard", "patients", "appointments", "encounters", "inventory"],
  PHARMACIST: ["dashboard", "patients", "inventory"],
  LAB_TECH: ["dashboard", "patients", "encounters"],
  RECEPTIONIST: ["dashboard", "patients", "appointments"],
  BILLING: ["dashboard", "patients", "claims", "billing"],
  HR: ["dashboard", "settings"]
};

export const PATIENT_FIELDS = {
  demographics: [
    "id", "mrn", "firstName", "middleName", "lastName",
    "dateOfBirth", "gender", "phone", "email", "address",
    "bloodGroup", "nextOfKin", "createdAt", "updatedAt"
  ],
  clinical: ["allergies"],
  financial: []
} as const;
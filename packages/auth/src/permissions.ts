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
    "patient:read",
    "patient:write",
    "encounter:*",
    "order:*",
    "prescription:write",
    "invoice:read",
    "appointment:*"
  ],
  NURSE: [
    "patient:read",
    "encounter:read",
    "vitals:write",
    "order:read",
    "appointment:read"
  ],
  PHARMACIST: [
    "prescription:read",
    "prescription:dispense",
    "inventory:*",
    "drug:read"
  ],
  LAB_TECH: ["order:read", "order:result:write"],
  RECEPTIONIST: [
    "patient:write",
    "patient:read",
    "appointment:*",
    "invoice:read"
  ],
  BILLING: ["invoice:*", "payment:*", "patient:read"],
  HR: ["employee:*", "payroll:*"]
};

export const can = (role: Role, permission: string): boolean => {
  const perms = PERMISSIONS[role] ?? [];
  if (perms.includes("*")) return true;
  const [resource] = permission.split(":");
  return perms.includes(permission) || perms.includes(`${resource}:*`);
};
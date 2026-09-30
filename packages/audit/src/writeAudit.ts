import { prisma } from "@clinic-two/db-client";
import type { AuditEntry } from "./types";

/**
 * Append a single audit record.
 *
 * Rules:
 *  1. Never throws in a way that breaks the caller's main flow.
 *     A failed audit is logged, not thrown.
 *  2. Never updates or deletes. Only `create`.
 *  3. Always includes tenantId — RLS enforces isolation at the DB level.
 */
export const writeAudit = async (entry: AuditEntry): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId ?? null,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId ?? null,
        beforeState: (entry.beforeState ?? null) as object | null,
        afterState: (entry.afterState ?? null) as object | null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null
      }
    });
  } catch (err) {
    // Audit must never break the caller — but it must be loud.
    console.error("[audit] failed to write entry", {
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      error: err instanceof Error ? err.message : String(err)
    });
  }
};

/**
 * Convenience helper for HTTP request handlers.
 * Pulls ip + user-agent from an Express request automatically.
 */
export const auditFromRequest = async (
  req: {
    user?: { sub: string; tenantId: string };
    ip?: string;
    headers: Record<string, unknown>;
  },
  entry: Omit<AuditEntry, "tenantId" | "userId" | "ipAddress" | "userAgent">
): Promise<void> => {
  if (!req.user) return;
  await writeAudit({
    ...entry,
    tenantId: req.user.tenantId,
    userId: req.user.sub,
    ipAddress: req.ip,
    userAgent: String(req.headers["user-agent"] ?? "")
  });
};
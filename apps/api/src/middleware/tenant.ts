import type { Request, Response, NextFunction } from "express";
import { prisma } from "@cura/db-client";

export const tenantMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (req.user?.tenantId) {
      await prisma.$queryRawUnsafe(
        `SELECT set_config('app.tenant_id', $1, true)` as any,
        req.user.tenantId
      );
    }
    next();
  } catch (err) {
    console.error("[tenant middleware] error:", err);
    next();
  }
};

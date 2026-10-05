import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "@cura/auth";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  console.log("[auth] header present:", !!header, "| prefix ok:", header?.startsWith("Bearer "));
  console.log("[auth] JWT_SECRET length:", process.env.JWT_SECRET?.length ?? "MISSING");

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    req.user = verifyToken(header.slice(7), process.env.JWT_SECRET!);
    console.log("[auth] ✅ token verified | user:", req.user.sub, "| role:", req.user.role);
    next();
  } catch (err) {
    console.error("[auth] ❌ verify failed:", err instanceof Error ? err.message : err);
    return res.status(401).json({ error: "Invalid token" });
  }
};
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
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    req.user = verifyToken(header.slice(7), process.env.JWT_SECRET!);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};

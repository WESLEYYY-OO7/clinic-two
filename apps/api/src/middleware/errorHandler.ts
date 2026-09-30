import type { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("[api] route error:", err.stack ?? err.message);
  if (res.headersSent) return;
  res.status(500).json({ error: err.message || "Internal server error" });
};
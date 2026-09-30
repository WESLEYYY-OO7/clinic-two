import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Role } from "./permissions";

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: Role;
}

export const hashPassword = (pw: string): Promise<string> => bcrypt.hash(pw, 12);

export const verifyPassword = (pw: string, hash: string): Promise<boolean> =>
  bcrypt.compare(pw, hash);

export const signToken = (
  payload: JwtPayload,
  secret: string,
  expiresIn: string = "15m"
): string => jwt.sign(payload, secret, { expiresIn });

export const verifyToken = (token: string, secret: string): JwtPayload =>
  jwt.verify(token, secret) as JwtPayload;
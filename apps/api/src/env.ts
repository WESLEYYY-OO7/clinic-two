/**
 * Runtime environment configuration.
 * Loaded after dotenv runs (see apps/api/src/index.ts).
 *
 * Use this in place of scattering `process.env.X` throughout the codebase.
 * All values have safe defaults for local development.
 */
export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  JWT_SECRET: process.env.JWT_SECRET ?? "dev-secret-change-me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",
  PORT: Number(process.env.PORT ?? process.env.API_PORT ?? 4000),
  WEB_ORIGIN: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379"
} as const;

export type Env = typeof env;
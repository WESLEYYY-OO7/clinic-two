import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../../.env") });

import express from "express";
import helmet from "helmet";
import cors from "cors";
import { authMiddleware } from "./middleware/auth";
import { tenantMiddleware } from "./middleware/tenant";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth.routes";
import healthRoutes from "./routes/health.routes";
import apiRoutes from "./routes";

process.on("uncaughtException", (err) => {
  console.error("[api] uncaughtException:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[api] unhandledRejection:", reason);
});

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

// Health
app.use("/health", healthRoutes);

// Auth routes — login, register, AND /me are all inside authRoutes
// but /me needs auth, so we split:
app.use("/api/auth", authRoutes);

// Everything else requires auth + tenant context
app.use("/api", authMiddleware, tenantMiddleware, apiRoutes);

app.use(errorHandler);

const port = Number(process.env.API_PORT) || 4000;
app.listen(port, () => {
  console.log(`🩺 Cura Health API listening on http://localhost:${port}`);
});
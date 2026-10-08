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
const corsOptions = { origin: true, credentials: true };
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "2mb" }));

app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", authMiddleware, tenantMiddleware, apiRoutes);

app.use(errorHandler);

const port = Number(process.env.PORT || process.env.API_PORT) || 4000;
app.listen(port, () => {
  console.log(`🩺 Cura Health API listening on http://localhost:${port}`);
});
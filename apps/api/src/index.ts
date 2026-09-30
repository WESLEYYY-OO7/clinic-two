import "dotenv/config";
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
app.use(cors({ origin: process.env.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", authMiddleware, tenantMiddleware, apiRoutes);
app.use(errorHandler);

const port = Number(process.env.API_PORT) || 4000;
app.listen(port, () => {
  console.log(`🏥 Clinic Two API listening on http://localhost:${port}`);
});
import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ status: "ok", service: "clinic-two-api", time: new Date().toISOString() });
});

export default router;

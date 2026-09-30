import { Router } from "express";
import { z } from "zod";
import { evaluate } from "../engine";

const router = Router();

const CdsInput = z.object({
  patient: z.object({
    allergies: z.array(z.string()),
    age: z.number(),
    gender: z.string()
  }),
  medications: z.array(z.string()),
  currentMeds: z.array(z.string()),
  diagnoses: z.array(z.string())
});

router.post("/evaluate", (req, res) => {
  const parsed = CdsInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const alerts = evaluate(parsed.data);
  res.json({ data: { alerts } });
});

export default router;
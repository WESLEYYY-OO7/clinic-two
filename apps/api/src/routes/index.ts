import { Router } from "express";
import {
  patientsRouter,
  encountersRouter,
  vitalsRouter,
  notesRouter,
  diagnosesRouter,
  appointmentsRouter
} from "@cura/emr";
import { invoicesRouter, paymentsRouter } from "@cura/billing";
import { drugsRouter, prescriptionsRouter } from "@cura/pharmacy";
import { labOrdersRouter } from "@cura/lab";
import { employeesRouter } from "@cura/hr";
import { claimsRouter } from "@cura/hmo";
import { evaluateRouter } from "@cura/cds";

const router = Router();

router.use("/patients", patientsRouter);
router.use("/encounters", encountersRouter);
router.use("/vitals", vitalsRouter);
router.use("/notes", notesRouter);
router.use("/diagnoses", diagnosesRouter);
router.use("/appointments", appointmentsRouter);
router.use("/invoices", invoicesRouter);
router.use("/payments", paymentsRouter);
router.use("/drugs", drugsRouter);
router.use("/prescriptions", prescriptionsRouter);
router.use("/lab-orders", labOrdersRouter);
router.use("/employees", employeesRouter);
router.use("/claims", claimsRouter);
router.use("/cds", evaluateRouter);

export default router;

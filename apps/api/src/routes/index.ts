import { Router } from "express";
import {
  patientsRouter,
  encountersRouter,
  vitalsRouter,
  notesRouter,
  diagnosesRouter,
  appointmentsRouter
} from "@clinic-two/emr";
import { invoicesRouter, paymentsRouter } from "@clinic-two/billing";
import { drugsRouter, prescriptionsRouter } from "@clinic-two/pharmacy";
import { labOrdersRouter } from "@clinic-two/lab";
import { employeesRouter } from "@clinic-two/hr";
import { claimsRouter } from "@clinic-two/hmo";
import { evaluateRouter } from "@clinic-two/cds";

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
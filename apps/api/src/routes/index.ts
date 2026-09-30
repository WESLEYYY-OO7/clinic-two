import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
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

router.use("/patients", asyncHandler(patientsRouter as any));
router.use("/encounters", asyncHandler(encountersRouter as any));
router.use("/vitals", asyncHandler(vitalsRouter as any));
router.use("/notes", asyncHandler(notesRouter as any));
router.use("/diagnoses", asyncHandler(diagnosesRouter as any));
router.use("/appointments", asyncHandler(appointmentsRouter as any));
router.use("/invoices", asyncHandler(invoicesRouter as any));
router.use("/payments", asyncHandler(paymentsRouter as any));
router.use("/drugs", asyncHandler(drugsRouter as any));
router.use("/prescriptions", asyncHandler(prescriptionsRouter as any));
router.use("/lab-orders", asyncHandler(labOrdersRouter as any));
router.use("/employees", asyncHandler(employeesRouter as any));
router.use("/claims", asyncHandler(claimsRouter as any));
router.use("/cds", asyncHandler(evaluateRouter as any));

export default router;
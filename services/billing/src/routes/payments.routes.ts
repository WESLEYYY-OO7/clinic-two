import { Router } from "express";
import { auditFromRequest } from "@clinic-two/audit";
import { can } from "@clinic-two/auth";
import { PaymentInput } from "../validators/invoice.schema";
import { recordPayment } from "../services/payment.service";

const router = Router();

router.post("/", async (req, res) => {
  const ctx = req.user!;
  if (!can(ctx.role, "payment:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = PaymentInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { payment, invoice } = await recordPayment(ctx.tenantId, parsed.data);

  await auditFromRequest(req, {
    action: "CREATE",
    resourceType: "Payment",
    resourceId: payment.id,
    afterState: payment
  });

  res.status(201).json({ data: { payment, invoice } });
});

export default router;
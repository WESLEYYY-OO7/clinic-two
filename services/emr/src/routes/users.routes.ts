import { Router } from "express";
import { can } from "@cura/auth";
import { prisma } from "@cura/db-client";

const router = Router();

router.get("/", async (req, res) => {
  console.log("[users] handler hit");
  const ctx = req.user!;
  console.log("[users] ctx:", JSON.stringify(ctx));

  if (!can(ctx.role, "employee:read") && !can(ctx.role, "user:read")) {
    console.log("[users] forbidden");
    return res.status(403).json({ error: "Forbidden" });
  }

  console.log("[users] permission passed");

  try {
    const users = await prisma.user.findMany({
      where: { tenantId: ctx.tenantId }
    });
    console.log("[users] query returned", users.length, "rows");
    res.json({ data: users });
  } catch (err: any) {
    console.error("[users] query failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
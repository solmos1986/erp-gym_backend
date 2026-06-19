import express from "express";
import { getBusinessTemplates } from "./businessTemplate.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { tenantGuard } from "../../middlewares/tenant.middleware.js";

const router = express.Router();

// =========================
// 📋 LISTAR BUSINESS TEMPLATE
// =========================
router.get("/", requireAuth, requirePermission("SYSTEM_COMPANIES_CREATE"), getBusinessTemplates);

export default router;

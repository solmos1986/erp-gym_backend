import express from "express";
import {
  getBusinessTemplates,
  getBusinessTemplateById,
  createBusinessTemplate,
  updateBusinessTemplate,
  toggleBusinessTemplate,
  createRoleTemplate,
  updateRoleTemplate,
  deleteRoleTemplate
} from "./businessTemplate.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { tenantGuard } from "../../middlewares/tenant.middleware.js";

const router = express.Router();

// =========================
// 📋 LISTAR BUSINESS TEMPLATE
// =========================
router.get("/", requireAuth, requirePermission("SYSTEM_COMPANIES_VIEW"), getBusinessTemplates);

router.get("/:id", requireAuth, requirePermission("SYSTEM_COMPANIES_VIEW"), getBusinessTemplateById);

router.post("/", requireAuth, requirePermission("SYSTEM_COMPANIES_CREATE"), createBusinessTemplate);

router.put("/:id", requireAuth, requirePermission("SYSTEM_COMPANIES_EDIT"), updateBusinessTemplate);

router.patch("/:id/toggle", requireAuth, requirePermission("SYSTEM_COMPANIES_DELETE"), toggleBusinessTemplate);

// =========================
// 👥 ROLES DEL TEMPLATE
// =========================

router.post("/:id/roles", requireAuth, requirePermission("SYSTEM_COMPANIES_EDIT"), createRoleTemplate);

router.put("/:id/roles/:roleId", requireAuth, requirePermission("SYSTEM_COMPANIES_EDIT"), updateRoleTemplate);

router.delete("/:id/roles/:roleId", requireAuth, requirePermission("SYSTEM_COMPANIES_EDIT"), deleteRoleTemplate);

export default router;

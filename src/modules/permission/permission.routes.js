import express from "express";

import {
  getPermissions,
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  togglePermission,
  getCompanyPermissions
} from "./permission.controller.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { tenantGuard } from "../../middlewares/tenant.middleware.js";

const router = express.Router();
// =========================
// 🔐 LISTAR PERMISOS
// =========================
router.get("/", requireAuth, requirePermission(["SYSTEM_COMPANIES_VIEW", "TENANT_PERMISSIONS_VIEW"]), getPermissions);

// =========================
// 📋 CRUD PERMISOS SYSTEM
// =========================

router.get("/catalog", requireAuth, requirePermission("SYSTEM_COMPANIES_VIEW"), getAllPermissions);

router.get("/company-catalog", requireAuth, requirePermission("TENANT_ROLES_VIEW"), getCompanyPermissions);

router.get("/:id", requireAuth, requirePermission("SYSTEM_COMPANIES_VIEW"), getPermissionById);

router.post("/", requireAuth, requirePermission("SYSTEM_COMPANIES_CREATE"), createPermission);

router.patch("/:id/toggle", requireAuth, requirePermission("SYSTEM_COMPANIES_EDIT"), togglePermission);

router.put("/:id", requireAuth, requirePermission("SYSTEM_COMPANIES_EDIT"), updatePermission);

export default router;

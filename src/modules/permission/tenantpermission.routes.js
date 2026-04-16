import express from "express";

import {
 
  getPermissions
} from "./tenantpermission.controller.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { tenantGuard } from "../../middlewares/tenant.middleware.js";

const router = express.Router();
// =========================
// 🔐 LISTAR PERMISOS
// =========================
router.get(
  "/",
  requireAuth,
  requirePermission([
  "SYSTEM_COMPANIES_VIEW",
  "TENANT_PERMISSIONS_VIEW"
]),
  getPermissions
);

export default router;
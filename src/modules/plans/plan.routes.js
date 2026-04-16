import express from "express";

import {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan
} from "./plan.controller.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { tenantGuard } from "../../middlewares/tenant.middleware.js";

const router = express.Router();

// =========================
// ➕ CREAR PLAN
// =========================
router.post(
  "/",
  requireAuth,
  requirePermission("TENANT_PLANS_CREATE"),
  createPlan
);

// =========================
// 📋 LISTAR PLANES
// =========================
router.get(
  "/",
  requireAuth,
  requirePermission("TENANT_PLANS_VIEW"),
  getPlans
);

// =========================
// 🔍 OBTENER PLAN
// =========================
router.get(
  "/:id",
  requireAuth,
  requirePermission("TENANT_PLANS_VIEW"),
  tenantGuard,
  getPlanById
);

// =========================
// ✏️ ACTUALIZAR PLAN
// =========================
router.put(
  "/:id",
  requireAuth,
  requirePermission("TENANT_PLANS_EDIT"),
  tenantGuard,
  updatePlan
);

// =========================
// ❌ DESACTIVAR PLAN
// =========================
router.delete(
  "/:id",
  requireAuth,
  requirePermission("TENANT_PLANS_DELETE"),
  deletePlan
);

export default router;
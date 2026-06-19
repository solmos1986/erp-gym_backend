import express from "express";

import { createCashMovement, getCashMovements, getCashMovementById, cancelCashMovement } from "./cashMovement.controller.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { tenantGuard } from "../../middlewares/tenant.middleware.js";

const router = express.Router();

// =========================
// ➕ CREAR MOVIMIENTO
// =========================
router.post("/", requireAuth, requirePermission("TENANT_CASH_CREATE"), createCashMovement);

// =========================
// 📋 LISTAR MOVIMIENTOS
// =========================
router.get("/", requireAuth, requirePermission("TENANT_CASH_VIEW"), getCashMovements);
// =========================
// ❌ ANULAR MOVIMIENTO
// =========================
router.post("/:id/cancel", requireAuth, requirePermission("TENANT_CASH_CREATE"), tenantGuard, cancelCashMovement);
// =========================
// 🔍 OBTENER MOVIMIENTO
// =========================
router.get("/:id", requireAuth, requirePermission("TENANT_CASH_VIEW"), tenantGuard, getCashMovementById);

export default router;

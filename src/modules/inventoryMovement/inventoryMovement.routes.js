import express from "express";

import {
  createInventoryMovement,
  getInventoryMovements,
  getInventoryMovementById,
  getStockByBranch,
  getKardex
} from "./inventoryMovement.controller.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { tenantGuard } from "../../middlewares/tenant.middleware.js";

const router = express.Router();

// =========================
// ➕ CREAR MOVIMIENTO
// =========================
router.post(
  "/",
  requireAuth,
  requirePermission("TENANT_INVENTORY_CREATE"),
  createInventoryMovement
);

// =========================
// 📋 LISTAR MOVIMIENTOS
// =========================
router.get(
  "/",
  requireAuth,
  requirePermission("TENANT_INVENTORY_VIEW"),
  getInventoryMovements
);
// =========================
// OBTENER STOCK ACTUAL
// =========================
router.get(
  "/stock",
  requireAuth,
  requirePermission("TENANT_INVENTORY_VIEW"),
  getStockByBranch
);
//=========================
// OBTENER MOVIMIENTOS POR PRODUCTO (KARDEX)
//=========================
router.get(
  "/kardex",
  requireAuth,
  requirePermission("TENANT_INVENTORY_VIEW"),
  getKardex
);
// =========================
// 🔍 OBTENER MOVIMIENTO
// =========================
router.get(
  "/:id",
  requireAuth,
  requirePermission("TENANT_INVENTORY_VIEW"),
  tenantGuard,
  getInventoryMovementById
);


export default router;
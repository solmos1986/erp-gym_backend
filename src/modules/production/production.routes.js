import express from "express";
import {
  createProductionOrder,
  getProductionOrders,
  getProductionOrderById,
  updateProductionOrder,
  deleteProductionOrder,
  activateProductionOrder,
  startProductionOrder,
  startProductionOrderItem,
  finishProductionOrderItem
} from "./production.controller.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { tenantGuard } from "../../middlewares/tenant.middleware.js";

const router = express.Router();

// =========================
// ➕ CREAR ORDEN DE PRODUCCIÓN
// =========================
router.post("/", requireAuth, requirePermission("TENANT_PRODUCTION_CREATE"), createProductionOrder);

// =========================
// 📋 LISTAR ÓRDENES
// =========================
router.get("/", requireAuth, requirePermission("TENANT_PRODUCTION_VIEW"), getProductionOrders);

// =========================
// 🔍 OBTENER ORDEN
// =========================
router.get("/:id", requireAuth, requirePermission("TENANT_PRODUCTION_VIEW"), tenantGuard, getProductionOrderById);

// =========================
// ✏️ ACTUALIZAR ORDEN
// =========================
router.put("/:id", requireAuth, requirePermission("TENANT_PRODUCTION_EDIT"), tenantGuard, updateProductionOrder);

// =========================
// ❌ CANCELAR ORDEN
// =========================
router.delete("/:id", requireAuth, requirePermission("TENANT_PRODUCTION_DELETE"), tenantGuard, deleteProductionOrder);

// =========================
// ✅ REACTIVAR ORDEN
// =========================
router.put("/:id/activate", requireAuth, requirePermission("TENANT_PRODUCTION_EDIT"), tenantGuard, activateProductionOrder);

// =========================
// ▶️ INICIAR PRODUCCIÓN
// =========================
router.put("/:id/start", requireAuth, requirePermission("TENANT_PRODUCTION_EXECUTE"), tenantGuard, startProductionOrder);

// =========================
// ▶️ INICIAR ITEM
// =========================
router.put("/items/:itemId/start", requireAuth, requirePermission("TENANT_PRODUCTION_EXECUTE"), tenantGuard, startProductionOrderItem);

// =========================
// 🏁 FINALIZAR ITEM
// =========================
router.put("/items/:itemId/finish", requireAuth, requirePermission("TENANT_PRODUCTION_EXECUTE"), tenantGuard, finishProductionOrderItem);

export default router;

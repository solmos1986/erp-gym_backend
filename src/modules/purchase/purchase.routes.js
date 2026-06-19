import express from "express";

import { createPurchase, getPurchases, getPurchaseById, cancelPurchase } from "./purchase.controller.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { tenantGuard } from "../../middlewares/tenant.middleware.js";

const router = express.Router();

// =========================
// 🛒 CREAR COMPRA
// =========================
router.post("/", requireAuth, requirePermission("TENANT_PURCHASES_CREATE"), createPurchase);

// =========================
// 📋 LISTAR COMPRAS
// =========================
router.get("/", requireAuth, requirePermission("TENANT_PURCHASES_VIEW"), getPurchases);

// =========================
// 🔍 OBTENER COMPRA
// =========================
router.get("/:id", requireAuth, requirePermission("TENANT_PURCHASES_VIEW"), tenantGuard, getPurchaseById);

// =========================
// ❌ ANULAR COMPRA
// =========================
router.post("/:id/cancel", requireAuth, requirePermission("TENANT_PURCHASES_DELETE"), tenantGuard, cancelPurchase);

export default router;

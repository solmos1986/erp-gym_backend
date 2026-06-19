import express from "express";

import { getSales, getSaleById, annulSale } from "./sale.controller.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { tenantGuard } from "../../middlewares/tenant.middleware.js";

const router = express.Router();

// =========================
// 📋 LISTAR VENTAS
// =========================
router.get("/", requireAuth, requirePermission("TENANT_SALES_VIEW"), getSales);
// =========================
// 🔄 ANULAR VENTA
// =========================
router.post("/:id/annul", requireAuth, requirePermission("TENANT_SALES_VIEW"), tenantGuard, annulSale);
// =========================
// 🔍 OBTENER VENTA
// =========================
router.get("/:id", requireAuth, requirePermission("TENANT_SALES_VIEW"), tenantGuard, getSaleById);

export default router;

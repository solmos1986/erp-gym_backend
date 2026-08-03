import express from "express";

import { createProductSale, annulProductSale } from "./productSale.controller.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { tenantGuard } from "../../middlewares/tenant.middleware.js";

const router = express.Router();

// =========================
// 🛒 VENDER PRODUCTOS
// =========================
router.post("/", requireAuth, requirePermission("TENANT_SALES_CREATE"), tenantGuard, createProductSale);

// =========================
// 🛒 ANULAR VENTA PRODUCTOS
// =========================
router.patch("/:id/annul", requireAuth, requirePermission("TENANT_SALES_DELETE") , annulProductSale);

export default router;

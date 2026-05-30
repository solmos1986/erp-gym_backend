import express from "express";

import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  activateProduct
} from "./product.controller.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { tenantGuard } from "../../middlewares/tenant.middleware.js";

const router = express.Router();

// =========================
// ➕ CREAR PRODUCTO
// =========================
router.post(
  "/",
  requireAuth,
  requirePermission("TENANT_PRODUCTS_CREATE"),
  createProduct
);

// =========================
// 📋 LISTAR PRODUCTOS
// =========================
router.get(
  "/",
  requireAuth,
  requirePermission("TENANT_PRODUCTS_VIEW"),
  getProducts
);

// =========================
// 🔍 OBTENER PRODUCTO
// =========================
router.get(
  "/:id",
  requireAuth,
  requirePermission("TENANT_PRODUCTS_VIEW"),
  tenantGuard,
  getProductById
);

// =========================
// ✏️ ACTUALIZAR PRODUCTO
// =========================
router.put(
  "/:id",
  requireAuth,
  requirePermission("TENANT_PRODUCTS_EDIT"),
  tenantGuard,
  updateProduct
);

// =========================
// ❌ DESACTIVAR PRODUCTO
// =========================
router.delete(
  "/:id",
  requireAuth,
  requirePermission("TENANT_PRODUCTS_DELETE"),
  tenantGuard,
  deleteProduct
);

// =========================
// ✅ ACTIVAR PRODUCTO
// =========================
router.put(
  "/:id/activate",
  requireAuth,
  requirePermission("TENANT_PRODUCTS_EDIT"),
  tenantGuard,
  activateProduct
);

export default router;
import express from "express";

import {
  createProductCategory,
  getProductCategories,
  getProductCategoryById,
  updateProductCategory,
  deleteProductCategory,
  activateProductCategory
} from "./productCategory.controller.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { tenantGuard } from "../../middlewares/tenant.middleware.js";

const router = express.Router();

// =========================
// ➕ CREAR CATEGORÍA
// =========================
router.post(
  "/",
  requireAuth,
  requirePermission("TENANT_PRODUCT_CATEGORIES_CREATE"),
  createProductCategory
);

// =========================
// 📋 LISTAR CATEGORÍAS
// =========================
router.get(
  "/",
  requireAuth,
  requirePermission("TENANT_PRODUCT_CATEGORIES_VIEW"),
  getProductCategories
);

// =========================
// 🔍 OBTENER CATEGORÍA
// =========================
router.get(
  "/:id",
  requireAuth,
  requirePermission("TENANT_PRODUCT_CATEGORIES_VIEW"),
  tenantGuard,
  getProductCategoryById
);

// =========================
// ✏️ ACTUALIZAR CATEGORÍA
// =========================
router.put(
  "/:id",
  requireAuth,
  requirePermission("TENANT_PRODUCT_CATEGORIES_EDIT"),
  tenantGuard,
  updateProductCategory
);

// =========================
// ❌ DESACTIVAR CATEGORÍA
// =========================
router.delete(
  "/:id",
  requireAuth,
  requirePermission("TENANT_PRODUCT_CATEGORIES_DELETE"),
  tenantGuard,
  deleteProductCategory
);

// =========================
// ✅ ACTIVAR CATEGORÍA
// =========================
router.put(
  "/:id/activate",
  requireAuth,
  requirePermission("TENANT_PRODUCT_CATEGORIES_EDIT"),
  tenantGuard,
  activateProductCategory
);

export default router;
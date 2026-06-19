import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";

import {
  getDashboard,
  getTopProducts,
  getLowStockProducts,
  getRecentMovements,
  getInventoryValuation,
  getKardex,
  getProductProfitability,
  getGeneralProfitability
} from "./inventory.controller.js";

const router = Router();

//////////////////////////////////////
// 📊 DASHBOARD INVENTARIO
//////////////////////////////////////
router.get("/dashboard", requireAuth, requirePermission("TENANT_INVENTORY_VIEW"), getDashboard);

//////////////////////////////////////
// 📈 PRODUCTOS MÁS VENDIDOS
//////////////////////////////////////
router.get("/top-products", requireAuth, requirePermission("TENANT_INVENTORY_VIEW"), getTopProducts);

//////////////////////////////////////
// ⚠️ PRODUCTOS BAJO STOCK
//////////////////////////////////////
router.get("/low-stock", requireAuth, requirePermission("TENANT_INVENTORY_VIEW"), getLowStockProducts);

//////////////////////////////////////
// 📋 ÚLTIMOS MOVIMIENTOS
//////////////////////////////////////
router.get("/recent-movements", requireAuth, requirePermission("TENANT_INVENTORY_VIEW"), getRecentMovements);
//=========================
// VALUACIÓN DE INVENTARIO
//=========================
router.get("/valuation", requireAuth, requirePermission("TENANT_INVENTORY_VIEW"), getInventoryValuation);

//=========================
// KARDEX
//=========================
router.get("/kardex", requireAuth, requirePermission("TENANT_INVENTORY_VIEW"), getKardex);

//=========================
// RENTABILIDAD DE PRODUCTOS
//=========================
router.get("/product-profitability", requireAuth, requirePermission("TENANT_INVENTORY_VIEW"), getProductProfitability);
//=========================
// RENTABILIDAD GENERAL
//=========================
router.get("/general-profitability", requireAuth, requirePermission("TENANT_INVENTORY_VIEW"), getGeneralProfitability);

export default router;

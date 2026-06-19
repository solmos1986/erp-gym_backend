import express from "express";

import {
  openCashRegister,
  getCurrentCashRegister,
  getCashRegisters,
  getCashRegisterById,
  closeCashRegister,
  getCurrentCashSummary
} from "./cashRegister.controller.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { tenantGuard } from "../../middlewares/tenant.middleware.js";

const router = express.Router();

// =========================
// ABRIR CAJA
// =========================
router.post("/open", requireAuth, requirePermission("TENANT_CASH_CREATE"), openCashRegister);

// =========================
// CAJA ACTUAL
// =========================
router.get("/current", requireAuth, requirePermission("TENANT_CASH_VIEW"), getCurrentCashRegister);

// =========================
// LISTAR CAJAS
// =========================
router.get("/", requireAuth, requirePermission("TENANT_CASH_VIEW"), getCashRegisters);
// =========================
// 📊 RESUMEN CAJA ACTUAL
// =========================
router.get("/current/summary", requireAuth, requirePermission("TENANT_CASH_VIEW"), getCurrentCashSummary);
// =========================
// CERRAR CAJA
// =========================
router.post("/:id/close", requireAuth, requirePermission("TENANT_CASH_CLOSE"), tenantGuard, closeCashRegister);
// =========================
// OBTENER CAJA
// =========================
router.get("/:id", requireAuth, requirePermission("TENANT_CASH_VIEW"), tenantGuard, getCashRegisterById);

export default router;

import express from "express";

import {
  purchaseMembership,
  getMemberships,
  getMembershipById,
  getMembershipStatus,
  getAllStatus,
  retryMembershipSale,getMembershipReportPDF
} from "./membership.controller.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { tenantGuard } from "../../middlewares/tenant.middleware.js";

const router = express.Router();
// =========================
// 📄 REPORTE PDF
// =========================
router.get(
  '/report/pdf',
  requireAuth,
  requirePermission("TENANT_MEMBERSHIP_VIEW"), // 👈 usa el permiso correcto
  getMembershipReportPDF
);
// =========================
// 💰 COMPRAR / RENOVAR
// =========================
router.post(
  "/purchase",
  requireAuth,
  requirePermission("TENANT_MEMBERSHIP_CREATE"),
  purchaseMembership
);

// =========================
// 📋 HISTORIAL
// =========================
router.get(
  "/",
  requireAuth,
  requirePermission("TENANT_MEMBERSHIP_VIEW"),
  getMemberships
);
// =========================
// 🔐 ESTADO GLOBAL
// =========================
router.get(
  "/status",
  requireAuth,
  requirePermission("TENANT_MEMBERSHIP_VIEW"),
  getAllStatus
);
// =========================
// 🔍 DETALLE
// =========================
router.get(
  "/:id",
  requireAuth,
  requirePermission("TENANT_MEMBERSHIP_VIEW"),
  tenantGuard,
  getMembershipById
);

// =========================
// 🔐 ESTADO ACTUAL
// =========================
router.get(
  "/status/:customerId",
  requireAuth,
  requirePermission("TENANT_MEMBERSHIP_VIEW"),
  getMembershipStatus
);
// =========================
// 🔄 REINTENTAR PAGO
// =========================
router.post(
  '/:id/retry',
  requireAuth,
  requirePermission("TENANT_MEMBERSHIP_CREATE"),
  retryMembershipSale
);


export default router;
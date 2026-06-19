import express from "express";

import {
  purchaseMembership,
  getMemberships,
  getMembershipById,
  getMembershipStatus,
  getAllStatus,
  retryMembershipSale,
  getMembershipReportPDF,
  syncMembershipStatus,
  assignMembership,
  annulMembershipSale
} from "./membership.controller.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { tenantGuard } from "../../middlewares/tenant.middleware.js";

const router = express.Router();
// =========================
// 📄 REPORTE PDF
// =========================
router.get(
  "/report/pdf",
  requireAuth,
  requirePermission("TENANT_MEMBERSHIP_VIEW"), // 👈 usa el permiso correcto
  getMembershipReportPDF
);
// =========================
// 💰 COMPRAR / RENOVAR
// =========================
router.post("/purchase", requireAuth, requirePermission("TENANT_MEMBERSHIP_CREATE"), purchaseMembership);

// =========================
// 📋 HISTORIAL
// =========================
router.get("/", requireAuth, requirePermission("TENANT_MEMBERSHIP_VIEW"), getMemberships);
// =========================
// 🔐 ESTADO GLOBAL
// =========================
router.get("/status", requireAuth, requirePermission("TENANT_MEMBERSHIP_VIEW"), getAllStatus);
// =========================
// 🔍 DETALLE
// =========================
router.get("/:id", requireAuth, requirePermission("TENANT_MEMBERSHIP_VIEW"), tenantGuard, getMembershipById);

// =========================
// 🔐 ESTADO ACTUAL
// =========================
router.get("/status/:customerId", requireAuth, requirePermission("TENANT_MEMBERSHIP_VIEW"), getMembershipStatus);
// =========================
// 🔄 REINTENTAR PAGO
// =========================
router.post("/:id/retry", requireAuth, requirePermission("TENANT_MEMBERSHIP_CREATE"), retryMembershipSale);
//=========================
// ASIGNAR CUSTOMER MEMBERSHIP
//=========================
router.post("/assign", requireAuth, requirePermission("TENANT_MEMBERSHIP_ASSIGN"), assignMembership);
//=========================
// SYNC CUSTOMER MEMBERSHIP STATUS
//=========================
router.post("/sync/:id", requireAuth, requirePermission("TENANT_MEMBERSHIP_SYNC"), syncMembershipStatus);

//=========================
// DELETE MEMBERSHIP (SOFT DELETE)
//=========================
router.post("/:id/annul", requireAuth, requirePermission("TENANT_MEMBERSHIP_DELETE"), annulMembershipSale);

export default router;

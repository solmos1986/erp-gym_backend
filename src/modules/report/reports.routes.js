import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";

import { getSalesReport, exportSalesExcel, exportSalesPDF } from "./reports.controller.js";

const router = Router();
// =========================
// 📗 EXCEL VENTAS
// =========================
router.get("/sales/excel", requireAuth, requirePermission("TENANT_REPORT_VIEW"), exportSalesExcel);

// =========================
// 📄 PDF VENTAS
// =========================

router.get("/sales/pdf", requireAuth, requirePermission("TENANT_REPORT_VIEW"), exportSalesPDF);

// =========================
// 📊 REPORTE VENTAS
// =========================

router.get("/sales", requireAuth, requirePermission("TENANT_REPORT_VIEW"), getSalesReport);

// =========================
// 📊 REPORTE CAJAS
// =========================
router.get(
  "/cash",
  requireAuth,
  requirePermission("TENANT_REPORT_VIEW")
  //getCashReport
);

// =========================
// 📗 EXCEL CAJAS
// =========================
router.get(
  "/cash/excel",
  requireAuth,
  requirePermission("TENANT_REPORT_VIEW")
  //exportCashExcel
);

// =========================
// 📄 PDF CAJAS
// =========================
router.get(
  "/cash/pdf",
  requireAuth,
  requirePermission("TENANT_REPORT_VIEW")
  //exportCashPDF
);
export default router;

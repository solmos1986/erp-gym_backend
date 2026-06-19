import express from "express";

import {
  getDashboardSummary,
  getSalesLast7Days,
  getRevenueComparison,
  getRegistrationsComparison,
  getPlanDistribution
} from "./dashboard.controller.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { tenantGuard } from "../../middlewares/tenant.middleware.js";

const router = express.Router();

//////////////////////////////////////
// 🔒 BASE
//////////////////////////////////////
router.use(requireAuth);
router.use(tenantGuard);

//////////////////////////////////////
// 📊 DASHBOARD
//////////////////////////////////////

router.get("/summary", requirePermission("TENANT_DASHBOARD_VIEW"), getDashboardSummary);

router.get("/sales-last-7-days", requirePermission("TENANT_DASHBOARD_VIEW"), getSalesLast7Days);
router.get("/revenue-comparison", requirePermission("TENANT_DASHBOARD_VIEW"), getRevenueComparison);

router.get("/registrations-comparison", requirePermission("TENANT_DASHBOARD_VIEW"), getRegistrationsComparison);

router.get("/plan-distribution", requirePermission("TENANT_DASHBOARD_VIEW"), getPlanDistribution);
export default router;

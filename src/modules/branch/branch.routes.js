import express from "express";
import { getBranches, createBranch  } from "./branch.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import requirePermission from "../../middlewares/permission.middleware.js";

const router = express.Router();

// =========================
// 🔐 AUTH
// =========================
router.use(requireAuth);

// =========================
// 📋 LISTAR
// =========================
router.get(
  "/",
  requirePermission("TENANT_BRANCH_VIEW"), // 🔥 importante
  getBranches
);
// =========================
// 📋 CREAR
// =========================
router.post(
  "/",
  requirePermission("TENANT_BRANCH_CREATE"),
  createBranch
);
export default router;
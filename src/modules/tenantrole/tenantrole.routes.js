import express from "express";

import {
  createRole,
  getRoles,
  updateRole,
  deleteRole,
  assignRoleToUser,
  removeRoleFromUser
} from "./tenantrole.controller.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { tenantGuard } from "../../middlewares/tenant.middleware.js";

const router = express.Router();

// =========================
// 🔐 CREAR ROL (PROTEGIDO - STAFF)
// =========================
router.post(
  "/create",
  requireAuth,
  requirePermission("TENANT_ROLES_CREATE"),
  createRole
);

// =========================
// 🔐 LISTAR ROLES
// =========================
router.get(
  "/",
  requireAuth,
  requirePermission("TENANT_ROLES_VIEW"),
  getRoles
);

// =========================
// 🔐 ACTUALIZAR ROL
// =========================
router.put(
  "/:id",
  requireAuth,
  requirePermission("TENANT_ROLES_EDIT"),
  tenantGuard,
  updateRole
);

// =========================
// 🔐 ELIMINAR ROL
// =========================
router.delete(
  "/:id",
  requireAuth,
  requirePermission("TENANT_ROLES_DELETE"),
  deleteRole
);

// =========================
// 🔐 ASIGNAR ROL A USUARIO
// =========================
router.post(
  "/assign",
  requireAuth,
  requirePermission("TENANT_ROLES_ASSIGN"),
  assignRoleToUser
);

// =========================
// 🔐 QUITAR ROL A USUARIO
// =========================
router.post(
  "/remove",
  requireAuth,
  requirePermission("TENANT_ROLES_REMOVE"),
  removeRoleFromUser
);

export default router;
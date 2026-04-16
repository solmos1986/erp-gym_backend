import express from "express";

import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser
} from "./user.controller.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { tenantGuard } from "../../middlewares/tenant.middleware.js";

const router = express.Router();

// =========================
// 🔐 CREAR USUARIO
// =========================
router.post(
  "/",
  requireAuth,
  requirePermission("TENANT_USERS_CREATE"),
  createUser
);

// =========================
// 🔐 LISTAR USUARIOS
// =========================
router.get(
  "/",
  requireAuth,
  requirePermission("TENANT_USERS_VIEW"),
  getUsers
);

// =========================
// 🔐 OBTENER POR ID
// =========================
router.get(
  "/:id",
  requireAuth,
  requirePermission("TENANT_USERS_VIEW"),
  tenantGuard,
  getUserById
);

// =========================
// 🔐 ACTUALIZAR USUARIO
// =========================
router.put(
  "/:id",
  requireAuth,
  requirePermission("TENANT_USERS_EDIT"),
  tenantGuard,
  updateUser
);

// =========================
// 🔐 DESACTIVAR USUARIO
// =========================
router.delete(
  "/:id",
  requireAuth,
  requirePermission("TENANT_USERS_DELETE"),
  tenantGuard,
  deleteUser
);

export default router;
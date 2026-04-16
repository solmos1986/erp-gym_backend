import express from "express";

import {
  createDevice,
  getDevices,
  getDeviceById,
  updateDevice,
  deleteDevice
} from "./device.controller.js";
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
// CRUD CON PERMISOS
//////////////////////////////////////

// ➕ Crear
router.post(
  "/",
  requirePermission("TENANT_DEVICES_CREATE"),
  createDevice
);

// 📋 Listar
router.get(
  "/",
  requirePermission("TENANT_DEVICES_VIEW"),
  getDevices
);

// 🔍 Obtener por ID
router.get(
  "/:id",
  requirePermission("TENANT_DEVICES_VIEW"),
  getDeviceById
);

// ✏️ Actualizar
router.put(
  "/:id",
  requirePermission("TENANT_DEVICES_EDIT"),
  updateDevice
);

// ❌ Eliminar
router.delete(
  "/:id",
  requirePermission("TENANT_DEVICES_DELETE"),
  deleteDevice
);

export default router;
import express from "express";

import {
  registerCompany,
  updateCompany,
  getCompanies,
  getCompanyById,
  deleteCompany,
  activateCompany,
  uploadCompanyLogo // 🔥 NUEVO
} from "./company.controller.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
// import { tenantGuard } from "../../middlewares/tenant.middleware.js"; // opcional según tu lógica

import multer from "multer";
import fs from "fs";

const router = express.Router();

// =========================
// ➕ CREAR COMPANY
// =========================
router.post(
  "/register",
  requireAuth,
  requirePermission("SYSTEM_COMPANIES_CREATE"),
  registerCompany
);

// =========================
// 📋 LISTAR
// =========================
router.get(
  "/",
  requireAuth,
  requirePermission("SYSTEM_COMPANIES_VIEW"),
  getCompanies
);

// =========================
// 🔍 OBTENER
// =========================
router.get(
  "/:id",
  requireAuth,
  
  getCompanyById
);

// =========================
// ✏️ UPDATE
// =========================
router.put(
  "/:id",
  requireAuth,
  requirePermission("SYSTEM_COMPANIES_EDIT"),
  updateCompany
);

// =========================
// ❌ DELETE
// =========================
router.delete(
  "/:id",
  requireAuth,
  requirePermission("SYSTEM_COMPANIES_DELETE"),
  deleteCompany
);

// =========================
// ✅ ACTIVATE
// =========================
router.patch(
  "/:id/activate",
  requireAuth,
  requirePermission("SYSTEM_COMPANIES_EDIT"),
  activateCompany
);


// ==========================================
// 🖼️ LOGO (🔥 IGUAL QUE PARTNER)
// ==========================================
const uploadDir = "uploads/logos";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + ".png"); // puedes cambiar extensión si quieres
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 } // 🔥 500KB (logos suelen ser livianos)
});

router.post(
  "/:id/logo",
  requireAuth,
  requirePermission("SYSTEM_COMPANIES_EDIT"),
  upload.single("file"), // 🔥 MISMO NOMBRE QUE FRONTEND
  uploadCompanyLogo
);

export default router;
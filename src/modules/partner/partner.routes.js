import express from "express";

import {
  createPartner,
  getPartners,
  getPartnerById,
  updatePartner,
  deletePartner,
  addPartnerImage,
  activatePartner,
  importPartnersFromExcel
} from "./partner.controller.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { tenantGuard } from "../../middlewares/tenant.middleware.js";

import multer from "multer";
import fs from "fs";
import path from "path";

const router = express.Router();

// =========================
// ➕ CREAR PARTNER
// =========================
router.post(
  "/",
  requireAuth,
  requirePermission("TENANT_PARTNER_CREATE"),
  createPartner
);

// =========================
// 📋 LISTAR PARTNERS
// =========================
router.get(
  "/",
  requireAuth,
  requirePermission("TENANT_PARTNER_VIEW"),
  getPartners
);

// =========================
// 🔍 OBTENER PARTNER
// =========================
router.get(
  "/:id",
  requireAuth,
  requirePermission("TENANT_PARTNER_VIEW"),
  tenantGuard,
  getPartnerById
);

// =========================
// ✏️ ACTUALIZAR PARTNER
// =========================
router.put(
  "/:id",
  requireAuth,
  requirePermission("TENANT_PARTNER_EDIT"),
  tenantGuard,
  updatePartner
);

// =========================
// ❌ DESACTIVAR PARTNER
// =========================
router.delete(
  "/:id",
  requireAuth,
  requirePermission("TENANT_PARTNER_DELETE"),
  deletePartner
);

// =========================
// 🖼️ AGREGAR IMAGEN
// =========================
const uploadDir = "uploads/partners";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true
  });
}

const storage = multer.diskStorage({

  destination: uploadDir,

  filename: (
    req,
    file,
    cb
  ) => {

    cb(
      null,
      Date.now() + ".jpg"
    );

  }

});

const upload = multer({

  storage,

  limits: {
    fileSize:
      300 * 1024
  }

});

router.post(
  "/:id/image",

  requireAuth,

  requirePermission(
    "TENANT_PARTNER_EDIT"
  ),

  tenantGuard,

  upload.single(
    "file"
  ),

  addPartnerImage
);

// =========================
// 🖼️ ACTIVAR PARTNER
// =========================
router.put(
  "/:id/activate",

  requireAuth,

  requirePermission(
    "TENANT_PARTNER_EDIT"
  ),

  activatePartner
);

// =========================
// 📥 IMPORTAR CLIENTES EXCEL
// =========================

const excelDir =
"uploads/excel";

if (
  !fs.existsSync(
    excelDir
  )
) {

  fs.mkdirSync(
    excelDir,

    {
      recursive:true
    }

  );

}

const excelStorage =
multer.diskStorage({

  destination:
  excelDir,

  filename:
  (
    req,
    file,
    cb
  ) => {

    cb(

      null,

      Date.now()

      +

      path.extname(
        file.originalname
      )

    );

  }

});

const excelUpload =
multer({

  storage:
  excelStorage

});

router.post(

  "/import-excel",

  requireAuth,

  requirePermission(
    "TENANT_PARTNER_CREATE"
  ),

  excelUpload.single(
    "file"
  ),

  importPartnersFromExcel

);

export default router;
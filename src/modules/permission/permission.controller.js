import { PrismaClient } from "@prisma/client";
import { applyTenantFilter } from "../../utils/tenant.util.js";

const prisma = new PrismaClient();

// =========================
// 📋 LISTAR PERMISOS
// =========================
export const getPermissions = async (req, res) => {
  try {
    console.log("llegue getPermissions");
    // 🔥 SI ES SYSTEM → ver todo
    if (req.user.systemRoles?.includes("SYSTEM_ADMIN")) {
      const permissions = await prisma.permission.findMany({
        where: { scope: "TENANT" }
      });

      return res.json(permissions);
    }

    // 🔥 SI ES TENANT → solo lo permitido
    const permissions = await prisma.companyPermission.findMany({
      where: { companyId: req.user.companyId },
      include: {
        permission: true
      }
    });

    return res.json(permissions.map((p) => p.permission));
  } catch (error) {
    res.status(500).json({ message: "Error obteniendo permisos" });
  }
};

// =========================
// 📋 LISTAR TODOS LOS PERMISOS
// =========================
export const getAllPermissions = async (req, res) => {
  try {
    console.log("llegue get all permisoss catalog");
    const { scope } = req.query;

    const where = {};

    if (scope) {
      where.scope = scope;
    }

    const permissions = await prisma.permission.findMany({
      where,
      orderBy: {
        code: "asc"
      }
    });

    res.json(permissions);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error obteniendo permisos"
    });
  }
};

// =========================
// 📋 OBTENER PERMISO
// =========================
export const getPermissionById = async (req, res) => {
  try {
    const { id } = req.params;

    const permission = await prisma.permission.findUnique({
      where: { id }
    });

    if (!permission) {
      return res.status(404).json({
        message: "Permiso no encontrado"
      });
    }

    res.json(permission);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error obteniendo permiso"
    });
  }
};

// =========================
// 📋 CREAR PERMISO
// =========================
export const createPermission = async (req, res) => {
  try {
    const { code, description, scope } = req.body;

    if (!code) {
      throw new Error("Código requerido");
    }

    if (!scope) {
      throw new Error("Scope requerido");
    }

    const exists = await prisma.permission.findUnique({
      where: {
        code: code.toUpperCase()
      }
    });

    if (exists) {
      throw new Error("Ya existe un permiso con ese código");
    }

    const permission = await prisma.permission.create({
      data: {
        code: code.toUpperCase(),
        description,
        scope
      }
    });

    res.status(201).json(permission);
  } catch (error) {
    console.error(error);

    res.status(400).json({
      message: error.message
    });
  }
};

// =========================
// 📋 ACTUALIZAR PERMISO
// =========================
export const updatePermission = async (req, res) => {
  try {
    console.log("llegue a editar permiso");
    const { id } = req.params;

    const { description, scope } = req.body;

    const permission = await prisma.permission.update({
      where: { id },
      data: {
        description,
        scope
      }
    });

    res.json(permission);
  } catch (error) {
    console.error(error);

    res.status(400).json({
      message: error.message
    });
  }
};

// =========================
// 📋 TOGGLE PERMISO
// =========================
export const togglePermission = async (req, res) => {
  try {
    console.log("🔥 TOGGLE PERMISSION", req.params.id);
    const { id } = req.params;

    const current = await prisma.permission.findUnique({
      where: { id }
    });

    if (!current) {
      return res.status(404).json({
        message: "Permiso no encontrado"
      });
    }

    const permission = await prisma.permission.update({
      where: { id },
      data: {
        isActive: !current.isActive
      }
    });

    res.json(permission);
  } catch (error) {
    console.error(error);

    res.status(400).json({
      message: error.message
    });
  }
};

// ======================================================
// 📋 CATÁLOGO DE PERMISOS DEL BUSINESS TEMPLATE
// Solo devuelve los permisos que pertenecen al
// BusinessTemplate de la empresa autenticada.
// ======================================================
export const getCompanyPermissions = async (req, res) => {
  console.log("🚀 ENTRE A getCompanyPermissions");
  try {
    const companyId = req.user.companyId;

    // =========================
    // EMPRESA
    // =========================
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        businessTemplateId: true
      }
    });

    if (!company) {
      return res.status(404).json({
        message: "Empresa no encontrada"
      });
    }

    if (!company.businessTemplateId) {
      return res.status(400).json({
        message: "La empresa no tiene un BusinessTemplate asignado."
      });
    }

    // =========================
    // PERMISOS DEL TEMPLATE
    // =========================
    const permissions = await prisma.permission.findMany({
      where: {
        businessTemplatePermissions: {
          some: {
            businessTemplateId: company.businessTemplateId
          }
        },
        isActive: true
      },
      orderBy: {
        code: "asc"
      }
    });

    res.json(permissions);
  } catch (error) {
    console.error("❌ ERROR getCompanyPermissions:", error);

    res.status(500).json({
      message: "Error obteniendo catálogo de permisos."
    });
  }
};

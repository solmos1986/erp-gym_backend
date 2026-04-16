import { PrismaClient } from "@prisma/client";
import { applyTenantFilter } from "../../utils/tenant.util.js";

const prisma = new PrismaClient();

// =========================
// ➕ CREAR PLAN
// =========================
export const createPlan = async (req, res) => {
  const { name, price, durationDays, description } = req.body;

  try {
    // VALIDACIONES
    if (!name || !price || !durationDays) {
      return res.status(400).json({
        message: "Nombre, precio y duración son obligatorios"
      });
    }

    if (price <= 0) {
      return res.status(400).json({
        message: "El precio debe ser mayor a 0"
      });
    }

    if (durationDays <= 0) {
      return res.status(400).json({
        message: "La duración debe ser mayor a 0"
      });
    }

    // VALIDAR DUPLICADO POR EMPRESA
    const existingPlan = await prisma.plan.findFirst({
      where: {
        name,
        companyId: req.user.companyId
      }
    });

    if (existingPlan) {
      return res.status(400).json({
        message: "Ya existe un plan con ese nombre"
      });
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        price,
        durationDays,
        description,
        company: {
          connect: { id: req.user.companyId }
        }
      }
    });

    res.status(201).json({
      message: "Plan creado correctamente",
      plan
    });

  } catch (error) {
    

    res.status(500).json({
      message: error.message || "Error creando plan"
    });
  }
};

// =========================
// 📋 LISTAR PLANES
// =========================
export const getPlans = async (req, res) => {
  const { isActive } = req.query;

  try {
    const plans = await prisma.plan.findMany({
      where: {
        ...applyTenantFilter(req),
        ...(isActive !== undefined && {
          isActive: isActive === "true"
        })
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(plans);

  } catch (error) {
    

    res.status(500).json({
      message: "Error obteniendo planes"
    });
  }
};

// =========================
// 🔍 OBTENER PLAN
// =========================
export const getPlanById = async (req, res) => {
  const { id } = req.params;

  try {
    const plan = await prisma.plan.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
      }
    });

    if (!plan) {
      return res.status(404).json({
        message: "Plan no encontrado"
      });
    }

    res.json(plan);

  } catch (error) {
    

    res.status(500).json({
      message: "Error obteniendo plan"
    });
  }
};

// =========================
// ✏️ ACTUALIZAR PLAN
// =========================
export const updatePlan = async (req, res) => {
  const { id } = req.params;
  const { name, price, durationDays, description, isActive } = req.body;

  try {
    const existingPlan = await prisma.plan.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
      }
    });

    if (!existingPlan) {
      return res.status(404).json({
        message: "Plan no encontrado"
      });
    }

    // VALIDAR NOMBRE DUPLICADO
    if (name && name !== existingPlan.name) {
      const duplicate = await prisma.plan.findFirst({
        where: {
          name,
          companyId: req.user.companyId
        }
      });

      if (duplicate) {
        return res.status(400).json({
          message: "Ya existe un plan con ese nombre"
        });
      }
    }

    const plan = await prisma.plan.update({
      where: { id },
      data: {
        name,
        price,
        durationDays,
        description,
        isActive
      }
    });

    res.json({
      message: "Plan actualizado correctamente",
      plan
    });

  } catch (error) {
    

    res.status(500).json({
      message: "Error actualizando plan"
    });
  }
};

// =========================
// ❌ DESACTIVAR PLAN
// =========================
export const deletePlan = async (req, res) => {
  const { id } = req.params;

  try {
    
    

    const plan = await prisma.plan.findFirst({
      where: {
        id,
        companyId: req.user.companyId
      }
    });

    

    if (!plan) {
      return res.status(404).json({
        message: "Plan no encontrado"
      });
    }

    const updated = await prisma.plan.update({
      where: { id },
      data: { isActive: false }
    });

    

    res.json({
      message: "Plan desactivado correctamente"
    });

  } catch (error) {
    

    res.status(500).json({
      message: error.message
    });
  }
};
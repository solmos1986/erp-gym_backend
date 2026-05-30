import { PrismaClient } from "@prisma/client";
import { applyTenantFilter } from "../../utils/tenant.util.js";

const prisma = new PrismaClient();

// =========================
// ➕ CREAR CATEGORÍA
// =========================
export const createProductCategory = async (req, res) => {
  const { name, description } = req.body;

  try {
    if (!name) {
      return res.status(400).json({
        message: "El nombre es obligatorio"
      });
    }

    const existingCategory = await prisma.productCategory.findFirst({
      where: {
        name,
        companyId: req.user.companyId
      }
    });

    if (existingCategory) {
      return res.status(400).json({
        message: "Ya existe una categoría con ese nombre"
      });
    }

    const category = await prisma.productCategory.create({
      data: {
        name,
        description,
        company: {
          connect: { id: req.user.companyId }
        }
      }
    });

    res.status(201).json({
      message: "Categoría creada correctamente",
      category
    });

  } catch (error) {
    res.status(500).json({
      message: error.message || "Error creando categoría",
      error: error.message
    });
  }
};

// =========================
// 📋 LISTAR CATEGORÍAS
// =========================
export const getProductCategories = async (req, res) => {
  const { isActive } = req.query;

  try {
    const categories = await prisma.productCategory.findMany({
      where: {
        ...applyTenantFilter(req),
        ...(isActive !== undefined && {
          isActive: isActive === "true"
        })
      },
      orderBy: {
        name: "asc"
      }
    });

    res.json(categories);

  } catch (error) {
    res.status(500).json({
      message: "Error obteniendo categorías",
      error: error.message
    });
  }
};

// =========================
// 🔍 OBTENER CATEGORÍA
// =========================
export const getProductCategoryById = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await prisma.productCategory.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
      }
    });

    if (!category) {
      return res.status(404).json({
        message: "Categoría no encontrada"
      });
    }

    res.json(category);

  } catch (error) {
    res.status(500).json({
      message: "Error obteniendo categoría",
      error: error.message
    });
  }
};

// =========================
// ✏️ ACTUALIZAR CATEGORÍA
// =========================
export const updateProductCategory = async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;

  try {
    const existingCategory = await prisma.productCategory.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
      }
    });

    if (!existingCategory) {
      return res.status(404).json({
        message: "Categoría no encontrada"
      });
    }

    if (name && name !== existingCategory.name) {
      const duplicate = await prisma.productCategory.findFirst({
        where: {
          name,
          companyId: req.user.companyId
        }
      });

      if (duplicate) {
        return res.status(400).json({
          message: "Ya existe una categoría con ese nombre"
        });
      }
    }

    const category = await prisma.productCategory.update({
      where: { id },
      data: {
        name,
        description,
        isActive
      }
    });

    res.json({
      message: "Categoría actualizada correctamente",
      category
    });

  } catch (error) {
    res.status(500).json({
      message: "Error actualizando categoría",
      error: error.message
    });
  }
};

// =========================
// ❌ DESACTIVAR CATEGORÍA
// =========================
export const deleteProductCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await prisma.productCategory.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
      }
    });

    if (!category) {
      return res.status(404).json({
        message: "Categoría no encontrada"
      });
    }

    const productsCount = await prisma.product.count({
      where: {
        productCategoryId: id
      }
    });

    if (productsCount > 0) {
      return res.status(400).json({
        message: "La categoría tiene productos asociados"
      });
    }

    await prisma.productCategory.update({
      where: { id },
      data: {
        isActive: false
      }
    });

    res.json({
      message: "Categoría desactivada correctamente"
    });

  } catch (error) {
    res.status(500).json({
      message: "Error desactivando categoría",
      error: error.message
    });
  }
};

// =========================
// ✅ ACTIVAR CATEGORÍA
// =========================
export const activateProductCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await prisma.productCategory.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
      }
    });

    if (!category) {
      return res.status(404).json({
        message: "Categoría no encontrada"
      });
    }

    await prisma.productCategory.update({
      where: { id },
      data: {
        isActive: true
      }
    });

    res.json({
      message: "Categoría activada correctamente"
    });

  } catch (error) {
    res.status(500).json({
      message: "Error activando categoría",
      error: error.message
    });
  }
};
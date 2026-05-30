import { PrismaClient } from "@prisma/client";
import { applyTenantFilter } from "../../utils/tenant.util.js";

const prisma = new PrismaClient();

// =========================
// ➕ CREAR PRODUCTO
// =========================
export const createProduct = async (req, res) => {
  const {
    code,
    name,
    description,
    costPrice,
    salePrice,
    productCategoryId
  } = req.body;

  try {
    if (!name) {
      return res.status(400).json({
        message: "El nombre es obligatorio"
      });
    }

    if (salePrice === undefined || salePrice === null) {
      return res.status(400).json({
        message: "El precio de venta es obligatorio"
      });
    }

    // validar categoría
    if (productCategoryId) {
      const category = await prisma.productCategory.findFirst({
        where: {
          id: productCategoryId,
          ...applyTenantFilter(req)
        }
      });

      if (!category) {
        return res.status(400).json({
          message: "La categoría no existe"
        });
      }
    }

    const product = await prisma.product.create({
        data: {
            code,
            name,
            description,
            costPrice,
            salePrice,

            company: {
            connect: {
                id: req.user.companyId
            }
            },

            ...(productCategoryId && {
            category: {
                connect: {
                id: productCategoryId
                }
            }
            })
        },

        include: {
            category: true
        }
    });

    res.status(201).json({
      message: "Producto creado correctamente",
      product
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
      code: error.code
    });
  }
};

// =========================
// 📋 LISTAR PRODUCTOS
// =========================
export const getProducts = async (req, res) => {
  const { isActive } = req.query;

  try {
    const products = await prisma.product.findMany({
      where: {
        ...applyTenantFilter(req),

        ...(isActive !== undefined && {
          isActive: isActive === "true"
        })
      },

      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      },

      orderBy: {
        name: "asc"
      }
    });

    res.json(products);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error obteniendo productos"
    });
  }
};

// =========================
// 🔍 OBTENER PRODUCTO
// =========================
export const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
      },

      include: {
        category: {
            select: {
            id: true,
            name: true
            }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    res.json(product);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error obteniendo producto"
    });
  }
};

// =========================
// ✏️ ACTUALIZAR PRODUCTO
// =========================
export const updateProduct = async (req, res) => {
  const { id } = req.params;

  const {
    code,
    name,
    description,
    costPrice,
    salePrice,
    productCategoryId,
    isActive
  } = req.body;

  try {
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
      }
    });

    if (!existingProduct) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    // validar categoría
    if (productCategoryId) {
      const category = await prisma.productCategory.findFirst({
        where: {
          id: productCategoryId,
          ...applyTenantFilter(req)
        }
      });

      if (!category) {
        return res.status(400).json({
          message: "La categoría no existe"
        });
      }
    }

    const product = await prisma.product.update({
      where: {
        id
      },

      data: {
        code,
        name,
        description,
        costPrice,
        salePrice,
        isActive,

        ...(productCategoryId && {
          category: {
            connect: {
              id: productCategoryId
            }
          }
        })
      },

      include: {
        category: true
      }
    });

    res.json({
      message: "Producto actualizado correctamente",
      product
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
      code: error.code
    });
  }
};

// =========================
// ❌ DESACTIVAR PRODUCTO
// =========================
export const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
      }
    });

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    await prisma.product.update({
      where: {
        id
      },

      data: {
        isActive: false
      }
    });

    res.json({
      message: "Producto desactivado correctamente"
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error desactivando producto"
    });
  }
};

// =========================
// ✅ ACTIVAR PRODUCTO
// =========================
export const activateProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
      }
    });

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    await prisma.product.update({
      where: {
        id
      },

      data: {
        isActive: true
      }
    });

    res.json({
      message: "Producto activado correctamente"
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error activando producto"
    });
  }
};
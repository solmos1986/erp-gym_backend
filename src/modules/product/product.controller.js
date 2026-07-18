import { PrismaClient } from "@prisma/client";
import { applyTenantFilter } from "../../utils/tenant.util.js";

const prisma = new PrismaClient();
// =========================
// ➕ CREAR PRODUCTO
// =========================
export const createProduct = async (req, res) => {
  // =========================
  // Datos recibidos
  // =========================

  const productData = req.body.product ?? req.body;
  const bom = req.body.bom ?? null;

  let {
    code,
    barcode,
    name,
    description,
    imageUrl,
    productType,
    sourceType,
    unit,
    costPrice,
    salePrice,
    minStock,
    maxStock,
    reorderPoint,
    productCategoryId
  } = productData;

  try {
    // =========================
    // Normalizar datos
    // =========================

    code = code?.trim().toUpperCase();
    barcode = barcode?.trim() || null;
    name = name?.trim();
    description = description?.trim() || null;
    imageUrl = imageUrl?.trim() || null;

    // =========================
    // Validaciones obligatorias
    // =========================

    if (!code) {
      return res.status(400).json({
        message: "El código es obligatorio."
      });
    }

    if (!name) {
      return res.status(400).json({
        message: "El nombre es obligatorio."
      });
    }

    if (!productCategoryId) {
      return res.status(400).json({
        message: "La categoría es obligatoria."
      });
    }

    if (!productType) {
      return res.status(400).json({
        message: "El tipo de producto es obligatorio."
      });
    }

    if (!sourceType) {
      return res.status(400).json({
        message: "El origen del producto es obligatorio."
      });
    }

    if (!unit) {
      return res.status(400).json({
        message: "La unidad es obligatoria."
      });
    }

    if (salePrice === undefined || salePrice === null) {
      return res.status(400).json({
        message: "El precio de venta es obligatorio."
      });
    }

    // =========================
    // Validaciones numéricas
    // =========================

    if (Number(salePrice) < 0) {
      return res.status(400).json({
        message: "El precio de venta no puede ser negativo."
      });
    }

    if (minStock !== undefined && Number(minStock) < 0) {
      return res.status(400).json({
        message: "El stock mínimo no puede ser negativo."
      });
    }

    if (maxStock !== undefined && Number(maxStock) < 0) {
      return res.status(400).json({
        message: "El stock máximo no puede ser negativo."
      });
    }

    if (reorderPoint !== undefined && Number(reorderPoint) < 0) {
      return res.status(400).json({
        message: "El punto de reposición no puede ser negativo."
      });
    }

    if (minStock !== undefined && maxStock !== undefined && Number(maxStock) < Number(minStock)) {
      return res.status(400).json({
        message: "El stock máximo no puede ser menor al stock mínimo."
      });
    }

    // =========================
    // Validaciones de negocio
    // =========================

    if (productType === "RAW_MATERIAL" && sourceType !== "PURCHASE") {
      return res.status(400).json({
        message: "Una materia prima solo puede tener origen PURCHASE."
      });
    }

    if (productType === "SERVICE" && sourceType === "PRODUCTION") {
      return res.status(400).json({
        message: "Un servicio no puede producirse."
      });
    }

    // =========================
    // Código único
    // =========================

    const existingCode = await prisma.product.findFirst({
      where: {
        companyId: req.user.companyId,
        code
      }
    });

    if (existingCode) {
      return res.status(400).json({
        message: "Ya existe un producto con ese código."
      });
    }

    // =========================
    // Código de barras único
    // =========================

    if (barcode) {
      const existingBarcode = await prisma.product.findFirst({
        where: {
          companyId: req.user.companyId,
          barcode
        }
      });

      if (existingBarcode) {
        return res.status(400).json({
          message: "Ya existe un producto con ese código de barras."
        });
      }
    }

    // =========================
    // Validar categoría
    // =========================

    const category = await prisma.productCategory.findFirst({
      where: {
        id: productCategoryId,
        ...applyTenantFilter(req)
      }
    });

    if (!category) {
      return res.status(400).json({
        message: "La categoría no existe."
      });
    }

    // =========================
    // Crear producto + BOM
    // =========================

    const product = await prisma.$transaction(async (tx) => {
      // =========================
      // Crear producto
      // =========================

      const createdProduct = await tx.product.create({
          data: {
              company: {
                  connect: {
                      id: req.user.companyId
                  }
              },

              category: {
                  connect: {
                      id: productCategoryId
                  }
              },

              code,
              barcode,
              name,
              description,
              imageUrl,

              productType,
              sourceType,

              unit
          }
      });
      // ======================================
      // Crear ProductBranch
      // ======================================

      await tx.productBranch.create({
          data: {
              companyId: req.user.companyId,
              branchId: req.user.branchId,

              productId: createdProduct.id,

              currentStock: 0,

              costPrice: costPrice ?? 0,
              salePrice: salePrice ?? 0,

              minStock: minStock ?? 0,
              maxStock: maxStock ?? 0,
              reorderPoint: reorderPoint ?? 0
          }
      });

      // ======================================
      // Crear BOM (si fue enviado)
      // ======================================

      if (bom) {
        // ======================================
        // Crear BOM (si fue enviado)
        // ======================================

        if (bom) {
          const createdBom = await tx.productBom.create({
            data: {
              company: {
                connect: {
                  id: req.user.companyId
                }
              },

              product: {
                connect: {
                  id: createdProduct.id
                }
              },

              version: 1,

              name: bom.name?.trim() || null,

              description: bom.description?.trim() || null,

              isActive: true
            }
          });

          // ======================================
          // Crear Items del BOM
          // ======================================

          if (Array.isArray(bom.items) && bom.items.length > 0) {
            for (const item of bom.items) {
              // ==========================
              // Validar material
              // ==========================

              const material = await tx.product.findFirst({
                where: {
                  id: item.materialId,
                  companyId: req.user.companyId
                }
              });

              if (!material) {
                throw new Error(`El material ${item.materialId} no existe.`);
              }

              if (material.productType === "SERVICE") {
                throw new Error(`${material.name} es un servicio y no puede utilizarse como materia prima.`);
              }

              // ==========================
              // Crear Item
              // ==========================

              await tx.productBomItem.create({
                data: {
                  bom: {
                    connect: {
                      id: createdBom.id
                    }
                  },

                  material: {
                    connect: {
                      id: item.materialId
                    }
                  },

                  quantity: item.quantity,

                  wastePercent: item.wastePercent ?? 0,

                  notes: item.notes?.trim() || null
                }
              });
            }
          }
        }
      }

      // ======================================
      // Retornar producto completo
      // ======================================

      return await tx.product.findUnique({
        where: {
          id: createdProduct.id
        },

        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          },

          bom: {
            where: {
              isActive: true
            },

            include: {
              items: {
                include: {
                  material: {
                    select: {
                      id: true,
                      code: true,
                      barcode: true,
                      name: true,
                      unit: true,
                      productType: true
                    }
                  }
                },

                orderBy: {
                  createdAt: "asc"
                }
              }
            }
          }
        }
      });
    });

    res.status(201).json({
      message: "Producto creado correctamente.",
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
// 📋 OBTENER PRODUCTOS
// =========================
export const getProducts = async (req, res) => {
  const { isActive, productType, sourceType, productCategoryId, search } = req.query;

  try {
    const products = await prisma.product.findMany({
      where: {
        ...applyTenantFilter(req),

        ...(isActive !== undefined && {
          isActive: isActive === "true"
        }),

        ...(productType && {
          productType
        }),

        ...(sourceType && {
          sourceType
        }),

        ...(productCategoryId && {
          productCategoryId
        }),

        ...(search && {
          OR: [
            {
              code: {
                contains: search,
                mode: "insensitive"
              }
            },
            {
              barcode: {
                contains: search,
                mode: "insensitive"
              }
            },
            {
              name: {
                contains: search,
                mode: "insensitive"
              }
            }
          ]
        })
      },

      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },

        productBranches: {
          where: {
            branchId: req.user.branchId
          },
          select: {
            currentStock: true,
            costPrice: true,
            salePrice: true,
            minStock: true,
            maxStock: true,
            reorderPoint: true
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
      message: "Error obteniendo productos",
      error: error.message
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
        },

        productBranches: {
          where: {
            branchId: req.user.branchId
          },
          select: {
            currentStock: true,
            costPrice: true,
            salePrice: true,
            minStock: true,
            maxStock: true,
            reorderPoint: true
          }
        },

        bom: {
          where: {
            isActive: true
          },

          orderBy: {
            version: "desc"
          },

          include: {
            items: {
              include: {
                material: {
                  include: {
                    productBranches: {
                      where: {
                        branchId: req.user.branchId
                      },
                      select: {
                        currentStock: true,
                        costPrice: true
                      }
                    }
                  }
                }
              }
            }
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

  // =========================
  // Payload
  // =========================

  const { product = {}, bom = {} } = req.body;

  let {
    code,
    barcode,
    name,
    description,
    imageUrl,

    productType,
    sourceType,

    unit,

    salePrice,

    minStock,
    maxStock,
    reorderPoint,

    productCategoryId,

    isActive
  } = product;

  // =========================
  // BOM
  // =========================

  const { indirectCostPercent = 0, items = [] } = bom;
  try {
    // =========================
    // Verificar existencia
    // =========================

    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
      }
    });

    if (!existingProduct) {
      return res.status(404).json({
        message: "Producto no encontrado."
      });
    }

    // =========================
    // Normalizar datos
    // =========================

    code = code?.trim().toUpperCase();
    barcode = barcode?.trim() || null;
    name = name?.trim();
    description = description?.trim() || null;
    imageUrl = imageUrl?.trim() || null;

    // =========================
    // Validaciones obligatorias
    // =========================

    if (!code) {
      return res.status(400).json({
        message: "El código es obligatorio."
      });
    }

    if (!name) {
      return res.status(400).json({
        message: "El nombre es obligatorio."
      });
    }

    if (!productCategoryId) {
      return res.status(400).json({
        message: "La categoría es obligatoria."
      });
    }

    if (!productType) {
      return res.status(400).json({
        message: "El tipo de producto es obligatorio."
      });
    }

    if (!sourceType) {
      return res.status(400).json({
        message: "El tipo de abastecimiento es obligatorio."
      });
    }

    if (!unit) {
      return res.status(400).json({
        message: "La unidad es obligatoria."
      });
    }

    if (salePrice === undefined || salePrice === null) {
      return res.status(400).json({
        message: "El precio de venta es obligatorio."
      });
    }

    // =========================
    // Validaciones numéricas
    // =========================

    if (Number(salePrice) < 0) {
      return res.status(400).json({
        message: "El precio de venta no puede ser negativo."
      });
    }

    if (minStock !== undefined && Number(minStock) < 0) {
      return res.status(400).json({
        message: "El stock mínimo no puede ser negativo."
      });
    }

    if (maxStock !== undefined && Number(maxStock) < 0) {
      return res.status(400).json({
        message: "El stock máximo no puede ser negativo."
      });
    }

    if (reorderPoint !== undefined && Number(reorderPoint) < 0) {
      return res.status(400).json({
        message: "El punto de reposición no puede ser negativo."
      });
    }

    if (minStock !== undefined && maxStock !== undefined && Number(maxStock) < Number(minStock)) {
      return res.status(400).json({
        message: "El stock máximo no puede ser menor al stock mínimo."
      });
    }
    // =========================
    // Validaciones BOM
    // =========================

    if (sourceType === "PRODUCTION") {
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          message: "Los productos de producción deben tener al menos una materia prima."
        });
      }
    }

    if (sourceType === "PURCHASE") {
      // No requiere BOM
    }

    if (productType === "SERVICE") {
      if (items.length > 0) {
        return res.status(400).json({
          message: "Los servicios no pueden tener una receta (BOM)."
        });
      }
    }

    // =========================
    // Validar materiales duplicados
    // =========================

    if (items.length > 0) {
      const materialIds = items.map((item) => item.materialId);

      const duplicated = materialIds.find((id, index) => materialIds.indexOf(id) !== index);

      if (duplicated) {
        return res.status(400).json({
          message: "La receta contiene materias primas duplicadas."
        });
      }
    }

    // =========================
    // Código único
    // =========================

    const existingCode = await prisma.product.findFirst({
      where: {
        companyId: req.user.companyId,
        code,
        NOT: {
          id
        }
      }
    });

    if (existingCode) {
      return res.status(400).json({
        message: "Ya existe otro producto con ese código."
      });
    }

    // =========================
    // Código de barras único
    // =========================

    if (barcode) {
      const existingBarcode = await prisma.product.findFirst({
        where: {
          companyId: req.user.companyId,
          barcode,
          NOT: {
            id
          }
        }
      });

      if (existingBarcode) {
        return res.status(400).json({
          message: "Ya existe otro producto con ese código de barras."
        });
      }
    }

    // =========================
    // Validar categoría
    // =========================

    const category = await prisma.productCategory.findFirst({
      where: {
        id: productCategoryId,
        ...applyTenantFilter(req)
      }
    });

    if (!category) {
      return res.status(400).json({
        message: "La categoría no existe."
      });
    }

    // =========================
    // Actualizar
    // =========================

    // =========================
    // Actualizar (Product + BOM)
    // =========================

    const product = await prisma.$transaction(async (tx) => {
      // =========================
      // Actualizar Producto
      // =========================

      const updatedProduct = await tx.product.update({
        where: {
          id
        },

        data: {
          code,
          barcode,
          name,
          description,
          imageUrl,

          productType,
          sourceType,

          unit,

          salePrice,

          minStock,
          maxStock,
          reorderPoint,

          isActive,

          category: {
            connect: {
              id: productCategoryId
            }
          }
        }
      });

      // =========================
      // Productos de Producción
      // =========================

      if (sourceType === "PRODUCTION" || sourceType === "BOTH") {
        let productBom = await tx.productBom.findFirst({
          where: {
            productId: updatedProduct.id,
            isActive: true
          }
        });

        if (!productBom) {
          productBom = await tx.productBom.create({
            data: {
              companyId: req.user.companyId,
              productId: updatedProduct.id,
              version: 1,
              name: updatedProduct.name,
              description: updatedProduct.description,
              isActive: true
            }
          });
        } else {
          productBom = await tx.productBom.update({
            where: {
              id: productBom.id
            },

            data: {
              name: updatedProduct.name,
              description: updatedProduct.description
            }
          });
        }

        // =========================
        // Eliminar Items anteriores
        // =========================

        await tx.productBomItem.deleteMany({
          where: {
            bomId: productBom.id
          }
        });

        // =========================
        // Crear nuevos Items
        // =========================

        if (items.length > 0) {
          await tx.productBomItem.createMany({
            data: items.map((item) => ({
              bomId: productBom.id,
              materialId: item.materialId,
              quantity: item.quantity,
              wastePercent: item.wastePercent ?? 0,
              notes: item.notes ?? null
            }))
          });
        }
      }

      // =========================
      // Productos sin Producción
      // =========================
      else if (sourceType === "PURCHASE") {
        const productBom = await tx.productBom.findFirst({
          where: {
            productId: updatedProduct.id,
            isActive: true
          }
        });

        if (productBom) {
          await tx.productBomItem.deleteMany({
            where: {
              bomId: productBom.id
            }
          });
        }
      }

      // =========================
      // Retornar Producto completo
      // =========================

      return await tx.product.findUnique({
        where: {
          id: updatedProduct.id
        },

        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          },

          bom: {
            where: {
              isActive: true
            },

            include: {
              items: {
                include: {
                  material: {
                    select: {
                      id: true,
                      code: true,
                      barcode: true,
                      name: true,
                      unit: true,
                      costPrice: true
                    }
                  }
                }
              }
            }
          }
        }
      });
    });

    res.json({
      message: "Producto actualizado correctamente.",
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

    // TODO:
    // Cuando implementemos InventoryMovement,
    // impedir desactivar productos con movimientos.

    await prisma.product.update({
      where: {
        id
      },
      data: {
        isActive: false
      }
    });

    res.json({
      message: "Producto desactivado correctamente."
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
      message: "Producto activado correctamente."
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error activando producto"
    });
  }
};

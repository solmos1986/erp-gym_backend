import { PrismaClient } from "@prisma/client";
import { applyTenantFilter } from "../../utils/tenant.util.js";

const prisma = new PrismaClient();

// =========================
// ➕ CREAR MOVIMIENTO
// =========================
export const createInventoryMovement = async (req, res) => {
  const { productId, movementType, quantity, notes } = req.body;

  try {
    // =========================
    // VALIDACIONES
    // =========================

    if (!productId) {
      return res.status(400).json({
        message: "El producto es obligatorio"
      });
    }

    if (!movementType) {
      return res.status(400).json({
        message: "El tipo de movimiento es obligatorio"
      });
    }

    if (quantity === undefined || quantity === null || Number(quantity) <= 0) {
      return res.status(400).json({
        message: "La cantidad debe ser mayor a cero"
      });
    }

    // =========================
    // VERIFICAR PRODUCTO
    // =========================

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        ...applyTenantFilter(req)
      }
    });

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    if (!product.isActive) {
      return res.status(400).json({
        message: "El producto está desactivado"
      });
    }

    // =========================
    // CREAR MOVIMIENTO
    // =========================
    const movement = await prisma.inventoryMovement.create({
      data: {
        movementType,
        quantity,
        notes,

        companyId: req.user.companyId,
        branchId: req.user.branchId,
        productId,

        createdById: req.user.userId
      },

      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },

        branch: {
          select: {
            id: true,
            name: true
          }
        },

        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    return res.status(201).json({
      message: "Movimiento registrado correctamente",
      movement
    });
  } catch (error) {
    console.error("Error creando movimiento:", error);

    return res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};
// =========================
// 📋 LISTAR MOVIMIENTOS
// =========================
export const getInventoryMovements = async (req, res) => {
  const { productId, movementType } = req.query;

  try {
    const where = {
      companyId: req.user.companyId
    };

    if (!req.user.isOwner) {
      where.branchId = req.user.branchId;
    }

    if (productId) {
      where.productId = productId;
    }

    if (movementType) {
      where.movementType = movementType;
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,

      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },

        branch: {
          select: {
            id: true,
            name: true
          }
        },

        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      },

      orderBy: {
        createdAt: "desc"
      }
    });

    res.json(movements);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
      code: error.code
    });
  }
};

// =========================
// 🔍 OBTENER MOVIMIENTO
// =========================
export const getInventoryMovementById = async (req, res) => {
  const { id } = req.params;

  try {
    const where = {
      id,
      companyId: req.user.companyId
    };

    if (!req.user.isOwner) {
      where.branchId = req.user.branchId;
    }

    const movement = await prisma.inventoryMovement.findFirst({
      where,

      include: {
        product: true,
        branch: true,
        createdBy: true
      }
    });

    if (!movement) {
      return res.status(404).json({
        message: "Movimiento no encontrado"
      });
    }

    res.json(movement);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
      code: error.code
    });
  }
};
// =========================
// 📦 STOCK POR SUCURSAL
// =========================
export const getStockByBranch = async (req, res) => {
  try {
    const where = {
      companyId: req.user.companyId
    };

    if (!req.user.isOwner) {
      where.branchId = req.user.branchId;
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,

      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true
          }
        }
      }
    });

    const stockMap = new Map();

    for (const movement of movements) {
      const key = movement.productId;

      if (!stockMap.has(key)) {
        stockMap.set(key, {
          productId: movement.product.id,
          code: movement.product.code,
          name: movement.product.name,
          stock: 0
        });
      }

      const item = stockMap.get(key);

      switch (movement.movementType) {
        case "INITIAL_STOCK":
        case "PURCHASE":
        case "ADJUSTMENT_IN":
        case "TRANSFER_IN":
        case "SALE_CANCEL":
          item.stock += Number(movement.quantity);
          break;

        case "SALE":
        case "ADJUSTMENT_OUT":
        case "TRANSFER_OUT":
          item.stock -= Number(movement.quantity);
          break;
      }
    }

    return res.json(Array.from(stockMap.values()));
  } catch (error) {
    console.error("Error obteniendo stock:", error);

    return res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};
// =========================
// 📒 KARDEX
// =========================
export const getKardex = async (req, res) => {
  try {
    const { productId } = req.query;

    if (!productId) {
      return res.status(400).json({
        message: "productId es obligatorio"
      });
    }

    const where = {
      companyId: req.user.companyId,
      productId
    };

    if (!req.user.isOwner) {
      where.branchId = req.user.branchId;
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,

      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },

        createdBy: {
          select: {
            id: true,
            fullName: true
          }
        }
      },

      orderBy: {
        createdAt: "asc"
      }
    });

    let balance = 0;

    const kardex = movements.map((movement) => {
      const qty = Number(movement.quantity);

      const isEntry = ["INITIAL_STOCK", "PURCHASE", "ADJUSTMENT_IN", "TRANSFER_IN", "SALE_CANCEL"].includes(movement.movementType);

      const input = isEntry ? qty : 0;
      const output = isEntry ? 0 : qty;

      balance += isEntry ? qty : -qty;

      return {
        id: movement.id,
        date: movement.createdAt,

        product: movement.product,

        movementType: movement.movementType,

        input,
        output,

        balance,

        notes: movement.notes,

        createdBy: movement.createdBy
      };
    });

    return res.json(kardex);
  } catch (error) {
    console.error("Error obteniendo kardex:", error);

    return res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};
